# Budget Tracker Implementation Guide (Dexie + IndexedDB)

This guide is a **step-by-step build plan** for your budgeting features with minimal complexity.

It follows your baseline:
- `Expenses` (default 50%)
- `Savings` (default 30%)
- `Wants` (default 20%)
- 2 cutoffs: `15` and `30`

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
    tracker/
      TrackerPage.vue
      components/
        SalaryInputCard.vue
        RuleDistributionCard.vue
        RulePieChartCard.vue
        TemplateListCard.vue
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
- `SalaryCutoff`
  - `id`
  - `cutoff` (`15` | `30`)
  - `salaryAmount`
  - `createdAt`
- `TemplateItem`
  - `id`
  - `ruleName`
  - `cutoff`
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
  - `rules`
  - `salaryCutoffs`
  - `templateItems`
  - `budgetEntries`
  - `unexpectedExpenses`
  - `othersBudgets`
  - `othersExpenses`

Recommended indexed fields:
- `rules: ++id, name`
- `salaryCutoffs: ++id, cutoff, createdAt`
- `templateItems: ++id, ruleName, cutoff, name, createdAt`
- `budgetEntries: ++id, monthKey, ruleName, cutoff, createdAt`
- `unexpectedExpenses: ++id, monthKey, createdAt`
- `othersBudgets: ++id, monthKey`
- `othersExpenses: ++id, monthKey, createdAt`

---

## 6) Add the core math utilities

Create `src/pages/tracker/utils/budgetMath.ts` with simple functions:

1. `distributeByRules(salaryAmount, rules)`
   - Returns amount per rule using rule percent.

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

### Step 7.1 - Salary input and auto distribution

Create `SalaryInputCard.vue`:
- Input salary amount for cutoff (`15` or `30`).
- On save:
  - store salary in `salaryCutoffs`.
  - run distribution using current rules.

Expected result:
- User enters one amount, system auto-allocates to `Expenses`, `Savings`, `Wants`.

### Step 7.2 - Rule editor (50/30/20 editable)

Create `RuleDistributionCard.vue`:
- Table fields:
  - `Name` (fixed text)
  - `Percent` (editable input)
  - `No. of items` (computed count of entries/template items)
- Validate total percent = 100 before save.
- Save updated rules in `rules` table.

### Step 7.3 - Rule pie chart

Create `RulePieChartCard.vue`:
- Use `vue-chartjs` + `chart.js`.
- Data source: `rules`.
- Labels fixed: `Expenses`, `Savings`, `Wants`.
- Values: current edited percentages.

### Step 7.4 - Split each rule amount into cutoffs

After distribution per rule, create 2 cutoff entries:
- cutoff `15` (editable amount)
- cutoff `30` (editable amount)

Flexible entry rule:
- User can manually set both cutoff amounts.
- Validate: `cutoff15 + cutoff30 <= parentRuleAmount`.
- If exceeded, show error: `Total cutoff amount cannot exceed allocated rule amount.`

Example:
- Salary cutoff amount = `20,000`
- Expenses 50% = `10,000` (parent rule amount)
- Valid entries:
  - `15`: `6,000`
  - `30`: `4,000`
- Invalid entries:
  - `15`: `7,000`
  - `30`: `4,000` (total `11,000` exceeds `10,000`)

Store entries in `budgetEntries`.

---

## 8) Template list (reusable dropdown source)

Create `TemplateListCard.vue`:

- Sections:
  - `Expenses`
  - `Savings`
  - `Wants`
- Per section and per cutoff (`15` or `30`), allow adding:
  - `Name`
  - `Amount`
- On save:
  - insert into `templateItems`.
  - these become dropdown options later.

Dropdown behavior:
- When user adds a new name not in options, save it immediately.
- Next entries can pick it from dropdown.

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
4. `utils/budgetMath.ts`
5. `SalaryInputCard.vue`
6. `RuleDistributionCard.vue`
7. `RulePieChartCard.vue`
8. `TemplateListCard.vue`
9. `WantsTrackerCard.vue`
10. `BudgetTrackerCard.vue`
11. `UnexpectedExpensesCard.vue`
12. `OthersBudgetCard.vue`
13. connect all cards in `TrackerPage.vue`

---

## 14) Validation checklist before done

- Rule names are fixed to `Expenses`, `Savings`, `Wants`.
- Rule percentages are editable and total always equals `100`.
- Salary entry automatically distributes to rules.
- Every rule amount is split into `15` and `30`.
- Template list saves and appears in dropdown options.
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

