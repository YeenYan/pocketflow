<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import {
		HandThumbUpIcon,
		FaceFrownIcon,
		CalendarDaysIcon,
		BanknotesIcon,
	} from "@heroicons/vue/24/outline";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import Divider from "../../components/divider/Divider.vue";
	import yarsiImg from "../../assets/img/image_1.webp";
	import {
		db,
		type BudgetEntry,
		type CycleCutoff,
		type ItemBuilder,
		type OthersBudget,
		type OthersExpense,
		type RuleExtraBudget,
		type RuleName,
		type SavingsTransfer,
		type TabBudget,
		type TabBudgetExpense,
	} from "../../db/budgetDb";
	import { useTheme } from "../../composables/useTheme";

	const { currentTheme } = useTheme();

	const cutoffs = ref<CycleCutoff[]>([]);
	const budgetEntries = ref<BudgetEntry[]>([]);
	const itemBuilders = ref<ItemBuilder[]>([]);
	const tabBudgets = ref<TabBudget[]>([]);
	const tabBudgetExpenses = ref<TabBudgetExpense[]>([]);
	const othersBudgets = ref<OthersBudget[]>([]);
	const othersExpenses = ref<OthersExpense[]>([]);
	const savingsTransfers = ref<SavingsTransfer[]>([]);
	const ruleExtraBudgets = ref<RuleExtraBudget[]>([]);
	const displayName = ref("");
	const photoUrl = ref("");
	const showAllRecentItems = ref(false);

	const now = new Date();
	const greetingLabel = (() => {
		const hour = now.getHours();
		if (hour < 12) return "Good Morning";
		if (hour < 18) return "Good Afternoon";
		return "Good Evening";
	})();

	const RULE_COLORS: Record<"Expenses" | "Wants", string> = {
		Expenses: "#d96b6b",
		Wants: "#c4b5fd",
	};
	const RULE_COLORS_MUTED: Record<"Expenses" | "Wants", string> = {
		Expenses: "rgba(110, 74, 74, 0.45)",
		Wants: "rgba(79, 74, 102, 0.45)",
	};
	const RULE_COLORS_LIGHT: Record<"Expenses" | "Wants", string> = {
		Expenses: "#b42318",
		Wants: "#5b21b6",
	};
	const RULE_COLORS_MUTED_LIGHT: Record<"Expenses" | "Wants", string> = {
		Expenses: "rgb(255 228 230 / 0.78)",
		Wants: "rgb(237 233 254 / 0.82)",
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
	const SAVINGS_COLOR = "#10b981";

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
		savingsTransfers.value = await db.savingsTransfers.toArray();
		ruleExtraBudgets.value = await db.ruleExtraBudgets.toArray();
	}

	onMounted(loadData);

	const activeCutoff = computed(() => {
		const list = cutoffs.value.filter((c) => c.status !== "finalized");
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
			const dark = currentTheme.value === "dark";
			return {
				name,
				spent,
				percent,
				color: dark ? RULE_COLORS[name] : RULE_COLORS_LIGHT[name],
				bg: dark ? RULE_COLORS_MUTED[name] : RULE_COLORS_MUTED_LIGHT[name],
				fill: progressFillColor(percent),
				offset: CHIP_CIRC * (1 - percent / 100),
			};
		});
	});

	const savingsTarget = computed(
		() => activeCutoff.value?.allocations?.Savings?.amount ?? 0,
	);

	const savingsSaved = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return 0;
		const transferEntryIds = new Set(
			savingsTransfers.value.map((transfer) => transfer.budgetEntryId),
		);
		const mySavingsEntryIds = new Set(
			ruleExtraBudgets.value
				.filter((extra) => extra.source === "mySavings" && extra.budgetEntryId)
				.map((extra) => extra.budgetEntryId!),
		);
		return budgetEntries.value
			.filter(
				(entry) =>
					entry.cutoffId === cutoffId &&
					entry.ruleName === "Savings" &&
					!entry.parentBudgetEntryId &&
					!transferEntryIds.has(entry.id) &&
					!mySavingsEntryIds.has(entry.id),
			)
			.reduce((sum, entry) => sum + entry.amount, 0);
	});

	const savingsPercent = computed(() => {
		if (savingsTarget.value <= 0) return 0;
		return Math.min(
			100,
			Math.max(0, Math.round((savingsSaved.value / savingsTarget.value) * 100)),
		);
	});

	const savingsRingOffset = computed(
		() => SAVE_CIRC * (1 - savingsPercent.value / 100),
	);

	const childItemRows = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return [];
		const rows: Array<{
			id: string;
			name: string;
			amount: number;
			childrenSpent: number;
			percent: number;
		}> = [];
		for (const entry of budgetEntries.value) {
			if (entry.cutoffId !== cutoffId || entry.parentBudgetEntryId) continue;
			const builder = entry.itemBuilderId
				? itemBuilders.value.find((item) => item.id === entry.itemBuilderId)
				: itemBuilders.value.find((item) => item.name === entry.name);
			if (!builder?.hasChildItems) continue;
			const childrenSpent = budgetEntries.value
				.filter((child) => child.parentBudgetEntryId === entry.id)
				.reduce((sum, child) => sum + child.amount, 0);
			const percent =
				entry.amount > 0
					? Math.min(100, Math.round((childrenSpent / entry.amount) * 100))
					: 0;
			rows.push({
				id: entry.id,
				name: builder.name ?? entry.name,
				amount: entry.amount,
				childrenSpent,
				percent,
			});
		}
		return rows;
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

	const recentItems = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return [];
		const transferEntryIds = new Set(
			savingsTransfers.value.map((transfer) => transfer.budgetEntryId),
		);
		const items: Array<{
			id: string;
			name: string;
			amount: number;
			createdAt: string;
		}> = [];

		for (const entry of budgetEntries.value) {
			if (entry.cutoffId !== cutoffId) continue;
			if (transferEntryIds.has(entry.id)) continue;
			const builder = entry.itemBuilderId
				? itemBuilders.value.find((item) => item.id === entry.itemBuilderId)
				: itemBuilders.value.find((item) => item.name === entry.name);
			items.push({
				id: entry.id,
				name: builder?.name ?? entry.name,
				amount: entry.amount,
				createdAt: entry.createdAt,
			});
		}

		for (const expense of tabBudgetExpenses.value) {
			if (expense.cutoffId !== cutoffId) continue;
			items.push({
				id: expense.id,
				name: expense.expenseName,
				amount: expense.amount,
				createdAt: expense.createdAt,
			});
		}

		for (const expense of othersExpenses.value) {
			if (expense.cutoffId !== cutoffId) continue;
			items.push({
				id: expense.id,
				name: expense.expenseName,
				amount: expense.amount,
				createdAt: expense.createdAt,
			});
		}

		return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	});

	const visibleRecentItems = computed(() =>
		showAllRecentItems.value ? recentItems.value : recentItems.value.slice(0, 5),
	);

	const hasMoreRecentItems = computed(() => recentItems.value.length > 5);

	const tipMessage = computed(() => {
		const hl = (text: string) => `<strong class="tip-hl">${text}</strong>`;

		if (!activeCutoff.value) {
			return `Hey! Wanna start tracking? Just set up a cutoff in Tracker and I'll keep an eye on things for you.`;
		}

		const expenses = spendRuleChips.value.find((r) => r.name === "Expenses");
		const wants = spendRuleChips.value.find((r) => r.name === "Wants");
		const expensesSpent = expenses?.spent ?? 0;
		const wantsSpent = wants?.spent ?? 0;
		const expensesPct = expenses?.percent ?? 0;
		const wantsPct = wants?.percent ?? 0;
		const top = expensesSpent >= wantsSpent ? "Expenses" : "Wants";
		const topPct = expensesSpent >= wantsSpent ? expensesPct : wantsPct;
		const left = `₱${Math.round(amountLeft.value).toLocaleString("en-PH")}`;
		const savedPct = savingsPercent.value;
		const spentPct = `${spentPercent.value}%`;

		if (isOverspent.value) {
			const over = `₱${Math.round(spentAmount.value - spendBudgetAmount.value).toLocaleString("en-PH")}`;
			return `Oh noo… you went over by ${hl(over)}. Maybe ease up on the extras for now? You got this. Small cuts still count.`;
		}

		if (spentPercent.value >= 85) {
			return `Heads up! You're already at ${hl(spentPct)} of your budget. Only ${hl(left)} left, so maybe save the non-essentials.`;
		}

		if (savedPct >= 100) {
			return `Keep it up!! Your savings goal is at ${hl(`${savedPct}%`)}. Still got ${hl(left)} to work with, and most of your spend is going to ${hl(top)}.`;
		}

		if (savedPct > 0 && savedPct < 50 && amountLeft.value > 0) {
			return `Hmm, savings is sitting at just ${hl(`${savedPct}%`)}. You've still got ${hl(left)} left. Even a little set aside helps. You got this!`;
		}

		if (topPct >= 80 && amountLeft.value > 0) {
			return `Whoa, ${hl(top)} is already at ${hl(`${topPct}%`)}. You've got ${hl(left)} left overall. Stay mindful and keep it up!!`;
		}

		if (amountLeft.value > 0 && spentPercent.value < 40) {
			return `Nice pace! Only ${hl(spentPct)} spent so far, with ${hl(left)} still free. Most of it's going to ${hl(top)}. Keep it up!!`;
		}

		if (amountLeft.value > 0) {
			return `Looking good! You've got ${hl(left)} left. Most spending is on ${hl(top)} at ${hl(`${topPct}%`)}. Keep it up!!`;
		}

		return `Oh noo, budget's all used up. Stick to needs only until the next cutoff, okay?`;
	});
</script>

<template>
	<div class="page-shell relative">
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

		<div class="tip-card absolute z-[99] top-[5.5rem]">
			<img :src="yarsiImg" alt="" class="tip-mascot" />
			<div class="tip-bubble max-w-[15rem]">
				<p class="tip-name">Poko</p>
				<p class="tip-message" v-html="tipMessage" />
			</div>
		</div>

		<GlassContainer class="hero mt-[7rem]">
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
			<div class="savings-card">
				<span
					class="savings-icon-wrap bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300"
				>
					<BanknotesIcon class="savings-icon" />
				</span>
				<div class="savings-main">
					<div class="flex justify-between items-center gap-2">
						<span class="savings-name">Savings</span>
						<p class="savings-amount">
							<span class="savings-saved"
								>₱{{ savingsSaved.toLocaleString("en-PH") }}</span
							>
							<span class="savings-target">
								of ₱{{ savingsTarget.toLocaleString("en-PH") }}
							</span>
						</p>
					</div>
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
							:stroke="SAVINGS_COLOR"
							:stroke-dasharray="SAVE_CIRC"
							:stroke-dashoffset="savingsRingOffset"
						/>
					</svg>
					<span class="savings-ring-pct" :style="{ color: SAVINGS_COLOR }">
						{{ savingsPercent }}%
					</span>
				</div>
			</div>
		</GlassContainer>

		<template v-if="activeCutoff">
			<Divider margin-top="0" margin-bottom="0" />

			<GlassContainer class="child-items-section">
				<div v-for="row in budgetOthersRows" :key="row.name" class="child-item-row">
					<p class="child-item-name">{{ row.name }}</p>
					<div class="child-item-head">
						<p class="child-item-label">
							Alloted:
							<span class="child-item-budget"
								>₱{{ row.allocated.toLocaleString("en-PH") }}</span
							>
						</p>
						<p class="child-item-pct">( {{ row.percent }}% )</p>
					</div>
					<div class="child-item-track">
						<div
							class="child-item-fill"
							:style="{
								width: row.percent + '%',
								background: progressFillColor(row.percent),
							}"
						/>
					</div>
					<div class="child-item-foot">
						<p class="child-item-spent-amount">
							₱{{ row.spent.toLocaleString("en-PH") }} spent
						</p>
						<p class="child-item-left-amount">
							₱{{ Math.max(0, row.allocated - row.spent).toLocaleString("en-PH") }}
							left
						</p>
					</div>
				</div>
			</GlassContainer>
		</template>

		<template v-if="activeCutoff && childItemRows.length">
			<Divider margin-top="0" margin-bottom="0" />

			<GlassContainer class="child-items-section">
				<div v-for="row in childItemRows" :key="row.id" class="child-item-row">
					<p class="child-item-name">{{ row.name }}</p>
					<div class="child-item-head">
						<p class="child-item-label">
							Alloted:
							<span class="child-item-budget"
								>₱{{ row.amount.toLocaleString("en-PH") }}</span
							>
						</p>
						<p class="child-item-pct">( {{ row.percent }}% )</p>
					</div>
					<div class="child-item-track">
						<div
							class="child-item-fill"
							:style="{
								width: row.percent + '%',
								background: progressFillColor(row.percent),
							}"
						/>
					</div>
					<div class="child-item-foot">
						<p class="child-item-spent-amount">
							₱{{ row.childrenSpent.toLocaleString("en-PH") }} spent
						</p>
						<p class="child-item-left-amount">
							₱{{
								Math.max(0, row.amount - row.childrenSpent).toLocaleString(
									"en-PH",
								)
							}}
							left
						</p>
					</div>
				</div>
			</GlassContainer>
		</template>

		<template v-if="activeCutoff && recentItems.length">
			<Divider margin-top="0" margin-bottom="0" />

			<GlassContainer class="recent-items-section">
				<p class="recent-items-title">Recent Items</p>
				<ul class="recent-items-list">
					<li
						v-for="item in visibleRecentItems"
						:key="item.id"
						class="recent-item-row"
					>
						<span class="recent-item-name">{{ item.name }}</span>
						<span class="recent-item-amount"
							>₱{{ item.amount.toLocaleString("en-PH") }}</span
						>
					</li>
				</ul>
				<button
					v-if="hasMoreRecentItems && !showAllRecentItems"
					type="button"
					class="recent-items-more"
					@click="showAllRecentItems = true"
				>
					Show more
				</button>
				<button
					v-if="hasMoreRecentItems && showAllRecentItems"
					type="button"
					class="recent-items-more"
					@click="showAllRecentItems = false"
				>
					Show less
				</button>
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

	.tip-card {
		display: flex;
		width: 100%;
		max-width: 480px;
		align-items: flex-end;
		gap: 0.35rem;
	}

	.tip-mascot {
		width: 8.5rem;
		height: auto;
		flex-shrink: 0;
		object-fit: contain;
		align-self: flex-end;
	}

	.tip-bubble {
		position: relative;
		flex: 1;
		min-width: 0;
		margin-bottom: 0.75rem;
		padding: 0.75rem 0.9rem;
		border-radius: 1rem;
		background: #ffd0b0;
		border: 1px solid color-mix(in srgb, #ffd0b0 70%, #000 8%);
		box-shadow: 0 5px 10px color-mix(in srgb, #000 40%, transparent);
	}

	.tip-bubble::before {
		content: "";
		position: absolute;
		left: -0.4rem;
		bottom: 3rem;
		width: 0.75rem;
		height: 0.75rem;
		background: #ffd0b0;
		border-left: 1px solid color-mix(in srgb, #ffd0b0 70%, #000 8%);
		border-bottom: 1px solid color-mix(in srgb, #ffd0b0 70%, #000 8%);
		transform: rotate(45deg);
	}

	.tip-name {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 700;
		color: #c2410c;
	}

	.tip-message {
		margin: 0.25rem 0 0;
		font-size: 0.8rem;
		line-height: 1.35;
		color: #1f2937;
	}

	.tip-message :deep(.tip-hl) {
		font-weight: 700;
		color: #9a3412;
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

	:global(:root:not(.dark)) .rule-chip {
		border: 1px solid rgb(255 255 255 / 0.7);
		box-shadow:
			0 4px 14px rgb(0 0 0 / 0.05),
			inset 0 1px 0 rgb(255 255 255 / 0.8);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
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

	:global(:root:not(.dark)) .rule-chip-track {
		stroke: rgb(0 0 0 / 0.1);
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
		border-radius: 0.5rem;
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
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		line-height: 1.2;
		flex-shrink: 0;
	}

	.savings-saved {
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.savings-target {
		margin-left: 0.2rem;
		font-weight: 500;
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

	.child-items-section {
		width: 100%;
		max-width: 480px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.child-item-name {
		margin: 0 0 0.35rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.child-item-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.25rem;
	}

	.child-item-label {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-textSecondary);
	}

	.child-item-budget {
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--color-textPrimary);
	}

	.child-item-pct {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.child-item-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 0.35rem;
	}

	.child-item-spent-amount,
	.child-item-left-amount {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-textSecondary);
	}

	.child-item-track {
		height: 0.5rem;
		border-radius: 9999px;
		background: var(--color-progress-track);
		border: 1px solid var(--color-progress-track-border);
		box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.6);
		overflow: hidden;
	}

	.child-item-fill {
		height: 100%;
		border-radius: 9999px;
		transition:
			width 0.2s,
			background-color 0.2s;
	}

	.recent-items-section {
		width: 100%;
		max-width: 480px;
	}

	.recent-items-title {
		margin: 0 0 0.85rem;
		font-size: 1.2rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.recent-items-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.recent-item-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.recent-item-name {
		min-width: 0;
		font-size: 0.9rem;
		color: var(--color-textPrimary);
	}

	.recent-item-amount {
		flex-shrink: 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.recent-items-more {
		display: block;
		width: 100%;
		margin-top: 0.85rem;
		padding: 0;
		border: none;
		background: none;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-info);
		cursor: pointer;
		text-align: center;
	}
</style>
