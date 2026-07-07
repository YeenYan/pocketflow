<script setup lang="ts">
	import { XMarkIcon } from "@heroicons/vue/24/outline";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";
	import type {
		UnexpectedExpense,
		UnexpectedExpenseSource,
	} from "../../../../db/budgetDb";

	defineProps<{
		show: boolean;
		items: UnexpectedExpense[];
		sourceLabel: (source: UnexpectedExpenseSource) => string;
	}>();

	const emit = defineEmits<{
		close: [];
	}>();
</script>

<template>
	<Teleport to="body">
		<div v-if="show" class="drawer-overlay" @click.self="emit('close')">
			<GlassContainer class="drawer-sheet">
				<div class="drawer-handle" />
				<div class="drawer-header">
					<h2 class="drawer-title">Unexpected Spending</h2>
					<button
						type="button"
						class="drawer-close"
						aria-label="Close"
						@click="emit('close')"
					>
						<XMarkIcon class="h-5 w-5" />
					</button>
				</div>

				<ul v-if="items.length" class="subitem-list">
					<li
						v-for="item in items"
						:key="item.id"
						class="subitem-row flex-col items-stretch gap-1"
					>
						<div class="flex items-center justify-between gap-3 w-full">
							<div class="flex flex-col">
								<span class="subitem-name">{{ item.itemName }}</span>
								<span class="text-xs text-textSecondary">
									{{ sourceLabel(item.sourceSection) }}
								</span>
							</div>
							<div class="text-right">
								<span class="subitem-amount text-progress-red font-bold">
									₱{{ item.excessAmount.toLocaleString("en-PH") }}
									<span class="text-xs italic">excess</span>
								</span>
								<p class="text-[.7rem] text-textSecondary">
									{{ item.date }}
								</p>
							</div>
						</div>
					</li>
				</ul>
				<p v-else class="m-0 text-center text-sm text-textSecondary">
					No unexpected spending
				</p>
			</GlassContainer>
		</div>
	</Teleport>
</template>

<style scoped>
	@import "./drawer-shared.css";
</style>
