<script setup lang="ts">
	import { PlusIcon } from "@heroicons/vue/24/outline";
	import * as OutlineIcons from "@heroicons/vue/24/outline";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";

	type OtherExpense = {
		id: string;
		expenseName: string;
		amount: number;
		createdAt: string;
	};

	defineProps<{
		title: string;
		expenses: OtherExpense[];
		swipeOffset: (id: string) => number;
	}>();

	const emit = defineEmits<{
		openItemModal: [];
		deleteExpense: [id: string];
		swipeStart: [id: string, event: TouchEvent];
		swipeMove: [id: string, event: TouchEvent];
		swipeEnd: [id: string];
		itemRowClick: [expense: OtherExpense, id: string];
	}>();

	function formatExpenseDate(createdAt: string) {
		const d = new Date(createdAt);
		return d.toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
		});
	}
</script>

<template>
	<GlassContainer class="relative mb-4">
		<GlassContainer
			as="button"
			type="button"
			rounded="full"
			:padding="false"
			class="plus-btn absolute right-[.6rem] top-[.6rem]"
			aria-label="Add item"
			@click="emit('openItemModal')"
		>
			<PlusIcon class="h-5 w-5" />
		</GlassContainer>
		<p class="m-0 mb-[1.5rem] min-w-0 pr-12 text-sm text-textSecondary">
			{{ title }}
		</p>
		<ul v-if="expenses.length" class="item-list">
			<li
				v-for="expense in expenses"
				:key="expense.id"
				class="item-swipe-wrap"
				:class="{ 'is-swiped': swipeOffset(String(expense.id)) < 0 }"
			>
				<button
					type="button"
					class="item-swipe-delete"
					aria-label="Remove expense"
					@click.stop="emit('deleteExpense', expense.id)"
				>
					<component :is="OutlineIcons.TrashIcon" class="item-swipe-delete-icon" />
				</button>
				<div
					class="item-row-wrap"
					:class="{ 'is-swiped': swipeOffset(String(expense.id)) < 0 }"
					:style="{
						transform: `translateX(${swipeOffset(String(expense.id))}px)`,
					}"
					@touchstart.passive="emit('swipeStart', String(expense.id), $event)"
					@touchmove="emit('swipeMove', String(expense.id), $event)"
					@touchend="emit('swipeEnd', String(expense.id))"
				>
					<div
						class="item-row"
						@click="emit('itemRowClick', expense, String(expense.id))"
					>
						<div class="item-row-main">
							<div class="flex items-start justify-between gap-3">
								<div class="flex min-w-0 flex-col">
									<span class="item-row-name">{{ expense.expenseName }}</span>
									<span class="text-[.7rem] text-textSecondary">
										{{ formatExpenseDate(expense.createdAt) }}
									</span>
								</div>
								<span class="item-row-amount">
									₱{{ expense.amount.toLocaleString("en-PH") }}
								</span>
							</div>
						</div>
					</div>
				</div>
			</li>
		</ul>
		<p v-else class="m-0 text-sm text-textSecondary">No items yet</p>
	</GlassContainer>
</template>

<style scoped>
	@import "./shared.css";
</style>
