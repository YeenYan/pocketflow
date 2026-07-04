# PocketFlow Database Guide (Dexie + IndexedDB)

This is the dedicated database guide based on `BUDGET_TRACKER_IMPLEMENTATION_GUIDE.md`.

It focuses on:

- clear table design
- practical relationships
- indexes for fast local queries
- sample records for testing

---

## 1) Database Overview

- Database engine: `Dexie.js` on top of `IndexedDB`
- Storage scope: local device/browser
- Database name (recommended): `pocketflow-budget-db`

Main modules stored in DB:

- User profile
- Rules and cutoffs
- Item builder (+ child items; also used as dropdown source when adding entries)
- Budget entries and trackers
- Unexpected expenses
- Others optional budget

---

## 2) Table List

1. `userProfiles`
2. `rules`
3. `cycleCutoffs`
4. `itemBuilders`
5. `itemBuilderChildren`
6. `budgetEntries`
7. `unexpectedExpenses`
8. `othersBudgets`
9. `othersExpenses`

---

## 3) Table Structure

## 3.1 `userProfiles`

Purpose:

- First-time onboarding and profile data used in `Me` page.

Fields:

- `id` (number, PK, auto increment)
- `displayName` (string)
- `photoUrl` (string, optional; URL or base64)
- `createdAt` (date/time)
- `updatedAt` (date/time)

Indexes:

- `++id`
- `updatedAt`

---

## 3.2 `rules`

Purpose:

- Stores category split percentages.

Fields:

- `id` (number, PK, auto increment)
- `name` (string; `Expenses` | `Savings` | `Wants`)
- `percent` (number)
- `itemCount` (number)

Indexes:

- `++id`
- `name`

Validation:

- Sum of all `percent` values must always equal `100`.

---

## 3.3 `cycleCutoffs`

Purpose:

- Stores exactly 2 cutoff slots per month/cycle.

Fields:

- `id` (number, PK, auto increment)
- `monthKey` (string, ex: `2026-07`)
- `slot` (number; `1` or `2`)
- `label` (string; default `1st cutoff` / `2nd cutoff`, editable)
- `amount` (number)
- `createdAt` (date/time)

Indexes:

- `++id`
- `monthKey`
- `slot`
- `label`
- `createdAt`

Rules:

- Only 2 cutoff rows per `monthKey`.

---

## 3.4 `itemBuilders`

Purpose:

- Reusable items under Expenses/Savings/Wants.
- Also the dropdown source when adding a budget entry under a rule (filter by `categories` + `isActive`).

Fields:

- `id` (number, PK, auto increment)
- `name` (string)
- `amount` (number, optional; default `0`)
- `categories` (array of strings)
- `isActive` (boolean)
- `hasChildItems` (boolean)
- `createdAt` (date/time)

Indexes:

- `++id`
- `name`
- `isActive`
- `hasChildItems`
- `createdAt`

---

## 3.5 `itemBuilderChildren`

Purpose:

- Child rows under a parent `itemBuilder`.

Fields:

- `id` (number, PK, auto increment)
- `parentItemId` (number; FK-style reference to `itemBuilders.id`)
- `name` (string)
- `amount` (number)
- `createdAt` (date/time)

Indexes:

- `++id`
- `parentItemId`
- `createdAt`

Rules:

- Parent progress uses:
  - `remaining = parent.amount - sum(children.amount)`
  - if `parent.amount == 0`, progress stays `0%`

---

## 3.6 `budgetEntries`

Purpose:

- Line items under a rule for a specific cutoff (example: Expenses → Internet ₱1500).

Fields:

- `id` (string, PK, UUID)
- `cutoffId` (string; FK-style reference to `cycleCutoffs.id`)
- `monthKey` (string, ex: `2026-07`)
- `ruleName` (string; `Expenses` | `Savings` | `Wants`)
- `name` (string)
- `amount` (number)
- `createdAt` (date/time)

Indexes:

- `id`
- `cutoffId`
- `monthKey`
- `ruleName`
- `createdAt`

Validation:

- For each cutoff: sum of related entry amounts per rule must not exceed that rule's allocated amount.

---

## 3.7 `unexpectedExpenses`

Purpose:

- Stores over-budget records only.

Fields:

- `id` (number, PK, auto increment)
- `monthKey` (string)
- `expenseName` (string)
- `amount` (number, negative)
- `createdAt` (date/time)

Indexes:

- `++id`
- `monthKey`
- `createdAt`

---

## 3.8 `othersBudgets`

Purpose:

- Optional monthly "Others" allocation.

Fields:

- `id` (number, PK, auto increment)
- `monthKey` (string)
- `budgetAllocated` (number)
- `createdAt` (date/time)

Indexes:

- `++id`
- `monthKey`

---

## 3.9 `othersExpenses`

Purpose:

- Expense rows under Others bucket.

Fields:

- `id` (number, PK, auto increment)
- `monthKey` (string)
- `expenseName` (string)
- `amount` (number)
- `createdAt` (date/time)

Indexes:

- `++id`
- `monthKey`
- `createdAt`

---

## 4) Practical Relationships

- `itemBuilders (1) -> (many) itemBuilderChildren`
  - Link: `itemBuilderChildren.parentItemId`

- `itemBuilders.categories + isActive -> budget entry dropdown options`
  - When adding an entry under a rule, show matching active items.
  - If no item exists yet, user types a new name and save it to `itemBuilders`.

- `cycleCutoffs.id -> budgetEntries.cutoffId`
  - Links each line item to its cutoff.

- `rules.name -> budgetEntries.ruleName`
  - Defines category ownership (`Expenses`, `Savings`, `Wants`).

- `othersBudgets.monthKey -> othersExpenses.monthKey`
  - Same month/cycle grouping.

Note:

- IndexedDB/Dexie does not enforce SQL foreign keys automatically.
- Enforce relation integrity in app logic before saving.

---

## 5) Sample Seed Data

## 5.1 Profile

- `displayName`: `Alex`
- `photoUrl`: `data:image/png;base64,...`

## 5.2 Rules

- `Expenses`: `50`
- `Savings`: `30`
- `Wants`: `20`

## 5.3 Cycle Cutoffs

- `monthKey`: `2026-07`, `slot`: `1`, `label`: `15`, `amount`: `12000`
- `monthKey`: `2026-07`, `slot`: `2`, `label`: `30`, `amount`: `8000`

## 5.4 Derived Allocations

- Cutoff `15`:
  - Expenses `6000`
  - Savings `3600`
  - Wants `2400`
- Cutoff `30`:
  - Expenses `4000`
  - Savings `2400`
  - Wants `1600`

---

## 6) Validation Rules Summary

- Rule percentages total must be `100`.
- Only 2 cutoffs per month/cycle.
- Per cutoff allocation cannot exceed cutoff amount.
- Unexpected expenses are stored only when overrun happens.
- Item Builder child progress uses parent amount vs child totals.
- On first app use, profile (name + picture) is required.

---

## 7) Suggested Dexie Store Config (Reference)

```ts
db.version(1).stores({
	userProfiles: "++id, updatedAt",
	rules: "++id, name",
	cycleCutoffs: "++id, monthKey, slot, label, createdAt",
	itemBuilders: "++id, name, isActive, hasChildItems, createdAt",
	itemBuilderChildren: "++id, parentItemId, createdAt",
	budgetEntries: "id, cutoffId, monthKey, ruleName, createdAt",
	unexpectedExpenses: "++id, monthKey, createdAt",
	othersBudgets: "++id, monthKey",
	othersExpenses: "++id, monthKey, createdAt",
});
```

Use this as a direct implementation baseline.
