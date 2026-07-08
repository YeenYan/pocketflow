<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import Divider from "../../components/divider/Divider.vue";
	import {
		db,
		type CycleCutoff,
		type BudgetEntry,
		type OthersExpense,
		type TabBudgetExpense,
		type RuleName,
	} from "../../db/budgetDb";

	const RULE_ORDER: RuleName[] = ["Expenses", "Savings", "Wants"];

	const cutoffs = ref<CycleCutoff[]>([]);
	const budgetEntries = ref<BudgetEntry[]>([]);
	const tabBudgetExpenses = ref<TabBudgetExpense[]>([]);
	const othersExpenses = ref<OthersExpense[]>([]);
	const selectedIndex = ref(0);

	onMounted(async () => {
		const all = await db.cycleCutoffs.toArray();
		cutoffs.value = all
			.filter((c) => c.status === "finalized")
			.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
		budgetEntries.value = await db.budgetEntries.toArray();
		tabBudgetExpenses.value = await db.tabBudgetExpenses.toArray();
		othersExpenses.value = await db.othersExpenses.toArray();
		selectedIndex.value = Math.max(0, cutoffs.value.length - 1);
	});

	const selectedCutoff = computed(
		() => cutoffs.value[selectedIndex.value] ?? null,
	);

	const canPrev = computed(() => selectedIndex.value > 0);
	const canNext = computed(() => selectedIndex.value < cutoffs.value.length - 1);

	function goPrev() {
		if (canPrev.value) selectedIndex.value--;
	}

	function goNext() {
		if (canNext.value) selectedIndex.value++;
	}

	function formatAmount(n: number) {
		return `₱${n.toLocaleString("en-PH")}`;
	}

	const periodLabel = computed(() => {
		const c = selectedCutoff.value;
		if (!c) return "—";
		const d = new Date(c.monthKey + "-01T00:00:00");
		const month = d.toLocaleDateString("en-US", {
			month: "long",
			year: "numeric",
		});
		return `${c.label} · ${month}`;
	});

	const tabForCutoff = computed(() =>
		selectedCutoff.value
			? tabBudgetExpenses.value.filter(
					(e) => e.cutoffId === selectedCutoff.value!.id,
				)
			: [],
	);

	const othersForCutoff = computed(() =>
		selectedCutoff.value
			? othersExpenses.value.filter((e) => e.cutoffId === selectedCutoff.value!.id)
			: [],
	);

	const ruleBreakdown = computed(() => {
		const c = selectedCutoff.value;
		if (!c) return [];
		return RULE_ORDER.map((name) => {
			const entries = budgetEntries.value.filter(
				(e) => e.cutoffId === c.id && e.ruleName === name && !e.parentBudgetEntryId,
			);
			const entriesSum = entries.reduce((s, e) => s + e.amount, 0);
			const tabSum = tabForCutoff.value.reduce((s, e) => s + e.amount, 0);
			const othersSum = othersForCutoff.value.reduce((s, e) => s + e.amount, 0);
			const spent =
				name === "Expenses" ? entriesSum + tabSum + othersSum : entriesSum;
			const allotted = c.allocations?.[name]?.amount ?? 0;
			const over = spent > allotted;
			const diff = Math.abs(spent - allotted);
			const percent = allotted > 0 ? Math.round((diff / allotted) * 100) : 0;
			const good = name === "Savings" ? spent >= allotted : spent <= allotted;
			return { name, allotted, spent, over, diff, percent, good, entries };
		});
	});

	const overallCutoffBudget = computed(() => selectedCutoff.value?.amount ?? 0);

	const totalAllotted = computed(() => {
		const c = selectedCutoff.value;
		if (!c) return 0;
		return (
			(c.allocations?.Expenses?.amount ?? 0) + (c.allocations?.Wants?.amount ?? 0)
		);
	});

	const totalSpent = computed(() =>
		ruleBreakdown.value
			.filter((r) => r.name !== "Savings")
			.reduce((s, r) => s + r.spent, 0),
	);

	const overallOver = computed(() => totalSpent.value > totalAllotted.value);

	const overallDiff = computed(() =>
		Math.abs(totalSpent.value - totalAllotted.value),
	);

	const overallPercent = computed(() =>
		totalAllotted.value > 0
			? Math.round((totalSpent.value / totalAllotted.value) * 100)
			: 0,
	);

	const savingsRule = computed(
		() => ruleBreakdown.value.find((r) => r.name === "Savings") ?? null,
	);

	const savingsTarget = computed(() => savingsRule.value?.allotted ?? 0);
	const savingsSaved = computed(() => savingsRule.value?.spent ?? 0);
	const savingsHit = computed(() => savingsSaved.value >= savingsTarget.value);
	const savingsDiff = computed(() =>
		Math.abs(savingsSaved.value - savingsTarget.value),
	);
	const savingsPercent = computed(() =>
		savingsTarget.value > 0
			? Math.round((savingsSaved.value / savingsTarget.value) * 100)
			: 0,
	);

	const GAUGE_R = 80;
	const GAUGE_LENGTH = Math.PI * GAUGE_R;
	const gaugePath = `M ${100 - GAUGE_R} 100 A ${GAUGE_R} ${GAUGE_R} 0 0 1 ${100 + GAUGE_R} 100`;

	const summaryGaugeOffset = computed(() => {
		const pct = Math.min(overallPercent.value, 100);
		return GAUGE_LENGTH * (1 - pct / 100);
	});

	const savingsGaugeOffset = computed(() => {
		const pct = Math.min(savingsPercent.value, 100);
		return GAUGE_LENGTH * (1 - pct / 100);
	});
</script>

<template>
	<div
		class="mx-auto flex min-h-0 w-full max-w-[480px] flex-1 flex-col overflow-hidden items-stretch pt-0"
	>
		<div class="reports-fixed shrink-0">
			<GlassContainer class="nav">
				<button
					type="button"
					class="nav-btn"
					:disabled="!canPrev"
					aria-label="Previous cutoff"
					@click="goPrev"
				>
					<ChevronLeftIcon class="h-5 w-5" />
				</button>
				<span class="nav-label">{{ periodLabel }}</span>
				<button
					type="button"
					class="nav-btn"
					:disabled="!canNext"
					aria-label="Next cutoff"
					@click="goNext"
				>
					<ChevronRightIcon class="h-5 w-5" />
				</button>
			</GlassContainer>
		</div>

		<div class="reports-scroll min-h-0 flex-1">
			<p v-if="!selectedCutoff" class="empty">No finalized cutoffs yet</p>

			<template v-else>
				<GlassContainer class="overall-budget mb-4">
					<span class="overall-budget-label">Overall Budget Allotted</span>
					<span class="overall-budget-amount">{{
						formatAmount(overallCutoffBudget)
					}}</span>
				</GlassContainer>
				<div class="summary-row mb-4">
					<GlassContainer class="summary">
						<p class="summary-label">How much spent</p>
						<p class="summary-spent">{{ formatAmount(totalSpent) }}</p>
						<p class="summary-allotted">
							Allotted budget {{ formatAmount(totalAllotted) }}
						</p>
						<div class="summary-gauge-wrap">
							<svg class="summary-gauge" viewBox="0 0 200 120" aria-hidden="true">
								<path class="summary-gauge-track" :d="gaugePath" fill="none" />
								<path
									class="summary-gauge-fill"
									:d="gaugePath"
									fill="none"
									:stroke-dasharray="GAUGE_LENGTH"
									:stroke-dashoffset="summaryGaugeOffset"
									:style="{
										stroke: overallOver
											? 'var(--color-progress-red)'
											: 'var(--color-progress-green)',
									}"
								/>
							</svg>
							<div class="summary-gauge-center">
								<span class="summary-gauge-pct">{{ overallPercent }}%</span>
							</div>
						</div>
						<p
							class="summary-status"
							:class="overallOver ? 'text-progress-red' : 'text-progress-green'"
						>
							{{ overallOver ? "Over Budget" : "Within Budget" }}
							{{ formatAmount(overallDiff) }}
						</p>
					</GlassContainer>

					<GlassContainer class="summary">
						<p class="summary-label">How much saved</p>
						<p class="summary-spent">{{ formatAmount(savingsSaved) }}</p>
						<p class="summary-allotted">Target {{ formatAmount(savingsTarget) }}</p>
						<div class="summary-gauge-wrap">
							<svg class="summary-gauge" viewBox="0 0 200 120" aria-hidden="true">
								<path class="summary-gauge-track" :d="gaugePath" fill="none" />
								<path
									class="summary-gauge-fill"
									:d="gaugePath"
									fill="none"
									:stroke-dasharray="GAUGE_LENGTH"
									:stroke-dashoffset="savingsGaugeOffset"
									:style="{
										stroke: savingsHit
											? 'var(--color-progress-green)'
											: 'var(--color-progress-red)',
									}"
								/>
							</svg>
							<div class="summary-gauge-center">
								<span class="summary-gauge-pct">{{ savingsPercent }}%</span>
							</div>
						</div>
						<p
							class="summary-status"
							:class="savingsHit ? 'text-progress-green' : 'text-progress-red'"
						>
							<template v-if="savingsHit && savingsDiff > 0">
								Excess {{ formatAmount(savingsDiff) }}
							</template>
							<template v-else-if="savingsHit">Target Hit</template>
							<template v-else>Need {{ formatAmount(savingsDiff) }} more</template>
						</p>
					</GlassContainer>
				</div>

				<GlassContainer v-for="rule in ruleBreakdown" :key="rule.name" class="mb-4">
					<div class="rule-head">
						<p class="section-title">{{ rule.name }}</p>
						<span
							class="pill"
							:class="rule.good ? 'text-progress-green' : 'text-progress-red'"
						>
							{{ rule.over ? "Excess" : "Remaining" }}
							{{ formatAmount(rule.diff) }} ({{ rule.percent }}%)
						</span>
					</div>
					<div class="row">
						<span class="text-textSecondary">
							{{ rule.name === "Savings" ? "Target" : "Allotted" }}
						</span>
						<span class="strong">{{ formatAmount(rule.allotted) }}</span>
					</div>
					<div class="row">
						<span class="text-textSecondary">
							{{ rule.name === "Savings" ? "Saved" : "Spent" }}
						</span>
						<span class="strong">{{ formatAmount(rule.spent) }}</span>
					</div>

					<Divider marginTop="1rem" marginBottom="1rem" />

					<p class="group-label">Items</p>
					<ul v-if="rule.entries.length" class="item-list">
						<li v-for="e in rule.entries" :key="e.id" class="item-row">
							<span class="text-textPrimary">{{ e.name }}</span>
							<span class="text-textPrimary">{{ formatAmount(e.amount) }}</span>
						</li>
					</ul>
					<p v-else class="muted">No items</p>

					<template v-if="rule.name === 'Expenses'">
						<p class="group-label">Budget Items</p>
						<ul v-if="tabForCutoff.length" class="item-list">
							<li v-for="e in tabForCutoff" :key="e.id" class="item-row">
								<span class="text-textPrimary">{{ e.expenseName }}</span>
								<span class="text-textPrimary">{{ formatAmount(e.amount) }}</span>
							</li>
						</ul>
						<p v-else class="muted">No items</p>

						<p class="group-label">Other Items</p>
						<ul v-if="othersForCutoff.length" class="item-list">
							<li v-for="e in othersForCutoff" :key="e.id" class="item-row">
								<span class="text-textPrimary">{{ e.expenseName }}</span>
								<span class="text-textPrimary">{{ formatAmount(e.amount) }}</span>
							</li>
						</ul>
						<p v-else class="muted">No items</p>
					</template>
				</GlassContainer>
			</template>
		</div>
	</div>
</template>

<style scoped>
	.reports-fixed {
		padding-top: 1rem;
		padding-bottom: 1rem;
	}

	.reports-scroll {
		flex: 1 1 0;
		min-height: 0;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
		padding-bottom: calc(6rem + env(safe-area-inset-bottom));
	}

	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.4rem;
		border: none;
		border-radius: 9999px;
		background: var(--color-inputBorder);
		color: var(--color-textPrimary);
		cursor: pointer;
	}

	.nav-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.nav-label {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.empty {
		margin: 2rem 0;
		text-align: center;
		font-size: 0.9rem;
		color: var(--color-textSecondary);
	}

	.section-title {
		margin: 0 0 0.75rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.overall-budget {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.overall-budget-label {
		font-size: 0.85rem;
		color: var(--color-textSecondary);
	}

	.overall-budget-amount {
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-textPrimary);
	}

	.summary-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.65rem;
	}

	.summary {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		min-width: 0;
	}

	.summary-label {
		margin: 0;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-textSecondary);
	}

	.summary-spent {
		margin: 0.35rem 0 0;
		font-size: 1.15rem;
		font-weight: 700;
		line-height: 1.15;
		color: var(--color-textPrimary);
	}

	.summary-allotted {
		margin: 0.25rem 0 0;
		font-size: 0.7rem;
		color: var(--color-textSecondary);
	}

	.summary-gauge-wrap {
		position: relative;
		width: 100%;
		max-width: 8.5rem;
		margin-top: 0.55rem;
	}

	.summary-gauge {
		display: block;
		width: 100%;
		height: auto;
	}

	.summary-gauge-track {
		stroke: var(--color-inputBorder);
		stroke-width: 14;
		stroke-linecap: round;
		opacity: 0.45;
	}

	.summary-gauge-fill {
		stroke-width: 14;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.2s ease;
	}

	.summary-gauge-center {
		position: absolute;
		left: 0;
		right: 0;
		top: 55%;
		display: flex;
		justify-content: center;
		pointer-events: none;
	}

	.summary-gauge-pct {
		font-size: 1.1rem;
		font-weight: 700;
		line-height: 1;
		color: var(--color-textPrimary);
	}

	.summary-status {
		margin-top: 0.15rem;
		margin-bottom: 0.15rem;
		font-size: 0.72rem;
		font-weight: 600;
	}

	.rule-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.pill {
		font-size: 0.8rem;
		font-weight: 600;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.25rem 0;
		font-size: 0.9rem;
	}

	.strong {
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.group-label {
		margin: 0.75rem 0 0.35rem;
		font-size: 0.8rem;
		color: var(--color-textSecondary);
	}

	.item-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.item-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.9rem;
	}

	.muted {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-textSecondary);
	}
</style>
