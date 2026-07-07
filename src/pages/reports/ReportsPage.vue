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

	const totalAllotted = computed(() => selectedCutoff.value?.amount ?? 0);

	const totalSpent = computed(() =>
		ruleBreakdown.value.reduce((s, r) => s + r.spent, 0),
	);

	const overallOver = computed(() => totalSpent.value > totalAllotted.value);

	const overallDiff = computed(() =>
		Math.abs(totalSpent.value - totalAllotted.value),
	);

	const overallPercent = computed(() =>
		totalAllotted.value > 0
			? Math.round((overallDiff.value / totalAllotted.value) * 100)
			: 0,
	);
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
				<GlassContainer class="mb-4">
					<p class="section-title">Summary</p>
					<div class="row">
						<span class="text-textSecondary">Allotted budget</span>
						<span class="strong">{{ formatAmount(totalAllotted) }}</span>
					</div>
					<div class="row">
						<span class="text-textSecondary">Total spent</span>
						<span class="strong">{{ formatAmount(totalSpent) }}</span>
					</div>
					<div class="row">
						<span class="text-textSecondary">
							{{ overallOver ? "Overall excess" : "Overall remaining" }}
						</span>
						<span
							class="strong"
							:class="overallOver ? 'text-progress-red' : 'text-progress-green'"
						>
							{{ formatAmount(overallDiff) }} ({{ overallPercent }}%)
						</span>
					</div>
				</GlassContainer>

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
						<span class="text-textSecondary">Allotted</span>
						<span class="strong">{{ formatAmount(rule.allotted) }}</span>
					</div>
					<div class="row">
						<span class="text-textSecondary">Spent</span>
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
