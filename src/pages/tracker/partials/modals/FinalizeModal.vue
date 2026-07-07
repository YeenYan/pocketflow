<script setup lang="ts">
	import { computed, nextTick, ref, watch } from "vue";
	import {
		ViewfinderCircleIcon,
		CheckIcon,
		XMarkIcon,
	} from "@heroicons/vue/24/outline";
	import Button from "../../../../components/button/Button.vue";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";
	import { db } from "../../../../db/budgetDb";
	import { verifyPin } from "../../../../utils/pinHash";
	import { unlockWithBiometric } from "../../../../utils/biometric";
	import Divider from "../../../../components/divider/Divider.vue";

	defineProps<{
		message: string;
		allotted: string;
		excess: string;
		excessPercent: number;
		summary: { name: string; pass: boolean; percent: number; amount: string }[];
	}>();

	const open = defineModel<boolean>("open", { default: false });

	const emit = defineEmits<{
		confirmed: [];
	}>();

	const pinDigits = ref(["", "", "", "", ""]);
	const pinInputRef = ref<HTMLInputElement | null>(null);
	const pinError = ref("");
	const hasPin = ref(false);
	const useBiometric = ref(false);
	const credentialId = ref("");
	const unlocking = ref(false);
	const showPin = ref(false);

	const pin = computed(() => pinDigits.value.join(""));

	watch(open, (value) => {
		if (value) {
			pinError.value = "";
			clearPin();
			loadAuthState();
		} else {
			pinError.value = "";
			clearPin();
		}
	});

	async function loadAuthState() {
		const profile = await db.userProfiles.get(1);
		hasPin.value = !!profile?.pinHash;
		useBiometric.value =
			!!profile?.useBiometric && !!profile?.biometricCredentialId;
		credentialId.value = profile?.biometricCredentialId || "";
		showPin.value = hasPin.value && !useBiometric.value;
		if (showPin.value) {
			await nextTick();
			pinInputRef.value?.focus();
		}
	}

	function clearPin() {
		pinDigits.value = ["", "", "", "", ""];
		if (pinInputRef.value) pinInputRef.value.value = "";
	}

	function onPinInput(event: Event) {
		const el = event.target as HTMLInputElement;
		const value = el.value.replace(/\D/g, "").slice(0, 5);
		el.value = value;
		pinError.value = "";
		for (let i = 0; i < 5; i++) {
			pinDigits.value[i] = value[i] ?? "";
		}
	}

	function close() {
		open.value = false;
	}

	async function confirmWithPin() {
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
		emit("confirmed");
		close();
	}

	async function confirmWithFaceId() {
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
		emit("confirmed");
		close();
	}
</script>

<template>
	<Teleport to="body">
		<div
			v-if="open"
			class="fixed inset-0 z-[80] flex items-center justify-center bg-overlay p-4"
			@click.self="close"
		>
			<GlassContainer class="flex w-full min-w-0 max-w-[400px] flex-col gap-4">
				<h2 class="m-0 text-center text-lg font-semibold text-textPrimary">
					Finalize Budget
				</h2>
				<p class="m-0 text-center text-sm text-textSecondary">
					{{ message }}
				</p>

				<div class="flex flex-col gap-2 text-sm">
					<div class="flex justify-between text-white">
						<span>Allotted budget</span>
						<span class="font-semibold text-textPrimary">{{ allotted }}</span>
					</div>
					<div class="flex justify-between text-white">
						<span>Overall excess</span>
						<span class="font-semibold text-progress-red">
							{{ excess }} ({{ excessPercent }}%)
						</span>
					</div>

					<Divider marginBottom="my-1" marginTop="mt-1" />

					<div
						v-for="row in summary"
						:key="row.name"
						class="flex items-center justify-between"
					>
						<div class="flex items-center gap-2">
							<div v-if="row.pass" class="bg-progress-green rounded-full p-1">
								<CheckIcon class="h-4 w-4 text-white" />
							</div>
							<div v-else class="bg-progress-red rounded-full p-1">
								<XMarkIcon class="h-4 w-4 text-white" />
							</div>
							<span class="text-white">{{ row.name }}</span>
						</div>
						<span
							class="flex items-center gap-1 font-semibold"
							:class="row.pass ? 'text-progress-green' : 'text-progress-red'"
						>
							<template v-if="row.name === 'Savings'">
								{{
									row.pass ? `+${row.percent}% excess` : `${row.percent}% more needed`
								}}
							</template>
							<template v-else>
								{{
									row.pass
										? `${row.amount} left (${row.percent}%)`
										: `${row.amount} excess (${row.percent}%)`
								}}
							</template>
						</span>
					</div>
				</div>

				<Divider marginBottom="my-1" marginTop="mt-1" />
				<button
					v-if="useBiometric"
					type="button"
					class="bio-btn"
					aria-label="Confirm with Face ID"
					:disabled="unlocking"
					@click="confirmWithFaceId"
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
							:key="'finalize-pin-' + i"
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
				</template>

				<Button
					v-if="hasPin && useBiometric && !showPin"
					class="w-full"
					@click="showPin = true"
				>
					Use PIN instead
				</Button>

				<p v-if="pinError" class="error">{{ pinError }}</p>

				<div class="flex gap-3">
					<Button block variant="shade" @click="close">Cancel</Button>
					<Button
						v-if="hasPin && showPin"
						block
						variant="primary"
						:disabled="pin.length !== 5"
						@click="confirmWithPin"
					>
						Confirm with PIN
					</Button>
				</div>
			</GlassContainer>
		</div>
	</Teleport>
</template>

<style scoped>
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
</style>
