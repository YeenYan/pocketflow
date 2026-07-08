<script setup lang="ts">
	import { computed } from "vue";
	import { MinusIcon, PlusIcon } from "@heroicons/vue/24/outline";
	import Button from "../../../../components/button/Button.vue";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";
	import AmountField from "../../../../components/inputs/AmountField.vue";
	import SelectField from "../../../../components/inputs/SelectField.vue";
	import Divider from "../../../../components/divider/Divider.vue";

	defineProps<{
		show: boolean;
		isEditing: boolean;
		error: string;
		options: { value: string; label: string }[];
		canSave: boolean;
	}>();

	const emit = defineEmits<{
		close: [];
		save: [];
	}>();

	const amount = defineModel<string>("amount", { default: "" });
	const name = defineModel<string>("name", { default: "" });
	const date = defineModel<string>("date", { default: "" });
	const percents = defineModel<{ name: string; percent: number }[]>("percents", {
		default: () => [],
	});

	const percentTotal = computed(() =>
		percents.value.reduce((sum, rule) => sum + (Number(rule.percent) || 0), 0),
	);

	function ruleAmount(percent: number) {
		const value = Number(amount.value) * ((Number(percent) || 0) / 100);
		return `₱${value.toLocaleString("en-PH")}`;
	}

	function decreasePercent(rule: { percent: number }) {
		rule.percent = Math.max(0, (Number(rule.percent) || 0) - 5);
	}

	function increasePercent(rule: { percent: number }) {
		rule.percent = Math.min(100, (Number(rule.percent) || 0) + 5);
	}
</script>

<template>
	<Teleport to="body">
		<div
			v-if="show"
			class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-overlay p-4"
			@click.self="emit('close')"
		>
			<GlassContainer
				class="flex w-full min-w-0 max-w-[400px] max-h-[calc(100vh-2rem)] flex-col gap-4 overflow-y-auto"
			>
				<h2 class="m-0 text-center text-lg font-semibold text-textPrimary">
					{{ isEditing ? "Edit Cutoff" : "Add Cutoff" }}
				</h2>

				<AmountField v-model="amount" label="Cutoff Amount" placeholder="0.00" />
				<SelectField
					v-model="name"
					label="Name"
					:options="options"
					placeholder="Select cutoff"
				/>
				<label class="flex w-full min-w-0 flex-col gap-2 overflow-hidden">
					<span class="text-base text-textPrimary">Date</span>
					<input v-model="date" type="date" class="field-input field-input-date" />
				</label>

				<Divider margin-top="0.25rem" margin-bottom="0.25rem" />

				<div class="flex flex-col gap-3">
					<div
						v-for="rule in percents"
						:key="rule.name"
						class="rule-row"
					>
						<div class="rule-row-top">
							<span class="text-sm text-textPrimary">{{ rule.name }}</span>
							<div class="flex items-center gap-3">
								<span class="text-sm text-textSecondary">
									{{ ruleAmount(rule.percent) }}
								</span>
								<div class="pct-stepper">
									<button
										type="button"
										class="pct-stepper-btn"
										@click="decreasePercent(rule)"
									>
										<MinusIcon class="pct-stepper-icon" />
									</button>
									<span class="pct-stepper-value">{{ rule.percent }}</span>
									<button
										type="button"
										class="pct-stepper-btn"
										@click="increasePercent(rule)"
									>
										<PlusIcon class="pct-stepper-icon" />
									</button>
								</div>
							</div>
						</div>
						<input
							v-model.number="rule.percent"
							type="range"
							min="0"
							max="100"
							step="5"
							class="pct-slider"
						/>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm font-semibold text-textPrimary">Total</span>
						<span
							class="text-sm font-semibold"
							:class="percentTotal === 100 ? 'text-textPrimary' : 'text-[#f87171]'"
						>
							{{ percentTotal }}%
						</span>
					</div>
				</div>

				<p v-if="error" class="m-0 text-center text-sm text-[#f87171]">
					{{ error }}
				</p>

				<div class="flex gap-3">
					<Button block @click="emit('close')">Cancel</Button>
					<Button variant="primary" block :disabled="!canSave" @click="emit('save')">
						{{ isEditing ? "Update" : "Save" }}
					</Button>
				</div>
			</GlassContainer>
		</div>
	</Teleport>
</template>

<style scoped>
	.field-input {
		width: 100%;
		min-width: 0;
		max-width: 100%;
		box-sizing: border-box;
		padding: 0.875rem 1.25rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		background: transparent;
		color: var(--color-inputText);
		font-size: 1rem;
		font-family: inherit;
		outline: none;
	}

	.field-input-date {
		display: block;
		-webkit-min-logical-width: 0;
	}

	.field-input-date::-webkit-date-and-time-value {
		min-width: 0;
		text-align: left;
	}

	.field-input:focus {
		border-color: var(--color-textSecondary);
	}

	.rule-row {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.rule-row-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.pct-stepper {
		display: flex;
		align-items: center;
		overflow: hidden;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		background: rgb(255 255 255 / 0.04);
		touch-action: manipulation;
	}

	.pct-stepper-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border: none;
		background: transparent;
		color: var(--color-inputText);
		cursor: pointer;
		touch-action: manipulation;
	}

	.pct-stepper-value {
		min-width: 2.5rem;
		text-align: center;
		color: var(--color-textPrimary);
		font-size: 1rem;
		font-weight: 600;
	}

	.pct-stepper-icon {
		width: 1.1rem;
		height: 1.1rem;
	}

	.pct-slider {
		width: 100%;
		margin: 0;
		accent-color: var(--color-textPrimary);
		touch-action: manipulation;
	}

	.pct-slider:focus {
		outline: none;
	}

	.pct-slider::-webkit-slider-runnable-track {
		height: 0.25rem;
		border-radius: 9999px;
		background: var(--color-inputBorder);
	}

	.pct-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 1.2rem;
		height: 1.2rem;
		margin-top: -0.475rem;
		border: none;
		border-radius: 9999px;
		background: var(--color-textPrimary);
	}

	.pct-slider::-moz-range-track {
		height: 0.25rem;
		border: none;
		border-radius: 9999px;
		background: var(--color-inputBorder);
	}

	.pct-slider::-moz-range-thumb {
		width: 1.2rem;
		height: 1.2rem;
		border: none;
		border-radius: 9999px;
		background: var(--color-textPrimary);
	}
</style>
