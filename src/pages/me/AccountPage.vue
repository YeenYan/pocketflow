<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";
	import { useRouter } from "vue-router";
	import {
		ChevronRightIcon,
		PencilSquareIcon,
		KeyIcon,
		FingerPrintIcon,
		ArrowRightOnRectangleIcon,
	} from "@heroicons/vue/24/outline";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import InputField from "../../components/inputs/InputField.vue";
	import ToggleSwitch from "../../components/inputs/ToggleSwitch.vue";
	import { db, setSessionUnlocked } from "../../db/budgetDb";
	import { hashPin, verifyPin } from "../../utils/pinHash";
	import { canUseBiometric, registerBiometric } from "../../utils/biometric";

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

	function logout() {
		setSessionUnlocked(false);
		router.push("/lock");
	}
</script>

<template>
	<div class="page-shell">
		<header class="page-header">
			<button type="button" class="back-btn" @click="router.push('/me')">←</button>
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

			<button type="button" class="account-row logout" @click="logout">
				<span class="icon-box icon-box-logout">
					<ArrowRightOnRectangleIcon class="row-icon" />
				</span>
				<span class="row-label">Log out</span>
			</button>
		</GlassContainer>

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
						<button type="button" class="btn" @click="closeModal">Cancel</button>
						<button
							type="button"
							class="btn primary"
							@click="activeModal === 'name' ? saveName() : savePassword()"
						>
							Save
						</button>
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
		background: none;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		color: var(--color-textPrimary);
		border-radius: 6px;
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

	.icon-box-logout {
		background: rgba(248, 113, 113, 0.15);
	}

	.icon-box-logout .row-icon {
		color: #f87171;
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

	.btn {
		flex: 1;
		padding: 0.75rem 1.25rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		background: transparent;
		color: var(--color-textPrimary);
		font-size: 0.95rem;
		font-family: inherit;
		cursor: pointer;
	}

	.btn.primary {
		border-color: transparent;
		background: var(--color-textPrimary);
		color: var(--color-bg);
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
