<script setup lang="ts">
	import Button from "../../../../components/button/Button.vue";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";
	import AmountField from "../../../../components/inputs/AmountField.vue";
	import InputField from "../../../../components/inputs/InputField.vue";

	defineProps<{
		show: boolean;
		isEditing: boolean;
		error: string;
		canSave: boolean;
	}>();

	const emit = defineEmits<{
		close: [];
		save: [];
	}>();

	const name = defineModel<string>("name", { default: "" });
	const amount = defineModel<string>("amount", { default: "" });
	const date = defineModel<string>("date", { default: "" });
</script>

<template>
	<Teleport to="body">
		<div
			v-if="show"
			class="fixed inset-0 z-[70] flex items-center justify-center bg-overlay p-4"
			@click.self="emit('close')"
		>
			<GlassContainer class="flex w-full min-w-0 max-w-[400px] flex-col gap-4">
				<h2 class="m-0 text-center text-lg font-semibold text-textPrimary">
					{{ isEditing ? "Edit Sub Item" : "Add Sub Item" }}
				</h2>

				<InputField
					v-model="name"
					label="Name"
					placeholder="Sub item name"
					mode="both"
				/>

				<AmountField v-model="amount" label="Amount" placeholder="0.00" />

				<label class="flex w-full min-w-0 flex-col gap-2">
					<span class="text-base text-textPrimary">Date</span>
					<input v-model="date" type="date" class="field-input field-input-date" />
				</label>

				<p v-if="error" class="m-0 text-center text-sm text-[#f87171]">
					{{ error }}
				</p>

				<div class="flex gap-3">
					<Button block variant="shade" @click="emit('close')">Cancel</Button>
					<Button
						variant="primary"
						block
						:disabled="!canSave"
						@click="emit('save')"
					>
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
		background: var(--color-inputBg);
		color: var(--color-inputText);
		font-size: 1rem;
		font-family: inherit;
		outline: none;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.2);
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
