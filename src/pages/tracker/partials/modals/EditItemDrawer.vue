<script setup lang="ts">
	import { XMarkIcon, PlusIcon, PencilIcon } from "@heroicons/vue/24/outline";
	import * as OutlineIcons from "@heroicons/vue/24/outline";
	import Button from "../../../../components/button/Button.vue";
	import Divider from "../../../../components/divider/Divider.vue";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";
	import AmountField from "../../../../components/inputs/AmountField.vue";
	import ToggleSwitch from "../../../../components/inputs/ToggleSwitch.vue";
	import type { BudgetEntry } from "../../../../db/budgetDb";

	defineProps<{
		show: boolean;
		name: string;
		icon: string;
		iconWrapClass: string;
		hasChildItems: boolean;
		subItems: BudgetEntry[];
		subItemSwipeOffset: (id: string) => number;
		error: string;
		canSave: boolean;
		saving: boolean;
		removeBtnColor: string;
		withdrawLocked: boolean;
	}>();

	const emit = defineEmits<{
		close: [];
		save: [];
		completeChange: [];
		toWithdrawChange: [];
		saveWithdraw: [];
		editWithdraw: [];
		remove: [];
		addSubItem: [];
		deleteSubItem: [id: string];
		subItemRowClick: [child: BudgetEntry, id: string];
		subItemSwipeStart: [id: string, event: TouchEvent];
		subItemSwipeMove: [id: string, event: TouchEvent];
		subItemSwipeEnd: [id: string];
	}>();

	const amount = defineModel<string>("amount", { default: "" });
	const isComplete = defineModel<boolean>("isComplete", { default: false });
	const toWithdraw = defineModel<boolean>("toWithdraw", { default: false });
	const withdrawAmount = defineModel<string>("withdrawAmount", { default: "" });
</script>

<template>
	<Teleport to="body">
		<div v-if="show" class="drawer-overlay" @click.self="emit('close')">
			<GlassContainer class="drawer-sheet justify-between">
				<div class="flex flex-col gap-4">
					<div class="drawer-handle" />
					<div class="drawer-header">
						<h2 class="drawer-title">Edit Item</h2>
						<button
							type="button"
							class="drawer-close"
							aria-label="Close"
							@click="emit('close')"
						>
							<XMarkIcon class="h-5 w-5" />
						</button>
					</div>

					<div class="flex items-center justify-center gap-3">
						<span class="item-icon-wrap" :class="iconWrapClass">
							<component
								:is="OutlineIcons[icon as keyof typeof OutlineIcons]"
								class="item-icon"
							/>
						</span>
						<span class="edit-item-name">{{ name }}</span>
					</div>

					<div class="toggle-row">
						<span>Complete</span>
						<ToggleSwitch v-model="isComplete" @change="emit('completeChange')" />
					</div>

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
							:disabled="!withdrawAmount.trim()"
							@click="emit('saveWithdraw')"
						>
							<PlusIcon class="h-5 w-5" />
						</button>
					</div>

					<AmountField v-model="amount" label="Amount" placeholder="0.00" />

					<Divider margin-top="1rem" margin-bottom="1rem" />

					<p
						v-if="hasChildItems && !subItems.length"
						class="m-0 text-center text-sm text-textSecondary"
					>
						No sub items yet
					</p>

					<ul v-if="hasChildItems && subItems.length" class="subitem-list">
						<li
							v-for="child in subItems"
							:key="child.id"
							class="subitem-swipe-wrap"
							:class="{ 'is-swiped': subItemSwipeOffset(String(child.id)) < 0 }"
						>
							<button
								type="button"
								class="subitem-swipe-delete"
								aria-label="Remove sub item"
								@click.stop="emit('deleteSubItem', child.id!)"
							>
								<component
									:is="OutlineIcons.TrashIcon"
									class="subitem-swipe-delete-icon"
								/>
							</button>
							<div
								class="subitem-row"
								:style="{
									transform: `translateX(${subItemSwipeOffset(String(child.id))}px)`,
								}"
								@click="emit('subItemRowClick', child, String(child.id))"
								@touchstart.passive="
									emit('subItemSwipeStart', String(child.id), $event)
								"
								@touchmove="emit('subItemSwipeMove', String(child.id), $event)"
								@touchend="emit('subItemSwipeEnd', String(child.id))"
							>
								<span class="subitem-name">{{ child.name }}</span>
								<span class="subitem-amount">
									₱{{ child.amount.toLocaleString("en-PH") }}
								</span>
							</div>
						</li>
					</ul>

					<Button
						v-if="hasChildItems"
						variant="secondary"
						@click="emit('addSubItem')"
					>
						+ Add sub item
					</Button>

					<p v-if="error" class="drawer-error">{{ error }}</p>
				</div>

				<div class="drawer-actions">
					<Button variant="primary" block :disabled="!canSave" @click="emit('save')">
						Update
					</Button>
					<Button
						variant="danger"
						class="edit-remove-btn"
						:style="{ backgroundColor: removeBtnColor }"
						:disabled="saving"
						aria-label="Remove item"
						@click="emit('remove')"
					>
						<component :is="OutlineIcons.TrashIcon" class="h-5 w-6" />
					</Button>
				</div>
			</GlassContainer>
		</div>
	</Teleport>
</template>

<style scoped>
	@import "../sections/shared.css";
	@import "./drawer-shared.css";

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
