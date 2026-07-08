<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import * as OutlineIcons from "@heroicons/vue/24/outline";
	import {
		HandThumbUpIcon,
		FaceFrownIcon,
		CalendarDaysIcon,
	} from "@heroicons/vue/24/outline";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import Divider from "../../components/divider/Divider.vue";
	import {
		db,
		type BudgetEntry,
		type CycleCutoff,
		type ItemBuilder,
		type OthersBudget,
		type OthersExpense,
		type RuleName,
		type TabBudget,
		type TabBudgetExpense,
	} from "../../db/budgetDb";

	const cutoffs = ref<CycleCutoff[]>([]);
	const budgetEntries = ref<BudgetEntry[]>([]);
	const itemBuilders = ref<ItemBuilder[]>([]);
	const tabBudgets = ref<TabBudget[]>([]);
	const tabBudgetExpenses = ref<TabBudgetExpense[]>([]);
	const othersBudgets = ref<OthersBudget[]>([]);
	const othersExpenses = ref<OthersExpense[]>([]);
	const displayName = ref("");
	const photoUrl = ref("");

	const now = new Date();
	const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const greetingLabel = (() => {
		const hour = now.getHours();
		if (hour < 12) return "Good Morning";
		if (hour < 18) return "Good Afternoon";
		return "Good Evening";
	})();

	const ITEM_COLOR_OPTIONS = [
		{
			value: "slate-500",
			wrap:
				"bg-slate-500/15 dark:bg-slate-500/25 text-slate-700 dark:text-slate-200",
			hex: "#64748b",
		},
		{
			value: "gray-500",
			wrap: "bg-gray-500/15 dark:bg-gray-500/25 text-gray-700 dark:text-gray-200",
			hex: "#6b7280",
		},
		{
			value: "zinc-500",
			wrap: "bg-zinc-500/15 dark:bg-zinc-500/25 text-zinc-700 dark:text-zinc-200",
			hex: "#71717a",
		},
		{
			value: "neutral-500",
			wrap:
				"bg-neutral-500/15 dark:bg-neutral-500/25 text-neutral-700 dark:text-neutral-200",
			hex: "#737373",
		},
		{
			value: "stone-500",
			wrap:
				"bg-stone-500/15 dark:bg-stone-500/25 text-stone-700 dark:text-stone-200",
			hex: "#78716c",
		},
		{
			value: "red-500",
			wrap: "bg-red-500/15 dark:bg-red-500/25 text-red-700 dark:text-red-300",
			hex: "#ef4444",
		},
		{
			value: "orange-500",
			wrap:
				"bg-orange-500/15 dark:bg-orange-500/25 text-orange-700 dark:text-orange-300",
			hex: "#f97316",
		},
		{
			value: "amber-500",
			wrap:
				"bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300",
			hex: "#f59e0b",
		},
		{
			value: "yellow-500",
			wrap:
				"bg-yellow-500/15 dark:bg-yellow-500/25 text-yellow-700 dark:text-yellow-300",
			hex: "#eab308",
		},
		{
			value: "lime-500",
			wrap: "bg-lime-500/15 dark:bg-lime-500/25 text-lime-700 dark:text-lime-300",
			hex: "#84cc16",
		},
		{
			value: "green-500",
			wrap:
				"bg-green-500/15 dark:bg-green-500/25 text-green-700 dark:text-green-300",
			hex: "#22c55e",
		},
		{
			value: "emerald-500",
			wrap:
				"bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300",
			hex: "#10b981",
		},
		{
			value: "teal-500",
			wrap: "bg-teal-500/15 dark:bg-teal-500/25 text-teal-700 dark:text-teal-300",
			hex: "#14b8a6",
		},
		{
			value: "cyan-500",
			wrap: "bg-cyan-500/15 dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300",
			hex: "#06b6d4",
		},
		{
			value: "sky-500",
			wrap: "bg-sky-500/15 dark:bg-sky-500/25 text-sky-700 dark:text-sky-300",
			hex: "#0ea5e9",
		},
		{
			value: "blue-500",
			wrap: "bg-blue-500/15 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300",
			hex: "#3b82f6",
		},
		{
			value: "indigo-500",
			wrap:
				"bg-indigo-500/15 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300",
			hex: "#6366f1",
		},
		{
			value: "violet-500",
			wrap:
				"bg-violet-500/15 dark:bg-violet-500/25 text-violet-700 dark:text-violet-300",
			hex: "#8b5cf6",
		},
		{
			value: "purple-500",
			wrap:
				"bg-purple-500/15 dark:bg-purple-500/25 text-purple-700 dark:text-purple-300",
			hex: "#a855f7",
		},
		{
			value: "fuchsia-500",
			wrap:
				"bg-fuchsia-500/15 dark:bg-fuchsia-500/25 text-fuchsia-700 dark:text-fuchsia-300",
			hex: "#d946ef",
		},
		{
			value: "pink-500",
			wrap: "bg-pink-500/15 dark:bg-pink-500/25 text-pink-700 dark:text-pink-300",
			hex: "#ec4899",
		},
		{
			value: "rose-500",
			wrap: "bg-rose-500/15 dark:bg-rose-500/25 text-rose-700 dark:text-rose-300",
			hex: "#f43f5e",
		},
	];
	const DEFAULT_ITEM_COLOR = "emerald-500";

	const RULE_COLORS: Record<"Expenses" | "Wants", string> = {
		Expenses: "#d96b6b",
		Wants: "#c4b5fd",
	};
	const RULE_COLORS_MUTED: Record<"Expenses" | "Wants", string> = {
		Expenses: "rgba(110, 74, 74, 0.45)",
		Wants: "rgba(79, 74, 102, 0.45)",
	};

	const GAUGE_CX = 100;
	const GAUGE_CY = 100;
	const PROGRESS_RADIUS = 70;
	const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;
	const TICK_COUNT = 40;
	const CHIP_R = 14;
	const CHIP_CIRC = 2 * Math.PI * CHIP_R;
	const SAVE_R = 18;
	const SAVE_CIRC = 2 * Math.PI * SAVE_R;

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
		const profile = await db.userProfiles.get(1);
		if (profile) {
			displayName.value = profile.displayName;
			photoUrl.value = profile.photoUrl || "";
		}
		cutoffs.value = await db.cycleCutoffs.toArray();
		budgetEntries.value = await db.budgetEntries.toArray();
		itemBuilders.value = await db.itemBuilders.toArray();
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

	const spendBudgetAmount = computed(() => {
		const allocations = activeCutoff.value?.allocations;
		return (
			(allocations?.Expenses?.amount ?? 0) + (allocations?.Wants?.amount ?? 0)
		);
	});

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

	const tabBudgetAllocated = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return 0;
		return (
			tabBudgets.value.find(
				(b) => b.cutoffId === cutoffId && b.ruleName === "Expenses",
			)?.budgetAllocated ?? 0
		);
	});

	const tabBudgetSpent = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return 0;
		return tabBudgetExpenses.value
			.filter((e) => e.cutoffId === cutoffId && e.ruleName === "Expenses")
			.reduce((sum, e) => sum + e.amount, 0);
	});

	const othersReserved = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return 0;
		const budget =
			othersBudgets.value.find((b) => b.cutoffId === cutoffId) ?? null;
		const expenses = othersExpenses.value.filter((e) => e.cutoffId === cutoffId);
		const allocated = budget?.budgetAllocated ?? 0;
		const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
		return Math.max(allocated, spent);
	});

	const othersAllocated = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return 0;
		return (
			othersBudgets.value.find((b) => b.cutoffId === cutoffId)?.budgetAllocated ??
			0
		);
	});

	const othersSpent = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return 0;
		return othersExpenses.value
			.filter((e) => e.cutoffId === cutoffId)
			.reduce((sum, e) => sum + e.amount, 0);
	});

	const spentAmount = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return 0;
		const entriesSum = budgetEntries.value
			.filter(
				(entry) =>
					entry.cutoffId === cutoffId &&
					!entry.parentBudgetEntryId &&
					entry.ruleName !== "Savings",
			)
			.reduce((sum, entry) => sum + entry.amount, 0);
		return entriesSum + tabBudgetReserved.value + othersReserved.value;
	});

	const spentPercent = computed(() => {
		if (spendBudgetAmount.value <= 0) return 0;
		return Math.round((spentAmount.value / spendBudgetAmount.value) * 100);
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
		() =>
			spendBudgetAmount.value > 0 && spentAmount.value > spendBudgetAmount.value,
	);

	const amountLeft = computed(() =>
		Math.max(0, spendBudgetAmount.value - spentAmount.value),
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

	const spendRuleChips = computed(() => {
		const cutoff = activeCutoff.value;
		if (!cutoff) return [];
		const names: Array<"Expenses" | "Wants"> = ["Expenses", "Wants"];
		return names.map((name) => {
			const entriesSum = budgetEntries.value
				.filter(
					(entry) =>
						entry.cutoffId === cutoff.id &&
						entry.ruleName === name &&
						!entry.parentBudgetEntryId,
				)
				.reduce((sum, entry) => sum + entry.amount, 0);
			const spent =
				name === "Expenses"
					? entriesSum + tabBudgetReserved.value + othersReserved.value
					: entriesSum;
			const allotted = cutoff.allocations?.[name as RuleName]?.amount ?? 0;
			const percent =
				allotted > 0 ? Math.min(100, Math.round((spent / allotted) * 100)) : 0;
			return {
				name,
				spent,
				percent,
				color: RULE_COLORS[name],
				bg: RULE_COLORS_MUTED[name],
				fill: progressFillColor(percent),
				offset: CHIP_CIRC * (1 - percent / 100),
			};
		});
	});

	const savingsItems = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return [];
		return budgetEntries.value
			.filter(
				(entry) =>
					entry.cutoffId === cutoffId &&
					entry.ruleName === "Savings" &&
					!entry.parentBudgetEntryId,
			)
			.map((entry) => {
				const builder = entry.itemBuilderId
					? itemBuilders.value.find((item) => item.id === entry.itemBuilderId)
					: itemBuilders.value.find((item) => item.name === entry.name);
				const color = builder?.color ?? DEFAULT_ITEM_COLOR;
				const colorOption =
					ITEM_COLOR_OPTIONS.find((option) => option.value === color) ??
					ITEM_COLOR_OPTIONS.find((option) => option.value === DEFAULT_ITEM_COLOR)!;
				const childrenSum = budgetEntries.value
					.filter((child) => child.parentBudgetEntryId === entry.id)
					.reduce((sum, child) => sum + child.amount, 0);
				const saved = builder?.hasChildItems ? childrenSum : entry.amount;
				const percent =
					entry.amount > 0
						? Math.min(100, Math.round((saved / entry.amount) * 100))
						: 0;
				return {
					id: entry.id,
					target: entry.amount,
					saved,
					percent,
					icon: builder?.icon ?? "HomeIcon",
					iconWrapClass: colorOption.wrap,
					color: colorOption.hex,
					offset: SAVE_CIRC * (1 - percent / 100),
				};
			});
	});

	const budgetOthersRows = computed(() => {
		const tabPercent =
			tabBudgetAllocated.value > 0
				? Math.min(
						100,
						Math.round((tabBudgetSpent.value / tabBudgetAllocated.value) * 100),
					)
				: 0;
		const othersPercent =
			othersAllocated.value > 0
				? Math.min(
						100,
						Math.round((othersSpent.value / othersAllocated.value) * 100),
					)
				: 0;
		return [
			{
				name: "Budget for this Cutoff",
				allocated: tabBudgetAllocated.value,
				spent: tabBudgetSpent.value,
				percent: tabPercent,
			},
			{
				name: "Budget for Other expenses",
				allocated: othersAllocated.value,
				spent: othersSpent.value,
				percent: othersPercent,
			},
		];
	});
</script>

<template>
	<div class="page-shell">
		<div class="greeting">
			<img v-if="photoUrl" :src="photoUrl" alt="" class="greeting-avatar" />
			<div v-else class="greeting-avatar greeting-avatar--placeholder">
				{{ displayName.charAt(0) || "?" }}
			</div>
			<div class="greeting-text">
				<p class="greeting-hello">{{ greetingLabel }}!</p>
				<p class="greeting-welcome">
					Welcome back{{ displayName ? ` ${displayName}` : "" }}
				</p>
			</div>
		</div>

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

			<p class="hero-headline">
				{{ activeCutoff ? displayLeft : "No cutoff set" }}
			</p>
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
							stroke: isOverspent ? '#d96b6b' : progressFillColor(spentPercent),
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

			<div v-if="activeCutoff" class="rule-chips">
				<div
					v-for="rule in spendRuleChips"
					:key="rule.name"
					class="rule-chip"
					:style="{ background: rule.bg }"
				>
					<svg class="rule-chip-ring" viewBox="0 0 36 36" aria-hidden="true">
						<circle class="rule-chip-track" cx="18" cy="18" :r="CHIP_R" fill="none" />
						<circle
							class="rule-chip-fill"
							cx="18"
							cy="18"
							:r="CHIP_R"
							fill="none"
							:stroke="rule.fill"
							:stroke-dasharray="CHIP_CIRC"
							:stroke-dashoffset="rule.offset"
						/>
					</svg>
					<div class="rule-chip-text">
						<span class="rule-chip-name">{{ rule.name }}</span>
						<span class="rule-chip-spent" :style="{ color: rule.color }">
							₱{{ rule.spent.toLocaleString("en-PH") }} spent
						</span>
					</div>
				</div>
			</div>
		</GlassContainer>

		<GlassContainer v-if="activeCutoff" class="savings-section">
			<div v-if="savingsItems.length" class="savings-list">
				<div v-for="item in savingsItems" :key="item.id" class="savings-card">
					<span class="savings-icon-wrap" :class="item.iconWrapClass">
						<component
							:is="OutlineIcons[item.icon as keyof typeof OutlineIcons]"
							class="savings-icon"
						/>
					</span>
					<div class="savings-main">
						<p class="savings-name">Savings</p>
						<p class="savings-amount">
							<span class="savings-saved"
								>₱{{ item.saved.toLocaleString("en-PH") }}</span
							>
							<span class="savings-target">
								of ₱{{ item.target.toLocaleString("en-PH") }}
							</span>
						</p>
					</div>
					<div class="savings-ring-wrap">
						<svg class="savings-ring" viewBox="0 0 44 44" aria-hidden="true">
							<circle
								class="savings-ring-track"
								cx="22"
								cy="22"
								:r="SAVE_R"
								fill="none"
							/>
							<circle
								class="savings-ring-fill"
								cx="22"
								cy="22"
								:r="SAVE_R"
								fill="none"
								:stroke="item.color"
								:stroke-dasharray="SAVE_CIRC"
								:stroke-dashoffset="item.offset"
							/>
						</svg>
						<span class="savings-ring-pct" :style="{ color: item.color }">
							{{ item.percent }}%
						</span>
					</div>
				</div>
			</div>
			<p v-else class="savings-empty">No savings items yet</p>
		</GlassContainer>

		<template v-if="activeCutoff">
			<Divider margin-top="0" margin-bottom="0" />

			<GlassContainer class="budget-others-section">
				<div
					v-for="row in budgetOthersRows"
					:key="row.name"
					class="budget-others-row"
				>
					<p class="budget-others-name">{{ row.name }}</p>
					<p class="budget-others-allocated">
						₱{{ row.allocated.toLocaleString("en-PH") }}
					</p>
					<div class="budget-others-meta">
						<span class="budget-others-spent"
							>-₱{{ row.spent.toLocaleString("en-PH") }} spent</span
						>
						<span class="budget-others-pct">{{ row.percent }}%</span>
					</div>
					<div class="budget-others-track">
						<div
							class="budget-others-fill"
							:style="{
								width: row.percent + '%',
								background: progressFillColor(row.percent),
							}"
						/>
					</div>
				</div>
			</GlassContainer>
		</template>
	</div>
</template>

<style scoped>
	.page-shell {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		align-items: stretch;
		justify-content: flex-start;
		gap: 1rem;
		padding-top: 1rem;
		padding-bottom: calc(6rem + env(safe-area-inset-bottom));
		overflow-y: auto;
	}

	.greeting {
		display: flex;
		width: 100%;
		max-width: 480px;
		align-items: center;
		gap: 0.85rem;
	}

	.greeting-avatar {
		width: 3.25rem;
		height: 3.25rem;
		flex-shrink: 0;
		border-radius: 9999px;
		object-fit: cover;
	}

	.greeting-avatar--placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-userAvatar);
		color: var(--color-onColor);
		font-size: 1.1rem;
		font-weight: 700;
	}

	.greeting-text {
		min-width: 0;
	}

	.greeting-hello {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 700;
		line-height: 1.2;
		color: var(--color-textPrimary);
	}

	.greeting-welcome {
		margin: 0.2rem 0 0;
		font-size: 0.9rem;
		color: var(--color-textSecondary);
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

	.rule-chips {
		display: flex;
		width: 100%;
		gap: 0.65rem;
		margin-top: 0.75rem;
	}

	.rule-chip {
		display: flex;
		min-width: 0;
		flex: 1;
		align-items: center;
		gap: 0.55rem;
		padding: 0.55rem 0.7rem;
		border-radius: 9999px;
	}

	.rule-chip-ring {
		width: 2.1rem;
		height: 2.1rem;
		flex-shrink: 0;
		transform: rotate(-90deg);
	}

	.rule-chip-track {
		stroke: rgba(255, 255, 255, 0.18);
		stroke-width: 3;
	}

	.rule-chip-fill {
		stroke-width: 3;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.2s ease;
	}

	.rule-chip-text {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 0.1rem;
	}

	.rule-chip-name {
		font-size: 0.85rem;
		font-weight: 600;
		line-height: 1.15;
		color: var(--color-textPrimary);
	}

	.rule-chip-spent {
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.15;
	}

	.savings-section {
		width: 100%;
		max-width: 480px;
	}

	.savings-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.savings-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.savings-icon-wrap {
		display: inline-flex;
		width: 2.5rem;
		height: 2.5rem;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border-radius: 0.65rem;
	}

	.savings-icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.savings-main {
		min-width: 0;
		flex: 1;
	}

	.savings-name {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.savings-amount {
		margin: 0.2rem 0 0;
		font-size: 0.8rem;
		line-height: 1.2;
	}

	.savings-saved {
		font-weight: 700;
		color: var(--color-textPrimary);
	}

	.savings-target {
		margin-left: 0.2rem;
		color: var(--color-textSecondary);
	}

	.savings-ring-wrap {
		position: relative;
		width: 3rem;
		height: 3rem;
		flex-shrink: 0;
	}

	.savings-ring {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.savings-ring-track {
		stroke: var(--color-inputBorder);
		stroke-width: 3.5;
		opacity: 0.55;
	}

	.savings-ring-fill {
		stroke-width: 3.5;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.2s ease;
	}

	.savings-ring-pct {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		font-weight: 700;
	}

	.savings-empty {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-textSecondary);
	}

	.budget-others-section {
		width: 100%;
		max-width: 480px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.budget-others-row {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.budget-others-name {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.budget-others-allocated {
		margin: 0.15rem 0 0;
		font-size: 0.8rem;
		color: var(--color-textSecondary);
	}

	.budget-others-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.budget-others-spent {
		font-size: 0.85rem;
		color: var(--color-textSecondary);
	}

	.budget-others-pct {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.budget-others-track {
		height: 0.5rem;
		border-radius: 9999px;
		background: var(--color-inputBorder);
		overflow: hidden;
	}

	.budget-others-fill {
		height: 100%;
		border-radius: 9999px;
		transition:
			width 0.2s,
			background-color 0.2s;
	}
</style>
