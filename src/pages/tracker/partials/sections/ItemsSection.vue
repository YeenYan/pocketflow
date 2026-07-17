<script setup lang="ts">
	import { CheckIcon } from "@heroicons/vue/24/outline";
	import * as OutlineIcons from "@heroicons/vue/24/outline";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";
	import type { BudgetEntry, RuleName } from "../../../../db/budgetDb";

	export type ItemEntry = BudgetEntry & {
		icon: string;
		iconWrapClass: string;
		hasChildItems: boolean;
		builderId: string;
		childrenSpent: number;
		childProgressPercent: number;
	};

	defineProps<{
		activeTab: RuleName;
		entries: ItemEntry[];
		itemSwipeOffset: (id: string) => number;
		progressFillColor: (percent: number) => string;
	}>();

	const emit = defineEmits<{
		removeSwipedItem: [id: string];
		itemSwipeStart: [id: string, event: TouchEvent];
		itemSwipeMove: [id: string, event: TouchEvent];
		itemSwipeEnd: [id: string];
		itemRowClick: [entry: ItemEntry, id: string];
	}>();
</script>

<template>
	<GlassContainer class="mb-4">
		<p class="m-0 mb-[1.5rem] text-sm text-textSecondary">
			{{
				activeTab === "Savings"
					? "Saving's Items"
					: activeTab === "Wants"
						? "Want's Items"
						: "Main Expense Items"
			}}
		</p>
		<ul v-if="entries.length" class="item-list">
			<li
				v-for="entry in entries"
				:key="entry.id"
				class="item-swipe-wrap"
				:class="{ 'is-swiped': itemSwipeOffset(entry.id) < 0 }"
			>
				<button
					type="button"
					class="item-swipe-delete"
					aria-label="Remove item"
					@click.stop="emit('removeSwipedItem', entry.id)"
				>
					<component :is="OutlineIcons.TrashIcon" class="item-swipe-delete-icon" />
				</button>
				<div
					class="item-row-wrap"
					:class="{ 'is-swiped': itemSwipeOffset(entry.id) < 0 }"
					:style="{ transform: `translateX(${itemSwipeOffset(entry.id)}px)` }"
					@touchstart.passive="emit('itemSwipeStart', entry.id, $event)"
					@touchmove="emit('itemSwipeMove', entry.id, $event)"
					@touchend="emit('itemSwipeEnd', entry.id)"
				>
					<div class="item-row" @click="emit('itemRowClick', entry, entry.id)">
						<span class="item-icon-wrap" :class="entry.iconWrapClass">
							<component
								:is="OutlineIcons[entry.icon as keyof typeof OutlineIcons]"
								class="item-icon"
							/>
						</span>
						<div class="item-row-main">
							<div class="flex justify-between items-center">
								<span class="item-row-name">{{ entry.name }}</span>
								<div class="flex items-center gap-2">
									<span class="item-row-amount">
										₱{{ entry.amount.toLocaleString("en-PH") }}
									</span>
									<div
										v-if="entry.isComplete"
										class="bg-progress-green rounded-full p-1"
									>
										<CheckIcon class="h-4 w-4 text-white" />
									</div>
								</div>
							</div>
							<div v-if="entry.hasChildItems" class="flex flex-col gap-1">
								<div class="rule-progress-track w-full">
									<div
										class="rule-progress-fill"
										:style="{
											width: entry.childProgressPercent + '%',
											background:
												activeTab === 'Savings'
													? 'var(--color-progress-green)'
													: progressFillColor(entry.childProgressPercent),
										}"
									/>
								</div>
								<div class="flex justify-between items-center">
									<span class="rule-progress-spent">
										₱{{ entry.childrenSpent.toLocaleString("en-PH") }} spent
									</span>
									<span class="rule-progress-spent">
										₱{{
											Math.max(0, entry.amount - entry.childrenSpent).toLocaleString(
												"en-PH",
											)
										}}
										left
									</span>
								</div>
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
