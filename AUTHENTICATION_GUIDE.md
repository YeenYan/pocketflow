# PocketFlow Authentication Guide (App Lock + Onboarding)

This guide covers **local app authentication** only.

- No cloud login
- No Supabase
- Data stays in Dexie + IndexedDB
- Face ID is optional app unlock on iPhone (via Capacitor)

Related guides:

- `BUDGET_TRACKER_IMPLEMENTATION_GUIDE.md`
- `DATABASE_GUIDE.md`

---

## 1) What this authentication does

- Protects app access on the user's phone
- First-time user completes a 4-step onboarding wizard
- Returning user unlocks with PIN and/or Face ID
- Profile can be edited later in `Me` page

---

## 2) First-time user flow (wizard)

Show onboarding only when profile/auth setup is not completed.

```text
Step 1: Display Name  -> Next
Step 2: Profile Image -> Next
Step 3: PIN Code (5 digits) -> Next
Step 4: Enable Face ID (toggle) -> Finish
```

After Finish:

- Save all data to Dexie
- Mark onboarding as completed
- Go to main app (Dashboard/Tracker)

---

## 3) Step-by-step onboarding screens

## Step 1 — Display Name

Fields:

- `Display Name` (required)

Actions:

- `Next` button (disabled if empty)

Validation:

- Trim spaces
- Minimum length: 2 characters

---

## Step 2 — Profile Image

Fields:

- Profile image picker (optional but recommended)

Actions:

- `Back`
- `Next`

Behavior:

- Allow camera or gallery pick (on native iOS build)
- Store image locally (base64 or local file URI in Dexie)

---

## Step 3 — PIN Code (5 digits)

Fields:

- `Enter PIN` (5 digits)
- `Confirm PIN` (5 digits)

Actions:

- `Back`
- `Next`

Validation:

- Must be exactly 5 digits
- PIN and Confirm PIN must match
- Save only hashed PIN (never raw PIN)

---

## Step 4 — Face ID toggle

Fields:

- Toggle: `Enable Face ID`

Actions:

- `Back`
- `Finish`

Behavior:

- If toggle ON:
  - Check device biometric availability
  - If available, run one Face ID test prompt
  - If success, save `useBiometric = true`
  - If unavailable/failed, keep toggle OFF and continue with PIN only
- If toggle OFF:
  - Save `useBiometric = false`
- On Finish, complete onboarding

---

## 4) Returning user unlock flow

On app open or resume (if lock enabled):

1. Show `LockScreen.vue`
2. If `useBiometric = true`, show Face ID unlock button (or auto prompt)
3. If Face ID fails/cancelled, allow PIN unlock
4. On success, set `isUnlocked = true` and show app

Lock again when:

- App goes to background
- App is inactive and returns later

---

## 5) Install packages

Core (already in project):

- `dexie`

For iPhone Face ID (native shell):

```bash
npm install @capacitor/core @capacitor/cli @capacitor/app
npm install @capacitor-community/biometric-auth
npx cap init
npx cap add ios
```

Build web assets then sync:

```bash
npm run build
npx cap sync ios
```

---

## 6) Suggested file structure

```text
src/
  pages/
    auth/
      OnboardingPage.vue
      onboarding/
        StepDisplayName.vue
        StepProfileImage.vue
        StepPinCode.vue
        StepFaceIdToggle.vue
      LockScreen.vue
    me/
      MePage.vue
  db/
    budgetDb.ts
  utils/
    pinHash.ts
    biometric.ts
```

Keep logic direct in these files. No extra architecture layers.

---

## 7) Dexie data model updates

Extend `userProfiles` (or add `authSettings` if preferred) with:

- `displayName` (string)
- `photoUrl` (string, optional)
- `pinHash` (string, required after onboarding)
- `useBiometric` (boolean, default `false`)
- `lockEnabled` (boolean, default `true`)
- `onboardingCompleted` (boolean, default `false`)
- `createdAt`
- `updatedAt`

Recommended `userProfiles` index:

- `userProfiles: ++id, updatedAt, onboardingCompleted`

Security rules:

- Never store raw PIN
- Never store Face ID biometric data (iOS handles biometrics)

---

## 8) PIN hashing (minimal)

Create `src/utils/pinHash.ts`:

```ts
export async function hashPin(pin: string): Promise<string> {
	const data = new TextEncoder().encode(pin);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export async function verifyPin(
	pin: string,
	pinHash: string,
): Promise<boolean> {
	return (await hashPin(pin)) === pinHash;
}
```

---

## 9) Face ID helper (Capacitor)

Create `src/utils/biometric.ts`:

```ts
import { BiometricAuth } from "@capacitor-community/biometric-auth";

export async function canUseBiometric(): Promise<boolean> {
	try {
		const result = await BiometricAuth.checkBiometry();
		return !!result.isAvailable;
	} catch {
		return false;
	}
}

export async function unlockWithBiometric(): Promise<boolean> {
	try {
		await BiometricAuth.authenticate({
			reason: "Unlock PocketFlow",
		});
		return true;
	} catch {
		return false;
	}
}
```

iOS `Info.plist` required key:

- `NSFaceIDUsageDescription`: `Use Face ID to unlock PocketFlow and protect your budget data.`

---

## 10) Router guard logic

```text
App start
  -> if onboardingCompleted is false
       go to /onboarding
     else if lockEnabled and not unlocked
       go to /lock
     else
       go to main app
```

Onboarding route:

- `/onboarding` (wizard steps 1-4)

Lock route:

- `/lock`

---

## 11) Onboarding state flow (implementation)

Use one parent page: `OnboardingPage.vue`

State:

- `step` = 1 | 2 | 3 | 4
- `displayName`
- `photoUrl`
- `pinHash` (set after step 3)
- `useBiometric`

Handlers:

- Step 1 Next -> validate name -> step 2
- Step 2 Next -> step 3
- Step 3 Next -> validate/confirm PIN -> hash -> step 4
- Step 4 Finish -> save Dexie profile -> onboardingCompleted=true -> main app

Save example:

```ts
await db.userProfiles.put({
	id: 1,
	displayName,
	photoUrl,
	pinHash,
	useBiometric,
	lockEnabled: true,
	onboardingCompleted: true,
	createdAt: now,
	updatedAt: now,
});
```

---

## 12) Lock screen behavior

`LockScreen.vue` should support:

- PIN input (5 digits)
- `Unlock with Face ID` button (only if `useBiometric=true`)
- Error text for wrong PIN

Unlock success:

- set app unlocked state
- route to main app

Auto-lock:

- listen to Capacitor `appStateChange`
- when app becomes inactive, set unlocked=false

---

## 13) Me page settings (after onboarding)

Allow user to update:

- Display name
- Profile image
- Change PIN (old PIN + new PIN + confirm)
- Toggle Face ID on/off
- Toggle App Lock on/off

If Face ID toggle ON:

- run biometric availability check
- if unavailable, show message and keep OFF

---

## 14) Implementation order

1. Extend `userProfiles` fields in `types/budget.ts`
2. Update Dexie schema in `budgetDb.ts`
3. Create `pinHash.ts` and `biometric.ts`
4. Build onboarding step components (1 to 4)
5. Build `OnboardingPage.vue` step controller
6. Build `LockScreen.vue`
7. Add router guards for onboarding/lock
8. Add Capacitor iOS project + biometric plugin
9. Add `NSFaceIDUsageDescription` in iOS `Info.plist`
10. Add Me page auth settings (change PIN / Face ID / lock)
11. Test full flows on iPhone device

---

## 15) Validation checklist

- First-time user sees 4-step wizard in exact order:
  1. Display Name
  2. Profile Image
  3. PIN (5 digits)
  4. Face ID toggle
- `Next` and `Finish` validations work per step
- PIN must be exactly 5 digits and confirmed
- Raw PIN is never stored in Dexie
- Face ID toggle OFF still allows PIN-only unlock
- Face ID toggle ON works on supported iPhone devices
- Returning user is blocked by lock screen when app reopens
- Wrong PIN shows error and stays locked
- Me page can update display name, photo, PIN, Face ID, and lock toggle
- Onboarding does not show again after completion

---

## 16) Keep it simple

- Do not add cloud auth
- Do not add sharing/multi-user auth
- Do not over-engineer security layers
- Use direct step components + Dexie save
- Face ID is optional; PIN is required fallback
