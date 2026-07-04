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

export interface CycleCutoff {
	id?: number;
	monthKey: string;
	slot: 1 | 2;
	label: string;
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

class BudgetDatabase extends Dexie {
	userProfiles!: Table<UserProfile>;
	rules!: Table<Rule>;
	cycleCutoffs!: Table<CycleCutoff>;

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
	}
}

export const db = new BudgetDatabase();
