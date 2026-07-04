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
}

export interface ItemBuilder {
	id?: number;
	name: string;
	amount?: number;
	categories: string[];
	isActive: boolean;
	hasChildItems: boolean;
	createdAt: string;
}

export interface ItemBuilderChild {
	id?: number;
	parentItemId: number;
	name: string;
	amount: number;
	createdAt: string;
}

export const FIXED_RULES: Omit<Rule, "id">[] = [
	{ name: "Expenses", percent: 50, itemCount: 0 },
	{ name: "Savings", percent: 30, itemCount: 0 },
	{ name: "Wants", percent: 20, itemCount: 0 },
];

export let sessionUnlocked = false;

export function setSessionUnlocked(value: boolean) {
	sessionUnlocked = value;
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

class BudgetDatabase extends Dexie {
	userProfiles!: Table<UserProfile>;
	rules!: Table<Rule>;
	cycleCutoffs!: Table<CycleCutoff>;
	itemBuilders!: Table<ItemBuilder>;
	itemBuilderChildren!: Table<ItemBuilderChild>;

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
	}
}

export const db = new BudgetDatabase();
