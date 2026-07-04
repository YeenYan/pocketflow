# Budget Tracker Implementation Guide (Dexie + IndexedDB)

This guide is a **step-by-step build plan** for your budgeting features with minimal complexity.

**Data strategy:**

- **Dexie + IndexedDB** = all app data stored locally on device/browser

Related guides:

- `DATABASE_GUIDE.md` — local table design
- `AUTHENTICATION_GUIDE.md` — onboarding wizard, PIN, and Face ID app lock

It follows your baseline:

- `Expenses` (default 50%)
- `Savings` (default 30%)
- `Wants` (default 20%)
- 2 cutoffs per month/cycle only
- default cutoff names: `1st cutoff`, `2nd cutoff`
- user can rename cutoff labels (example: `15`, `30`)
- first-time user onboarding: display name, profile image, 5-digit PIN, optional Face ID (see `AUTHENTICATION_GUIDE.md`)
- user can edit display name, profile image, PIN, and Face ID settings in `Me` page

---

## 0) First-time profile setup

Use `AUTHENTICATION_GUIDE.md` for the full 4-step onboarding flow:

1. Display Name
2. Profile Image
3. PIN Code (5 digits)
4. Enable Face ID toggle

After onboarding, user unlocks app with PIN and/or Face ID on return visits.

---

## 1) Install required packages

Run:

```bash
npm install dexie chart.js vue-chartjs
```

---

## 2) Create simple and organized directories

Use this structure only (minimal and clear):

```text
src/
  pages/
    me/
      MePage.vue
    tracker/
      TrackerPage.vue
      components/
        CutoffInputCard.vue
        RuleDistributionCard.vue
        RulePieChartCard.vue
        ItemBuilderCard.vue
        WantsTrackerCard.vue
        BudgetTrackerCard.vue
        UnexpectedExpensesCard.vue
        OthersBudgetCard.vue
      db/
        budgetDb.ts
      constants/
        budgetRules.ts
      utils/
        budgetMath.ts
      types/
        budget.ts
```

Notes:

- Keep all new logic inside `src/pages/tracker/`.
- Do not add extra layers outside this feature.

---

## 3) Define the data model (types)

Create `src/pages/tracker/types/budget.ts`:

- `Rule`
  - `id`
  - `name` (`Expenses` | `Savings` | `Wants`)
  - `percent`
  - `itemCount`
- `UserProfile`
  - `id`
  - `displayName`
  - `photoUrl` (or base64 image string)
  - `createdAt`
  - `updatedAt`
- `CycleCutoff`
  - `id`
  - `monthKey` (example: `2026-06`)
  - `slot` (`1` | `2`) // fixed two cutoffs only
  - `label` (default `1st cutoff` / `2nd cutoff`, editable by user)
  - `amount`
  - `createdAt`
- `ItemBuilder`
  - `id`
  - `name`
  - `amount` (optional; can be empty or default `0`)
  - `categories` (array of `Expenses` | `Savings` | `Wants`)
  - `isActive`
  - `hasChildItems`
  - `createdAt`
- `ItemBuilderChild`
  - `id`
  - `parentItemId`
  - `name`
  - `amount`
  - `createdAt`
- `BudgetEntry`
  - `id`
  - `monthKey` (example: `2026-06`)
  - `ruleName`
  - `cutoff`
  - `name`
  - `amount`
  - `createdAt`
- `UnexpectedExpense`
  - `id`
  - `monthKey`
  - `expenseName`
  - `amount` (store excess as negative, example `-1000`)
  - `createdAt`
- `OthersBudget`
  - `id`
  - `monthKey`
  - `budgetAllocated`
  - `createdAt`
- `OthersExpense`
  - `id`
  - `monthKey`
  - `expenseName`
  - `amount`
  - `createdAt`

---

## 4) Add fixed baseline rules

Create `src/pages/tracker/constants/budgetRules.ts`:

- Default rules:
  - `Expenses: 50`
  - `Savings: 30`
  - `Wants: 20`
- Fixed names:
  - Always use `Expenses`, `Savings`, `Wants`.
- Allow editing percent values, but validate:
  - total must equal `100`.

---

## 5) Create Dexie database

Create `src/pages/tracker/db/budgetDb.ts`:

- Create Dexie instance (example name: `pocketflow-budget-db`).
- Tables:
  - `userProfiles`
  - `rules`
  - `cycleCutoffs`
  - `itemBuilders`
  - `itemBuilderChildren`
  - `budgetEntries`
  - `unexpectedExpenses`
  - `othersBudgets`
  - `othersExpenses`

Recommended indexed fields:

- `userProfiles: ++id, updatedAt`
- `rules: ++id, name`
- `cycleCutoffs: ++id, monthKey, slot, label, createdAt`
- `itemBuilders: ++id, name, isActive, hasChildItems, createdAt`
- `itemBuilderChildren: ++id, parentItemId, createdAt`
- `budgetEntries: ++id, monthKey, ruleName, cutoff, createdAt`
- `unexpectedExpenses: ++id, monthKey, createdAt`
- `othersBudgets: ++id, monthKey`
- `othersExpenses: ++id, monthKey, createdAt`

---

## 6) Add the core math utilities

Create `src/pages/tracker/utils/budgetMath.ts` with simple functions:

1. `distributeByRules(cutoffAmount, rules)`
   - Returns amount per rule using rule percent for one cutoff entry.

2. `splitRuleByCutoff(ruleAmount)`
   - Splits rule amount into 2 parts for cutoffs `15` and `30`.
   - Default split: 50/50 per cutoff.

3. `calcProgress(usedAmount, allocatedAmount)`
   - Returns percent used.
   - If allocated is `0`, return `0`.

4. `calcRemaining(allocatedAmount, usedAmount)`
   - Returns remaining amount.

Keep formulas direct and readable.

---

## 7) Build feature step-by-step in `TrackerPage.vue`

Use `TrackerPage.vue` as the parent container and pass state/handlers to cards.

### Step 7.1 - Cutoff input and auto distribution

Create `CutoffInputCard.vue`:

- Always create exactly 2 cutoff slots per month/cycle.
- Default labels:
  - `1st cutoff`
  - `2nd cutoff`
- User can rename labels (example: `15`, `30`).
- User enters amount per cutoff slot.
- On save:
  - store entries in `cycleCutoffs`.
  - run distribution using current rules for each cutoff amount.

Expected result:

- User enters amount per cutoff, and system auto-allocates to `Expenses`, `Savings`, `Wants`.

### Step 7.2 - Rule editor (50/30/20 editable)

Create `RuleDistributionCard.vue`:

- Table fields:
  - `Name` (fixed text)
  - `Percent` (editable input)
  - `No. of items` (computed count of active `itemBuilders` or entries)
- Validate total percent = 100 before save.
- Save updated rules in `rules` table.

### Step 7.3 - Rule pie chart

Create `RulePieChartCard.vue`:

- Use `vue-chartjs` + `chart.js`.
- Data source: `rules`.
- Labels fixed: `Expenses`, `Savings`, `Wants`.
- Values: current edited percentages.

### Step 7.4 - Validate rule allocations per cutoff

For each cutoff entry, allocate by rules (`Expenses`, `Savings`, `Wants`).

Flexible entry rule:

- User can manually adjust rule amounts inside a cutoff.
- Validate: `sum(ruleAmountsForCutoff) <= cutoffAmount`.
- If exceeded, show error: `Total rule amount cannot exceed cutoff amount.`

Store entries in `budgetEntries`.

---

## 8) Item builder (reusable items + dropdown source)

Create `ItemBuilderCard.vue`:

- Fields:
  - `Item Name`
  - `Item Amount` (optional; can be empty or default `0`)
  - `Category` (checkbox multi-select):
    - `Expenses`
    - `Savings`
    - `Wants`
  - `Active` (toggle)
  - `Have child items` (toggle)
- Save parent item in `itemBuilders`.

When adding a budget entry under a rule:

- Load dropdown options from active `itemBuilders` where `categories` includes the current rule.
- If no item exists yet, user types a new name and save it to `itemBuilders`.
- Next entries can pick it from the dropdown.

If `Have child items` is true:

- Show parent progress bar.
- Parent progress formula:
  - `remaining = parentItemAmount - sum(childItemAmounts)`
  - `usedPercent = sum(childItemAmounts) / parentItemAmount * 100`
- Show `Add Child Item` button.
- Child item fields:
  - `Child Item Name`
  - `Child Item Amount`
- Save child items in `itemBuilderChildren`.

Notes:

- Parent amount can be optional. If empty, use default `0`.
- If parent amount is `0`, keep progress at `0%` to avoid divide-by-zero.

---

## 9) Wants tracker

Create `WantsTrackerCard.vue`:

- Show allocated Wants budget for month.
- Show used Wants amount (sum of wants entries).
- Show progress bar / percent used.
- List all bought wants items:
  - name
  - amount
  - date
- If used >= allocated, highlight as budget exhausted.

---

## 10) Budget tracker (overall)

Create `BudgetTrackerCard.vue`:

- Monthly totals:
  - total allocated
  - total used
  - remaining
  - percent used
- Show one main progress bar.
- Add warning states:
  - `>= 80%` almost runs out
  - `>= 100%` exceeded

---

## 11) Unexpected Expenses (auto-show on overrun)

Create `UnexpectedExpensesCard.vue`:

Display this card **only when over budget exists**.

Logic:

- For each expense category, if `used > allocated`,
  - overrun = `allocated - used` (negative value).
  - create record in `unexpectedExpenses`.

Fields:

- `Expense Name`
- `Amount` (negative, example `-1000`)

---

## 12) Others monthly optional budget

Create `OthersBudgetCard.vue`:

- Optional input: `Budget Allocated`.
- If set and user logs expense, collect:
  - `Expense Name`
  - `Amount`
- Save budget in `othersBudgets`.
- Save expenses in `othersExpenses`.
- Show progress bar for Others utilization.

---

## 13) Suggested implementation order (do this exact order)

1. `types/budget.ts`
2. `constants/budgetRules.ts`
3. `db/budgetDb.ts`
4. first-time profile setup + `Me` page edit (display name + picture)
5. `utils/budgetMath.ts`
6. `CutoffInputCard.vue`
7. `RuleDistributionCard.vue`
8. `RulePieChartCard.vue`
9. `ItemBuilderCard.vue`
10. `WantsTrackerCard.vue`
11. `BudgetTrackerCard.vue`
12. `UnexpectedExpensesCard.vue`
13. `OthersBudgetCard.vue`
14. connect all cards in `TrackerPage.vue`

---

## 14) Validation checklist before done

- First-time app open asks for display name and profile picture.
- Profile data is saved locally and reused on next open.
- `Me` page can edit display name and change profile picture.
- Rule names are fixed to `Expenses`, `Savings`, `Wants`.
- Rule percentages are editable and total always equals `100`.
- Only 2 cutoffs are allowed per month/cycle.
- Default cutoff names are `1st cutoff` and `2nd cutoff`, and labels are editable.
- Each cutoff amount automatically distributes to rules.
- For each cutoff, total rule allocation must not exceed cutoff amount.
- Item Builder items appear in dropdown when adding entries under a matching rule.
- Item Builder supports:
  - item name
  - optional/default item amount
  - multi-category selection (`Expenses`, `Savings`, `Wants`)
  - active toggle
  - child-items toggle
- If child-items toggle is on:
  - parent progress bar is shown
  - `Add Child Item` is available
  - child item name/amount can be added
- Parent progress uses `parent amount - total child amount`.
- Wants tracker shows progress and purchase list.
- Budget tracker shows overall progress and warning state.
- Unexpected Expenses shows only when overrun happens.
- Others section is optional and has its own progress bar.
- Data persists after refresh (IndexedDB via Dexie).

---

## 15) Keep implementation simple (important)

- Prefer direct logic in feature files.
- Avoid extra abstractions.
- Reuse the same naming everywhere.
- Do not add new architecture outside this scope.
- Build one step at a time, test each card before moving next.
