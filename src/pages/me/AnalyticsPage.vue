<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import { useRouter } from "vue-router";
	import {
		ArrowLeftIcon,
		ArrowTrendingUpIcon,
		ArrowTrendingDownIcon,
		BanknotesIcon,
		ChartPieIcon,
		CurrencyDollarIcon,
		ShoppingBagIcon,
		Squares2X2Icon,
		LightBulbIcon,
	} from "@heroicons/vue/24/outline";
	import {
		Chart as ChartJS,
		ArcElement,
		Tooltip,
		Legend,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Filler,
	} from "chart.js";
	import type { ChartData, ChartOptions } from "chart.js";
	import { Doughnut, Line } from "vue-chartjs";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import Divider from "../../components/divider/Divider.vue";
	import SelectField from "../../components/inputs/SelectField.vue";
	import {
		db,
		type CycleCutoff,
		type BudgetEntry,
		type OthersExpense,
		type TabBudgetExpense,
		type UnexpectedExpense,
		type ItemBuilder,
		type RuleName,
	} from "../../db/budgetDb";
	import { useTheme } from "../../composables/useTheme";

	ChartJS.register(
		ArcElement,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Filler,
		Tooltip,
		Legend,
	);

	const router = useRouter();
	const { currentTheme } = useTheme();

	const RULE_ORDER: RuleName[] = ["Expenses", "Savings", "Wants"];

	const cutoffs = ref<CycleCutoff[]>([]);
	const budgetEntries = ref<BudgetEntry[]>([]);
	const tabBudgetExpenses = ref<TabBudgetExpense[]>([]);
	const othersExpenses = ref<OthersExpense[]>([]);
	const unexpectedExpenses = ref<UnexpectedExpense[]>([]);
	const itemBuilders = ref<ItemBuilder[]>([]);

	type PeriodValue = "current" | "previous" | "custom";
	const period = ref<PeriodValue>("current");

	const now = new Date();
	const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const previousMonthKey = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, "0")}`;

	const customStart = ref(currentMonthKey);
	const customEnd = ref(currentMonthKey);

	const PERIOD_OPTIONS = [
		{ value: "current", label: "Current Month" },
		{ value: "previous", label: "Previous Month" },
		{ value: "custom", label: "Custom Date Range" },
	];

	onMounted(async () => {
		cutoffs.value = await db.cycleCutoffs.toArray();
		budgetEntries.value = await db.budgetEntries.toArray();
		tabBudgetExpenses.value = await db.tabBudgetExpenses.toArray();
		othersExpenses.value = await db.othersExpenses.toArray();
		unexpectedExpenses.value = await db.unexpectedExpenses.toArray();
		itemBuilders.value = await db.itemBuilders.toArray();
	});

	function formatAmount(n: number) {
		return `₱${Math.round(n).toLocaleString("en-PH")}`;
	}

	function pctOf(part: number, whole: number) {
		if (!whole) return 0;
		return Math.round((part / whole) * 100);
	}

	function monthLabel(monthKey: string) {
		const d = new Date(monthKey + "-01T00:00:00");
		return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
	}

	const activeRange = computed<{ start: string; end: string }>(() => {
		if (period.value === "current")
			return { start: currentMonthKey, end: currentMonthKey };
		if (period.value === "previous")
			return { start: previousMonthKey, end: previousMonthKey };
		return { start: customStart.value, end: customEnd.value };
	});

	const rangeLabel = computed(() => {
		const r = activeRange.value;
		if (r.start === r.end) return monthLabel(r.start);
		return `${monthLabel(r.start)} — ${monthLabel(r.end)}`;
	});

	const cutoffsInRange = computed(() => {
		const r = activeRange.value;
		return cutoffs.value
			.filter(
				(c) =>
					c.status === "finalized" &&
					c.monthKey >= r.start &&
					c.monthKey <= r.end,
			)
			.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	});

	function spentForRuleInCutoff(cutoffId: string, rule: RuleName) {
		const entriesSum = budgetEntries.value
			.filter(
				(e) =>
					e.cutoffId === cutoffId &&
					e.ruleName === rule &&
					!e.parentBudgetEntryId,
			)
			.reduce((sum, e) => sum + e.amount, 0);
		if (rule !== "Expenses") return entriesSum;
		const tabSum = tabBudgetExpenses.value
			.filter((e) => e.cutoffId === cutoffId && e.ruleName === "Expenses")
			.reduce((sum, e) => sum + e.amount, 0);
		const othersSum = othersExpenses.value
			.filter((e) => e.cutoffId === cutoffId)
			.reduce((sum, e) => sum + e.amount, 0);
		return entriesSum + tabSum + othersSum;
	}

	function totalsForCutoff(cutoff: CycleCutoff) {
		const allocated =
			(cutoff.allocations?.Expenses?.amount ?? 0) +
			(cutoff.allocations?.Savings?.amount ?? 0) +
			(cutoff.allocations?.Wants?.amount ?? 0);
		const expenses = spentForRuleInCutoff(cutoff.id, "Expenses");
		const savings = spentForRuleInCutoff(cutoff.id, "Savings");
		const wants = spentForRuleInCutoff(cutoff.id, "Wants");
		const totalSpent = expenses + wants;
		const remaining = Math.max(
			0,
			(cutoff.allocations?.Expenses?.amount ?? 0) +
				(cutoff.allocations?.Wants?.amount ?? 0) -
				totalSpent,
		);
		return { allocated, expenses, savings, wants, remaining };
	}

	const overview = computed(() => {
		const list = cutoffsInRange.value;
		let allocated = 0;
		let expensesAllotted = 0;
		let savingsAllotted = 0;
		let wantsAllotted = 0;
		let expenses = 0;
		let savings = 0;
		let wants = 0;
		let remaining = 0;
		for (const c of list) {
			const t = totalsForCutoff(c);
			allocated += t.allocated;
			expensesAllotted += c.allocations?.Expenses?.amount ?? 0;
			savingsAllotted += c.allocations?.Savings?.amount ?? 0;
			wantsAllotted += c.allocations?.Wants?.amount ?? 0;
			expenses += t.expenses;
			savings += t.savings;
			wants += t.wants;
			remaining += t.remaining;
		}
		return {
			allocated,
			expensesAllotted,
			savingsAllotted,
			wantsAllotted,
			expenses,
			savings,
			wants,
			remaining,
		};
	});

	const hasData = computed(() => cutoffsInRange.value.length > 0);

	const overviewCards = computed(() => {
		const o = overview.value;
		const cutoffLabel = cutoffsInRange.value
			.map((c) => c.label)
			.filter((v, i, a) => a.indexOf(v) === i)
			.join(" & ");
		return [
			{
				key: "allocated",
				title: "Budget Allocated",
				amount: o.allocated,
				subtitle: cutoffLabel
					? `Allocated for ${cutoffLabel}`
					: "Total allocated",
				icon: CurrencyDollarIcon,
				iconClass: "icon-allocated",
			},
			{
				key: "expenses",
				title: "Expenses",
				amount: o.expenses,
				subtitle: `${pctOf(o.expenses, o.expensesAllotted)}% Used`,
				icon: ShoppingBagIcon,
				iconClass: "icon-expenses",
			},
			{
				key: "savings",
				title: "Savings",
				amount: o.savings,
				subtitle: `${pctOf(o.savings, o.savingsAllotted)}% Saved`,
				icon: BanknotesIcon,
				iconClass: "icon-savings",
			},
			{
				key: "wants",
				title: "Wants",
				amount: o.wants,
				subtitle: `${pctOf(o.wants, o.wantsAllotted)}% Used`,
				icon: Squares2X2Icon,
				iconClass: "icon-wants",
			},
			{
				key: "remaining",
				title: "Remaining Budget",
				amount: o.remaining,
				subtitle: "Available",
				icon: ChartPieIcon,
				iconClass: "icon-remaining",
			},
		];
	});

	const RULE_COLORS_DARK: Record<RuleName, string> = {
		Expenses: "#f97316",
		Savings: "#10b981",
		Wants: "#a855f7",
	};

	const RULE_COLORS_LIGHT: Record<RuleName, string> = {
		Expenses: "#b42318",
		Savings: "#047857",
		Wants: "#5b21b6",
	};

	const ruleColor = (rule: RuleName) =>
		currentTheme.value === "dark"
			? RULE_COLORS_DARK[rule]
			: RULE_COLORS_LIGHT[rule];

	const distributionData = computed<
		ChartData<"doughnut", number[], string>
	>(() => {
		const o = overview.value;
		return {
			labels: ["Expenses", "Savings", "Wants"],
			datasets: [
				{
					data: [o.expensesAllotted, o.savingsAllotted, o.wantsAllotted],
					backgroundColor: [
						ruleColor("Expenses"),
						ruleColor("Savings"),
						ruleColor("Wants"),
					],
					borderWidth: 0,
					spacing: 2,
				},
			],
		};
	});

	const distributionOptions = computed<ChartOptions<"doughnut">>(() => ({
		responsive: true,
		maintainAspectRatio: true,
		cutout: "62%",
		plugins: { legend: { display: false }, tooltip: { enabled: true } },
	}));

	const distributionLegend = computed(() => {
		const o = overview.value;
		const total = o.expensesAllotted + o.savingsAllotted + o.wantsAllotted;
		return RULE_ORDER.map((name) => {
			const amount =
				name === "Expenses"
					? o.expensesAllotted
					: name === "Savings"
						? o.savingsAllotted
						: o.wantsAllotted;
			return {
				name,
				amount,
				percent: pctOf(amount, total),
				color: ruleColor(name),
			};
		});
	});

	function statusForRule(rule: RuleName, spent: number, allotted: number) {
		if (!allotted) return { label: "No Budget", tone: "muted" };
		if (rule === "Savings") {
			if (spent >= allotted) return { label: "Target Hit", tone: "good" };
			if (spent / allotted >= 0.8) return { label: "Near Target", tone: "warn" };
			return { label: "Behind Target", tone: "bad" };
		}
		if (spent > allotted) return { label: "Over Budget", tone: "bad" };
		if (spent / allotted >= 0.8) return { label: "Near Limit", tone: "warn" };
		return { label: "Within Budget", tone: "good" };
	}

	const budgetVsActual = computed(() => {
		const o = overview.value;
		const rows: {
			name: RuleName;
			allotted: number;
			spent: number;
			remaining: number;
			percent: number;
			status: { label: string; tone: string };
		}[] = [];
		for (const rule of RULE_ORDER) {
			const allotted =
				rule === "Expenses"
					? o.expensesAllotted
					: rule === "Savings"
						? o.savingsAllotted
						: o.wantsAllotted;
			const spent =
				rule === "Expenses" ? o.expenses : rule === "Savings" ? o.savings : o.wants;
			const remaining = Math.max(0, allotted - spent);
			const percent = pctOf(spent, allotted);
			rows.push({
				name: rule,
				allotted,
				spent,
				remaining,
				percent,
				status: statusForRule(rule, spent, allotted),
			});
		}
		return rows;
	});

	const cutoffComparison = computed(() => {
		const slot1 = cutoffsInRange.value.find((c) => c.slot === 1);
		const slot2 = cutoffsInRange.value.find((c) => c.slot === 2);
		return {
			first: slot1 ? { cutoff: slot1, totals: totalsForCutoff(slot1) } : null,
			second: slot2 ? { cutoff: slot2, totals: totalsForCutoff(slot2) } : null,
		};
	});

	const cutoffMetrics = computed(() => {
		const first = cutoffComparison.value.first?.totals;
		const second = cutoffComparison.value.second?.totals;
		return [
			{
				label: "Budget Allocated",
				first: first?.allocated,
				second: second?.allocated,
			},
			{ label: "Expenses", first: first?.expenses, second: second?.expenses },
			{ label: "Savings", first: first?.savings, second: second?.savings },
			{ label: "Wants", first: first?.wants, second: second?.wants },
			{
				label: "Remaining",
				first: first?.remaining,
				second: second?.remaining,
			},
		];
	});

	function itemBuilderById(id?: string) {
		if (!id) return null;
		return itemBuilders.value.find((b) => b.id === id) ?? null;
	}

	function itemBuilderByName(name: string) {
		return itemBuilders.value.find((b) => b.name === name) ?? null;
	}

	const expensesBreakdown = computed(() => {
		const cutoffIds = new Set(cutoffsInRange.value.map((c) => c.id));
		const totals: Record<string, { amount: number; color?: string }> = {};

		for (const e of budgetEntries.value) {
			if (!cutoffIds.has(e.cutoffId)) continue;
			if (e.ruleName !== "Expenses") continue;
			if (e.parentBudgetEntryId) continue;
			const builder = itemBuilderById(e.itemBuilderId) ?? itemBuilderByName(e.name);
			const key = builder?.name ?? e.name;
			if (!totals[key]) totals[key] = { amount: 0, color: builder?.color };
			totals[key].amount += e.amount;
		}
		for (const e of tabBudgetExpenses.value) {
			if (!cutoffIds.has(e.cutoffId)) continue;
			if (e.ruleName !== "Expenses") continue;
			const key = e.expenseName;
			if (!totals[key]) totals[key] = { amount: 0 };
			totals[key].amount += e.amount;
		}
		for (const e of othersExpenses.value) {
			if (!cutoffIds.has(e.cutoffId)) continue;
			const key = e.expenseName;
			if (!totals[key]) totals[key] = { amount: 0 };
			totals[key].amount += e.amount;
		}

		const rows = Object.entries(totals)
			.map(([name, v]) => ({ name, amount: v.amount, color: v.color }))
			.sort((a, b) => b.amount - a.amount);
		const total = rows.reduce((sum, r) => sum + r.amount, 0);
		return { rows, total };
	});

	const savingsAnalytics = computed(() => {
		const cutoffIds = new Set(cutoffsInRange.value.map((c) => c.id));
		const totals: Record<
			string,
			{ builderId?: string; saved: number; target: number; color?: string }
		> = {};

		for (const e of budgetEntries.value) {
			if (!cutoffIds.has(e.cutoffId)) continue;
			if (e.ruleName !== "Savings") continue;
			if (e.parentBudgetEntryId) continue;
			const builder = itemBuilderById(e.itemBuilderId) ?? itemBuilderByName(e.name);
			const key = builder?.name ?? e.name;
			if (!totals[key]) {
				totals[key] = {
					builderId: builder?.id,
					saved: 0,
					target: builder?.targetAmount ?? 0,
					color: builder?.color,
				};
			}
			totals[key].saved += e.amount;
		}

		return Object.entries(totals)
			.map(([name, v]) => ({
				name,
				saved: v.saved,
				target: v.target,
				remaining: Math.max(0, v.target - v.saved),
				percent: v.target > 0 ? pctOf(v.saved, v.target) : 0,
				color: v.color,
			}))
			.sort((a, b) => b.saved - a.saved);
	});

	const wantsAnalytics = computed(() => {
		const o = overview.value;
		const cutoffIds = new Set(cutoffsInRange.value.map((c) => c.id));
		const perItem: Record<string, { amount: number; color?: string }> = {};
		for (const e of budgetEntries.value) {
			if (!cutoffIds.has(e.cutoffId)) continue;
			if (e.ruleName !== "Wants") continue;
			if (e.parentBudgetEntryId) continue;
			const builder = itemBuilderById(e.itemBuilderId) ?? itemBuilderByName(e.name);
			const key = builder?.name ?? e.name;
			if (!perItem[key]) perItem[key] = { amount: 0, color: builder?.color };
			perItem[key].amount += e.amount;
		}
		const top = Object.entries(perItem)
			.map(([name, v]) => ({
				name,
				amount: v.amount,
				percent: pctOf(v.amount, o.wants),
				color: v.color,
			}))
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 5);
		return {
			allotted: o.wantsAllotted,
			spent: o.wants,
			remaining: Math.max(0, o.wantsAllotted - o.wants),
			percent: pctOf(o.wants, o.wantsAllotted),
			top,
		};
	});

	const trendData = computed<ChartData<"line", number[], string>>(() => {
		const finalized = cutoffs.value.filter((c) => c.status === "finalized");
		const months = Array.from(new Set(finalized.map((c) => c.monthKey))).sort();
		const last = months.slice(-6);
		const labels = last.map((m) => monthLabel(m));
		const totals: Record<string, Record<RuleName, number>> = {};
		for (const m of last)
			totals[m] = { Expenses: 0, Savings: 0, Wants: 0 };
		for (const c of finalized) {
			if (!totals[c.monthKey]) continue;
			totals[c.monthKey].Expenses += spentForRuleInCutoff(c.id, "Expenses");
			totals[c.monthKey].Savings += spentForRuleInCutoff(c.id, "Savings");
			totals[c.monthKey].Wants += spentForRuleInCutoff(c.id, "Wants");
		}
		return {
			labels,
			datasets: RULE_ORDER.map((rule) => ({
				label: rule,
				data: last.map((m) => totals[m][rule]),
				borderColor: ruleColor(rule),
				backgroundColor: ruleColor(rule) + "22",
				tension: 0.35,
				borderWidth: 2,
				pointRadius: 3,
				pointBackgroundColor: ruleColor(rule),
				fill: false,
			})),
		};
	});

	const trendOptions = computed<ChartOptions<"line">>(() => ({
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: true,
				position: "bottom",
				labels: {
					color:
						currentTheme.value === "dark"
							? "rgb(230 230 230)"
							: "rgb(60 60 60)",
					font: { size: 11 },
					boxWidth: 10,
					usePointStyle: true,
				},
			},
			tooltip: {
				callbacks: {
					label: (ctx) => `${ctx.dataset.label}: ${formatAmount(Number(ctx.parsed.y))}`,
				},
			},
		},
		scales: {
			x: {
				ticks: {
					color:
						currentTheme.value === "dark"
							? "rgb(200 200 200)"
							: "rgb(90 90 90)",
					font: { size: 10 },
				},
				grid: { display: false },
			},
			y: {
				ticks: {
					color:
						currentTheme.value === "dark"
							? "rgb(200 200 200)"
							: "rgb(90 90 90)",
					font: { size: 10 },
					callback: (v) => `₱${Number(v).toLocaleString("en-PH")}`,
				},
				grid: {
					color:
						currentTheme.value === "dark"
							? "rgba(255, 255, 255, 0.08)"
							: "rgba(0, 0, 0, 0.06)",
				},
			},
		},
	}));

	const hasTrendData = computed(() =>
		(trendData.value.datasets ?? []).some((d) =>
			(d.data as number[]).some((v) => v > 0),
		),
	);

	const unexpectedList = computed(() => {
		const cutoffIds = new Set(cutoffsInRange.value.map((c) => c.id));
		return unexpectedExpenses.value
			.filter((u) => cutoffIds.has(u.cutoffId))
			.sort((a, b) => b.date.localeCompare(a.date));
	});

	const unexpectedTotal = computed(() =>
		unexpectedList.value.reduce((sum, u) => sum + u.excessAmount, 0),
	);

	const topSpending = computed(() => {
		const rows = expensesBreakdown.value.rows.slice(0, 5);
		const total = expensesBreakdown.value.total;
		return rows.map((row) => ({
			...row,
			percent: pctOf(row.amount, total),
		}));
	});

	const insights = computed(() => {
		const items: { icon: typeof LightBulbIcon; text: string; tone: string }[] =
			[];
		const o = overview.value;

		if (!hasData.value) return items;

		const withinAll = budgetVsActual.value.every(
			(r) => r.status.tone === "good",
		);
		if (withinAll) {
			items.push({
				icon: LightBulbIcon,
				text: "You stayed within budget across all rules.",
				tone: "good",
			});
		}

		const nearLimit = budgetVsActual.value.find(
			(r) => r.name !== "Savings" && r.status.tone === "warn",
		);
		if (nearLimit) {
			items.push({
				icon: LightBulbIcon,
				text: `Your ${nearLimit.name} budget is close to reaching its limit (${nearLimit.percent}%).`,
				tone: "warn",
			});
		}

		const over = budgetVsActual.value.find(
			(r) => r.name !== "Savings" && r.status.tone === "bad",
		);
		if (over) {
			items.push({
				icon: LightBulbIcon,
				text: `You went over your ${over.name} budget by ${formatAmount(over.spent - over.allotted)}.`,
				tone: "bad",
			});
		}

		if (o.savingsAllotted > 0) {
			const savingsPercent = pctOf(o.savings, o.savingsAllotted);
			if (savingsPercent >= 100)
				items.push({
					icon: LightBulbIcon,
					text: `Savings target hit at ${savingsPercent}%.`,
					tone: "good",
				});
			else if (savingsPercent >= 80)
				items.push({
					icon: LightBulbIcon,
					text: `Savings reached ${savingsPercent}% of target.`,
					tone: "warn",
				});
		}

		if (o.wantsAllotted > 0 && o.wants < o.wantsAllotted * 0.5) {
			items.push({
				icon: LightBulbIcon,
				text: `You used only ${pctOf(o.wants, o.wantsAllotted)}% of your Wants budget.`,
				tone: "good",
			});
		}

		const top = topSpending.value[0];
		if (top) {
			items.push({
				icon: LightBulbIcon,
				text: `${top.name} is your highest spending category this period.`,
				tone: "info",
			});
		}

		if (unexpectedTotal.value > 0) {
			items.push({
				icon: LightBulbIcon,
				text: `Unexpected expenses total ${formatAmount(unexpectedTotal.value)}.`,
				tone: "bad",
			});
		}

		return items;
	});
</script>

<template>
	<div class="page-shell">
		<header class="page-header">
			<button
				type="button"
				class="back-btn"
				aria-label="Back"
				@click="router.push('/me')"
			>
				<ArrowLeftIcon class="h-5 w-5" />
			</button>
			<h1 class="page-title">Analytics</h1>
			<span class="header-spacer" />
		</header>

		<div class="filters">
			<SelectField
				v-model="period"
				label="Period"
				:options="PERIOD_OPTIONS"
				class="filter-select"
			/>
			<div v-if="period === 'custom'" class="date-range">
				<label class="date-field">
					<span class="date-label">From</span>
					<input v-model="customStart" type="month" class="date-input" />
				</label>
				<label class="date-field">
					<span class="date-label">To</span>
					<input v-model="customEnd" type="month" class="date-input" />
				</label>
			</div>
			<p class="range-label">{{ rangeLabel }}</p>
		</div>

		<div class="analytics-scroll">
			<template v-if="!hasData">
				<GlassContainer class="empty-card">
					<ChartPieIcon class="empty-icon" />
					<p class="empty-title">No analytics available yet.</p>
					<p class="empty-sub">
						Save a cutoff to generate insights from completed periods.
					</p>
				</GlassContainer>
			</template>

			<template v-else>
				<p class="section-heading">Overview</p>
				<div class="overview-grid">
					<GlassContainer
						v-for="card in overviewCards"
						:key="card.key"
						class="overview-card"
					>
						<span class="overview-icon-box" :class="card.iconClass">
							<component :is="card.icon" class="overview-icon" />
						</span>
						<p class="overview-title">{{ card.title }}</p>
						<p class="overview-amount">{{ formatAmount(card.amount) }}</p>
						<p class="overview-sub">{{ card.subtitle }}</p>
					</GlassContainer>
				</div>

				<Divider marginTop="1rem" marginBottom="1rem" />

				<p class="section-heading">Budget Distribution</p>
				<GlassContainer class="section-card">
					<div class="distribution-body">
						<div class="distribution-chart">
							<Doughnut :data="distributionData" :options="distributionOptions" />
						</div>
						<ul class="distribution-legend">
							<li v-for="entry in distributionLegend" :key="entry.name">
								<span class="legend-dot" :style="{ background: entry.color }" />
								<span class="legend-name">{{ entry.name }}</span>
								<span class="legend-amount">{{ formatAmount(entry.amount) }}</span>
								<span class="legend-pct">{{ entry.percent }}%</span>
							</li>
						</ul>
					</div>
				</GlassContainer>

				<Divider marginTop="1rem" marginBottom="1rem" />

				<p class="section-heading">Budget vs Actual</p>
				<GlassContainer
					v-for="row in budgetVsActual"
					:key="row.name"
					class="section-card rule-card"
				>
					<div class="rule-head">
						<p class="rule-name">{{ row.name }}</p>
						<span class="status-badge" :class="`tone-${row.status.tone}`">
							{{ row.status.label }}
						</span>
					</div>
					<div class="rule-row">
						<span class="muted">Allocated</span>
						<span class="strong">{{ formatAmount(row.allotted) }}</span>
					</div>
					<div class="rule-row">
						<span class="muted">
							{{ row.name === "Savings" ? "Saved" : "Spent" }}
						</span>
						<span class="strong">{{ formatAmount(row.spent) }}</span>
					</div>
					<div class="rule-row">
						<span class="muted">
							{{ row.name === "Savings" ? "Remaining Target" : "Remaining" }}
						</span>
						<span class="strong">{{ formatAmount(row.remaining) }}</span>
					</div>
					<div class="progress-track">
						<div
							class="progress-fill"
							:style="{
								width: Math.min(100, row.percent) + '%',
								background:
									row.status.tone === 'bad'
										? 'var(--color-progress-red)'
										: row.status.tone === 'warn'
											? 'var(--color-progress-yellow)'
											: 'var(--color-progress-green)',
							}"
						/>
					</div>
					<p class="rule-percent">{{ row.percent }}% Used</p>
				</GlassContainer>

				<Divider marginTop="1rem" marginBottom="1rem" />

				<p class="section-heading">1st Cutoff vs 2nd Cutoff</p>
				<GlassContainer class="section-card cutoff-combined">
					<div class="cutoff-combined-head">
						<span class="cutoff-title">1st Cutoff</span>
						<span class="cutoff-title">2nd Cutoff</span>
					</div>
					<div
						v-for="(row, i) in cutoffMetrics"
						:key="row.label"
						class="cutoff-combined-row"
						:class="{ zebra: i % 2 === 1 }"
					>
						<div class="cutoff-side">
							<span class="cutoff-side-label">{{ row.label }}</span>
							<span class="cutoff-side-amount">
								{{ row.first !== undefined ? formatAmount(row.first) : "—" }}
							</span>
						</div>
						<div class="cutoff-side">
							<span class="cutoff-side-label">{{ row.label }}</span>
							<span class="cutoff-side-amount">
								{{ row.second !== undefined ? formatAmount(row.second) : "—" }}
							</span>
						</div>
					</div>
				</GlassContainer>

				<Divider marginTop="1rem" marginBottom="1rem" />

				<p class="section-heading">Expenses Breakdown</p>
				<GlassContainer class="section-card">
					<ul v-if="expensesBreakdown.rows.length" class="breakdown-list">
						<li
							v-for="row in expensesBreakdown.rows"
							:key="row.name"
							class="breakdown-row"
						>
							<div class="breakdown-info">
								<span class="breakdown-name">{{ row.name }}</span>
								<span class="breakdown-amount">{{ formatAmount(row.amount) }}</span>
							</div>
							<div class="progress-track">
								<div
									class="progress-fill"
									:style="{
										width:
											pctOf(row.amount, expensesBreakdown.total) + '%',
										background: 'var(--color-accentSolid)',
									}"
								/>
							</div>
							<span class="breakdown-pct">
								{{ pctOf(row.amount, expensesBreakdown.total) }}%
							</span>
						</li>
					</ul>
					<p v-else class="muted small">No expenses recorded in this period.</p>
				</GlassContainer>

				<Divider marginTop="1rem" marginBottom="1rem" />

				<p class="section-heading">Savings Analytics</p>
				<template v-if="savingsAnalytics.length">
					<GlassContainer
						v-for="s in savingsAnalytics"
						:key="s.name"
						class="section-card"
					>
						<p class="rule-name">{{ s.name }}</p>
						<div class="rule-row">
							<span class="muted">Target</span>
							<span class="strong">{{ formatAmount(s.target) }}</span>
						</div>
						<div class="rule-row">
							<span class="muted">Saved</span>
							<span class="strong">{{ formatAmount(s.saved) }}</span>
						</div>
						<div class="rule-row">
							<span class="muted">Remaining</span>
							<span class="strong">{{ formatAmount(s.remaining) }}</span>
						</div>
						<div class="progress-track">
							<div
								class="progress-fill"
								:style="{
									width: Math.min(100, s.percent) + '%',
									background: 'var(--color-progress-green)',
								}"
							/>
						</div>
						<p class="rule-percent">{{ s.percent }}%</p>
					</GlassContainer>
				</template>
				<GlassContainer v-else class="section-card">
					<p class="muted small">No savings recorded in this period.</p>
				</GlassContainer>

				<Divider marginTop="1rem" marginBottom="1rem" />

				<p class="section-heading">Wants Analytics</p>
				<GlassContainer class="section-card">
					<div class="rule-row">
						<span class="muted">Allocated Budget</span>
						<span class="strong">{{ formatAmount(wantsAnalytics.allotted) }}</span>
					</div>
					<div class="rule-row">
						<span class="muted">Spent</span>
						<span class="strong">{{ formatAmount(wantsAnalytics.spent) }}</span>
					</div>
					<div class="rule-row">
						<span class="muted">Remaining</span>
						<span class="strong">{{ formatAmount(wantsAnalytics.remaining) }}</span>
					</div>
					<div class="progress-track">
						<div
							class="progress-fill"
							:style="{
								width: Math.min(100, wantsAnalytics.percent) + '%',
								background:
									wantsAnalytics.percent > 100
										? 'var(--color-progress-red)'
										: 'var(--color-progress-yellow)',
							}"
						/>
					</div>
					<p class="rule-percent">{{ wantsAnalytics.percent }}% Used</p>

					<template v-if="wantsAnalytics.top.length">
						<p class="subgroup-label">Top Wants</p>
						<ul class="breakdown-list">
							<li
								v-for="row in wantsAnalytics.top"
								:key="row.name"
								class="breakdown-row"
							>
								<div class="breakdown-info">
									<span class="breakdown-name">{{ row.name }}</span>
									<span class="breakdown-amount">{{ formatAmount(row.amount) }}</span>
								</div>
								<div class="progress-track">
									<div
										class="progress-fill"
										:style="{
											width: row.percent + '%',
											background: ruleColor('Wants'),
										}"
									/>
								</div>
								<span class="breakdown-pct">{{ row.percent }}%</span>
							</li>
						</ul>
					</template>
				</GlassContainer>

				<Divider marginTop="1rem" marginBottom="1rem" />

				<p class="section-heading">Monthly Trend</p>
				<GlassContainer class="section-card">
					<div v-if="hasTrendData" class="trend-chart">
						<Line :data="trendData" :options="trendOptions" />
					</div>
					<p v-else class="muted small">
						Not enough monthly data yet to show trends.
					</p>
				</GlassContainer>

				<Divider marginTop="1rem" marginBottom="1rem" />

				<p class="section-heading">Unexpected Expenses</p>
				<GlassContainer class="section-card">
					<template v-if="unexpectedList.length">
						<div class="rule-row">
							<span class="muted">Total Unexpected</span>
							<span class="strong text-progress-red">
								{{ formatAmount(unexpectedTotal) }}
							</span>
						</div>
						<Divider marginTop="0.5rem" marginBottom="0.5rem" />
						<ul class="unexpected-list">
							<li
								v-for="u in unexpectedList"
								:key="u.id"
								class="unexpected-row"
							>
								<div class="unexpected-info">
									<span class="unexpected-name">{{ u.itemName }}</span>
									<span class="unexpected-meta">
										{{ u.ruleName }} · {{ u.date }}
									</span>
								</div>
								<div class="unexpected-amounts">
									<span class="unexpected-excess">
										+{{ formatAmount(u.excessAmount) }}
									</span>
									<span class="unexpected-meta">Exceeded</span>
								</div>
							</li>
						</ul>
					</template>
					<p v-else class="muted small">
						No unexpected expenses in this period.
					</p>
				</GlassContainer>

				<Divider marginTop="1rem" marginBottom="1rem" />

				<p class="section-heading">Top Spending Categories</p>
				<GlassContainer class="section-card">
					<ol v-if="topSpending.length" class="ranked-list">
						<li
							v-for="(row, index) in topSpending"
							:key="row.name"
							class="ranked-row"
						>
							<span class="rank-num">{{ index + 1 }}</span>
							<div class="ranked-body">
								<div class="ranked-head">
									<span class="ranked-name">{{ row.name }}</span>
									<span class="ranked-amount">{{ formatAmount(row.amount) }}</span>
								</div>
								<div class="progress-track">
									<div
										class="progress-fill"
										:style="{
											width: row.percent + '%',
											background: 'var(--color-accentSolid)',
										}"
									/>
								</div>
							</div>
							<span class="ranked-pct">{{ row.percent }}%</span>
						</li>
					</ol>
					<p v-else class="muted small">No spending recorded in this period.</p>
				</GlassContainer>

				<Divider marginTop="1rem" marginBottom="1rem" />

				<p class="section-heading">Insights</p>
				<template v-if="insights.length">
					<GlassContainer
						v-for="(insight, i) in insights"
						:key="i"
						class="section-card insight-card"
					>
						<span class="insight-icon" :class="`tone-${insight.tone}`">
							<component
								:is="insight.tone === 'bad' ? ArrowTrendingDownIcon : insight.tone === 'good' ? ArrowTrendingUpIcon : LightBulbIcon"
								class="h-5 w-5"
							/>
						</span>
						<p class="insight-text">{{ insight.text }}</p>
					</GlassContainer>
				</template>
				<GlassContainer v-else class="section-card">
					<p class="muted small">
						Track more activity to unlock insights.
					</p>
				</GlassContainer>
			</template>
		</div>
	</div>
</template>

<style scoped>
	.page-shell {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		gap: 1rem;
		padding-top: 1rem;
		max-width: 480px;
		width: 100%;
	}

	.page-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.7rem;
		border: 1px solid var(--color-inputBorder);
		border-radius: 9999px;
		background: transparent;
		color: var(--color-textPrimary);
		cursor: pointer;
		flex-shrink: 0;
	}

	.back-btn:hover {
		background: var(--color-surfaceHover);
	}

	.header-spacer {
		width: 2rem;
	}

	.page-title {
		flex: 1;
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		text-align: center;
		color: var(--color-textPrimary);
	}

	.filters {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.filter-select {
		flex: 1;
	}

	.date-range {
		display: flex;
		gap: 0.75rem;
	}

	.date-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		flex: 1;
	}

	.date-label {
		font-size: 0.85rem;
		color: var(--color-textSecondary);
	}

	.date-input {
		width: 100%;
		padding: 0.75rem 1rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		background: var(--color-inputBg);
		color: var(--color-inputText);
		font-size: 0.95rem;
		outline: none;
	}

	.range-label {
		margin: 0.15rem 0 0;
		font-size: 0.8rem;
		color: var(--color-textSecondary);
	}

	.analytics-scroll {
		flex: 1 1 0;
		min-height: 0;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
		padding-bottom: calc(6rem + env(safe-area-inset-bottom));
	}

	.section-heading {
		margin: 0 0 0.65rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.section-card {
		margin-bottom: 0.75rem;
	}

	.section-card:last-child {
		margin-bottom: 0;
	}

	.empty-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.5rem;
		padding: 2rem 1rem;
	}

	.empty-icon {
		width: 2.5rem;
		height: 2.5rem;
		color: var(--color-textSecondary);
	}

	.empty-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.empty-sub {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-textSecondary);
	}

	.overview-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.65rem;
	}

	.overview-card {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-height: 8rem;
	}

	.overview-icon-box {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.55rem;
		flex-shrink: 0;
	}

	.overview-icon {
		width: 1.15rem;
		height: 1.15rem;
	}

	.icon-allocated {
		background: rgba(59, 130, 246, 0.15);
	}

	.icon-allocated .overview-icon {
		color: #3b82f6;
	}

	.icon-expenses {
		background: rgba(249, 115, 22, 0.15);
	}

	.icon-expenses .overview-icon {
		color: #f97316;
	}

	.icon-savings {
		background: rgba(16, 185, 129, 0.15);
	}

	.icon-savings .overview-icon {
		color: #10b981;
	}

	.icon-wants {
		background: rgba(168, 85, 247, 0.15);
	}

	.icon-wants .overview-icon {
		color: #a855f7;
	}

	.icon-remaining {
		background: rgba(20, 184, 166, 0.15);
	}

	.icon-remaining .overview-icon {
		color: #14b8a6;
	}

	.overview-title {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-textSecondary);
	}

	.overview-amount {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 700;
		line-height: 1.15;
		color: var(--color-textPrimary);
	}

	.overview-sub {
		margin: 0;
		font-size: 0.7rem;
		color: var(--color-textSecondary);
	}

	.distribution-body {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.distribution-chart {
		width: min(140px, 42vw);
		aspect-ratio: 1;
		flex-shrink: 0;
	}

	.distribution-legend {
		list-style: none;
		margin: 0;
		padding: 0;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		min-width: 0;
	}

	.distribution-legend li {
		display: grid;
		grid-template-columns: 0.75rem 1fr auto;
		align-items: center;
		column-gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--color-textPrimary);
	}

	.legend-dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 9999px;
		display: inline-block;
	}

	.legend-name {
		font-weight: 600;
	}

	.legend-amount {
		grid-column: 2 / 3;
		font-size: 0.75rem;
		color: var(--color-textSecondary);
	}

	.legend-pct {
		grid-row: 1 / span 2;
		grid-column: 3 / 4;
		font-weight: 700;
		color: var(--color-textPrimary);
	}

	.rule-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.rule-name {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.status-badge {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.2rem 0.55rem;
		border-radius: 9999px;
		border: 1px solid transparent;
	}

	.tone-good {
		color: var(--color-progress-green);
		background: rgba(16, 185, 129, 0.12);
		border-color: rgba(16, 185, 129, 0.28);
	}

	.tone-warn {
		color: var(--color-progress-yellow);
		background: rgba(234, 179, 8, 0.14);
		border-color: rgba(234, 179, 8, 0.3);
	}

	.tone-bad {
		color: var(--color-progress-red);
		background: rgba(239, 68, 68, 0.12);
		border-color: rgba(239, 68, 68, 0.3);
	}

	.tone-info {
		color: var(--color-accentSolid);
		background: rgba(213, 132, 85, 0.12);
		border-color: rgba(213, 132, 85, 0.3);
	}

	.tone-muted {
		color: var(--color-textSecondary);
		background: var(--color-surfaceHover);
	}

	.rule-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.2rem 0;
		font-size: 0.9rem;
	}

	.muted {
		color: var(--color-textSecondary);
	}

	.muted.small {
		font-size: 0.85rem;
	}

	.strong {
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.progress-track {
		height: 0.5rem;
		border-radius: 9999px;
		background: var(--color-progress-track);
		border: 1px solid var(--color-progress-track-border);
		box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.6);
		overflow: hidden;
		margin-top: 0.55rem;
	}

	.progress-fill {
		height: 100%;
		border-radius: 9999px;
		transition: width 0.2s;
	}

	.rule-percent {
		margin: 0.35rem 0 0;
		font-size: 0.8rem;
		font-weight: 600;
		text-align: right;
		color: var(--color-textPrimary);
	}

	.cutoff-combined {
		padding: 0;
		overflow: hidden;
	}

	.cutoff-combined-head,
	.cutoff-combined-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}

	.cutoff-combined-head {
		padding: 0.85rem 0;
		border-bottom: 1px solid var(--color-inputBorder);
	}

	.cutoff-combined-head > .cutoff-title:first-child,
	.cutoff-combined-row > .cutoff-side:first-child {
		padding-left: 1rem;
		padding-right: 0.85rem;
		border-right: 1px solid var(--color-inputBorder);
	}

	.cutoff-combined-head > .cutoff-title:last-child,
	.cutoff-combined-row > .cutoff-side:last-child {
		padding-left: 0.85rem;
		padding-right: 1rem;
	}

	.cutoff-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.cutoff-combined-row {
		padding: 0.6rem 0;
	}

	.cutoff-combined-row.zebra {
		background: var(--color-surfaceHover);
	}

	.cutoff-side {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.cutoff-side-label {
		font-size: 0.72rem;
		color: var(--color-textSecondary);
	}

	.cutoff-side-amount {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.breakdown-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.breakdown-row {
		display: grid;
		grid-template-columns: 1fr auto;
		row-gap: 0.35rem;
	}

	.breakdown-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		grid-column: 1 / -1;
	}

	.breakdown-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.breakdown-amount {
		font-size: 0.85rem;
		color: var(--color-textPrimary);
	}

	.breakdown-row .progress-track {
		margin-top: 0;
		grid-column: 1 / 2;
		align-self: center;
	}

	.breakdown-pct {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-textSecondary);
		align-self: center;
		padding-left: 0.5rem;
	}

	.subgroup-label {
		margin: 0.85rem 0 0.5rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-textSecondary);
	}

	.trend-chart {
		height: 220px;
		width: 100%;
	}

	.unexpected-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.unexpected-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.35rem 0;
		border-top: 1px solid var(--color-inputBorder);
	}

	.unexpected-row:first-child {
		border-top: none;
		padding-top: 0;
	}

	.unexpected-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.unexpected-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.unexpected-meta {
		font-size: 0.72rem;
		color: var(--color-textSecondary);
	}

	.unexpected-amounts {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.unexpected-excess {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--color-progress-red);
	}

	.ranked-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.ranked-row {
		display: grid;
		grid-template-columns: 1.5rem 1fr auto;
		column-gap: 0.65rem;
		align-items: center;
	}

	.rank-num {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 9999px;
		background: var(--color-surfaceHover);
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-textPrimary);
	}

	.ranked-body {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.ranked-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.ranked-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.ranked-amount {
		font-size: 0.85rem;
		color: var(--color-textPrimary);
	}

	.ranked-body .progress-track {
		margin-top: 0;
	}

	.ranked-pct {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--color-textPrimary);
	}

	.insight-card {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.insight-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.55rem;
		flex-shrink: 0;
	}

	.insight-icon.tone-good {
		background: rgba(16, 185, 129, 0.15);
		color: var(--color-progress-green);
	}

	.insight-icon.tone-warn {
		background: rgba(234, 179, 8, 0.15);
		color: var(--color-progress-yellow);
	}

	.insight-icon.tone-bad {
		background: rgba(239, 68, 68, 0.15);
		color: var(--color-progress-red);
	}

	.insight-icon.tone-info {
		background: rgba(213, 132, 85, 0.15);
		color: var(--color-accentSolid);
	}

	.insight-text {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-textPrimary);
	}
</style>
