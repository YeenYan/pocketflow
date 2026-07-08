<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import {
		HandThumbUpIcon,
		FaceFrownIcon,
		CalendarDaysIcon,
	} from "@heroicons/vue/24/outline";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import {
		db,
		type BudgetEntry,
		type CycleCutoff,
		type OthersBudget,
		type OthersExpense,
		type TabBudget,
		type TabBudgetExpense,
	} from "../../db/budgetDb";

	const cutoffs = ref<CycleCutoff[]>([]);
	const budgetEntries = ref<BudgetEntry[]>([]);
	const tabBudgets = ref<TabBudget[]>([]);
	const tabBudgetExpenses = ref<TabBudgetExpense[]>([]);
	const othersBudgets = ref<OthersBudget[]>([]);
	const othersExpenses = ref<OthersExpense[]>([]);

	const now = new Date();
	const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

	const GAUGE_CX = 100;
	const GAUGE_CY = 100;
	const PROGRESS_RADIUS = 70;
	const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;
	const TICK_COUNT = 40;

	const tickLines = Array.from({ length: TICK_COUNT }, (_, i) => {
		const angle = (i / TICK_COUNT) * Math.PI * 2 - Math.PI / 2;
		const inner = 82;
		const outer = 89;
		return {
			x1: GAUGE_CX + inner * Math.cos(angle),
			y1: GAUGE_CY + inner * Math.sin(angle),
			x2: GAUGE_CX + outer * Math.cos(angle),
			y2: GAUGE_CY + outer * Math.sin(angle),
		};
	});

	async function loadData() {
		cutoffs.value = await db.cycleCutoffs.toArray();
		budgetEntries.value = await db.budgetEntries.toArray();
		tabBudgets.value = await db.tabBudgets.toArray();
		tabBudgetExpenses.value = await db.tabBudgetExpenses.toArray();
		othersBudgets.value = await db.othersBudgets.toArray();
		othersExpenses.value = await db.othersExpenses.toArray();
	}

	onMounted(loadData);

	const activeCutoff = computed(() => {
		const list = cutoffs.value.filter(
			(c) => c.monthKey === currentMonthKey && c.status !== "finalized",
		);
		if (list.length === 0) return null;
		return list.reduce((latest, c) =>
			!latest || c.createdAt > latest.createdAt ? c : latest,
		);
	});

	const totalAmount = computed(() => activeCutoff.value?.amount ?? 0);

	const tabBudgetReserved = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return 0;
		const budget =
			tabBudgets.value.find(
				(b) => b.cutoffId === cutoffId && b.ruleName === "Expenses",
			) ?? null;
		const expenses = tabBudgetExpenses.value.filter(
			(e) => e.cutoffId === cutoffId && e.ruleName === "Expenses",
		);
		const allocated = budget?.budgetAllocated ?? 0;
		const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
		return Math.max(allocated, spent);
	});

	const othersReserved = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return 0;
		const budget = othersBudgets.value.find((b) => b.cutoffId === cutoffId) ?? null;
		const expenses = othersExpenses.value.filter((e) => e.cutoffId === cutoffId);
		const allocated = budget?.budgetAllocated ?? 0;
		const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
		return Math.max(allocated, spent);
	});

	const spentAmount = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return 0;
		const entriesSum = budgetEntries.value
			.filter((entry) => entry.cutoffId === cutoffId && !entry.parentBudgetEntryId)
			.reduce((sum, entry) => sum + entry.amount, 0);
		return entriesSum + tabBudgetReserved.value + othersReserved.value;
	});

	const spentPercent = computed(() => {
		if (totalAmount.value <= 0) return 0;
		return Math.round((spentAmount.value / totalAmount.value) * 100);
	});

	function progressFillColor(percent: number) {
		const value = Math.min(Math.max(percent, 0), 100);
		if (value >= 88) return "#d96b6b";
		if (value >= 84) return "#ff5100";
		if (value >= 80) return "#ff6500";
		if (value >= 76) return "#ff7a00";
		if (value >= 72) return "#ff8e00";
		if (value >= 68) return "#ffa300";
		if (value >= 64) return "#ffb700";
		if (value >= 60) return "#ffcc00";
		if (value >= 56) return "#ffe000";
		if (value >= 52) return "#fff400";
		if (value >= 48) return "#f4ff00";
		if (value >= 44) return "#e0ff00";
		if (value >= 40) return "#cbff00";
		if (value >= 36) return "#b7ff00";
		if (value >= 32) return "#a3ff00";
		if (value >= 28) return "#8eff00";
		if (value >= 24) return "#7aff00";
		if (value >= 20) return "#66ff00";
		if (value >= 16) return "#51ff00";
		if (value >= 12) return "#3dff00";
		if (value >= 8) return "#28ff00";
		return "#14ff00";
	}

	const progressOffset = computed(() => {
		const pct = Math.min(spentPercent.value, 100);
		return PROGRESS_CIRCUMFERENCE * (1 - pct / 100);
	});

	const isOverspent = computed(
		() => totalAmount.value > 0 && spentAmount.value > totalAmount.value,
	);

	const amountLeft = computed(() =>
		Math.max(0, totalAmount.value - spentAmount.value),
	);

	const displayLeft = computed(
		() => `₱${amountLeft.value.toLocaleString("en-PH")} left`,
	);

	const displaySpent = computed(
		() => `₱${spentAmount.value.toLocaleString("en-PH")} spent already`,
	);

	const cutoffName = computed(() => {
		const cutoff = activeCutoff.value;
		if (!cutoff) return "No cutoff set";
		return cutoff.label.charAt(0).toUpperCase() + cutoff.label.slice(1);
	});

	const displayCutoffDate = computed(() => {
		const date = activeCutoff.value?.date;
		if (!date) return "--";
		const d = new Date(date + "T00:00:00");
		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	});
</script>

<template>
	<div class="page-shell">
		<GlassContainer class="hero">
			<div
				v-if="activeCutoff"
				class="status-pill"
				:class="{ 'status-pill--overspent': isOverspent }"
			>
				<FaceFrownIcon v-if="isOverspent" class="status-pill-icon" />
				<HandThumbUpIcon v-else class="status-pill-icon" />
				<span>{{ isOverspent ? "Oh no! Overspent" : "On-track!" }}</span>
			</div>

			<p class="hero-headline">{{ activeCutoff ? displayLeft : "No cutoff set" }}</p>
			<p v-if="activeCutoff" class="hero-sub">{{ displaySpent }}</p>

			<div class="hero-gauge-wrap">
				<svg class="hero-gauge" viewBox="0 0 200 200" aria-hidden="true">
					<line
						v-for="(tick, i) in tickLines"
						:key="i"
						:x1="tick.x1"
						:y1="tick.y1"
						:x2="tick.x2"
						:y2="tick.y2"
						class="hero-tick"
					/>
					<circle
						class="hero-gauge-track"
						:cx="GAUGE_CX"
						:cy="GAUGE_CY"
						:r="PROGRESS_RADIUS"
						fill="none"
					/>
					<circle
						class="hero-gauge-fill"
						:cx="GAUGE_CX"
						:cy="GAUGE_CY"
						:r="PROGRESS_RADIUS"
						fill="none"
						:stroke-dasharray="PROGRESS_CIRCUMFERENCE"
						:stroke-dashoffset="progressOffset"
						:style="{
							stroke: isOverspent
								? '#d96b6b'
								: progressFillColor(spentPercent),
						}"
					/>
				</svg>
				<div class="hero-gauge-center">
					<span class="hero-gauge-pct">{{ spentPercent }}%</span>
					<span class="hero-gauge-cutoff">{{ cutoffName }}</span>
					<span v-if="activeCutoff" class="hero-gauge-date">
						<CalendarDaysIcon class="hero-gauge-date-icon" />
						{{ displayCutoffDate }}
					</span>
				</div>
			</div>
		</GlassContainer>
	</div>
</template>

<style scoped>
	.page-shell {
		display: flex;
		flex: 1;
		min-height: 0;
		align-items: stretch;
		justify-content: flex-start;
		padding-top: 1rem;
	}

	.hero {
		display: flex;
		width: 100%;
		max-width: 480px;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.status-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.85rem;
		border-radius: 9999px;
		border: 1px solid var(--color-info);
		background: var(--color-infoBg);
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-info);
	}

	.status-pill--overspent {
		border-color: var(--color-progress-red);
		background: var(--color-dangerBg);
		color: var(--color-progress-red);
	}

	.status-pill-icon {
		width: 0.95rem;
		height: 0.95rem;
		flex-shrink: 0;
	}

	.hero-headline {
		margin: 0.15rem 0 0;
		font-size: 2rem;
		font-weight: 700;
		line-height: 1.15;
		color: var(--color-textPrimary);
		text-align: center;
	}

	.hero-sub {
		margin: 0 0 0.75rem;
		font-size: 0.85rem;
		color: var(--color-textSecondary);
		text-align: center;
	}

	.hero-gauge-wrap {
		position: relative;
		width: 15rem;
		height: 15rem;
	}

	.hero-gauge {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.hero-tick {
		stroke: var(--color-inputBorder);
		stroke-width: 1.5;
		stroke-linecap: round;
	}

	.hero-gauge-track {
		stroke: var(--color-inputBorder);
		stroke-width: 14;
		opacity: 0.45;
	}

	.hero-gauge-fill {
		stroke-width: 14;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.2s ease;
	}

	.hero-gauge-center {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.2rem;
		padding: 0 1.5rem;
		text-align: center;
	}

	.hero-gauge-pct {
		font-size: 2rem;
		font-weight: 700;
		line-height: 1.1;
		color: var(--color-textPrimary);
	}

	.hero-gauge-cutoff {
		font-size: 0.85rem;
		color: var(--color-textSecondary);
	}

	.hero-gauge-date {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-top: 0.15rem;
		font-size: 0.75rem;
		color: var(--color-textSecondary);
	}

	.hero-gauge-date-icon {
		width: 0.85rem;
		height: 0.85rem;
		flex-shrink: 0;
	}
</style>
