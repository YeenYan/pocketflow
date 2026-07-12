<script setup lang="ts">
	import { computed, nextTick, onMounted, ref } from "vue";
	import { useRouter } from "vue-router";
	import { ViewfinderCircleIcon } from "@heroicons/vue/24/outline";
	import Button from "../../components/button/Button.vue";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import { db, setSessionUnlocked } from "../../db/budgetDb";
	import { verifyPin } from "../../utils/pinHash";
	import { unlockWithBiometric } from "../../utils/biometric";
	import poko from "../../assets/img/image_3.webp";

	const router = useRouter();

	const pinDigits = ref(["", "", "", "", ""]);
	const pinInputRef = ref<HTMLInputElement | null>(null);
	const pinError = ref("");
	const useBiometric = ref(false);
	const hasPin = ref(false);
	const credentialId = ref("");
	const displayName = ref("");
	const photoUrl = ref("");
	const unlocking = ref(false);
	const showPin = ref(false);

	const pin = computed(() => pinDigits.value.join(""));

	const welcomeTip = computed(() => {
		const name = displayName.value.trim();
		if (name) {
			return `Yay, ${name}! So glad you're back!! Welcome back. You can unlock with Face ID or enter your PIN.`;
		}
		return `Yay, you're back!! Welcome back. You can unlock with Face ID or enter your PIN.`;
	});

	onMounted(async () => {
		const profile = await db.userProfiles.get(1);
		if (!profile) return;
		displayName.value = profile.displayName;
		photoUrl.value = profile.photoUrl || "";
		useBiometric.value = profile.useBiometric && !!profile.biometricCredentialId;
		credentialId.value = profile.biometricCredentialId || "";
		hasPin.value = !!profile.pinHash;
		showPin.value = hasPin.value && !useBiometric.value;

		if (hasPin.value && showPin.value) {
			await nextTick();
			pinInputRef.value?.focus();
		}
	});

	function onPinInput(event: Event) {
		const el = event.target as HTMLInputElement;
		const value = el.value.replace(/\D/g, "").slice(0, 5);
		el.value = value;
		pinError.value = "";
		for (let i = 0; i < 5; i++) {
			pinDigits.value[i] = value[i] ?? "";
		}
	}

	function clearPin() {
		pinDigits.value = ["", "", "", "", ""];
		if (pinInputRef.value) pinInputRef.value.value = "";
	}

	async function unlockWithPin() {
		if (pin.value.length !== 5) {
			pinError.value = "Enter your 5-digit PIN";
			return;
		}

		const profile = await db.userProfiles.get(1);
		if (!profile?.pinHash) return;

		const ok = await verifyPin(pin.value, profile.pinHash);
		if (!ok) {
			pinError.value = "Wrong PIN";
			clearPin();
			pinInputRef.value?.focus();
			return;
		}

		pinError.value = "";
		setSessionUnlocked(true);
		router.push("/dashboard");
	}

	async function unlockWithFaceId() {
		if (unlocking.value || !credentialId.value) return;
		unlocking.value = true;
		pinError.value = "";
		const ok = await unlockWithBiometric(credentialId.value);
		unlocking.value = false;
		if (!ok) {
			if (hasPin.value) {
				showPin.value = true;
				pinError.value = "Face ID cancelled. Enter PIN or try again.";
				await nextTick();
				pinInputRef.value?.focus();
			} else {
				pinError.value = "Face ID failed. Try again.";
			}
			return;
		}

		setSessionUnlocked(true);
		router.push("/dashboard");
	}
</script>

<template>
	<div class="page-shell relative">
		<div class="absolute bottom-0 right-0 poko-wrap">
			<div class="lock-bubble">
				<p class="lock-bubble-name">Poko</p>
				<p class="lock-bubble-text">{{ welcomeTip }}</p>
			</div>
			<img :src="poko" alt="" class="max-w-[12rem]" />
		</div>

		<!-- <GlassContainer class="page h-[60dvh]"> </GlassContainer> -->
		<div class="w-[90%] flex flex-col items-center h-full pt-[8rem]">
			<div class="profile">
				<img v-if="photoUrl" :src="photoUrl" alt="" class="avatar" />
				<div v-else class="avatar placeholder">
					{{ displayName.charAt(0) || "?" }}
				</div>
				<p class="name">{{ displayName }}</p>
			</div>

			<!-- v-if="useBiometric" -->
			<button
				type="button"
				class="bio-btn"
				aria-label="Unlock with Face ID"
				:disabled="unlocking"
				@click="unlockWithFaceId"
			>
				<ViewfinderCircleIcon class="bio-btn-icon" />
			</button>

			<template v-if="hasPin && showPin">
				<div
					class="pin-row"
					:class="{ 'pin-row-error': !!pinError }"
					@click="pinInputRef?.focus()"
				>
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

				<Button
					:variant="useBiometric ? 'shade' : 'primary'"
					class="w-full max-w-[15rem]"
					:disabled="pin.length !== 5"
					@click="unlockWithPin"
				>
					Unlock with PIN
				</Button>
			</template>

			<Button
				v-if="hasPin && useBiometric && !showPin"
				class="w-full"
				@click="showPin = true"
			>
				Use PIN instead
			</Button>

			<p v-if="pinError" class="error">{{ pinError }}</p>
		</div>
	</div>
</template>

<style scoped>
	.page-shell {
		display: flex;
		flex: 1;
		min-height: 0;
		align-items: center;
		justify-content: center;
	}

	.page {
		max-width: 480px;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		text-align: center;
	}

	.profile {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.avatar {
		width: 72px;
		height: 72px;
		border-radius: 9999px;
		object-fit: cover;
	}

	.avatar.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-inputBorder);
		color: var(--color-textPrimary);
		font-size: 1.5rem;
		font-weight: 600;
	}

	.name {
		margin: 0;
		font-size: 1.125rem;
		color: var(--color-textPrimary);
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

	.poko-wrap {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.35rem;
		pointer-events: none;
		z-index: 2;
	}

	.lock-bubble {
		position: relative;
		max-width: 12.5rem;
		margin-right: 7.75rem;
		padding: 0.65rem 0.8rem;
		border-radius: 1rem;
		background: #ffd0b0;
		border: 1px solid color-mix(in srgb, #ffd0b0 70%, #000 8%);
		box-shadow: 0 1px 2px color-mix(in srgb, #000 8%, transparent);
		text-align: left;
	}

	.lock-bubble::after {
		content: "";
		position: absolute;
		right: 1.75rem;
		bottom: -0.35rem;
		width: 0.7rem;
		height: 0.7rem;
		background: #ffd0b0;
		border-right: 1px solid color-mix(in srgb, #ffd0b0 70%, #000 8%);
		border-bottom: 1px solid color-mix(in srgb, #ffd0b0 70%, #000 8%);
		transform: rotate(45deg);
	}

	.lock-bubble-name {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 700;
		color: #c2410c;
	}

	.lock-bubble-text {
		margin: 0.2rem 0 0;
		font-size: 0.75rem;
		line-height: 1.35;
		color: #1f2937;
	}
</style>
