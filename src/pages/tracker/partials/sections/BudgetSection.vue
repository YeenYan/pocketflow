<script setup lang="ts">
	import { PlusIcon, PencilIcon } from "@heroicons/vue/24/outline";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";
	import type { RuleName } from "../../../../db/budgetDb";

	defineProps<{
		activeTab: RuleName;
		displayAllocated: string;
		displayLeft: string;
		displaySpent: string;
		progressPercent: number;
		overBudget: boolean;
		hasBudget: boolean;
		progressFillColor: (percent: number) => string;
	}>();

	const emit = defineEmits<{
		openBudgetModal: [];
	}>();
</script>

<template>
	<GlassContainer class="relative mb-4">
		<GlassContainer
			as="button"
			type="button"
			rounded="full"
			:padding="false"
			class="plus-btn absolute right-[.6rem] top-[.6rem]"
			:aria-label="hasBudget ? 'Edit budget' : 'Add budget'"
			@click="emit('openBudgetModal')"
		>
			<PencilIcon v-if="hasBudget" class="h-5 w-5" />
			<PlusIcon v-else class="h-5 w-5" />
		</GlassContainer>
		<p
			class="m-0 mb-4 min-w-0 pr-12 text-[0.95rem] font-semibold text-textPrimary"
		>
			Budget
		</p>

		<div class="flex min-w-0 flex-col gap-2">
			<div>
				<p class="m-0 text-[0.85rem] text-textSecondary">
					Budget for {{ activeTab }}
				</p>
				<p class="mt-[-.1rem] mb-0 text-[1.4rem] font-bold text-textPrimary">
					{{ displayAllocated }}
				</p>
			</div>
			<div>
				<p class="m-0 text-[0.85rem] text-textSecondary">Budget left</p>
				<p
					class="mt-[-.1rem] mb-0 text-[1.4rem] font-bold"
					:class="overBudget ? 'text-progress-red' : 'text-textPrimary'"
				>
					{{ displayLeft }}
					<span v-if="overBudget" class="text-sm">excess</span>
				</p>
			</div>
		</div>

		<div class="rule-progress">
			<div class="flex items-center justify-between">
				<span class="rule-progress-spent">-{{ displaySpent }} spent</span>
				<p class="rule-progress-pct">{{ progressPercent }}%</p>
			</div>
			<div class="rule-progress-track">
				<div
					class="rule-progress-fill"
					:style="{
						width: progressPercent + '%',
						background: progressFillColor(progressPercent),
					}"
				/>
			</div>
		</div>
	</GlassContainer>
</template>

<style scoped>
	@import "./shared.css";
</style>
