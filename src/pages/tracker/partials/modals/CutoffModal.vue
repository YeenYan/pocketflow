<script setup lang="ts">
	import { computed } from "vue";
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
	const percents = defineModel<{ name: string; percent: number }[]>(
		"percents",
		{ default: () => [] },
	);

	const percentTotal = computed(() =>
		percents.value.reduce((sum, rule) => sum + (Number(rule.percent) || 0), 0),
	);

	function ruleAmount(percent: number) {
		const value = Number(amount.value) * ((Number(percent) || 0) / 100);
		return `₱${value.toLocaleString("en-PH")}`;
	}
</script>

<template>
	<Teleport to="body">
		<div
			v-if="show"
			class="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
			@click.self="emit('close')"
		>
			<GlassContainer
				class="flex w-full min-w-0 max-w-[400px] flex-col gap-4 overflow-hidden"
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
						class="flex items-center justify-between gap-3"
					>
						<span class="text-sm text-textPrimary">{{ rule.name }}</span>
						<div class="flex items-center gap-3">
							<span class="text-sm text-textSecondary">
								{{ ruleAmount(rule.percent) }}
							</span>
							<div class="pct-input-wrap">
								<input
									v-model.number="rule.percent"
									type="number"
									min="0"
									max="100"
									class="pct-input"
								/>
								<span class="pct-sign">%</span>
							</div>
						</div>
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

	.pct-input-wrap {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.4rem 0.75rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
	}

	.pct-input {
		width: 3rem;
		border: none;
		background: transparent;
		color: var(--color-inputText);
		font-size: 0.95rem;
		font-family: inherit;
		text-align: right;
		outline: none;
	}

	.pct-input::-webkit-outer-spin-button,
	.pct-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.pct-sign {
		color: var(--color-textSecondary);
		font-size: 0.95rem;
	}
</style>
