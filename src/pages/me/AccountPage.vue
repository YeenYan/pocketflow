<script setup lang="ts">
	import { computed, nextTick, onMounted, ref, watch } from "vue";
	import { useRouter } from "vue-router";
	import {
		ChevronRightIcon,
		PencilSquareIcon,
		KeyIcon,
		FingerPrintIcon,
		ArrowRightOnRectangleIcon,
		TrashIcon,
		ViewfinderCircleIcon,
		ArrowDownTrayIcon,
		ArrowUpTrayIcon,
		ArrowLeftIcon,
	} from "@heroicons/vue/24/outline";
	import Button from "../../components/button/Button.vue";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import InputField from "../../components/inputs/InputField.vue";
	import ToggleSwitch from "../../components/inputs/ToggleSwitch.vue";
	import { db, setSessionUnlocked } from "../../db/budgetDb";
	import { hashPin, verifyPin } from "../../utils/pinHash";
	import {
		canUseBiometric,
		registerBiometric,
		unlockWithBiometric,
	} from "../../utils/biometric";

	const BACKUP_TABLES = [
		"rules",
		"cycleCutoffs",
		"itemBuilders",
		"budgetEntries",
		"othersBudgets",
		"othersExpenses",
		"tabBudgets",
		"tabBudgetExpenses",
		"unexpectedExpenses",
		"incomingBillItems",
		"incomingBillBudgets",
		"savingsTransfers",
		"ruleExtraBudgets",
		"debtNotes",
		"debtPayments",
	] as const;

	const router = useRouter();

	const useBiometric = ref(false);
	const hasPin = ref(false);
	const biometricError = ref("");
	const activeModal = ref<"name" | "password" | null>(null);
	const newName = ref("");
	const currentPin = ref("");
	const newPin = ref("");
	const confirmPin = ref("");
	const formError = ref("");

	const showDeleteModal = ref(false);
	const deletePinDigits = ref(["", "", "", "", ""]);
	const deletePinInputRef = ref<HTMLInputElement | null>(null);
	const deleteError = ref("");
	const showDeletePin = ref(false);
	const deleting = ref(false);

	const backupBusy = ref(false);
	const backupMessage = ref("");
	const backupError = ref("");
	const importFileInputRef = ref<HTMLInputElement | null>(null);
	const showImportModal = ref(false);
	const pendingImportFile = ref<File | null>(null);
	const importing = ref(false);

	const deletePin = computed(() => deletePinDigits.value.join(""));

	onMounted(async () => {
		const profile = await db.userProfiles.get(1);
		if (!profile) return;
		useBiometric.value = profile.useBiometric && !!profile.biometricCredentialId;
		hasPin.value = !!profile.pinHash;
		newName.value = profile.displayName;
	});

	watch(currentPin, (v) => {
		if (v.length > 5) currentPin.value = v.slice(0, 5);
	});
	watch(newPin, (v) => {
		if (v.length > 5) newPin.value = v.slice(0, 5);
	});
	watch(confirmPin, (v) => {
		if (v.length > 5) confirmPin.value = v.slice(0, 5);
	});

	function openModal(panel: "name" | "password") {
		formError.value = "";
		activeModal.value = panel;
	}

	function closeModal() {
		formError.value = "";
		activeModal.value = null;
	}

	async function saveName() {
		const trimmed = newName.value.trim();
		if (trimmed.length < 2) {
			formError.value = "Name must be at least 2 characters";
			return;
		}

		const profile = await db.userProfiles.get(1);
		if (!profile) return;

		await db.userProfiles.put({
			...profile,
			displayName: trimmed,
			updatedAt: new Date().toISOString(),
		});

		closeModal();
	}

	async function savePassword() {
		if (newPin.value.length !== 5) {
			formError.value = "Enter a new 5-digit PIN";
			return;
		}
		if (newPin.value !== confirmPin.value) {
			formError.value = "New PINs do not match";
			return;
		}

		const profile = await db.userProfiles.get(1);
		if (!profile) return;

		if (profile.pinHash) {
			if (currentPin.value.length !== 5) {
				formError.value = "Enter your current 5-digit PIN";
				return;
			}
			const ok = await verifyPin(currentPin.value, profile.pinHash);
			if (!ok) {
				formError.value = "Current PIN is wrong";
				currentPin.value = "";
				return;
			}
		}

		await db.userProfiles.put({
			...profile,
			pinHash: await hashPin(newPin.value),
			updatedAt: new Date().toISOString(),
		});

		hasPin.value = true;
		currentPin.value = "";
		newPin.value = "";
		confirmPin.value = "";
		closeModal();
	}

	async function onBiometricChange() {
		biometricError.value = "";
		const profile = await db.userProfiles.get(1);
		if (!profile) return;

		if (useBiometric.value) {
			const available = await canUseBiometric();
			if (!available) {
				useBiometric.value = false;
				biometricError.value = "Face ID is not available on this device";
				return;
			}

			const credentialId = await registerBiometric();
			if (!credentialId) {
				useBiometric.value = false;
				biometricError.value = "Face ID setup was cancelled or failed";
				return;
			}

			await db.userProfiles.put({
				...profile,
				useBiometric: true,
				biometricCredentialId: credentialId,
				updatedAt: new Date().toISOString(),
			});
			return;
		}

		if (!profile.pinHash) {
			useBiometric.value = true;
			biometricError.value = "Set a PIN before turning off Face ID";
			return;
		}

		await db.userProfiles.put({
			...profile,
			useBiometric: false,
			biometricCredentialId: undefined,
			updatedAt: new Date().toISOString(),
		});
	}

	function clearDeletePin() {
		deletePinDigits.value = ["", "", "", "", ""];
		if (deletePinInputRef.value) deletePinInputRef.value.value = "";
	}

	function onDeletePinInput(event: Event) {
		const el = event.target as HTMLInputElement;
		const value = el.value.replace(/\D/g, "").slice(0, 5);
		el.value = value;
		deleteError.value = "";
		for (let i = 0; i < 5; i++) {
			deletePinDigits.value[i] = value[i] ?? "";
		}
	}

	async function openDeleteModal() {
		deleteError.value = "";
		clearDeletePin();
		showDeletePin.value = hasPin.value && !useBiometric.value;
		showDeleteModal.value = true;
		if (showDeletePin.value) {
			await nextTick();
			deletePinInputRef.value?.focus();
		}
	}

	function closeDeleteModal() {
		showDeleteModal.value = false;
		deleteError.value = "";
		clearDeletePin();
	}

	async function confirmDeleteFaceId() {
		if (deleting.value) return;
		const profile = await db.userProfiles.get(1);
		if (!profile?.biometricCredentialId) return;
		deleteError.value = "";
		const ok = await unlockWithBiometric(profile.biometricCredentialId);
		if (!ok) {
			if (hasPin.value) {
				showDeletePin.value = true;
				deleteError.value = "Face ID cancelled. Enter PIN or try again.";
				await nextTick();
				deletePinInputRef.value?.focus();
			} else {
				deleteError.value = "Face ID failed. Try again.";
			}
			return;
		}
		await wipeAllRecords();
	}

	async function confirmDeletePin() {
		if (deletePin.value.length !== 5) {
			deleteError.value = "Enter your 5-digit PIN";
			return;
		}
		const profile = await db.userProfiles.get(1);
		if (!profile?.pinHash) return;
		const ok = await verifyPin(deletePin.value, profile.pinHash);
		if (!ok) {
			deleteError.value = "Wrong PIN";
			clearDeletePin();
			deletePinInputRef.value?.focus();
			return;
		}
		await wipeAllRecords();
	}

	// Clears every table except the account profile and item templates.
	async function wipeAllRecords() {
		deleting.value = true;
		await Promise.all([
			db.rules.clear(),
			db.cycleCutoffs.clear(),
			db.budgetEntries.clear(),
			db.othersBudgets.clear(),
			db.othersExpenses.clear(),
			db.tabBudgets.clear(),
			db.tabBudgetExpenses.clear(),
			db.unexpectedExpenses.clear(),
			db.incomingBillItems.clear(),
			db.incomingBillBudgets.clear(),
			db.debtNotes.clear(),
			db.debtPayments.clear(),
		]);
		deleting.value = false;
		closeDeleteModal();
	}

	async function exportBackup() {
		if (backupBusy.value) return;
		backupBusy.value = true;
		backupError.value = "";
		backupMessage.value = "";
		try {
			const tables: Record<string, unknown[]> = {};
			for (const name of BACKUP_TABLES) {
				tables[name] = await db.table(name).toArray();
			}
			const payload = {
				app: "pocketflow",
				version: 1,
				exportedAt: new Date().toISOString(),
				tables,
			};
			const filename = `pocketflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
			const blob = new Blob([JSON.stringify(payload)], {
				type: "application/json",
			});
			const file = new File([blob], filename, { type: "application/json" });

			const canShare =
				typeof navigator.canShare === "function" &&
				navigator.canShare({ files: [file] });
			if (canShare) {
				await navigator.share({
					files: [file],
					title: "PocketFlow Backup",
					text: "PocketFlow data backup",
				});
			} else {
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = filename;
				link.click();
				URL.revokeObjectURL(url);
			}
			backupMessage.value = "Backup saved";
		} catch (err) {
			if ((err as Error)?.name === "AbortError") {
				backupMessage.value = "";
			} else {
				backupError.value = "Could not save backup. Try again.";
			}
		} finally {
			backupBusy.value = false;
		}
	}

	function openImportPicker() {
		backupError.value = "";
		backupMessage.value = "";
		importFileInputRef.value?.click();
	}

	function onImportFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		input.value = "";
		if (!file) return;
		pendingImportFile.value = file;
		showImportModal.value = true;
	}

	function closeImportModal() {
		showImportModal.value = false;
		pendingImportFile.value = null;
		importing.value = false;
	}

	async function confirmImport() {
		const file = pendingImportFile.value;
		if (!file || importing.value) return;
		importing.value = true;
		backupError.value = "";
		backupMessage.value = "";
		try {
			const parsed = JSON.parse(await file.text()) as {
				app?: string;
				tables?: Record<string, unknown[]>;
			};
			if (parsed.app !== "pocketflow" || !parsed.tables) {
				backupError.value = "Invalid PocketFlow backup file.";
				closeImportModal();
				return;
			}

			await db.transaction("rw", [...BACKUP_TABLES], async () => {
				for (const name of BACKUP_TABLES) {
					await db.table(name).clear();
					const rows = parsed.tables?.[name];
					if (Array.isArray(rows) && rows.length) {
						await db.table(name).bulkPut(rows);
					}
				}
			});

			backupMessage.value = "Backup imported";
			closeImportModal();
		} catch {
			backupError.value = "Could not import backup. Check the file and try again.";
			closeImportModal();
		}
	}

	function logout() {
		setSessionUnlocked(false);
		router.push("/lock");
	}
</script>

<template>
	<div class="page-shell">
		<header class="page-header mt-[-1rem]">
			<button
				type="button"
				class="back-btn"
				aria-label="Back"
				@click="router.push('/me')"
			>
				<ArrowLeftIcon class="h-5 w-5" />
			</button>
			<h1 class="page-title">Account</h1>
			<span class="header-spacer" />
		</header>

		<GlassContainer class="account-card">
			<p class="card-label">Account</p>

			<button type="button" class="account-row" @click="openModal('name')">
				<span class="icon-box icon-box-name">
					<PencilSquareIcon class="row-icon" />
				</span>
				<span class="row-label">Change Name</span>
				<ChevronRightIcon class="row-chevron" />
			</button>

			<button type="button" class="account-row" @click="openModal('password')">
				<span class="icon-box icon-box-key">
					<KeyIcon class="row-icon" />
				</span>
				<span class="row-label">{{ hasPin ? "Change PIN" : "Set PIN" }}</span>
				<ChevronRightIcon class="row-chevron" />
			</button>

			<div class="account-row toggle-row">
				<span class="icon-box icon-box-face">
					<FingerPrintIcon class="row-icon" />
				</span>
				<span class="row-label">Enable Face ID</span>
				<ToggleSwitch v-model="useBiometric" @change="onBiometricChange" />
			</div>
			<p v-if="biometricError" class="error row-error">{{ biometricError }}</p>

			<button
				type="button"
				class="account-row"
				:disabled="backupBusy"
				@click="exportBackup"
			>
				<span class="icon-box icon-box-backup">
					<ArrowDownTrayIcon class="row-icon" />
				</span>
				<span class="row-label">{{
					backupBusy ? "Backing up..." : "Backup data"
				}}</span>
				<ChevronRightIcon class="row-chevron" />
			</button>

			<button type="button" class="account-row" @click="openImportPicker">
				<span class="icon-box icon-box-import">
					<ArrowUpTrayIcon class="row-icon" />
				</span>
				<span class="row-label">Import backup</span>
				<ChevronRightIcon class="row-chevron" />
			</button>
			<input
				ref="importFileInputRef"
				type="file"
				class="hidden-file"
				accept="application/json,.json"
				@change="onImportFileChange"
			/>
			<p v-if="backupMessage" class="backup-status">{{ backupMessage }}</p>
			<p v-if="backupError" class="error row-error">{{ backupError }}</p>

			<button type="button" class="account-row logout" @click="logout">
				<span class="icon-box icon-box-logout">
					<ArrowRightOnRectangleIcon class="row-icon" />
				</span>
				<span class="row-label">Log out</span>
			</button>

			<button type="button" class="account-row logout" @click="openDeleteModal">
				<span class="icon-box icon-box-logout">
					<TrashIcon class="row-icon" />
				</span>
				<span class="row-label">Delete all records</span>
			</button>
		</GlassContainer>

		<p class="app-version">App version: 1.4.0</p>

		<Teleport to="body">
			<div v-if="activeModal" class="modal-overlay" @click.self="closeModal">
				<GlassContainer class="modal">
					<h2 class="modal-title">
						{{
							activeModal === "name"
								? "Change Name"
								: hasPin
									? "Change PIN"
									: "Set PIN"
						}}
					</h2>

					<template v-if="activeModal === 'name'">
						<InputField
							v-model="newName"
							label="Display Name"
							placeholder="Your name"
						/>
					</template>

					<template v-else>
						<InputField
							v-if="hasPin"
							v-model="currentPin"
							label="Current PIN"
							mode="number"
							placeholder="•••••"
						/>
						<InputField
							v-model="newPin"
							label="New PIN"
							mode="number"
							placeholder="•••••"
						/>
						<InputField
							v-model="confirmPin"
							label="Confirm PIN"
							mode="number"
							placeholder="•••••"
						/>
					</template>

					<p v-if="formError" class="error">{{ formError }}</p>

					<div class="modal-actions">
						<Button block @click="closeModal">Cancel</Button>
						<Button
							variant="primary"
							block
							@click="activeModal === 'name' ? saveName() : savePassword()"
						>
							Save
						</Button>
					</div>
				</GlassContainer>
			</div>
		</Teleport>

		<Teleport to="body">
			<div
				v-if="showDeleteModal"
				class="modal-overlay"
				@click.self="closeDeleteModal"
			>
				<GlassContainer class="modal">
					<h2 class="modal-title">Delete All Records</h2>
					<p class="modal-text">
						This permanently deletes all your entered records — cutoffs, budget
						amounts, expenses, and bills. Your account and saved items are kept. This
						cannot be undone.
					</p>

					<button
						v-if="useBiometric"
						type="button"
						class="bio-btn"
						aria-label="Confirm with Face ID"
						:disabled="deleting"
						@click="confirmDeleteFaceId"
					>
						<ViewfinderCircleIcon class="bio-btn-icon" />
					</button>

					<template v-if="hasPin && showDeletePin">
						<div
							class="pin-row"
							:class="{ 'pin-row-error': !!deleteError }"
							@click="deletePinInputRef?.focus()"
						>
							<span
								v-for="(digit, i) in deletePinDigits"
								:key="'delete-pin-' + i"
								class="pin-dot"
								:class="{ filled: !!digit }"
							/>
							<input
								ref="deletePinInputRef"
								:value="deletePin"
								type="text"
								inputmode="numeric"
								maxlength="5"
								class="pin-input-hidden"
								@input="onDeletePinInput"
							/>
						</div>
					</template>

					<Button
						v-if="hasPin && useBiometric && !showDeletePin"
						block
						@click="showDeletePin = true"
					>
						Use PIN instead
					</Button>

					<p v-if="deleteError" class="error">{{ deleteError }}</p>

					<div class="modal-actions">
						<Button block variant="shade" @click="closeDeleteModal">Cancel</Button>
						<Button
							v-if="hasPin && showDeletePin"
							block
							variant="danger"
							:disabled="deleting || deletePin.length !== 5"
							@click="confirmDeletePin"
						>
							Delete
						</Button>
					</div>
				</GlassContainer>
			</div>

			<div
				v-if="showImportModal"
				class="modal-overlay"
				@click.self="closeImportModal"
			>
				<GlassContainer class="modal">
					<h2 class="modal-title">Import Backup</h2>
					<p class="modal-text">
						This replaces all budget data with the backup. Your account profile stays
						the same.
					</p>
					<div class="modal-actions">
						<Button block variant="shade" @click="closeImportModal">Cancel</Button>
						<Button block :disabled="importing" @click="confirmImport">
							{{ importing ? "Importing..." : "Import" }}
						</Button>
					</div>
				</GlassContainer>
			</div>
		</Teleport>
	</div>
</template>

<style scoped>
	.page-shell {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		gap: 1rem;
		padding-top: 1rem;
		max-width: 480px;
		width: 100%;
	}

	.page-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.7rem;
		border: 1px solid var(--color-inputBorder);
		border-radius: 9999px;
		background: transparent;
		color: var(--color-textPrimary);
		cursor: pointer;
		flex-shrink: 0;
	}

	.back-btn:hover {
		background: var(--color-surfaceHover);
	}

	.page-title {
		flex: 1;
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		text-align: center;
		color: var(--color-textPrimary);
	}

	.header-spacer {
		width: 2rem;
	}

	.account-card {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.app-version {
		margin: auto 0 1rem;
		text-align: center;
		font-size: 0.75rem;
		color: var(--color-textSecondary);
	}

	.card-label {
		margin: 0 0 0.75rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.account-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.875rem 0;
		border: none;
		border-top: 1px solid var(--color-inputBorder);
		background: transparent;
		color: var(--color-textPrimary);
		font-size: 0.95rem;
		font-family: inherit;
		cursor: pointer;
		text-align: left;
	}

	.account-row:first-of-type {
		border-top: none;
		padding-top: 0;
	}

	.toggle-row {
		cursor: default;
	}

	.icon-box {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.5rem;
		flex-shrink: 0;
	}

	.icon-box-name {
		background: var(--color-surfaceHover);
	}

	.icon-box-name .row-icon {
		color: var(--color-textPrimary);
	}

	.icon-box-key {
		background: rgba(234, 179, 8, 0.15);
	}

	.icon-box-key .row-icon {
		color: #eab308;
	}

	.icon-box-face {
		background: rgba(52, 199, 89, 0.15);
	}

	.icon-box-face .row-icon {
		color: #34c759;
	}

	.icon-box-backup {
		background: var(--color-accentBg);
	}

	.icon-box-backup .row-icon {
		color: var(--color-accentSolid);
	}

	.icon-box-import {
		background: rgba(96, 165, 250, 0.15);
	}

	.icon-box-import .row-icon {
		color: #60a5fa;
	}

	.icon-box-logout {
		background: rgba(248, 113, 113, 0.15);
	}

	.icon-box-logout .row-icon {
		color: #f87171;
	}

	.hidden-file {
		display: none;
	}

	.backup-status {
		margin: 0.35rem 0 0;
		font-size: 0.8rem;
		color: var(--color-textSecondary);
	}

	.account-row:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.row-icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.row-label {
		flex: 1;
	}

	.row-chevron {
		width: 1rem;
		height: 1rem;
		color: var(--color-textSecondary);
	}

	.logout {
		color: #f87171;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: var(--color-overlay);
	}

	.modal {
		width: 100%;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.modal-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-textPrimary);
		text-align: center;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
	}

	.modal-text {
		margin: 0;
		font-size: 0.875rem;
		text-align: center;
		color: var(--color-textSecondary);
	}

	.bio-btn {
		align-self: center;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 5rem;
		height: 5rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		background: transparent;
		color: var(--color-textPrimary);
		cursor: pointer;
	}

	.bio-btn-icon {
		width: 2.5rem;
		height: 2.5rem;
	}

	.bio-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pin-row {
		position: relative;
		display: flex;
		justify-content: center;
		gap: 1.25rem;
		padding: 1.5rem 0;
		cursor: text;
	}

	.pin-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-inputBorder);
		transition: background 0.15s ease;
	}

	.pin-dot.filled {
		background: var(--gradient-fill);
	}

	:global(.dark) .pin-dot.filled {
		background: var(--color-textPrimary);
	}

	.pin-row-error .pin-dot.filled {
		background: #f87171;
	}

	.pin-input-hidden {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
		border: 0;
		padding: 0;
	}

	.error {
		margin: 0;
		color: #f87171;
		font-size: 0.875rem;
		text-align: center;
	}

	.row-error {
		padding-bottom: 0.5rem;
	}
</style>
