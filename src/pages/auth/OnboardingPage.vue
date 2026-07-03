<script setup lang="ts">
	import { computed, ref, watch } from "vue";
	import { useRouter } from "vue-router";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import InputField from "../../components/inputs/InputField.vue";
	import { db, setSessionUnlocked } from "../../db/budgetDb";
	import { hashPin } from "../../utils/pinHash";
	import { canUseBiometric, unlockWithBiometric } from "../../utils/biometric";

	const router = useRouter();

	const step = ref(1);
	const displayName = ref("");
	const photoUrl = ref("");
	const pinHashValue = ref("");
	const useBiometric = ref(false);
	const pin = ref("");
	const confirmPin = ref("");
	const pinError = ref("");
	const saving = ref(false);

	watch(pin, (v) => {
		if (v.length > 5) pin.value = v.slice(0, 5);
	});

	watch(confirmPin, (v) => {
		if (v.length > 5) confirmPin.value = v.slice(0, 5);
	});

	const canNextStep1 = computed(() => displayName.value.trim().length >= 2);
	const canNextStep3 = computed(
		() => pin.value.length === 5 && confirmPin.value.length === 5,
	);

	function onPhotoPick(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			photoUrl.value = reader.result as string;
		};
		reader.readAsDataURL(file);
	}

	async function nextFromStep3() {
		if (pin.value !== confirmPin.value) {
			pinError.value = "PINs do not match";
			return;
		}
		pinError.value = "";
		pinHashValue.value = await hashPin(pin.value);
		step.value = 4;
	}

	async function finish() {
		if (saving.value) return;
		saving.value = true;

		let biometric = useBiometric.value;
		if (biometric) {
			const available = await canUseBiometric();
			if (!available) {
				biometric = false;
			} else {
				const ok = await unlockWithBiometric();
				if (!ok) biometric = false;
			}
		}

		const now = new Date().toISOString();
		await db.userProfiles.put({
			id: 1,
			displayName: displayName.value.trim(),
			photoUrl: photoUrl.value || undefined,
			pinHash: pinHashValue.value,
			useBiometric: biometric,
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
				<button
					type="button"
					class="btn primary"
					:disabled="!canNextStep1"
					@click="step = 2"
				>
					Next
				</button>
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
					<button type="button" class="btn" @click="step = 1">Back</button>
					<button type="button" class="btn primary" @click="step = 3">Next</button>
				</div>
			</div>

			<div v-else-if="step === 3" class="step">
				<h1 class="title">PIN Code</h1>
				<p class="subtitle">Create a 5-digit PIN</p>
				<InputField
					v-model="pin"
					label="Enter PIN"
					mode="number"
					placeholder="•••••"
				/>
				<InputField
					v-model="confirmPin"
					label="Confirm PIN"
					mode="number"
					placeholder="•••••"
				/>
				<p v-if="pinError" class="error">{{ pinError }}</p>
				<div class="actions">
					<button type="button" class="btn" @click="step = 2">Back</button>
					<button
						type="button"
						class="btn primary"
						:disabled="!canNextStep3"
						@click="nextFromStep3"
					>
						Next
					</button>
				</div>
			</div>

			<div v-else class="step">
				<h1 class="title">Face ID</h1>
				<p class="subtitle">Unlock faster with biometrics (optional)</p>
				<label class="toggle-row">
					<span>Enable Face ID</span>
					<input v-model="useBiometric" type="checkbox" class="toggle" />
				</label>
				<div class="actions">
					<button type="button" class="btn" @click="step = 3">Back</button>
					<button
						type="button"
						class="btn primary"
						:disabled="saving"
						@click="finish"
					>
						Finish
					</button>
				</div>
			</div>
		</GlassContainer>

		<div class="progress">
			<div v-for="i in 4" :key="i" class="pill" :class="{ active: step >= i }" />
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
		width: 100%;
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
	}

	.subtitle {
		margin: 0;
		color: var(--color-textSecondary);
		font-size: 0.95rem;
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

	.btn {
		flex: 1;
		padding: 0.875rem 1.25rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		background: transparent;
		color: var(--color-textPrimary);
		font-size: 1rem;
		font-family: inherit;
		cursor: pointer;
	}

	.btn.primary {
		border-color: transparent;
		background: var(--color-textPrimary);
		color: var(--color-bg);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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

	.toggle {
		width: 1.25rem;
		height: 1.25rem;
	}

	.error {
		margin: 0;
		color: #f87171;
		font-size: 0.875rem;
	}
</style>
