<script setup lang="ts">
	import { computed, nextTick, onMounted, ref, watch } from "vue";
	import { useRouter } from "vue-router";
	import Button from "../../components/button/Button.vue";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import InputField from "../../components/inputs/InputField.vue";
	import ToggleSwitch from "../../components/inputs/ToggleSwitch.vue";
	import { db, setSessionUnlocked } from "../../db/budgetDb";
	import { hashPin } from "../../utils/pinHash";
	import {
		canUseBiometric,
		registerBiometric,
	} from "../../utils/biometric";

	const router = useRouter();

	const step = ref(1);
	const displayName = ref("");
	const photoUrl = ref("");
	const pinHashValue = ref("");
	const useBiometric = ref(false);
	const biometricAvailable = ref(false);
	const pinDigits = ref(["", "", "", "", ""]);
	const confirmPinDigits = ref(["", "", "", "", ""]);
	const pinError = ref(false);
	const authError = ref("");
	const saving = ref(false);

	const pinInputRef = ref<HTMLInputElement | null>(null);
	const confirmInputRef = ref<HTMLInputElement | null>(null);

	const pin = computed(() => pinDigits.value.join(""));
	const confirmPin = computed(() => confirmPinDigits.value.join(""));

	const canNextStep1 = computed(() => displayName.value.trim().length >= 2);
	const canNextStep4 = computed(() => pin.value.length === 5);
	const canNextStep5 = computed(() => confirmPin.value.length === 5);

	onMounted(async () => {
		biometricAvailable.value = await canUseBiometric();
		useBiometric.value = biometricAvailable.value;
	});

	watch(step, async (value) => {
		await nextTick();
		if (value === 4) pinInputRef.value?.focus();
		if (value === 5) confirmInputRef.value?.focus();
	});

	function onPhotoPick(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			photoUrl.value = reader.result as string;
		};
		reader.readAsDataURL(file);
	}

	function onPinInput(event: Event) {
		const el = event.target as HTMLInputElement;
		const value = el.value.replace(/\D/g, "").slice(0, 5);
		el.value = value;
		for (let i = 0; i < 5; i++) {
			pinDigits.value[i] = value[i] ?? "";
		}
	}

	function onConfirmInput(event: Event) {
		const el = event.target as HTMLInputElement;
		const value = el.value.replace(/\D/g, "").slice(0, 5);
		el.value = value;
		pinError.value = false;
		for (let i = 0; i < 5; i++) {
			confirmPinDigits.value[i] = value[i] ?? "";
		}
	}

	function goToConfirmPin() {
		confirmPinDigits.value = ["", "", "", "", ""];
		pinError.value = false;
		step.value = 5;
	}

	async function skipPinAndFinish() {
		pinHashValue.value = "";
		await finish();
	}

	async function nextFromStep5() {
		if (pinError.value) {
			pinDigits.value = ["", "", "", "", ""];
			confirmPinDigits.value = ["", "", "", "", ""];
			pinError.value = false;
			step.value = 4;
			return;
		}
		if (pin.value !== confirmPin.value) {
			pinError.value = true;
			return;
		}
		pinError.value = false;
		pinHashValue.value = await hashPin(pin.value);
		await finish();
	}

	async function finish() {
		if (saving.value) return;
		authError.value = "";

		if (!useBiometric.value && !pinHashValue.value) {
			authError.value = "Enable Face ID or set a PIN to continue";
			return;
		}

		saving.value = true;

		let biometric = useBiometric.value;
		let credentialId: string | undefined;

		if (biometric) {
			const available = await canUseBiometric();
			if (!available) {
				biometric = false;
			} else {
				const id = await registerBiometric();
				if (!id) {
					biometric = false;
				} else {
					credentialId = id;
				}
			}
		}

		if (!biometric && !pinHashValue.value) {
			authError.value =
				"Face ID setup failed. Enable Face ID or set a PIN to continue";
			saving.value = false;
			return;
		}

		const now = new Date().toISOString();
		await db.userProfiles.put({
			id: 1,
			displayName: displayName.value.trim(),
			photoUrl: photoUrl.value || undefined,
			pinHash: pinHashValue.value,
			useBiometric: biometric,
			biometricCredentialId: credentialId,
			lockEnabled: true,
			onboardingCompleted: true,
			createdAt: now,
			updatedAt: now,
		});

		setSessionUnlocked(true);
		router.push("/dashboard");
	}
</script>

<template>
	<div class="page-shell">
		<GlassContainer class="page">
			<div v-if="step === 1" class="step">
				<h1 class="title">App Display Name</h1>
				<p class="subtitle">What should we call you?</p>
				<InputField
					v-model="displayName"
					label="Display Name"
					placeholder="Your name"
				/>
				<Button
					variant="primary"
					class="w-full"
					:disabled="!canNextStep1"
					@click="step = 2"
				>
					Next
				</Button>
			</div>

			<div v-else-if="step === 2" class="step">
				<h1 class="title">Profile Image</h1>
				<p class="subtitle">Add a photo (optional)</p>
				<div class="photo-wrap">
					<img v-if="photoUrl" :src="photoUrl" alt="Profile" class="photo" />
					<div v-else class="photo-placeholder">No photo</div>
				</div>
				<label class="file-btn">
					Choose image
					<input type="file" accept="image/*" hidden @change="onPhotoPick" />
				</label>
				<div class="actions">
					<Button block @click="step = 1">Back</Button>
					<Button variant="primary" block @click="step = 3">Next</Button>
				</div>
			</div>

			<div v-else-if="step === 3" class="step">
				<h1 class="title">Face ID</h1>
				<p class="subtitle">Primary unlock method for this device</p>
				<label class="toggle-row">
					<span>Enable Face ID</span>
					<ToggleSwitch
						v-model="useBiometric"
						:disabled="!biometricAvailable"
					/>
				</label>
				<p v-if="!biometricAvailable" class="hint">
					Face ID is not available in this browser. You can set a PIN next.
				</p>
				<p v-if="authError" class="error">{{ authError }}</p>
				<div class="actions">
					<Button block @click="step = 2">Back</Button>
					<Button variant="primary" block @click="step = 4">Next</Button>
				</div>
			</div>

			<div v-else-if="step === 4" class="step">
				<h1 class="title">PIN Code</h1>
				<p class="subtitle">Optional backup if Face ID is unavailable</p>
				<div class="pin-row" @click="pinInputRef?.focus()">
					<span
						v-for="(digit, i) in pinDigits"
						:key="'pin-' + i"
						class="pin-dot"
						:class="{ filled: !!digit }"
					/>
					<input
						ref="pinInputRef"
						:value="pin"
						type="text"
						inputmode="numeric"
						maxlength="5"
						class="pin-input-hidden"
						@input="onPinInput"
					/>
				</div>
				<p v-if="authError" class="error">{{ authError }}</p>
				<div class="actions">
					<Button block @click="step = 3">Back</Button>
					<Button block :disabled="saving" @click="skipPinAndFinish">
						Skip
					</Button>
					<Button
						variant="primary"
						block
						:disabled="!canNextStep4"
						@click="goToConfirmPin"
					>
						Next
					</Button>
				</div>
			</div>

			<div v-else class="step">
				<h1 class="title">Confirm PIN</h1>
				<p class="subtitle">Re-enter your 5-digit PIN</p>
				<div
					class="pin-row"
					:class="{ 'pin-row-error': pinError }"
					@click="confirmInputRef?.focus()"
				>
					<span
						v-for="(digit, i) in confirmPinDigits"
						:key="'confirm-' + i"
						class="pin-dot"
						:class="{ filled: !!digit }"
					/>
					<input
						ref="confirmInputRef"
						:value="confirmPin"
						type="text"
						inputmode="numeric"
						maxlength="5"
						class="pin-input-hidden"
						@input="onConfirmInput"
					/>
				</div>
				<p v-if="pinError" class="error">
					The PIN you entered does not match. Please try again.
				</p>
				<p v-if="authError" class="error">{{ authError }}</p>
				<div class="actions">
					<Button block @click="step = 4">Back</Button>
					<Button
						variant="primary"
						block
						:disabled="!canNextStep5 || saving"
						@click="nextFromStep5"
					>
						{{ pinError ? "Try Again" : "Finish" }}
					</Button>
				</div>
			</div>
		</GlassContainer>

		<div class="progress">
			<div v-for="i in 5" :key="i" class="pill" :class="{ active: step >= i }" />
		</div>
	</div>
</template>

<style scoped>
	.page-shell {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		padding: 1rem 0;
	}

	.progress {
		display: flex;
		gap: 0.5rem;
		width: 50%;
		max-width: 480px;
	}

	.pill {
		flex: 1;
		height: 4px;
		border-radius: 9999px;
		background: var(--color-inputBorder);
		transition: background 0.2s;
	}

	.pill.active {
		background: var(--gradient-fill);
	}

	:global(.dark) .pill.active {
		background: var(--color-textPrimary);
	}

	.page {
		max-width: 480px;
		width: 100%;
	}

	.step {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.title {
		font-size: clamp(1.25rem, 5vw, 1.75rem);
		margin: 0;
		color: var(--color-textPrimary);
		text-align: center;
	}

	.subtitle {
		margin: 0;
		color: var(--color-textSecondary);
		font-size: 0.95rem;
		text-align: center;
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

	.photo-wrap {
		display: flex;
		justify-content: center;
	}

	.photo,
	.photo-placeholder {
		width: 96px;
		height: 96px;
		border-radius: 9999px;
		object-fit: cover;
	}

	.photo-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px dashed var(--color-inputBorder);
		color: var(--color-textSecondary);
		font-size: 0.875rem;
	}

	.file-btn {
		display: inline-flex;
		align-self: center;
		padding: 0.625rem 1.25rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		color: var(--color-textPrimary);
		cursor: pointer;
		font-size: 0.95rem;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.25rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		color: var(--color-textPrimary);
	}

	.hint {
		margin: 0;
		color: var(--color-textSecondary);
		font-size: 0.875rem;
		text-align: center;
	}

	.error {
		margin: 0;
		color: #f87171;
		font-size: 0.875rem;
		text-align: center;
	}
</style>
