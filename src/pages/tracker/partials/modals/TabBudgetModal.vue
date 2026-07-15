<script setup lang="ts">
	import { PlusIcon, PencilIcon } from "@heroicons/vue/24/outline";
	import Button from "../../../../components/button/Button.vue";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";
	import AmountField from "../../../../components/inputs/AmountField.vue";
	import ToggleSwitch from "../../../../components/inputs/ToggleSwitch.vue";

	defineProps<{
		show: boolean;
		isEditing: boolean;
		error: string;
		canSave: boolean;
		withdrawLocked: boolean;
	}>();

	const emit = defineEmits<{
		close: [];
		save: [];
		toWithdrawChange: [];
		saveWithdraw: [];
		editWithdraw: [];
	}>();

	const amount = defineModel<string>("amount", { default: "" });
	const toWithdraw = defineModel<boolean>("toWithdraw", { default: false });
	const withdrawAmount = defineModel<string>("withdrawAmount", { default: "" });
</script>

<template>
	<Teleport to="body">
		<div
			v-if="show"
			class="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
			@click.self="emit('close')"
		>
			<GlassContainer class="flex w-full min-w-0 max-w-[400px] flex-col gap-4">
				<h2 class="m-0 text-center text-lg font-semibold text-textPrimary">
					{{ isEditing ? "Edit Budget" : "Add Budget" }}
				</h2>
				<div class="toggle-row">
					<span>To Withdraw</span>
					<ToggleSwitch v-model="toWithdraw" @change="emit('toWithdrawChange')" />
				</div>
				<div v-if="toWithdraw" class="bank-wallet-row">
					<AmountField
						v-model="withdrawAmount"
						label="Withdraw amount"
						placeholder="0.00"
						:disabled="withdrawLocked"
					/>
					<button
						v-if="withdrawLocked"
						type="button"
						class="bank-wallet-btn"
						aria-label="Edit withdraw amount"
						@click="emit('editWithdraw')"
					>
						<PencilIcon class="h-5 w-5" />
					</button>
					<button
						v-else
						type="button"
						class="bank-wallet-btn"
						aria-label="Save withdraw amount"
						:disabled="!withdrawAmount.trim() || !isEditing"
						@click="emit('saveWithdraw')"
					>
						<PlusIcon class="h-5 w-5" />
					</button>
				</div>
				<AmountField v-model="amount" label="Amount" placeholder="0.00" />
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
	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		color: var(--color-textPrimary);
	}

	.bank-wallet-row {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.bank-wallet-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 2.75rem;
		height: 2.75rem;
		margin-bottom: 0.05rem;
		padding: 0;
		border: 1px solid var(--color-inputBorder);
		border-radius: 9999px;
		background: var(--color-inputBg);
		color: var(--color-textPrimary);
		cursor: pointer;
	}

	.bank-wallet-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
