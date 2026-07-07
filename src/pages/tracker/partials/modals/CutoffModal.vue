<script setup lang="ts">
	import Button from "../../../../components/button/Button.vue";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";
	import AmountField from "../../../../components/inputs/AmountField.vue";
	import SelectField from "../../../../components/inputs/SelectField.vue";

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
</style>
