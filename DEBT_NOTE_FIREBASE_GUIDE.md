# PocketFlow — Debt Note Firebase Link + Notifications Guide

This guide explains how to add **shared / mirrored Debt Notes** between two users (e.g. Juan lends to Bob) using **Firebase**, and how to wire **push notifications** on top of the notification capability already started in this project.

Place this file next to `DATABASE_GUIDE.md`. Update `DATABASE_GUIDE.md` when the Dexie schema fields in this guide are implemented.

---

## 0) Goal

Enable two users to **mirror** one debt:

| Juan (lender) | Bob (borrower) |
|---|---|
| Creates **Lent** entry for Bob | Scans QR / enters code → auto-creates **Borrowed** with Juan |
| Adds **Received** payment | Gets **push notification** + payment appears on Borrowed |

Same debt, opposite sides, kept in sync via Firebase. Local Dexie remains the UI source of truth on each device.

**Example**

1. Juan creates an entry under **Lent** for Bob.
2. Juan generates a QR / invite code.
3. Bob scans the QR or enters the code → app creates a **Borrowed** entry (mirror of Juan’s Lent).
4. Juan uses **Add Received** and saves a payment.
5. Bob gets an in-app / push notification, and the payment appears on Bob’s Borrowed detail (progress updates).

---

## 1) Current project state (important)

### What exists today

- Local tables: `DebtNote` (`type: borrowed | lent`), `DebtPayment` (`debtNoteId`, amount, date, description) in `src/db/budgetDb.ts`
- Detail page: `src/pages/me/DebtNoteDetailPage.vue` (add/edit/swipe-delete payments)
- List: `src/pages/me/BorrowedPage.vue` / `src/pages/me/LentPage.vue`
- PWA + service worker: `vite-plugin-pwa` in `vite.config.ts`
- Notification test only: `testNotification()` in `src/App.vue` using the browser `Notification` API (`Notification.requestPermission()` + `new Notification(...)`)

### What does **not** exist yet

- Firebase Auth / Firestore / FCM
- Multi-device user IDs
- Shared / linked debt IDs
- Cloud Functions for push
- QR generate / scan UI

So this feature is a **new cloud layer on top of** the existing local Debt Note module — not a small patch.

---

## 2) Recommended architecture

```
┌─────────────┐         QR / invite code          ┌─────────────┐
│  Juan app   │ ────────────────────────────────► │   Bob app   │
│  Dexie      │                                   │  Dexie      │
└──────┬──────┘                                   └──────┬──────┘
       │ write/sync                                   write/sync
       ▼                                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     Firebase Cloud                            │
│  Auth (uid) · Firestore (shared debts) · FCM tokens           │
│  Cloud Functions (on payment create → notify counterparty)   │
└─────────────────────────────────────────────────────────────┘
```

**Rule:** Firestore is the shared source of truth for *linked* debts. Each app mirrors into its own Dexie so existing UI keeps working offline-first.

---

## 3) Prerequisites / Firebase console setup

1. Create a Firebase project.
2. Enable:
   - **Authentication** (Anonymous first is fine; later Email/Google)
   - **Cloud Firestore**
   - **Cloud Messaging (FCM)**
3. Register a **Web app** → copy the web config.
4. Generate a **VAPID key** (Project Settings → Cloud Messaging → Web Push certificates).
5. Enable **Cloud Functions** (Blaze plan is required for outbound FCM from Functions).

Install when implementing:

```bash
npm i firebase
# Cloud Functions live in /functions if using Firebase Functions
```

---

## 4) Identity model (required before QR)

Today `userProfiles` is local only (`displayName`, PIN, etc.). Linked debts need a stable cloud id.

### Add cloud user fields (local + Firestore)

**Local `userProfiles` (Dexie migration):**

- `firebaseUid?: string`
- `fcmToken?: string`

**Firestore `users/{uid}`:**

```ts
{
  uid: string
  displayName: string
  fcmTokens: string[]   // multi-device
  updatedAt: string
}
```

### Auth flow

1. On app start / after onboarding unlock: `signInAnonymously()` (or real auth).
2. Save `uid` into Dexie `userProfiles.firebaseUid`.
3. Request notification permission → get FCM token → save to `users/{uid}.fcmTokens`.
4. Keep local PIN/lock as-is (device security ≠ cloud identity).

Without Auth + FCM token registration, QR linking and payment notify cannot work.

---

## 5) Data model for linked debts

### Keep local Dexie shapes, extend them

**`DebtNote` add:**

```ts
{
  // existing: id, type, title, amount, date, createdAt
  linkId?: string          // shared Firestore doc id
  role?: "lender" | "borrower"
  counterpartyUid?: string
  counterpartyName?: string
  inviteCode?: string      // short code Juan shows
  syncStatus?: "local" | "pending" | "linked" | "error"
}
```

**`DebtPayment` add:**

```ts
{
  // existing: id, debtNoteId, amount, date, description, createdAt
  cloudPaymentId?: string  // Firestore payment id (dedupe)
  createdByUid?: string
  syncedAt?: string
}
```

### Firestore collections

**`debtLinks/{linkId}`** — the shared debt header

```ts
{
  linkId: string
  amount: number
  title: string            // e.g. "Bob" or "Juan ↔ Bob"
  date: string             // ISO date lent/borrowed
  lenderUid: string
  borrowerUid: string | null   // null until Bob claims
  lenderName: string
  borrowerName: string | null
  inviteCode: string           // 6–8 char uppercase
  status: "pending" | "linked" | "closed"
  createdAt: string
  updatedAt: string
}
```

**`debtLinks/{linkId}/payments/{paymentId}`**

```ts
{
  paymentId: string
  amount: number
  date: string
  description: string
  createdByUid: string     // Juan when Add Received
  createdAt: string
}
```

**`invites/{inviteCode}`** (optional lookup index)

```ts
{
  inviteCode: string
  linkId: string
  lenderUid: string
  expiresAt: string
  usedByUid: string | null
}
```

Index `inviteCode` for fast claim. Enforce one-time claim (or allow reclaim carefully).

---

## 6) User flows (product → implementation)

### Flow A — Juan creates Lent and invites Bob

1. Juan creates Lent in UI (existing Add Lent modal) → write local `debtNotes` as today.
2. On save (or via a **Share / QR** button on the detail page):
   - Ensure Firebase Auth uid exists.
   - Create Firestore `debtLinks/{linkId}` with `borrowerUid: null`, generate `inviteCode`.
   - Create `invites/{inviteCode}`.
   - Update local note: `linkId`, `inviteCode`, `role: "lender"`, `syncStatus: "pending"`.
3. Show QR + manual code on the detail page.
   - QR payload (recommended JSON or URL):

     ```text
     pocketflow://debt-invite?code=ABC123
     ```

     or HTTPS deep link: `https://yourapp.com/debt-invite?code=ABC123`

### Flow B — Bob scans / enters code

1. Bob opens **Join debt** (scan camera or paste code).
2. App looks up `invites/{code}` → `debtLinks/{linkId}`.
3. Validate: not expired, `status === "pending"`, `borrowerUid === null`.
4. Transaction:
   - Set `debtLinks.borrowerUid = bobUid`, `borrowerName`, `status = "linked"`.
   - Mark invite used.
5. Create **local** Dexie `debtNotes` for Bob:
   - `type: "borrowed"`
   - `title: lenderName` (Juan)
   - same `amount`, `date`
   - `linkId`, `role: "borrower"`, `counterpartyUid: juanUid`
6. Optionally notify Juan: “Bob linked your debt”.

### Flow C — Juan adds Received → Bob notified + mirrored

1. Juan on Lent detail → **Add Received** (existing modal).
2. Save locally first (existing Dexie write).
3. If note has `linkId` and status is linked:
   - Write `debtLinks/{linkId}/payments/{paymentId}`.
   - Store `cloudPaymentId` on the local payment.
4. Cloud Function `onCreate` on payments:
   - Read parent `debtLinks`.
   - Resolve counterparty uid (if creator is lender → notify borrower, and vice versa).
   - Load `users/{uid}.fcmTokens`.
   - Send FCM:

     ```json
     {
       "notification": {
         "title": "Payment recorded",
         "body": "Juan recorded ₱1,000 received"
       },
       "data": {
         "type": "debt_payment",
         "linkId": "...",
         "paymentId": "..."
       }
     }
     ```

5. Bob’s app:
   - On FCM / foreground message / app resume: pull payments for `linkId`.
   - Upsert into local `debtPayments` for Bob’s mirrored note.
   - Show in-app toast / update detail + progress bar.

**Mirror rule**

- Juan payment = “Received” on Lent
- Same payment on Bob = “Payment” on Borrowed  
  Same amount/date/description; opposite labels only in UI (`isBorrowed`).

---

## 7) Notification integration (build on current PWA)

### Today

`App.vue` → `Notification.requestPermission()` + `new Notification(...)`  
Good for **foreground local** tests only. Not cross-device.

### Target

Use **Firebase Cloud Messaging** with the existing service worker from `vite-plugin-pwa`.

### Steps

1. **Firebase web config** (`src/firebase.ts`)
   - `initializeApp`, `getAuth`, `getFirestore`, `getMessaging`

2. **Service worker FCM**
   - Either:
     - `firebase-messaging-sw.js` in `public/`, or
     - extend Workbox SW via `vite-plugin-pwa` `injectManifest` / custom SW
   - Handle `onBackgroundMessage` → show notification with icon `/pwa-192x192.png` (already used in the test notification)

3. **Token registration**

   ```ts
   const token = await getToken(messaging, { vapidKey })
   // save to Firestore users/{uid}.fcmTokens
   ```

   Refresh on login and when the token changes.

4. **Foreground**

   ```ts
   onMessage(messaging, (payload) => {
     // update Dexie + optional in-app banner
     // can also call new Notification(...) like the current test
   })
   ```

5. **Replace the test bell** (later) with real permission + “Notifications enabled” status on Account page.

6. **iOS note:** Web Push on iOS requires an installed PWA (Add to Home Screen) + iOS 16.4+. Document this for users.

---

## 8) QR generate + scan (UI plan)

Stay minimal; reuse Debt Note detail patterns.

### Juan — detail page actions

- Button: **Share / Show QR**
- Modal: QR image + invite code + Copy
- Library options: `qrcode` (generate) — no new architecture; call from the page

### Bob — entry points

- On Debt Note list page: **Join via code**
- Optional: camera scan (`html5-qrcode` or `BarcodeDetector` if available)
- Route idea: `/me/debt-note/join?code=ABC123` (deep link from QR)

### Manual code

- Same join flow as scan; only the input differs

---

## 9) Sync rules (keep it simple)

| Event | Writer | Firestore | Local Dexie (other user) |
|---|---|---|---|
| Create Lent + invite | Lender | `debtLinks` + `invites` | — |
| Claim invite | Borrower | update link + invite | create Borrowed note |
| Add payment | Either (start with lender only) | `payments` subcollection | listener / FCM-triggered pull |
| Edit payment | Same uid that created, or either with rules | update payment | upsert by `cloudPaymentId` |
| Delete payment | Same | delete payment | delete local by `cloudPaymentId` |

**Conflict policy (v1):** last-write-wins on payment fields; payments identified by `cloudPaymentId`.

**Offline:** local write first → queue when online (`syncStatus: pending`). Show a pending indicator on linked notes.

---

## 10) Security rules (must-have)

Firestore rules sketch:

- `users/{uid}`: read/write own doc only
- `debtLinks/{id}`:
  - create: authenticated, `lenderUid == request.auth.uid`
  - read/update: only `lenderUid` or `borrowerUid`
  - claim: borrower may set `borrowerUid` once when null
- `payments`:
  - create/update/delete: only participants of the parent link
- `invites/{code}`:
  - read by authenticated users (or only by code path via Function)
  - prefer a **Cloud Function** `claimInvite(code)` to avoid open invite scraping

Prefer a callable Function for claim + payment notify to keep rules simpler and safer.

---

## 11) Cloud Functions outline

### `claimDebtInvite(code)`

- Auth required
- Lookup invite + link
- Validate pending / unused / not self-claim
- Set borrower, return link snapshot for local note creation

### `onDebtPaymentCreated`

- Trigger: `debtLinks/{linkId}/payments/{paymentId}` onCreate
- Load link, find other party’s FCM tokens
- Send multicast push with `linkId` / `paymentId` in `data`

### Optional `onDebtLinked`

- Notify lender when borrower claims

---

## 12) Client implementation map (files to touch)

Minimal, aligned with the current module:

| Area | File(s) |
|---|---|
| Schema | `src/db/budgetDb.ts` — extend `DebtNote` / `DebtPayment` / `UserProfile` + Dexie version bump |
| Firebase init | `src/firebase.ts` (new) |
| FCM + SW | `vite.config.ts` (SW strategy), `public/firebase-messaging-sw.js` or injectManifest |
| Auth + token | `src/main.ts` / Account / onboarding after unlock |
| Create invite | `BorrowedPage.vue` save path + `DebtNoteDetailPage.vue` Share UI |
| Join / scan | new route page under `src/pages/me/` e.g. `DebtNoteJoinPage.vue` + route in `src/main.ts` |
| Payment sync | `DebtNoteDetailPage.vue` `savePayment` / delete / edit |
| Listen / apply | small sync helpers inside the page first (prefer inline; avoid new layers unless forced) |
| Backup tables | `AccountPage.vue` `BACKUP_TABLES` already includes debt tables — keep new fields in export |

Do **not** invent repositories/composables unless duplication forces it.

---

## 13) Suggested phased rollout

### Phase 1 — Foundation

- Firebase project + Auth anonymous
- FCM permission + token saved to Firestore
- Prove push works (replace/extend App.vue test bell)

### Phase 2 — Link debt

- Create `debtLinks` + invite code + QR
- Bob claim → mirrored Borrowed note locally
- No payment sync yet

### Phase 3 — Payment sync + notify

- Write payments to Firestore from Juan Add Received
- Function sends FCM to Bob
- Bob upserts local payment + UI refresh

### Phase 4 — Polish

- Edit/delete sync
- Bob can also add payment (optional)
- Deep links, invite expiry, unlink, closed status
- Real Auth (email/Google) instead of anonymous

---

## 14) Edge cases to handle

- Juan invites himself → reject
- Code expired / already used
- Bob already has a local note for same `linkId` → don’t duplicate
- Payment arrives twice (FCM + listener) → upsert by `cloudPaymentId`
- User clears site data → re-login, re-pull linked debts by `uid`
- Notification denied → still sync on open via Firestore listener
- Amount mismatch if someone edits a local-only note → linked notes should treat cloud as authority for shared fields

---

## 15) Testing checklist

- [ ] Juan creates Lent → QR + code shown
- [ ] Bob enters code → Borrowed note appears with same amount/date
- [ ] Juan Add Received ₱1,000 → Firestore payment exists
- [ ] Bob receives notification (app background + foreground)
- [ ] Bob detail shows ₱1,000 and progress updates
- [ ] Edit/delete on Juan reflects on Bob
- [ ] Offline Juan payment queues and syncs later
- [ ] iOS PWA installed can receive Web Push (if targeting iPhone)

---

## 16) Relation to `DATABASE_GUIDE.md`

When implementing, update `DATABASE_GUIDE.md` to document:

- New optional fields on `debtNotes` / `debtPayments` / `userProfiles`
- Note that **linked** debts also live in Firestore (`debtLinks`, `payments`, `invites`, `users`)
- Local Dexie remains the device cache/UI store; Firestore is the multi-user sync layer

---

## 17) Non-goals for v1

- Full account system redesign
- End-to-end encrypted debt payloads
- Multi-party debts (1 lender : 1 borrower only)
- Auto bank detection of payments
- Replacing all local-only debts with cloud (local-only debts without QR stay local)

---

## 18) Quick reference — happy path

1. **Juan** creates Lent for Bob (local Dexie).
2. **Juan** taps Share → Firebase creates `debtLinks` + `inviteCode` → QR shown.
3. **Bob** scans/enters code → claim Function → Bob gets local Borrowed note.
4. **Juan** Add Received → local payment + Firestore `payments/{id}`.
5. **Function** sends FCM to Bob.
6. **Bob** app upserts payment → Borrowed detail + progress update.
