import Dexie, { type Table } from 'dexie'

export interface UserProfile {
	id?: number
	displayName: string
	photoUrl?: string
	pinHash: string
	useBiometric: boolean
	biometricCredentialId?: string
	lockEnabled: boolean
	onboardingCompleted: boolean
	createdAt: string
	updatedAt: string
}

export let sessionUnlocked = false

export function setSessionUnlocked(value: boolean) {
	sessionUnlocked = value
}

class BudgetDatabase extends Dexie {
	userProfiles!: Table<UserProfile>

	constructor() {
		super('pocketflow-budget-db')
		this.version(1).stores({
			userProfiles: '++id, updatedAt, onboardingCompleted',
		})
	}
}

export const db = new BudgetDatabase()
