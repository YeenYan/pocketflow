<script setup lang="ts">
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
							<div class="flex justify-between">
								<span class="item-row-name">{{ entry.name }}</span>
								<span class="item-row-amount">
									₱{{ entry.amount.toLocaleString("en-PH") }}
								</span>
							</div>
							<div
								class="flex justify-between items-center"
								v-if="entry.hasChildItems"
							>
								<div class="rule-progress-track w-[75%]">
									<div
										class="rule-progress-fill"
										:style="{
											width: entry.childProgressPercent + '%',
											background: progressFillColor(entry.childProgressPercent),
										}"
									/>
								</div>
								<span class="rule-progress-spent">
									₱{{ entry.childrenSpent.toLocaleString("en-PH") }}
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
