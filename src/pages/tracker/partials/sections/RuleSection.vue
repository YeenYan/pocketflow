<script setup lang="ts">
	import {
		PlusIcon,
		ArrowTrendingUpIcon,
		ArrowRightIcon,
	} from "@heroicons/vue/24/outline";
	import type { ChartData, ChartOptions } from "chart.js";
	import { Doughnut } from "vue-chartjs";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";
	import type { RuleName } from "../../../../db/budgetDb";

	const props = defineProps<{
		activeTab: RuleName;
		activeRulePercent: number;
		displayActiveAmount: string;
		displaySavingsBoost?: string;
		displayExtraBudget?: string;
		displayTotalRuleAmount?: string;
		displayRuleLeft: string;
		displayRuleSpent: string;
		ruleProgressPercent: number;
		ruleOverBudget: boolean;
		unexpectedExcessPercent: number;
		hasUnexpectedExcess: boolean;
		chartKey: string;
		chartData: ChartData<"doughnut", number[], string>;
		chartOptions: ChartOptions<"doughnut">;
		progressFillColor: (percent: number) => string;
		disabled?: boolean;
	}>();

	const emit = defineEmits<{
		openItemModal: [];
		openExtraBudgetModal: [];
		openUnexpectedDrawer: [];
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
			aria-label="Add item"
			:disabled="disabled"
			@click="emit('openItemModal')"
		>
			<PlusIcon class="h-5 w-5" />
		</GlassContainer>
		<p
			class="m-0 mb-4 min-w-0 pr-12 text-[0.95rem] font-semibold text-textPrimary"
		>
			{{ activeTab }}
		</p>

		<div class="rule-body">
			<div class="chart-wrap">
				<Doughnut
					:key="props.chartKey"
					:data="props.chartData"
					:options="props.chartOptions"
				/>
				<div class="chart-center">
					<p class="m-0 w-full text-center text-[1rem] font-bold text-textPrimary">
						{{ activeRulePercent }}%
					</p>
					<p class="mb-0 w-full text-center text-[0.85rem] text-textPrimary">
						{{ activeTab }}
					</p>
				</div>
			</div>
			<div class="flex min-w-0 flex-1 flex-col gap-2">
				<div>
					<p class="m-0 text-[0.85rem] text-textSecondary">
						{{ activeTab === "Savings" ? "Target" : "Budget" }} for
						{{ activeTab }}
					</p>
					<p class="mt-[-.1rem] mb-0 text-[1.4rem] font-bold text-textPrimary">
						{{ displayActiveAmount }}
					</p>
					<p
						v-if="displaySavingsBoost"
						class="m-0 mt-0.5 text-[0.72rem] text-textSecondary"
					>
						{{ displaySavingsBoost }}
					</p>
					<p
						v-if="displayExtraBudget"
						class="m-0 mt-0.5 text-[0.72rem] text-textSecondary"
					>
						{{ displayExtraBudget }}
					</p>
					<p
						v-if="displayTotalRuleAmount"
						class="m-0 mt-0.5 text-[0.8rem] font-semibold text-textPrimary"
					>
						{{ displayTotalRuleAmount }}
					</p>
				</div>
				<div>
					<p class="m-0 text-[0.85rem] text-textSecondary">
						{{ activeTab === "Savings" ? "Remaining" : "Budget left" }}
					</p>
					<p
						class="mt-[-.1rem] mb-0 text-[1.4rem] font-bold"
						:class="ruleOverBudget ? 'text-progress-red' : 'text-textPrimary'"
					>
						{{ displayRuleLeft }}
						<span v-if="ruleOverBudget" class="text-sm">excess</span>
					</p>
				</div>
			</div>
		</div>
		<button
			type="button"
			class="extra-budget-btn"
			:disabled="disabled"
			@click="emit('openExtraBudgetModal')"
		>
			Add Extra Budget
		</button>
		<div class="rule-progress">
			<div class="flex items-center justify-between">
				<span class="rule-progress-spent"
					>-{{ displayRuleSpent }}
					{{ activeTab === "Savings" ? "Saved" : "spent" }}</span
				>
				<p class="rule-progress-pct">{{ ruleProgressPercent }}%</p>
			</div>
			<div class="rule-progress-track">
				<div
					class="rule-progress-fill"
					:style="{
						width: ruleProgressPercent + '%',
						background: progressFillColor(ruleProgressPercent),
					}"
				/>
			</div>
		</div>
		<button
			v-if="hasUnexpectedExcess"
			type="button"
			class="unexpected-spending-badge"
			@click="emit('openUnexpectedDrawer')"
		>
			<span class="unexpected-spending-badge-main">
				<ArrowTrendingUpIcon class="unexpected-spending-icon size-6" />
				Over budget by
				<span class="text-base font-bold text-progress-red"
					>{{ unexpectedExcessPercent }}%</span
				>
			</span>
			<ArrowRightIcon class="unexpected-spending-chevron" />
		</button>
	</GlassContainer>
</template>

<style scoped>
	@import "./shared.css";

	.rule-body {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.chart-wrap {
		position: relative;
		width: min(140px, 38vw);
		aspect-ratio: 1;
		flex-shrink: 0;
	}

	.chart-center {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 58%;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		pointer-events: none;
	}

	.extra-budget-btn {
		display: block;
		width: 100%;
		margin: 0.5rem 0 0;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-surface);
		box-shadow: var(--shadow-sm);
		color: var(--color-textPrimary);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	.extra-budget-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	:global(.dark) .extra-budget-btn {
		background: var(--color-glass-bg);
		border-color: var(--color-glass-border);
		box-shadow: none;
	}

	.unexpected-spending-badge {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
		box-sizing: border-box;
		margin: 0.75rem 0 0;
		padding: 0.65rem 0.85rem;
		border: 1px solid var(--color-glass-border);
		border-radius: 0.5rem;
		background: var(--color-glass-bg);
		box-shadow: var(--shadow-glass);
		backdrop-filter: blur(var(--blur-glass));
		-webkit-backdrop-filter: blur(var(--blur-glass));
		color: var(--color-textPrimary);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}

	.unexpected-spending-badge-main {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.unexpected-spending-icon {
		color: var(--color-progress-red);
	}

	.unexpected-spending-chevron {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		color: var(--color-inputText);
	}
</style>
