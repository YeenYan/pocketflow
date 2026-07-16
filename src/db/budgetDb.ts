import Dexie, { type Table } from "dexie";

export interface UserProfile {
	id?: number;
	displayName: string;
	photoUrl?: string;
	pinHash: string;
	useBiometric: boolean;
	biometricCredentialId?: string;
	lockEnabled: boolean;
	onboardingCompleted: boolean;
	createdAt: string;
	updatedAt: string;
}

export type RuleName = "Expenses" | "Savings" | "Wants";

export interface Rule {
	id?: number;
	name: RuleName;
	percent: number;
	itemCount: number;
}

export type RuleAllocation = {
	percent: number;
	amount: number;
};

export type CutoffAllocations = Record<RuleName, RuleAllocation>;

export interface CycleCutoff {
	id: string;
	monthKey: string;
	slot: 1 | 2;
	label: string;
	amount: number;
	date?: string;
	allocations: CutoffAllocations;
	createdAt: string;
	status?: "active" | "finalized";
	finalizedAt?: string;
	carryOverAmount?: number;
	carryOverDecision?: "used" | "declined";
}

export interface ItemBuilder {
	id: string;
	name: string;
	categories: string[];
	isActive: boolean;
	hasChildItems: boolean;
	icon?: string;
	color?: string;
	hasTarget?: boolean;
	targetAmount?: number;
	bankWallet?: string;
	createdAt: string;
}

export interface BudgetEntry {
	id: string;
	cutoffId: string;
	monthKey: string;
	ruleName: RuleName;
	name: string;
	amount: number;
	itemBuilderId?: string;
	parentBudgetEntryId?: string;
	isComplete?: boolean;
	toWithdraw?: boolean;
	withdrawAmount?: number;
	createdAt: string;
}

export interface OthersBudget {
	id: string;
	cutoffId: string;
	monthKey: string;
	budgetAllocated: number;
	toWithdraw?: boolean;
	withdrawAmount?: number;
	createdAt: string;
}

export interface OthersExpense {
	id: string;
	cutoffId: string;
	monthKey: string;
	expenseName: string;
	amount: number;
	toWithdraw?: boolean;
	withdrawAmount?: number;
	createdAt: string;
}

export interface TabBudget {
	id: string;
	cutoffId: string;
	monthKey: string;
	ruleName: RuleName;
	budgetAllocated: number;
	toWithdraw?: boolean;
	withdrawAmount?: number;
	createdAt: string;
}

export interface TabBudgetExpense {
	id: string;
	cutoffId: string;
	monthKey: string;
	ruleName: RuleName;
	expenseName: string;
	amount: number;
	toWithdraw?: boolean;
	withdrawAmount?: number;
	createdAt: string;
}

export type UnexpectedExpenseSource =
	| "mainItems"
	| "budgetItems"
	| "otherItems";

export interface UnexpectedExpense {
	id: string;
	cutoffId: string;
	monthKey: string;
	itemName: string;
	excessAmount: number;
	ruleId: number;
	ruleName: RuleName;
	date: string;
	sourceSection: UnexpectedExpenseSource;
	sourceId: string;
}

export type IncomingBillItemCategory = "expense-main" | "savings";

export interface IncomingBillItem {
	id: string;
	category: IncomingBillItemCategory;
	name: string;
	itemBuilderId: string;
	amount: number;
	createdAt: string;
}

export type IncomingBillBudgetCategory = "cutoff" | "other-expenses" | "wants";

export interface IncomingBillBudget {
	id: string;
	category: IncomingBillBudgetCategory;
	amount: number;
	createdAt: string;
}

export interface SavingsTransfer {
	id: string;
	itemBuilderId: string;
	cutoffId: string;
	monthKey: string;
	targetRule: "Expenses" | "Wants";
	amount: number;
	budgetEntryId: string;
	createdAt: string;
}

export interface RuleExtraBudget {
	id: string;
	cutoffId: string;
	monthKey: string;
	ruleName: RuleName;
	amount: number;
	label: string;
	itemBuilderId?: string;
	budgetEntryId?: string;
	/** Set when added via My Savings "Add Savings" — excluded from Tracker. */
	source?: "mySavings";
	createdAt: string;
}

export type DebtNoteType = "borrowed" | "lent";

export interface DebtNote {
	id: string;
	type: DebtNoteType;
	title: string;
	amount: number;
	date: string;
	createdAt: string;
}

export interface DebtPayment {
	id: string;
	debtNoteId: string;
	amount: number;
	date: string;
	description: string;
	createdAt: string;
}

export const FIXED_RULES: Omit<Rule, "id">[] = [
	{ name: "Expenses", percent: 50, itemCount: 0 },
	{ name: "Savings", percent: 30, itemCount: 0 },
	{ name: "Wants", percent: 20, itemCount: 0 },
];

export let sessionUnlocked = false;

const SESSION_UNTIL_KEY = "sessionUnlockedUntil";
const SESSION_MS = 15 * 60 * 1000;

export function setSessionUnlocked(value: boolean) {
	sessionUnlocked = value;
	if (value) {
		localStorage.setItem(SESSION_UNTIL_KEY, String(Date.now() + SESSION_MS));
	} else {
		localStorage.removeItem(SESSION_UNTIL_KEY);
	}
}

export function restoreSessionUnlocked() {
	const until = Number(localStorage.getItem(SESSION_UNTIL_KEY) || 0);
	if (until > Date.now()) {
		sessionUnlocked = true;
		return true;
	}
	localStorage.removeItem(SESSION_UNTIL_KEY);
	sessionUnlocked = false;
	return false;
}

export function createId(): string {
	return crypto.randomUUID();
}

export function buildCutoffAllocations(
	cutoffAmount: number,
	ruleList: Pick<Rule, "name" | "percent">[],
): CutoffAllocations {
	const allocations = {} as CutoffAllocations;
	for (const rule of ruleList) {
		allocations[rule.name] = {
			percent: rule.percent,
			amount: cutoffAmount * (rule.percent / 100),
		};
	}
	return allocations;
}

type LegacyCycleCutoff = Omit<CycleCutoff, "id" | "allocations"> & {
	id?: number;
	allocations?: CutoffAllocations;
};

type LegacyCutoffRuleAllocation = {
	cutoffId: string;
	ruleName: RuleName;
	percent: number;
	amount: number;
};

let legacyCutoffsForMigration: LegacyCycleCutoff[] = [];

type LegacyItemBuilder = Omit<ItemBuilder, "id"> & { id?: number };

let legacyItemBuildersForMigration: LegacyItemBuilder[] = [];

type LegacyOthersBudget = {
	id?: number;
	monthKey: string;
	budgetAllocated: number;
	createdAt: string;
};

type LegacyOthersExpense = {
	id?: number;
	monthKey: string;
	expenseName: string;
	amount: number;
	createdAt: string;
};

type LegacyTabBudget = {
	id?: number;
	monthKey: string;
	ruleName: RuleName;
	budgetAllocated: number;
	createdAt: string;
};

type LegacyTabBudgetExpense = {
	id?: number;
	monthKey: string;
	ruleName: RuleName;
	expenseName: string;
	amount: number;
	createdAt: string;
};

let legacyOthersBudgetsForMigration: LegacyOthersBudget[] = [];
let legacyOthersExpensesForMigration: LegacyOthersExpense[] = [];
let legacyTabBudgetsForMigration: LegacyTabBudget[] = [];
let legacyTabBudgetExpensesForMigration: LegacyTabBudgetExpense[] = [];

class BudgetDatabase extends Dexie {
	userProfiles!: Table<UserProfile>;
	rules!: Table<Rule>;
	cycleCutoffs!: Table<CycleCutoff>;
	itemBuilders!: Table<ItemBuilder>;
	budgetEntries!: Table<BudgetEntry>;
	othersBudgets!: Table<OthersBudget>;
	othersExpenses!: Table<OthersExpense>;
	tabBudgets!: Table<TabBudget>;
	tabBudgetExpenses!: Table<TabBudgetExpense>;
	unexpectedExpenses!: Table<UnexpectedExpense>;
	incomingBillItems!: Table<IncomingBillItem>;
	incomingBillBudgets!: Table<IncomingBillBudget>;
	savingsTransfers!: Table<SavingsTransfer>;
	ruleExtraBudgets!: Table<RuleExtraBudget>;
	debtNotes!: Table<DebtNote>;
	debtPayments!: Table<DebtPayment>;

	constructor() {
		super("pocketflow-budget-db");
		this.version(1).stores({
			userProfiles: "++id, updatedAt, onboardingCompleted",
		});
		this.version(2).stores({
			userProfiles: "++id, updatedAt, onboardingCompleted",
			rules: "++id, name",
			cycleCutoffs: "++id, monthKey, slot, label, createdAt",
		});
		this.version(3)
			.stores({
				cycleCutoffs: null,
			})
			.upgrade(async (tx) => {
				legacyCutoffsForMigration = await tx.table("cycleCutoffs").toArray();
			});
		this.version(4)
			.stores({
				userProfiles: "++id, updatedAt, onboardingCompleted",
				rules: "++id, name",
				cycleCutoffs: "id, monthKey, slot, label, createdAt",
				cutoffRuleAllocations: "id, cutoffId, ruleName, createdAt",
			})
			.upgrade(async (tx) => {
				const rules = await tx.table("rules").toArray();
				for (const row of legacyCutoffsForMigration) {
					const cutoffId = createId();
					const { id: _id, ...rest } = row;
					await tx.table("cycleCutoffs").add({ ...rest, id: cutoffId });
					const distributed = buildCutoffAllocations(rest.amount, rules);
					await tx.table("cutoffRuleAllocations").bulkAdd(
						Object.entries(distributed).map(([ruleName, entry]) => ({
							id: createId(),
							cutoffId,
							ruleName: ruleName as RuleName,
							percent: entry.percent,
							amount: entry.amount,
							createdAt: rest.createdAt,
						})),
					);
				}
				legacyCutoffsForMigration = [];
			});
		this.version(5)
			.stores({
				cutoffRuleAllocations: null,
				cycleCutoffs: "id, monthKey, slot, label, createdAt",
			})
			.upgrade(async (tx) => {
				const rules = await tx.table("rules").toArray();
				const cutoffs = await tx.table("cycleCutoffs").toArray();
				const allocationRows: LegacyCutoffRuleAllocation[] = await tx
					.table("cutoffRuleAllocations")
					.toArray();

				for (const cutoff of cutoffs) {
					const rows = allocationRows.filter((a) => a.cutoffId === cutoff.id);
					const allocations =
						rows.length > 0
							? (Object.fromEntries(
									rows.map((row) => [
										row.ruleName,
										{ percent: row.percent, amount: row.amount },
									]),
								) as CutoffAllocations)
							: buildCutoffAllocations(cutoff.amount, rules);

					await tx.table("cycleCutoffs").update(cutoff.id, { allocations });
				}
			});
		this.version(6).stores({
			itemBuilders: "++id, name, isActive, hasChildItems, createdAt",
			itemBuilderChildren: "++id, parentItemId, createdAt",
		});
		this.version(7).stores({
			budgetEntries: "id, cutoffId, monthKey, ruleName, createdAt",
		});
		this.version(8)
			.stores({
				itemBuilders: null,
			})
			.upgrade(async (tx) => {
				legacyItemBuildersForMigration = await tx.table("itemBuilders").toArray();
			});
		this.version(9)
			.stores({
				itemBuilders: "id, name, isActive, hasChildItems, createdAt",
				itemBuilderChildren: "++id, parentItemId, createdAt",
			})
			.upgrade(async (tx) => {
				const idMap = new Map<number, string>();
				for (const row of legacyItemBuildersForMigration) {
					const id = createId();
					if (typeof row.id === "number") idMap.set(row.id, id);
					const { id: _id, ...rest } = row;
					await tx.table("itemBuilders").add({ ...rest, id });
				}
				const children = await tx.table("itemBuilderChildren").toArray();
				for (const child of children) {
					const parentItemId =
						typeof child.parentItemId === "number"
							? idMap.get(child.parentItemId)
							: child.parentItemId;
					if (parentItemId && parentItemId !== child.parentItemId) {
						await tx
							.table("itemBuilderChildren")
							.update(child.id, { parentItemId });
					}
				}
				legacyItemBuildersForMigration = [];
			});
		this.version(10).stores({
			itemBuilderChildren: null,
			budgetEntries:
				"id, cutoffId, monthKey, ruleName, parentBudgetEntryId, createdAt",
		});
		this.version(11).stores({
			budgetEntries:
				"id, cutoffId, monthKey, ruleName, itemBuilderId, parentBudgetEntryId, createdAt",
		});
		this.version(12).stores({
			othersBudgets: "++id, monthKey",
			othersExpenses: "++id, monthKey, createdAt",
		});
		this.version(13).stores({
			tabBudgets: "++id, monthKey, ruleName",
			tabBudgetExpenses: "++id, monthKey, ruleName, createdAt",
		});
		this.version(14).stores({
			tabBudgets: "++id, monthKey, ruleName, [monthKey+ruleName]",
			tabBudgetExpenses:
				"++id, monthKey, ruleName, [monthKey+ruleName], createdAt",
		});
		this.version(15)
			.stores({
				othersBudgets: null,
				othersExpenses: null,
				tabBudgets: null,
				tabBudgetExpenses: null,
			})
			.upgrade(async (tx) => {
				legacyOthersBudgetsForMigration = await tx
					.table("othersBudgets")
					.toArray();
				legacyOthersExpensesForMigration = await tx
					.table("othersExpenses")
					.toArray();
				legacyTabBudgetsForMigration = await tx.table("tabBudgets").toArray();
				legacyTabBudgetExpensesForMigration = await tx
					.table("tabBudgetExpenses")
					.toArray();
			});
		this.version(16)
			.stores({
				othersBudgets: "id, cutoffId, monthKey",
				othersExpenses: "id, cutoffId, monthKey, createdAt",
				tabBudgets: "id, cutoffId, monthKey, ruleName, [cutoffId+ruleName]",
				tabBudgetExpenses:
					"id, cutoffId, monthKey, ruleName, [cutoffId+ruleName], createdAt",
			})
			.upgrade(async (tx) => {
				const cutoffs: CycleCutoff[] = await tx.table("cycleCutoffs").toArray();
				const cutoffIdByMonth = new Map<string, string>();
				for (const monthKey of [...new Set(cutoffs.map((c) => c.monthKey))]) {
					const monthCutoffs = cutoffs.filter((c) => c.monthKey === monthKey);
					const latest = monthCutoffs.reduce<CycleCutoff | null>(
						(acc, cutoff) =>
							!acc || cutoff.createdAt > acc.createdAt ? cutoff : acc,
						null,
					);
					if (latest) cutoffIdByMonth.set(monthKey, latest.id);
				}

				for (const row of legacyOthersBudgetsForMigration) {
					const cutoffId = cutoffIdByMonth.get(row.monthKey);
					if (!cutoffId) continue;
					const { id: _id, ...rest } = row;
					await tx.table("othersBudgets").add({
						...rest,
						id: createId(),
						cutoffId,
					});
				}

				for (const row of legacyOthersExpensesForMigration) {
					const cutoffId = cutoffIdByMonth.get(row.monthKey);
					if (!cutoffId) continue;
					const { id: _id, ...rest } = row;
					await tx.table("othersExpenses").add({
						...rest,
						id: createId(),
						cutoffId,
					});
				}

				for (const row of legacyTabBudgetsForMigration) {
					const cutoffId = cutoffIdByMonth.get(row.monthKey);
					if (!cutoffId) continue;
					const { id: _id, ...rest } = row;
					await tx.table("tabBudgets").add({
						...rest,
						id: createId(),
						cutoffId,
					});
				}

				for (const row of legacyTabBudgetExpensesForMigration) {
					const cutoffId = cutoffIdByMonth.get(row.monthKey);
					if (!cutoffId) continue;
					const { id: _id, ...rest } = row;
					await tx.table("tabBudgetExpenses").add({
						...rest,
						id: createId(),
						cutoffId,
					});
				}

				legacyOthersBudgetsForMigration = [];
				legacyOthersExpensesForMigration = [];
				legacyTabBudgetsForMigration = [];
				legacyTabBudgetExpensesForMigration = [];
			});
		this.version(17).stores({
			unexpectedExpenses:
				"id, cutoffId, monthKey, ruleId, ruleName, date",
		});
		this.version(18)
			.stores({
				unexpectedExpenses:
					"id, cutoffId, monthKey, ruleId, ruleName, date, itemName, sourceSection, sourceId",
			})
			.upgrade(async (tx) => {
				const rows: (UnexpectedExpense & { name?: string })[] = await tx
					.table("unexpectedExpenses")
					.toArray();
				for (const row of rows) {
					if (row.itemName != null && row.sourceSection != null) continue;
					const itemName = row.itemName ?? row.name ?? "";
					await tx.table("unexpectedExpenses").update(row.id, {
						itemName,
						sourceSection: row.sourceSection ?? "mainItems",
						sourceId: row.sourceId ?? "",
					});
				}
			});
		this.version(19).stores({
			incomingBillItems: "id, category, itemBuilderId, createdAt",
			incomingBillBudgets: "id, category",
		});
		this.version(20)
			.stores({
				cycleCutoffs: "id, monthKey, slot, label, createdAt, status",
			})
			.upgrade(async (tx) => {
				const cutoffs = await tx.table("cycleCutoffs").toArray();
				for (const cutoff of cutoffs) {
					if (cutoff.status) continue;
					await tx.table("cycleCutoffs").update(cutoff.id, { status: "active" });
				}
			});
		this.version(21).stores({
			savingsTransfers:
				"id, itemBuilderId, cutoffId, monthKey, targetRule, budgetEntryId, createdAt",
		});
		this.version(22).stores({
			ruleExtraBudgets:
				"id, cutoffId, monthKey, ruleName, itemBuilderId, budgetEntryId, createdAt",
		});
		this.version(23).stores({
			debtNotes: "id, type, date, createdAt",
			debtPayments: "id, debtNoteId, date, createdAt",
		});
	}
}

export const db = new BudgetDatabase();
