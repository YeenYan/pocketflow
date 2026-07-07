<script setup lang="ts">
	import Button from "../../../../components/button/Button.vue";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";
	import AmountField from "../../../../components/inputs/AmountField.vue";
	import SelectField from "../../../../components/inputs/SelectField.vue";

	defineProps<{
		show: boolean;
		error: string;
		options: { value: string; label: string }[];
		saving: boolean;
	}>();

	const emit = defineEmits<{
		close: [];
		save: [];
		createItem: [];
	}>();

	const itemId = defineModel<string>("itemId", { default: "" });
	const amount = defineModel<string>("amount", { default: "" });
</script>

<template>
	<Teleport to="body">
		<div
			v-if="show"
			class="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
			@click.self="emit('close')"
		>
			<GlassContainer class="flex w-full min-w-0 max-w-[400px] flex-col gap-6">
				<div class="flex items-center justify-between gap-3">
					<h2 class="m-0 text-center text-lg font-semibold text-textPrimary">
						Add Item
					</h2>
					<Button
						variant="secondary"
						size="sm"
						class="max-w-[11rem]"
						@click="emit('createItem')"
					>
						+ Create New Item
					</Button>
				</div>

				<SelectField
					v-model="itemId"
					label="Item Name"
					:options="options"
					placeholder="Search item"
				/>

				<AmountField v-model="amount" label="Amount" placeholder="0.00" />

				<p v-if="error" class="m-0 text-center text-sm text-[#f87171]">
					{{ error }}
				</p>

				<div class="flex gap-3">
					<Button block variant="shade" @click="emit('close')">Cancel</Button>
					<Button variant="primary" block :disabled="saving" @click="emit('save')">
						Save
					</Button>
				</div>
			</GlassContainer>
		</div>
	</Teleport>
</template>
