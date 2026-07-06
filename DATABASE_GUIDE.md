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
5. `budgetEntries`
6. `unexpectedExpenses`
7. `othersBudgets`
8. `othersExpenses`
9. `tabBudgets`
10. `tabBudgetExpenses`

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

## 3.5 `budgetEntries`

Purpose:

- Line items under a rule for a specific cutoff (example: Expenses → Internet ₱1500).
- Sub-items are rows with `parentBudgetEntryId` set to a parent entry's `id`.

Fields:

- `id` (string, PK, UUID)
- `cutoffId` (string; FK-style reference to `cycleCutoffs.id`)
- `monthKey` (string, ex: `2026-07`)
- `ruleName` (string; `Expenses` | `Savings` | `Wants`)
- `name` (string)
- `amount` (number)
- `parentBudgetEntryId` (string, optional; FK-style reference to `budgetEntries.id`)
- `createdAt` (date/time)

Indexes:

- `id`
- `cutoffId`
- `monthKey`
- `ruleName`
- `parentBudgetEntryId`
- `createdAt`

Validation:

- For each cutoff: sum of top-level entry amounts (`!parentBudgetEntryId`) per rule must not exceed that rule's allocated amount.
- Parent progress uses sub-item totals where `parentBudgetEntryId === parent.id`:
  - `remaining = parent.amount - sum(children.amount)`
  - if `parent.amount == 0`, progress stays `0%`
- Deleting a parent entry should also delete its sub-items.

---

## 3.6 `unexpectedExpenses`

Purpose:

- Stores over-budget records only.

Fields:

- `id` (string, PK, UUID)
- `cutoffId` (string, FK-style reference to `cycleCutoffs.id`)
- `itemName` (string; example: `Fastfood`)
- `excessAmount` (number, amount over budget)
- `ruleId` (number, FK-style reference to `rules.id`)
- `ruleName` (string; `Expenses` | `Savings` | `Wants`)
- `date` (date)
- `monthKey` (string, ex: `2026-07`)
- `sourceSection` (string; `mainItems` | `budgetItems` | `otherItems`)
- `sourceId` (string, UUID of the source row)

`sourceSection` values:

- `mainItems` → Main Expense Items (`budgetEntries.id`)
- `budgetItems` → Budget Items (`tabBudgetExpenses.id`)
- `otherItems` → Other Items (`othersExpenses.id`)

Indexes:

- `id`
- `cutoffId`
- `monthKey`
- `ruleId`
- `ruleName`
- `date`
- `itemName`
- `sourceSection`
- `sourceId`

Validation:

- Record created only when overrun happens (spent > allocated).
- `excessAmount` is the positive overrun value.

---

## 3.7 `othersBudgets`

Purpose:

- Optional "Others" allocation per cutoff.

Fields:

- `id` (string, PK, UUID)
- `cutoffId` (string, FK-style reference to `cycleCutoffs.id`)
- `monthKey` (string, ex: `2026-07`)
- `budgetAllocated` (number)
- `createdAt` (date/time)

Indexes:

- `id`
- `cutoffId`
- `monthKey`

---

## 3.8 `othersExpenses`

Purpose:

- Expense rows under Others bucket.

Fields:

- `id` (string, PK, UUID)
- `cutoffId` (string, FK-style reference to `cycleCutoffs.id`)
- `monthKey` (string, ex: `2026-07`)
- `expenseName` (string)
- `amount` (number)
- `createdAt` (date/time)

Indexes:

- `id`
- `cutoffId`
- `monthKey`
- `createdAt`

---

## 3.9 `tabBudgets`

Purpose:

- Optional tab budget allocation per cutoff (example: Expenses Budget section).

Fields:

- `id` (string, PK, UUID)
- `cutoffId` (string, FK-style reference to `cycleCutoffs.id`)
- `monthKey` (string, ex: `2026-07`)
- `ruleName` (string; `Expenses` | `Savings` | `Wants`)
- `budgetAllocated` (number)
- `createdAt` (date/time)

Indexes:

- `id`
- `cutoffId`
- `monthKey`
- `ruleName`
- `[cutoffId+ruleName]`

---

## 3.10 `tabBudgetExpenses`

Purpose:

- Expense rows under tab budget (example: Budget Items list).

Fields:

- `id` (string, PK, UUID)
- `cutoffId` (string, FK-style reference to `cycleCutoffs.id`)
- `monthKey` (string, ex: `2026-07`)
- `ruleName` (string; `Expenses` | `Savings` | `Wants`)
- `expenseName` (string)
- `amount` (number)
- `createdAt` (date/time)

Indexes:

- `id`
- `cutoffId`
- `monthKey`
- `ruleName`
- `[cutoffId+ruleName]`
- `createdAt`

---

## 4) Practical Relationships

- `itemBuilders.hasChildItems` flags that a tracker entry for that item can have sub-items.
- `budgetEntries (parent) -> (many) budgetEntries (sub-items)`
  - Link: `budgetEntries.parentBudgetEntryId`

- `itemBuilders.categories + isActive -> budget entry dropdown options`
  - When adding an entry under a rule, show matching active items.
  - If no item exists yet, user types a new name and save it to `itemBuilders`.

- `cycleCutoffs.id -> budgetEntries.cutoffId`
  - Links each line item to its cutoff.

- `cycleCutoffs.id -> othersBudgets.cutoffId`
- `cycleCutoffs.id -> othersExpenses.cutoffId`
- `cycleCutoffs.id -> tabBudgets.cutoffId`
- `cycleCutoffs.id -> tabBudgetExpenses.cutoffId`
  - Links Budget/Others rows to their cutoff for reporting joins.

- `rules.name -> budgetEntries.ruleName`
  - Defines category ownership (`Expenses`, `Savings`, `Wants`).

- `cycleCutoffs.id -> unexpectedExpenses.cutoffId`
  - Links each overrun record to its cutoff for reporting joins.

- `rules.id -> unexpectedExpenses.ruleId`
- `rules.name -> unexpectedExpenses.ruleName`
  - Links each overrun record to its rule.

- `unexpectedExpenses.sourceId -> budgetEntries.id` when `sourceSection` is `mainItems`
- `unexpectedExpenses.sourceId -> tabBudgetExpenses.id` when `sourceSection` is `budgetItems`
- `unexpectedExpenses.sourceId -> othersExpenses.id` when `sourceSection` is `otherItems`
  - Links back to the original item row.

- `othersBudgets.cutoffId -> othersExpenses.cutoffId`
  - Same cutoff grouping.

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
- Item Builder child progress uses parent budget entry amount vs sub-item totals on the tracker.
- On first app use, profile (name + picture) is required.

---

## 7) Suggested Dexie Store Config (Reference)

```ts
db.version(1).stores({
	userProfiles: "++id, updatedAt",
	rules: "++id, name",
	cycleCutoffs: "++id, monthKey, slot, label, createdAt",
	itemBuilders: "++id, name, isActive, hasChildItems, createdAt",
	budgetEntries:
		"id, cutoffId, monthKey, ruleName, parentBudgetEntryId, createdAt",
	unexpectedExpenses:
		"id, cutoffId, monthKey, ruleId, ruleName, date, itemName, sourceSection, sourceId",
	othersBudgets: "id, cutoffId, monthKey",
	othersExpenses: "id, cutoffId, monthKey, createdAt",
	tabBudgets: "id, cutoffId, monthKey, ruleName, [cutoffId+ruleName]",
	tabBudgetExpenses:
		"id, cutoffId, monthKey, ruleName, [cutoffId+ruleName], createdAt",
});
```

Use this as a direct implementation baseline.
