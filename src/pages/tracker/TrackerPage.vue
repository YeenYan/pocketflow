<script setup lang="ts">
	import { computed, onMounted, ref, watch } from "vue";
	import { PaperAirplaneIcon } from "@heroicons/vue/24/outline";
	import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
	import Divider from "../../components/divider/Divider.vue";
	import ItemBuilderDrawer, {
		type ItemBuilderFormData,
	} from "../../components/item-builder/ItemBuilderDrawer.vue";
	import {
		buildCutoffAllocations,
		createId,
		db,
		FIXED_RULES,
		type CycleCutoff,
		type ItemBuilder,
		type BudgetEntry,
		type OthersBudget,
		type OthersExpense,
		type TabBudget,
		type TabBudgetExpense,
		type Rule,
		type RuleName,
		type UnexpectedExpenseSource,
		type UnexpectedExpense,
	} from "../../db/budgetDb";
	import PeriodNavSection from "./partials/sections/PeriodNavSection.vue";
	import CutoffBudgetSection from "./partials/sections/CutoffBudgetSection.vue";
	import TabsSection from "./partials/sections/TabsSection.vue";
	import RuleSection from "./partials/sections/RuleSection.vue";
	import ItemsSection, {
		type ItemEntry,
	} from "./partials/sections/ItemsSection.vue";
	import OthersSection from "./partials/sections/OthersSection.vue";
	import BudgetSection from "./partials/sections/BudgetSection.vue";
	import OtherItemsSection from "./partials/sections/OtherItemsSection.vue";
	import CutoffModal from "./partials/modals/CutoffModal.vue";
	import AddItemModal from "./partials/modals/AddItemModal.vue";
	import EditItemDrawer from "./partials/modals/EditItemDrawer.vue";
	import SubItemModal from "./partials/modals/SubItemModal.vue";
	import OthersBudgetModal from "./partials/modals/OthersBudgetModal.vue";
	import OthersItemModal from "./partials/modals/OthersItemModal.vue";
	import TabBudgetModal from "./partials/modals/TabBudgetModal.vue";
	import TabBudgetItemModal from "./partials/modals/TabBudgetItemModal.vue";
	import UnexpectedDrawer from "./partials/modals/UnexpectedDrawer.vue";
	import ExceedModal from "./partials/modals/ExceedModal.vue";
	import FinalizeModal from "./partials/modals/FinalizeModal.vue";

	const ITEM_COLOR_OPTIONS = [
		{
			value: "slate-500",
			swatch: "bg-slate-500",
			wrap:
				"bg-slate-500/15 dark:bg-slate-500/25 text-slate-700 dark:text-slate-200",
		},
		{
			value: "gray-500",
			swatch: "bg-gray-500",
			wrap: "bg-gray-500/15 dark:bg-gray-500/25 text-gray-700 dark:text-gray-200",
		},
		{
			value: "zinc-500",
			swatch: "bg-zinc-500",
			wrap: "bg-zinc-500/15 dark:bg-zinc-500/25 text-zinc-700 dark:text-zinc-200",
		},
		{
			value: "neutral-500",
			swatch: "bg-neutral-500",
			wrap:
				"bg-neutral-500/15 dark:bg-neutral-500/25 text-neutral-700 dark:text-neutral-200",
		},
		{
			value: "stone-500",
			swatch: "bg-stone-500",
			wrap:
				"bg-stone-500/15 dark:bg-stone-500/25 text-stone-700 dark:text-stone-200",
		},
		{
			value: "red-500",
			swatch: "bg-red-500",
			wrap: "bg-red-500/15 dark:bg-red-500/25 text-red-700 dark:text-red-300",
		},
		{
			value: "orange-500",
			swatch: "bg-orange-500",
			wrap:
				"bg-orange-500/15 dark:bg-orange-500/25 text-orange-700 dark:text-orange-300",
		},
		{
			value: "amber-500",
			swatch: "bg-amber-500",
			wrap:
				"bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300",
		},
		{
			value: "yellow-500",
			swatch: "bg-yellow-500",
			wrap:
				"bg-yellow-500/15 dark:bg-yellow-500/25 text-yellow-700 dark:text-yellow-300",
		},
		{
			value: "lime-500",
			swatch: "bg-lime-500",
			wrap: "bg-lime-500/15 dark:bg-lime-500/25 text-lime-700 dark:text-lime-300",
		},
		{
			value: "green-500",
			swatch: "bg-green-500",
			wrap:
				"bg-green-500/15 dark:bg-green-500/25 text-green-700 dark:text-green-300",
		},
		{
			value: "emerald-500",
			swatch: "bg-emerald-500",
			wrap:
				"bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300",
		},
		{
			value: "teal-500",
			swatch: "bg-teal-500",
			wrap: "bg-teal-500/15 dark:bg-teal-500/25 text-teal-700 dark:text-teal-300",
		},
		{
			value: "cyan-500",
			swatch: "bg-cyan-500",
			wrap: "bg-cyan-500/15 dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300",
		},
		{
			value: "sky-500",
			swatch: "bg-sky-500",
			wrap: "bg-sky-500/15 dark:bg-sky-500/25 text-sky-700 dark:text-sky-300",
		},
		{
			value: "blue-500",
			swatch: "bg-blue-500",
			wrap: "bg-blue-500/15 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300",
		},
		{
			value: "indigo-500",
			swatch: "bg-indigo-500",
			wrap:
				"bg-indigo-500/15 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300",
		},
		{
			value: "violet-500",
			swatch: "bg-violet-500",
			wrap:
				"bg-violet-500/15 dark:bg-violet-500/25 text-violet-700 dark:text-violet-300",
		},
		{
			value: "purple-500",
			swatch: "bg-purple-500",
			wrap:
				"bg-purple-500/15 dark:bg-purple-500/25 text-purple-700 dark:text-purple-300",
		},
		{
			value: "fuchsia-500",
			swatch: "bg-fuchsia-500",
			wrap:
				"bg-fuchsia-500/15 dark:bg-fuchsia-500/25 text-fuchsia-700 dark:text-fuchsia-300",
		},
		{
			value: "pink-500",
			swatch: "bg-pink-500",
			wrap: "bg-pink-500/15 dark:bg-pink-500/25 text-pink-700 dark:text-pink-300",
		},
		{
			value: "rose-500",
			swatch: "bg-rose-500",
			wrap: "bg-rose-500/15 dark:bg-rose-500/25 text-rose-700 dark:text-rose-300",
		},
	];

	const DEFAULT_ITEM_COLOR = "emerald-500";
	const ITEM_SWIPE_DELETE_WIDTH = 72;

	// =============================================================================
	// CHART — active arc shadow plugin
	// =============================================================================
	const activeArcShadowPlugin = {
		id: "activeArcShadow",
		beforeDatasetDraw(
			chart: { data: { datasets: { activeIndex?: number }[] } },
			args: {
				index: number;
				meta: { data: { hidden?: boolean }[] };
			},
		) {
			const activeIndex = chart.data.datasets[args.index]?.activeIndex;
			if (activeIndex == null || activeIndex < 0) return;
			const arc = args.meta.data[activeIndex];
			if (arc) arc.hidden = true;
		},
		afterDatasetDraw(
			chart: {
				ctx: CanvasRenderingContext2D;
				data: { datasets: { activeIndex?: number }[] };
			},
			args: {
				index: number;
				meta: {
					data: {
						hidden?: boolean;
						innerRadius: number;
						outerRadius: number;
						draw: (ctx: CanvasRenderingContext2D) => void;
					}[];
				};
			},
		) {
			const activeIndex = chart.data.datasets[args.index]?.activeIndex;
			if (activeIndex == null || activeIndex < 0) return;
			const arc = args.meta.data[activeIndex];
			if (!arc) return;
			arc.hidden = false;
			const prevInner = arc.innerRadius;
			const prevOuter = arc.outerRadius;
			arc.innerRadius = prevInner - 4;
			const ctx = chart.ctx;
			ctx.save();
			ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
			ctx.shadowBlur = 12;
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 3;
			arc.draw(ctx);
			ctx.restore();
			arc.innerRadius = prevInner;
			arc.outerRadius = prevOuter;
		},
	};

	ChartJS.register(ArcElement, Tooltip, activeArcShadowPlugin);

	// =============================================================================
	// CONSTANTS
	// =============================================================================
	const RULE_ORDER: RuleName[] = ["Expenses", "Savings", "Wants"];
	const RULE_COLORS: Record<RuleName, string> = {
		Expenses: "#d96b6b",
		Savings: "#99f6e4",
		Wants: "#c4b5fd",
	};
	const RULE_COLORS_MUTED: Record<RuleName, string> = {
		Expenses: "#6e4a4a",
		Savings: "#3d5c57",
		Wants: "#4f4a66",
	};

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

	const props = defineProps<{
		initialMonthKey?: string;
	}>();

	// =============================================================================
	// STATE
	// =============================================================================
	const activeTab = ref<RuleName>("Expenses");
	const tabs = RULE_ORDER;

	const rules = ref<Rule[]>([]);
	const cutoffs = ref<CycleCutoff[]>([]);
	const itemBuilders = ref<ItemBuilder[]>([]);
	const budgetEntries = ref<BudgetEntry[]>([]);
	const othersBudget = ref<OthersBudget | null>(null);
	const othersExpenses = ref<OthersExpense[]>([]);
	const tabBudget = ref<TabBudget | null>(null);
	const tabBudgetExpenses = ref<TabBudgetExpense[]>([]);
	const unexpectedExpenses = ref<UnexpectedExpense[]>([]);

	const now = new Date();
	const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const viewMonthKey = ref(currentMonthKey);

	const showModal = ref(false);
	const editingCutoffId = ref("");
	const formAmount = ref("");
	const formName = ref("");
	const formDate = ref("");
	const formError = ref("");
	const saving = ref(false);
	const formPercents = ref<{ name: RuleName; percent: number }[]>([]);
	const formUseCarryOver = ref(false);

	const formPercentTotal = computed(() =>
		formPercents.value.reduce(
			(sum, rule) => sum + (Number(rule.percent) || 0),
			0,
		),
	);

	const cutoffOptions = computed(() => {
		const all = [
			{ value: "1st cutoff", label: "1st cutoff" },
			{ value: "2nd cutoff", label: "2nd cutoff" },
		];
		const monthKey = formDate.value ? formDate.value.slice(0, 7) : "";
		if (!monthKey) return all;
		const usedSlots = cutoffs.value
			.filter((c) => c.monthKey === monthKey && c.id !== editingCutoffId.value)
			.map((c) => c.slot);
		return all.filter(
			(opt) => !usedSlots.includes(opt.value === "1st cutoff" ? 1 : 2),
		);
	});

	watch(formDate, () => {
		if (
			formName.value &&
			!cutoffOptions.value.some((opt) => opt.value === formName.value)
		) {
			formName.value = "";
		}
	});

	const showItemModal = ref(false);
	const itemFormId = ref("");
	const itemFormAmount = ref("");
	const itemFormError = ref("");
	const savingItem = ref(false);

	const showEditItemModal = ref(false);
	const editItemId = ref("");
	const editItemName = ref("");
	const editItemIcon = ref("HomeIcon");
	const editItemIconWrapClass = ref("");
	const editItemAmount = ref("");
	const editItemBuilderId = ref("");
	const editItemHasChildItems = ref(false);
	const editItemError = ref("");
	const savingEditItem = ref(false);

	const itemSwipeOffsets = ref<Record<string, number>>({});
	let itemSwipeStartX = 0;
	let itemSwipeStartOffset = 0;
	let itemSwipeActiveId = "";
	let itemSwipeMoved = false;

	const showCreateItemDrawer = ref(false);
	const savingCreateItem = ref(false);

	const showSubItemModal = ref(false);
	const subItemEditId = ref("");
	const subItemName = ref("");
	const subItemAmount = ref("");
	const subItemError = ref("");
	const savingSubItem = ref(false);

	const showOthersBudgetModal = ref(false);
	const othersBudgetAmount = ref("");
	const othersBudgetError = ref("");
	const savingOthersBudget = ref(false);

	const showOthersItemModal = ref(false);
	const othersItemEditId = ref<string | "">("");
	const othersExpenseName = ref("");
	const othersExpenseAmount = ref("");
	const othersItemError = ref("");
	const savingOthersItem = ref(false);

	const showTabBudgetModal = ref(false);
	const tabBudgetAmount = ref("");
	const tabBudgetError = ref("");
	const savingTabBudget = ref(false);

	const showTabBudgetItemModal = ref(false);
	const tabBudgetItemEditId = ref<string | "">("");
	const tabBudgetExpenseName = ref("");
	const tabBudgetExpenseAmount = ref("");
	const tabBudgetItemError = ref("");
	const savingTabBudgetItem = ref(false);

	const tabBudgetSwipeOffsets = ref<Record<string, number>>({});
	let tabBudgetSwipeStartX = 0;
	let tabBudgetSwipeStartOffset = 0;
	let tabBudgetSwipeActiveId = "";
	let tabBudgetSwipeMoved = false;

	const othersSwipeOffsets = ref<Record<string, number>>({});
	let othersSwipeStartX = 0;
	let othersSwipeStartOffset = 0;
	let othersSwipeActiveId = "";
	let othersSwipeMoved = false;

	const showExceedModal = ref(false);
	const exceedModalExcess = ref(0);
	let exceedModalOnProceed: (() => Promise<void>) | null = null;

	let reconciling = false;
	let reconcileAgain = false;

	const showFinalizeModal = ref(false);

	const showUnexpectedDrawer = ref(false);

	const displayExceedModalExcess = computed(
		() => `₱${exceedModalExcess.value.toLocaleString("en-PH")}`,
	);

	const subItemSwipeOffsets = ref<Record<string, number>>({});
	let subItemSwipeStartX = 0;
	let subItemSwipeStartOffset = 0;
	let subItemSwipeActiveId = "";
	let subItemSwipeMoved = false;

	// =============================================================================
	// PERIOD NAV — computed
	// =============================================================================
	const monthKeys = computed(() => {
		const keys = [
			...new Set(cutoffs.value.map((c) => c.monthKey).filter(Boolean)),
		];
		if (!keys.includes(currentMonthKey)) keys.push(currentMonthKey);
		return keys.sort();
	});

	const viewCutoffs = computed(() =>
		cutoffs.value.filter((c) => c.monthKey === viewMonthKey.value),
	);

	const periodLabel = computed(() =>
		viewMonthKey.value === currentMonthKey ? "Current" : viewMonthKey.value,
	);

	const canGoPrev = computed(() => {
		const index = monthKeys.value.indexOf(viewMonthKey.value);
		return index > 0;
	});

	const canGoNext = computed(() => {
		const index = monthKeys.value.indexOf(viewMonthKey.value);
		return index >= 0 && index < monthKeys.value.length - 1;
	});

	// =============================================================================
	// BUDGET SECTION — computed
	// =============================================================================
	const activeCutoff = computed(() => {
		const list = viewCutoffs.value.filter((c) => c.status !== "finalized");
		if (list.length === 0) return null;
		return list.reduce((latest, c) =>
			!latest || c.createdAt > latest.createdAt ? c : latest,
		);
	});

	// Overspend uses Expenses + Wants only; Savings is a separate target tracker.
	const totalAmount = computed(() => {
		const cutoff = activeCutoff.value;
		if (!cutoff) return 0;
		return cutoff.amount + (cutoff.carryOverAmount ?? 0);
	});

	const displayAmountDetail = computed(() => {
		const cutoff = activeCutoff.value;
		if (!cutoff || !(cutoff.carryOverAmount ?? 0)) return "";
		return `(Alloted: ₱${cutoff.amount.toLocaleString("en-PH")} · Carry over: ₱${(cutoff.carryOverAmount ?? 0).toLocaleString("en-PH")})`;
	});

	const spendBudgetAmount = computed(() => {
		const allocations = activeCutoff.value?.allocations;
		return (
			(allocations?.Expenses?.amount ?? 0) + (allocations?.Wants?.amount ?? 0)
		);
	});

	const budgetTitle = computed(() =>
		activeCutoff.value ? `${activeCutoff.value.label} - Budget` : "Budget",
	);

	const displayCutoffDate = computed(() => {
		const date = activeCutoff.value?.date;
		if (!date) return "--";
		const d = new Date(date + "T00:00:00");
		return d.toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
		});
	});

	const displayAmount = computed(
		() => `₱${totalAmount.value.toLocaleString("en-PH")}`,
	);

	const displaySpendBudget = computed(
		() => `₱${spendBudgetAmount.value.toLocaleString("en-PH")}`,
	);

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

	const displaySpent = computed(
		() => `₱${spentAmount.value.toLocaleString("en-PH")}`,
	);

	const progressPercent = computed(() => {
		if (spendBudgetAmount.value <= 0) return 0;
		return Math.min(
			100,
			Math.round((spentAmount.value / spendBudgetAmount.value) * 100),
		);
	});

	const cutoffExcessAmount = computed(() =>
		Math.max(0, spentAmount.value - spendBudgetAmount.value),
	);

	const displayCutoffExcess = computed(
		() => `₱${cutoffExcessAmount.value.toLocaleString("en-PH")}`,
	);

	const cutoffExcessPercent = computed(() => {
		if (spendBudgetAmount.value <= 0) return 0;
		return Math.round((cutoffExcessAmount.value / spendBudgetAmount.value) * 100);
	});

	const finalizeSummary = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		const allocations = activeCutoff.value?.allocations;
		return RULE_ORDER.map((name) => {
			const entriesSum = budgetEntries.value
				.filter(
					(entry) =>
						entry.cutoffId === cutoffId &&
						entry.ruleName === name &&
						!entry.parentBudgetEntryId,
				)
				.reduce((sum, entry) => sum + entry.amount, 0);
			const spent =
				name === "Expenses"
					? entriesSum + tabBudgetReserved.value + othersReserved.value
					: entriesSum;
			const allotted = allocations?.[name]?.amount ?? 0;
			const percent =
				allotted > 0
					? Math.round((Math.abs(spent - allotted) / allotted) * 100)
					: 0;
			const pass = name === "Savings" ? spent >= allotted : spent <= allotted;
			const amount = `₱${Math.abs(spent - allotted).toLocaleString("en-PH")}`;
			return { name, pass, percent, amount };
		});
	});

	const isEditingCutoff = computed(() => !!editingCutoffId.value);

	const previousCutoff = computed(() => {
		if (isEditingCutoff.value) return null;
		const sorted = [...cutoffs.value].sort((a, b) =>
			a.createdAt.localeCompare(b.createdAt),
		);
		return sorted.length ? sorted[sorted.length - 1] : null;
	});

	const availableCarryOver = ref(0);

	const showCarryOverOption = computed(
		() => !isEditingCutoff.value && availableCarryOver.value > 0,
	);

	async function loadCarryOverForCutoff(cutoff: CycleCutoff) {
		const spendAllotted =
			(cutoff.allocations?.Expenses?.amount ?? 0) +
			(cutoff.allocations?.Wants?.amount ?? 0);
		const cutoffId = cutoff.id;
		const entries = await db.budgetEntries
			.where("cutoffId")
			.equals(cutoffId)
			.toArray();
		const expensesEntriesSum = entries
			.filter(
				(entry) =>
					entry.ruleName === "Expenses" && !entry.parentBudgetEntryId,
			)
			.reduce((sum, entry) => sum + entry.amount, 0);
		const wantsEntriesSum = entries
			.filter((entry) => entry.ruleName === "Wants" && !entry.parentBudgetEntryId)
			.reduce((sum, entry) => sum + entry.amount, 0);
		const tabBudget = await db.tabBudgets
			.where({ cutoffId, ruleName: "Expenses" })
			.first();
		const tabExpenses = await db.tabBudgetExpenses
			.where({ cutoffId, ruleName: "Expenses" })
			.toArray();
		const tabSpent = tabExpenses.reduce((sum, expense) => sum + expense.amount, 0);
		const tabReserved = Math.max(tabBudget?.budgetAllocated ?? 0, tabSpent);
		const othersBudget = await db.othersBudgets
			.where("cutoffId")
			.equals(cutoffId)
			.first();
		const othersExp = await db.othersExpenses
			.where("cutoffId")
			.equals(cutoffId)
			.toArray();
		const othersSpent = othersExp.reduce((sum, expense) => sum + expense.amount, 0);
		const othersReserved = Math.max(othersBudget?.budgetAllocated ?? 0, othersSpent);
		const spent =
			expensesEntriesSum + wantsEntriesSum + tabReserved + othersReserved;
		return Math.max(0, spendAllotted - spent);
	}

	const cutoffFormUnchanged = computed(() => {
		if (!editingCutoffId.value) return false;
		const cutoff = cutoffs.value.find((c) => c.id === editingCutoffId.value);
		if (!cutoff) return false;
		const amount = Number(formAmount.value);
		const percentsUnchanged = formPercents.value.every(
			(rule) => rule.percent === (cutoff.allocations?.[rule.name]?.percent ?? 0),
		);
		return (
			amount === cutoff.amount &&
			formName.value.trim() === cutoff.label &&
			formDate.value === (cutoff.date ?? "") &&
			percentsUnchanged
		);
	});

	const canSaveCutoff = computed(() => {
		if (saving.value) return false;
		if (formPercentTotal.value !== 100) return false;
		if (isEditingCutoff.value) return !cutoffFormUnchanged.value;
		return true;
	});

	const editItemFormUnchanged = computed(() => {
		const entry = budgetEntries.value.find((e) => e.id === editItemId.value);
		if (!entry) return true;
		const amount = Number(editItemAmount.value);
		return amount === entry.amount;
	});

	const canSaveEditItem = computed(() => {
		if (savingEditItem.value) return false;
		return !editItemFormUnchanged.value;
	});

	const subItemFormUnchanged = computed(() => {
		if (!subItemEditId.value) return false;
		const entry = budgetEntries.value.find((e) => e.id === subItemEditId.value);
		if (!entry) return true;
		const name = subItemName.value.trim();
		const amount = Number(subItemAmount.value);
		return name === entry.name && amount === entry.amount;
	});

	const canSaveSubItem = computed(() => {
		if (savingSubItem.value) return false;
		if (subItemEditId.value) return !subItemFormUnchanged.value;
		return true;
	});

	const othersItemFormUnchanged = computed(() => {
		if (!othersItemEditId.value) return false;
		const expense = othersExpenses.value.find(
			(e) => e.id === othersItemEditId.value,
		);
		if (!expense) return true;
		const name = othersExpenseName.value.trim();
		const amount = Number(othersExpenseAmount.value);
		return name === expense.expenseName && amount === expense.amount;
	});

	const canSaveOthersItem = computed(() => {
		if (savingOthersItem.value) return false;
		if (othersItemEditId.value) return !othersItemFormUnchanged.value;
		return true;
	});

	const tabBudgetItemFormUnchanged = computed(() => {
		if (!tabBudgetItemEditId.value) return false;
		const expense = tabBudgetExpenses.value.find(
			(e) => e.id === tabBudgetItemEditId.value,
		);
		if (!expense) return true;
		const name = tabBudgetExpenseName.value.trim();
		const amount = Number(tabBudgetExpenseAmount.value);
		return name === expense.expenseName && amount === expense.amount;
	});

	const canSaveTabBudgetItem = computed(() => {
		if (savingTabBudgetItem.value) return false;
		if (tabBudgetItemEditId.value) return !tabBudgetItemFormUnchanged.value;
		return true;
	});

	const isEditingOthersBudget = computed(() => !!othersBudget.value);

	const othersBudgetFormUnchanged = computed(() => {
		if (!othersBudget.value) return false;
		const amount = Number(othersBudgetAmount.value);
		return amount === othersBudget.value.budgetAllocated;
	});

	const canSaveOthersBudget = computed(() => {
		if (savingOthersBudget.value) return false;
		if (isEditingOthersBudget.value) return !othersBudgetFormUnchanged.value;
		return true;
	});

	// =============================================================================
	// RULE SECTION — computed (chart + progress)
	// =============================================================================
	const activeRulePercent = computed(
		() => activeCutoff.value?.allocations?.[activeTab.value]?.percent ?? 0,
	);

	const activeRuleAmount = computed(
		() => activeCutoff.value?.allocations?.[activeTab.value]?.amount ?? 0,
	);

	const displayActiveAmount = computed(
		() => `₱${activeRuleAmount.value.toLocaleString("en-PH")}`,
	);

	const activeRuleEntries = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return [];
		return budgetEntries.value
			.filter(
				(entry) =>
					entry.cutoffId === cutoffId &&
					entry.ruleName === activeTab.value &&
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
				const childrenSpent = budgetEntries.value
					.filter((child) => child.parentBudgetEntryId === entry.id)
					.reduce((sum, child) => sum + child.amount, 0);
				const childProgressPercent =
					entry.amount > 0
						? Math.min(100, Math.round((childrenSpent / entry.amount) * 100))
						: 0;
				return {
					...entry,
					name: builder?.name ?? entry.name,
					icon: builder?.icon ?? "HomeIcon",
					iconWrapClass: colorOption.wrap,
					hasChildItems: builder?.hasChildItems ?? false,
					builderId: builder?.id ?? "",
					childrenSpent,
					childProgressPercent,
				};
			});
	});

	const ruleSpentAmount = computed(() => {
		const entriesSum = activeRuleEntries.value.reduce(
			(sum, entry) => sum + entry.amount,
			0,
		);
		if (activeTab.value === "Expenses") {
			return entriesSum + tabBudgetReserved.value + othersReserved.value;
		}
		return entriesSum;
	});

	const ruleOverBudget = computed(
		() =>
			activeTab.value !== "Savings" &&
			ruleSpentAmount.value > activeRuleAmount.value,
	);

	const ruleExcessAmount = computed(() =>
		Math.max(0, ruleSpentAmount.value - activeRuleAmount.value),
	);

	const ruleLeftAmount = computed(() =>
		Math.max(0, activeRuleAmount.value - ruleSpentAmount.value),
	);

	const ruleProgressPercent = computed(() => {
		if (activeRuleAmount.value <= 0) return 0;
		return Math.min(
			100,
			Math.round((ruleSpentAmount.value / activeRuleAmount.value) * 100),
		);
	});

	const displayRuleSpent = computed(
		() => `₱${ruleSpentAmount.value.toLocaleString("en-PH")}`,
	);

	const displayRuleLeft = computed(() => {
		const amount = ruleOverBudget.value
			? ruleExcessAmount.value
			: ruleLeftAmount.value;
		return `₱${amount.toLocaleString("en-PH")}`;
	});

	const canFinalizeBudget = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return false;
		const entriesSum = budgetEntries.value
			.filter(
				(entry) =>
					entry.cutoffId === cutoffId &&
					entry.ruleName === "Expenses" &&
					!entry.parentBudgetEntryId,
			)
			.reduce((sum, entry) => sum + entry.amount, 0);
		const spent = entriesSum + tabBudgetReserved.value + othersReserved.value;
		return spent > 0;
	});

	const finalizeButtonLabel = computed(() =>
		activeCutoff.value
			? `Finalize ${activeCutoff.value.label} Tracker`
			: "Finalize Budget",
	);

	const finalizeModalMessage = computed(() => {
		const label = activeCutoff.value?.label ?? "this cutoff";
		return `Are you sure you want to save the Budget Tracker for ${label}?`;
	});

	const othersAllocated = computed(
		() => othersBudget.value?.budgetAllocated ?? 0,
	);

	const othersSpent = computed(() =>
		othersExpenses.value.reduce((sum, expense) => sum + expense.amount, 0),
	);

	const othersOverBudget = computed(
		() => othersSpent.value > othersAllocated.value,
	);

	const othersExcessAmount = computed(() =>
		Math.max(0, othersSpent.value - othersAllocated.value),
	);

	const othersLeft = computed(() =>
		Math.max(0, othersAllocated.value - othersSpent.value),
	);

	const displayOthersAllocated = computed(
		() => `₱${othersAllocated.value.toLocaleString("en-PH")}`,
	);

	const displayOthersLeft = computed(() => {
		const amount = othersOverBudget.value
			? othersExcessAmount.value
			: othersLeft.value;
		return `₱${amount.toLocaleString("en-PH")}`;
	});

	const displayOthersSpent = computed(
		() => `₱${othersSpent.value.toLocaleString("en-PH")}`,
	);

	const othersProgressPercent = computed(() => {
		if (othersAllocated.value <= 0) return 0;
		return Math.min(
			100,
			Math.round((othersSpent.value / othersAllocated.value) * 100),
		);
	});

	const tabBudgetAllocated = computed(
		() => tabBudget.value?.budgetAllocated ?? 0,
	);

	const tabBudgetSpent = computed(() =>
		tabBudgetExpenses.value.reduce((sum, expense) => sum + expense.amount, 0),
	);

	// Budget/Others allocations are reserved from the Expenses budget, so the
	// allocated amount counts toward Expenses spent (or the actual spent if higher).
	const tabBudgetReserved = computed(() =>
		Math.max(tabBudgetAllocated.value, tabBudgetSpent.value),
	);

	const othersReserved = computed(() =>
		Math.max(othersAllocated.value, othersSpent.value),
	);

	const tabBudgetOverBudget = computed(
		() => tabBudgetSpent.value > tabBudgetAllocated.value,
	);

	const tabBudgetExcessAmount = computed(() =>
		Math.max(0, tabBudgetSpent.value - tabBudgetAllocated.value),
	);

	const tabBudgetLeft = computed(() =>
		Math.max(0, tabBudgetAllocated.value - tabBudgetSpent.value),
	);

	const displayTabBudgetAllocated = computed(
		() => `₱${tabBudgetAllocated.value.toLocaleString("en-PH")}`,
	);

	const displayTabBudgetLeft = computed(() => {
		const amount = tabBudgetOverBudget.value
			? tabBudgetExcessAmount.value
			: tabBudgetLeft.value;
		return `₱${amount.toLocaleString("en-PH")}`;
	});

	const displayTabBudgetSpent = computed(
		() => `₱${tabBudgetSpent.value.toLocaleString("en-PH")}`,
	);

	const tabBudgetProgressPercent = computed(() => {
		if (tabBudgetAllocated.value <= 0) return 0;
		return Math.min(
			100,
			Math.round((tabBudgetSpent.value / tabBudgetAllocated.value) * 100),
		);
	});

	const isEditingTabBudget = computed(() => !!tabBudget.value);

	const tabBudgetFormUnchanged = computed(() => {
		if (!tabBudget.value) return false;
		const amount = Number(tabBudgetAmount.value);
		return amount === tabBudget.value.budgetAllocated;
	});

	const canSaveTabBudget = computed(() => {
		if (savingTabBudget.value) return false;
		if (isEditingTabBudget.value) return !tabBudgetFormUnchanged.value;
		return true;
	});

	const activeRuleUnexpectedExpenses = computed(() =>
		unexpectedExpenses.value.filter((item) => item.ruleName === activeTab.value),
	);

	const activeRuleUnexpectedTotal = computed(() =>
		activeRuleUnexpectedExpenses.value.reduce(
			(sum, item) => sum + item.excessAmount,
			0,
		),
	);

	const unexpectedExcessPercent = computed(() => {
		if (activeRuleAmount.value <= 0) return 0;
		return Math.round(
			(activeRuleUnexpectedTotal.value / activeRuleAmount.value) * 100,
		);
	});

	const hasRuleUnexpectedBadge = computed(
		() =>
			activeTab.value !== "Savings" &&
			activeRuleUnexpectedExpenses.value.length > 0,
	);

	const displayUnexpectedExcessTotal = computed(
		() => `₱${activeRuleUnexpectedTotal.value.toLocaleString("en-PH")}`,
	);

	const editItemSubItems = computed(() =>
		budgetEntries.value.filter(
			(entry) => entry.parentBudgetEntryId === editItemId.value,
		),
	);

	const itemBuilderOptions = computed(() => {
		const addedBuilderIds = new Set(
			activeRuleEntries.value.map((entry) => entry.builderId).filter(Boolean),
		);
		return itemBuilders.value
			.filter(
				(item) =>
					item.isActive &&
					item.categories.includes(activeTab.value) &&
					!addedBuilderIds.has(item.id),
			)
			.map((item) => {
				const color = item.color ?? DEFAULT_ITEM_COLOR;
				const colorOption =
					ITEM_COLOR_OPTIONS.find((entry) => entry.value === color) ??
					ITEM_COLOR_OPTIONS.find((entry) => entry.value === DEFAULT_ITEM_COLOR)!;
				return {
					value: item.id,
					label: item.name,
					icon: item.icon ?? "HomeIcon",
					iconWrapClass: colorOption.wrap,
				};
			});
	});

	// =============================================================================
	// CHART — data & options
	// =============================================================================
	const chartData = computed(() => ({
		labels: RULE_ORDER,
		datasets: [
			{
				data: RULE_ORDER.map(
					(name) => activeCutoff.value?.allocations?.[name]?.percent ?? 0,
				),
				backgroundColor: RULE_ORDER.map((name) =>
					name === activeTab.value ? RULE_COLORS[name] : RULE_COLORS_MUTED[name],
				),
				offset: RULE_ORDER.map((name) => (name === activeTab.value ? 5 : 0)),
				activeIndex: RULE_ORDER.indexOf(activeTab.value),
				clip: false as const,
				borderWidth: 0,
				spacing: 4,
				borderRadius: 8,
			},
		],
	}));

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: true,
		cutout: "82%",
		layout: { padding: 14 },
		plugins: { legend: { display: false }, tooltip: { enabled: true } },
	};

	// =============================================================================
	// PERIOD NAV — actions
	// =============================================================================
	function todayDate() {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
	}

	function closeExceedModal() {
		showExceedModal.value = false;
		exceedModalOnProceed = null;
	}

	function requestExceedConfirm(excess: number, onProceed: () => Promise<void>) {
		exceedModalExcess.value = excess;
		exceedModalOnProceed = onProceed;
		showExceedModal.value = true;
	}

	async function confirmExceedProceed() {
		const proceed = exceedModalOnProceed;
		closeExceedModal();
		if (proceed) await proceed();
	}

	function onFinalizeClick() {
		if (!canFinalizeBudget.value) return;
		showFinalizeModal.value = true;
	}

	async function onFinalizeConfirmed() {
		const cutoff = activeCutoff.value;
		if (!cutoff) return;
		await db.cycleCutoffs.update(cutoff.id, {
			status: "finalized",
			finalizedAt: new Date().toISOString(),
		});
		await reloadTracker();
	}

	async function addUnexpectedExpense(
		itemName: string,
		excessAmount: number,
		sourceSection: UnexpectedExpenseSource,
		sourceId: string,
		ruleName: RuleName,
	) {
		const cutoff = activeCutoff.value;
		const rule = rules.value.find((r) => r.name === ruleName);
		if (!cutoff || rule?.id == null) return;
		await db.unexpectedExpenses.add({
			id: createId(),
			cutoffId: cutoff.id,
			monthKey: cutoff.monthKey,
			itemName,
			excessAmount,
			ruleId: rule.id,
			ruleName,
			date: todayDate(),
			sourceSection,
			sourceId,
		});
		await loadUnexpectedExpenses();
	}

	function unexpectedSourceLabel(sourceSection: UnexpectedExpenseSource) {
		if (sourceSection === "mainItems") return "Main Expense Items";
		if (sourceSection === "budgetItems") return "Budget Items";
		return "Other Items";
	}

	function openUnexpectedDrawer() {
		showUnexpectedDrawer.value = true;
	}

	function closeUnexpectedDrawer() {
		showUnexpectedDrawer.value = false;
	}

	function mainItemBudgetExcess(newAmount: number, oldAmount = 0) {
		if (activeTab.value === "Savings") return 0;
		const reserved =
			activeTab.value === "Expenses"
				? tabBudgetReserved.value + othersReserved.value
				: 0;
		const currentSpent = activeRuleEntries.value.reduce(
			(sum, entry) => sum + entry.amount,
			0,
		);
		const previousSpent = currentSpent - oldAmount + reserved;
		const previousExcess = Math.max(0, previousSpent - activeRuleAmount.value);
		return previousSpent + newAmount - activeRuleAmount.value - previousExcess;
	}

	async function loadCutoffs() {
		cutoffs.value = await db.cycleCutoffs.toArray();
	}

	async function loadItemBuilders() {
		itemBuilders.value = await db.itemBuilders.toArray();
	}

	async function loadBudgetEntries() {
		budgetEntries.value = await db.budgetEntries.toArray();
	}

	async function loadOthers() {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) {
			othersBudget.value = null;
			othersExpenses.value = [];
			return;
		}
		othersBudget.value =
			(await db.othersBudgets.where("cutoffId").equals(cutoffId).first()) ?? null;
		othersExpenses.value = await db.othersExpenses
			.where("cutoffId")
			.equals(cutoffId)
			.toArray();
	}

	async function loadTabBudget() {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) {
			tabBudget.value = null;
			tabBudgetExpenses.value = [];
			return;
		}
		tabBudget.value =
			(await db.tabBudgets.where({ cutoffId, ruleName: "Expenses" }).first()) ??
			null;
		tabBudgetExpenses.value = await db.tabBudgetExpenses
			.where({ cutoffId, ruleName: "Expenses" })
			.toArray();
	}

	async function loadUnexpectedExpenses() {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) {
			unexpectedExpenses.value = [];
			return;
		}
		unexpectedExpenses.value = await db.unexpectedExpenses
			.where("cutoffId")
			.equals(cutoffId)
			.toArray();
	}

	// Keep the mainItems unexpected records in sync with the current over-budget
	// state so the excess is always recorded, whether the overrun came from an
	// item change or from lowering the rule's allocation. Budget/Others records
	// are scoped to their own sections and cleared when their source is removed.
	// The guard serializes overlapping watcher runs so they can't double-insert.
	async function reconcileUnexpectedExpenses() {
		if (reconciling) {
			reconcileAgain = true;
			return;
		}
		reconciling = true;
		try {
			const cutoff = activeCutoff.value;
			if (!cutoff) return;
			let changed = false;
			for (const name of RULE_ORDER) {
				if (name === "Savings") {
					const leftover = (
						await db.unexpectedExpenses.where("cutoffId").equals(cutoff.id).toArray()
					).filter(
						(item) =>
							item.ruleName === "Savings" && item.sourceSection === "mainItems",
					);
					for (const record of leftover) {
						await db.unexpectedExpenses.delete(record.id);
						changed = true;
					}
					continue;
				}
				const rule = rules.value.find((r) => r.name === name);
				if (rule?.id == null) continue;
				const allotted = cutoff.allocations?.[name]?.amount ?? 0;
				const mainEntries = budgetEntries.value
					.filter(
						(entry) =>
							entry.cutoffId === cutoff.id &&
							entry.ruleName === name &&
							!entry.parentBudgetEntryId,
					)
					.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

				// Excess only starts once spending passes the allotted budget. For
				// Expenses the reserved Budget/Others amounts fill the budget first.
				let running =
					name === "Expenses" ? tabBudgetReserved.value + othersReserved.value : 0;
				const desiredExcess = new Map<string, number>();
				for (const entry of mainEntries) {
					const before = running;
					running += entry.amount;
					const itemExcess =
						Math.max(0, running - allotted) - Math.max(0, before - allotted);
					if (itemExcess > 0) desiredExcess.set(entry.id, itemExcess);
				}

				const existing = (
					await db.unexpectedExpenses.where("cutoffId").equals(cutoff.id).toArray()
				).filter(
					(item) => item.ruleName === name && item.sourceSection === "mainItems",
				);
				const kept = new Set<string>();
				for (const record of existing) {
					const excess = desiredExcess.get(record.sourceId);
					if (excess == null || kept.has(record.sourceId)) {
						await db.unexpectedExpenses.delete(record.id);
						changed = true;
						continue;
					}
					kept.add(record.sourceId);
					if (record.excessAmount !== excess) {
						await db.unexpectedExpenses.update(record.id, {
							excessAmount: excess,
						});
						changed = true;
					}
				}
				for (const [sourceId, excess] of desiredExcess) {
					if (kept.has(sourceId)) continue;
					const entry = mainEntries.find((e) => e.id === sourceId)!;
					await db.unexpectedExpenses.add({
						id: createId(),
						cutoffId: cutoff.id,
						monthKey: cutoff.monthKey,
						itemName: entry.name,
						excessAmount: excess,
						ruleId: rule.id,
						ruleName: name,
						date: todayDate(),
						sourceSection: "mainItems",
						sourceId,
					});
					changed = true;
				}
			}
			if (changed) await loadUnexpectedExpenses();
		} finally {
			reconciling = false;
			if (reconcileAgain) {
				reconcileAgain = false;
				await reconcileUnexpectedExpenses();
			}
		}
	}

	async function reloadTracker() {
		await loadCutoffs();
		await loadItemBuilders();
		await loadBudgetEntries();
		await loadOthers();
		await loadTabBudget();
		await loadUnexpectedExpenses();
	}

	async function deleteBudgetEntry(id: string) {
		await db.budgetEntries.where("parentBudgetEntryId").equals(id).delete();
		await db.budgetEntries.delete(id);
		await db.unexpectedExpenses.where("sourceId").equals(id).delete();
		await loadBudgetEntries();
		await loadUnexpectedExpenses();
	}

	function goPrev() {
		const index = monthKeys.value.indexOf(viewMonthKey.value);
		if (index > 0) {
			viewMonthKey.value = monthKeys.value[index - 1];
			loadOthers();
			loadTabBudget();
			loadUnexpectedExpenses();
		}
	}

	function goNext() {
		if (!canGoNext.value) return;
		const index = monthKeys.value.indexOf(viewMonthKey.value);
		if (index < monthKeys.value.length - 1) {
			viewMonthKey.value = monthKeys.value[index + 1];
			loadOthers();
			loadTabBudget();
			loadUnexpectedExpenses();
		}
	}

	// =============================================================================
	// ADD CUTOFF MODAL — actions
	// =============================================================================
	async function openModal() {
		formError.value = "";
		availableCarryOver.value = 0;
		if (activeCutoff.value) {
			editingCutoffId.value = activeCutoff.value.id;
			formAmount.value = String(activeCutoff.value.amount);
			formName.value = activeCutoff.value.label;
			formDate.value = activeCutoff.value.date ?? todayDate();
			formPercents.value = RULE_ORDER.map((name) => ({
				name,
				percent: activeCutoff.value!.allocations?.[name]?.percent ?? 0,
			}));
		} else {
			editingCutoffId.value = "";
			formAmount.value = "";
			formName.value = "";
			formDate.value = todayDate();
			formUseCarryOver.value = false;
			formPercents.value = RULE_ORDER.map((name) => ({
				name,
				percent: rules.value.find((rule) => rule.name === name)?.percent ?? 0,
			}));
			const previous = previousCutoff.value;
			if (previous && !previous.carryOverDecision) {
				availableCarryOver.value = await loadCarryOverForCutoff(previous);
			}
		}
		showModal.value = true;
	}

	function closeModal() {
		formError.value = "";
		editingCutoffId.value = "";
		formUseCarryOver.value = false;
		showModal.value = false;
	}

	async function saveCutoff() {
		const amount = Number(formAmount.value);
		const name = formName.value.trim();
		const date = formDate.value;

		if (!formAmount.value || Number.isNaN(amount) || amount < 0) {
			formError.value = "Enter a valid amount";
			return;
		}
		if (!name) {
			formError.value = "Select a name";
			return;
		}
		if (!date) {
			formError.value = "Enter a date";
			return;
		}
		if (formPercentTotal.value !== 100) {
			formError.value = "Rule percentages must total 100%";
			return;
		}

		const monthKey = date.slice(0, 7);
		const slot = (name === "1st cutoff" ? 1 : 2) as 1 | 2;
		const existing = await db.cycleCutoffs
			.where("monthKey")
			.equals(monthKey)
			.toArray();

		if (existing.some((c) => c.slot === slot && c.id !== editingCutoffId.value)) {
			formError.value = `${name} already exists for this month`;
			return;
		}

		saving.value = true;
		const existingCutoff = editingCutoffId.value
			? cutoffs.value.find((c) => c.id === editingCutoffId.value)
			: null;
		const carryOver = existingCutoff?.carryOverAmount ?? 0;
		let newCarryOver = 0;

		if (editingCutoffId.value) {
			await db.cycleCutoffs.update(editingCutoffId.value, {
				monthKey,
				slot,
				label: name,
				amount,
				date,
				allocations: buildCutoffAllocations(amount + carryOver, formPercents.value),
			});
		} else {
			const previous = previousCutoff.value;
			if (previous && availableCarryOver.value > 0) {
				if (formUseCarryOver.value) {
					newCarryOver = availableCarryOver.value;
					await db.cycleCutoffs.update(previous.id, {
						carryOverDecision: "used",
					});
				} else {
					await db.cycleCutoffs.update(previous.id, {
						carryOverDecision: "declined",
					});
				}
			}
			await db.cycleCutoffs.add({
				id: createId(),
				monthKey,
				slot,
				label: name,
				amount,
				date,
				carryOverAmount: newCarryOver || undefined,
				allocations: buildCutoffAllocations(
					amount + newCarryOver,
					formPercents.value,
				),
				createdAt: new Date().toISOString(),
			});
		}
		await loadCutoffs();
		viewMonthKey.value = monthKey;
		saving.value = false;
		closeModal();
	}

	// =============================================================================
	// ADD ITEM MODAL — actions
	// =============================================================================
	function openItemModal() {
		itemFormId.value = "";
		itemFormAmount.value = "";
		itemFormError.value = "";
		showItemModal.value = true;
	}

	function closeItemModal() {
		itemFormError.value = "";
		showItemModal.value = false;
	}

	function openCreateItemDrawer() {
		showCreateItemDrawer.value = true;
	}

	function closeCreateItemDrawer() {
		showCreateItemDrawer.value = false;
	}

	async function saveCreateItem(data: ItemBuilderFormData) {
		savingCreateItem.value = true;
		const id = createId();
		await db.itemBuilders.add({
			id,
			...data,
			createdAt: new Date().toISOString(),
		});
		await loadItemBuilders();
		itemFormId.value = id;
		savingCreateItem.value = false;
		closeCreateItemDrawer();
	}

	async function saveItem() {
		if (!activeCutoff.value) {
			itemFormError.value = "Add a cutoff first";
			return;
		}
		if (!itemFormId.value) {
			itemFormError.value = "Select an item";
			return;
		}

		const amount = Number(itemFormAmount.value);
		if (!itemFormAmount.value || Number.isNaN(amount) || amount <= 0) {
			itemFormError.value = "Enter a valid amount";
			return;
		}

		const builder = itemBuilders.value.find(
			(item) => item.id === itemFormId.value,
		);
		if (!builder) {
			itemFormError.value = "Select an item";
			return;
		}

		const excess = mainItemBudgetExcess(amount);
		const doSave = async () => {
			savingItem.value = true;
			const entryId = createId();
			await db.budgetEntries.add({
				id: entryId,
				cutoffId: activeCutoff.value!.id,
				monthKey: activeCutoff.value!.monthKey,
				ruleName: activeTab.value,
				name: builder.name,
				amount,
				itemBuilderId: builder.id,
				createdAt: new Date().toISOString(),
			});
			await loadBudgetEntries();
			savingItem.value = false;
			closeItemModal();
		};

		if (excess > 0) {
			requestExceedConfirm(excess, doSave);
			return;
		}
		await doSave();
	}

	function openEditItemModal(entry: ItemEntry) {
		itemSwipeOffsets.value = {};
		itemSwipeActiveId = "";
		editItemId.value = entry.id;
		editItemName.value = entry.name;
		editItemIcon.value = entry.icon;
		editItemIconWrapClass.value = entry.iconWrapClass;
		editItemAmount.value = String(entry.amount);
		editItemBuilderId.value = entry.builderId;
		editItemHasChildItems.value = entry.hasChildItems;
		editItemError.value = "";
		subItemSwipeOffsets.value = {};
		showEditItemModal.value = true;
	}

	function closeEditItemModal() {
		editItemError.value = "";
		subItemSwipeOffsets.value = {};
		showEditItemModal.value = false;
	}

	async function saveEditItem() {
		const amount = Number(editItemAmount.value);
		if (!editItemAmount.value || Number.isNaN(amount) || amount <= 0) {
			editItemError.value = "Enter a valid amount";
			return;
		}

		const entry = budgetEntries.value.find((e) => e.id === editItemId.value);
		const oldAmount = entry?.amount ?? 0;
		const excess = mainItemBudgetExcess(amount, oldAmount);
		const doSave = async () => {
			savingEditItem.value = true;
			await db.budgetEntries.update(editItemId.value, { amount });
			await reloadTracker();
			savingEditItem.value = false;
			closeEditItemModal();
		};

		if (excess > 0) {
			requestExceedConfirm(excess, doSave);
			return;
		}
		await doSave();
	}

	async function removeEditItem() {
		savingEditItem.value = true;
		await deleteBudgetEntry(editItemId.value);
		savingEditItem.value = false;
		closeEditItemModal();
	}

	function itemSwipeOffset(id: string) {
		return itemSwipeOffsets.value[id] ?? 0;
	}

	function onItemSwipeStart(id: string, event: TouchEvent) {
		const touch = event.touches[0];
		if (!touch) return;
		itemSwipeStartX = touch.clientX;
		itemSwipeStartOffset = itemSwipeOffset(id);
		itemSwipeActiveId = id;
		itemSwipeMoved = false;
		for (const key of Object.keys(itemSwipeOffsets.value)) {
			if (key !== id) itemSwipeOffsets.value[key] = 0;
		}
	}

	function onItemSwipeMove(id: string, event: TouchEvent) {
		if (itemSwipeActiveId !== id) return;
		const touch = event.touches[0];
		if (!touch) return;
		const delta = touch.clientX - itemSwipeStartX;
		if (Math.abs(delta) > 6) itemSwipeMoved = true;
		itemSwipeOffsets.value[id] = Math.min(
			0,
			Math.max(-ITEM_SWIPE_DELETE_WIDTH, itemSwipeStartOffset + delta),
		);
	}

	async function onItemSwipeEnd(id: string) {
		const offset = itemSwipeOffset(id);
		if (offset <= -ITEM_SWIPE_DELETE_WIDTH * 0.85) {
			await removeSwipedItem(id);
			return;
		}
		itemSwipeOffsets.value[id] =
			offset < -ITEM_SWIPE_DELETE_WIDTH / 2 ? -ITEM_SWIPE_DELETE_WIDTH : 0;
		itemSwipeActiveId = "";
	}

	function onItemRowClick(entry: ItemEntry, id: string) {
		if (itemSwipeOffset(id) < 0) {
			itemSwipeOffsets.value[id] = 0;
			return;
		}
		if (itemSwipeMoved) return;
		openEditItemModal(entry);
	}

	function subItemSwipeOffset(id: string) {
		return subItemSwipeOffsets.value[id] ?? 0;
	}

	function onSubItemSwipeStart(id: string, event: TouchEvent) {
		const touch = event.touches[0];
		if (!touch) return;
		subItemSwipeStartX = touch.clientX;
		subItemSwipeStartOffset = subItemSwipeOffset(id);
		subItemSwipeActiveId = id;
		subItemSwipeMoved = false;
		for (const key of Object.keys(subItemSwipeOffsets.value)) {
			if (key !== id) subItemSwipeOffsets.value[key] = 0;
		}
	}

	function onSubItemSwipeMove(id: string, event: TouchEvent) {
		if (subItemSwipeActiveId !== id) return;
		const touch = event.touches[0];
		if (!touch) return;
		const delta = touch.clientX - subItemSwipeStartX;
		if (Math.abs(delta) > 6) subItemSwipeMoved = true;
		subItemSwipeOffsets.value[id] = Math.min(
			0,
			Math.max(-ITEM_SWIPE_DELETE_WIDTH, subItemSwipeStartOffset + delta),
		);
	}

	async function onSubItemSwipeEnd(id: string) {
		const offset = subItemSwipeOffset(id);
		if (offset <= -ITEM_SWIPE_DELETE_WIDTH * 0.85) {
			await deleteSubItem(id);
			return;
		}
		subItemSwipeOffsets.value[id] =
			offset < -ITEM_SWIPE_DELETE_WIDTH / 2 ? -ITEM_SWIPE_DELETE_WIDTH : 0;
		subItemSwipeActiveId = "";
	}

	async function deleteSubItem(id: string) {
		await db.budgetEntries.delete(id);
		delete subItemSwipeOffsets.value[id];
		await loadBudgetEntries();
	}

	function openSubItemModal() {
		subItemEditId.value = "";
		subItemName.value = "";
		subItemAmount.value = "";
		subItemError.value = "";
		showSubItemModal.value = true;
	}

	function onSubItemRowClick(child: BudgetEntry, id: string) {
		if (subItemSwipeOffset(id) < 0) {
			subItemSwipeOffsets.value[id] = 0;
			return;
		}
		if (subItemSwipeMoved) return;
		subItemEditId.value = id;
		subItemName.value = child.name;
		subItemAmount.value = String(child.amount);
		subItemError.value = "";
		showSubItemModal.value = true;
	}

	function closeSubItemModal() {
		showSubItemModal.value = false;
		subItemEditId.value = "";
		subItemError.value = "";
	}

	async function saveSubItem() {
		const name = subItemName.value.trim();
		const amount = Number(subItemAmount.value);
		if (!name) {
			subItemError.value = "Enter sub item name";
			return;
		}
		if (!subItemAmount.value || Number.isNaN(amount) || amount <= 0) {
			subItemError.value = "Enter a valid amount";
			return;
		}

		const parentEntry = budgetEntries.value.find(
			(e) => e.id === editItemId.value,
		);
		const parentAmount = parentEntry?.amount ?? 0;
		const otherSubItemsSum = budgetEntries.value
			.filter(
				(e) =>
					e.parentBudgetEntryId === editItemId.value && e.id !== subItemEditId.value,
			)
			.reduce((sum, e) => sum + e.amount, 0);
		if (otherSubItemsSum + amount > parentAmount) {
			const left = Math.max(0, parentAmount - otherSubItemsSum);
			subItemError.value = `Amount exceeds parent budget (₱${left.toLocaleString("en-PH")} left)`;
			return;
		}

		savingSubItem.value = true;
		if (subItemEditId.value) {
			await db.budgetEntries.update(subItemEditId.value, { name, amount });
		} else {
			if (!parentEntry) {
				savingSubItem.value = false;
				return;
			}
			await db.budgetEntries.add({
				id: createId(),
				cutoffId: parentEntry.cutoffId,
				monthKey: parentEntry.monthKey,
				ruleName: parentEntry.ruleName,
				name,
				amount,
				parentBudgetEntryId: editItemId.value,
				createdAt: new Date().toISOString(),
			});
		}
		await loadBudgetEntries();
		savingSubItem.value = false;
		closeSubItemModal();
	}

	async function removeSwipedItem(id: string) {
		itemSwipeOffsets.value = {};
		itemSwipeActiveId = "";
		await deleteBudgetEntry(id);
	}

	function openOthersBudgetModal() {
		othersBudgetError.value = "";
		if (othersBudget.value) {
			othersBudgetAmount.value = String(othersBudget.value.budgetAllocated);
		} else {
			othersBudgetAmount.value = "";
		}
		showOthersBudgetModal.value = true;
	}

	function closeOthersBudgetModal() {
		othersBudgetError.value = "";
		showOthersBudgetModal.value = false;
	}

	async function saveOthersBudget() {
		const amount = Number(othersBudgetAmount.value);
		if (!othersBudgetAmount.value || Number.isNaN(amount) || amount < 0) {
			othersBudgetError.value = "Enter a valid amount";
			return;
		}
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) {
			othersBudgetError.value = "Add a cutoff first";
			return;
		}
		const expensesRuleAmount =
			activeCutoff.value?.allocations?.Expenses?.amount ?? 0;
		const expensesEntriesSum = cutoffId
			? budgetEntries.value
					.filter(
						(entry) =>
							entry.cutoffId === cutoffId &&
							entry.ruleName === "Expenses" &&
							!entry.parentBudgetEntryId,
					)
					.reduce((sum, entry) => sum + entry.amount, 0)
			: 0;
		const remainingBudget = expensesRuleAmount - expensesEntriesSum;
		if (amount > remainingBudget) {
			othersBudgetError.value = `Amount exceeds remaining budget (₱${Math.max(0, remainingBudget).toLocaleString("en-PH")} left)`;
			return;
		}
		savingOthersBudget.value = true;
		if (othersBudget.value?.id) {
			await db.othersBudgets.update(othersBudget.value.id, {
				budgetAllocated: amount,
			});
		} else {
			await db.othersBudgets.add({
				id: createId(),
				cutoffId,
				monthKey: viewMonthKey.value,
				budgetAllocated: amount,
				createdAt: new Date().toISOString(),
			});
		}
		await loadOthers();
		savingOthersBudget.value = false;
		closeOthersBudgetModal();
	}

	function openOthersItemModal() {
		othersItemEditId.value = "";
		othersExpenseName.value = "";
		othersExpenseAmount.value = "";
		othersItemError.value = "";
		showOthersItemModal.value = true;
	}

	function onOthersItemRowClick(
		expense: { expenseName: string; amount: number },
		id: string,
	) {
		if (othersSwipeOffset(id) < 0) {
			othersSwipeOffsets.value[id] = 0;
			return;
		}
		if (othersSwipeMoved) return;
		othersItemEditId.value = id;
		othersExpenseName.value = expense.expenseName;
		othersExpenseAmount.value = String(expense.amount);
		othersItemError.value = "";
		showOthersItemModal.value = true;
	}

	function closeOthersItemModal() {
		showOthersItemModal.value = false;
		othersItemEditId.value = "";
		othersItemError.value = "";
	}

	async function saveOthersItem() {
		const name = othersExpenseName.value.trim();
		const amount = Number(othersExpenseAmount.value);
		if (!name) {
			othersItemError.value = "Enter expense name";
			return;
		}
		if (!othersExpenseAmount.value || Number.isNaN(amount) || amount <= 0) {
			othersItemError.value = "Enter a valid amount";
			return;
		}
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) {
			othersItemError.value = "Add a cutoff first";
			return;
		}

		const oldAmount = othersItemEditId.value
			? (othersExpenses.value.find((e) => e.id === othersItemEditId.value)
					?.amount ?? 0)
			: 0;
		const currentSpent = othersExpenses.value.reduce(
			(sum, expense) => sum + expense.amount,
			0,
		);
		const previousSpent = currentSpent - oldAmount;
		const previousExcess = Math.max(0, previousSpent - othersAllocated.value);
		const excess =
			previousSpent + amount - othersAllocated.value - previousExcess;

		const doSave = async () => {
			savingOthersItem.value = true;
			let sourceId = othersItemEditId.value;
			if (othersItemEditId.value) {
				await db.othersExpenses.update(othersItemEditId.value, {
					expenseName: name,
					amount,
				});
			} else {
				sourceId = createId();
				await db.othersExpenses.add({
					id: sourceId,
					cutoffId,
					monthKey: viewMonthKey.value,
					expenseName: name,
					amount,
					createdAt: new Date().toISOString(),
				});
			}
			if (excess > 0 && sourceId) {
				await addUnexpectedExpense(
					name,
					excess,
					"otherItems",
					sourceId,
					"Expenses",
				);
			}
			await loadOthers();
			savingOthersItem.value = false;
			closeOthersItemModal();
		};

		if (excess > 0) {
			requestExceedConfirm(excess, doSave);
			return;
		}
		await doSave();
	}

	async function deleteOthersExpense(id: string) {
		await db.othersExpenses.delete(id);
		await db.unexpectedExpenses.where("sourceId").equals(id).delete();
		delete othersSwipeOffsets.value[id];
		await loadOthers();
		await loadUnexpectedExpenses();
	}

	function othersSwipeOffset(id: string) {
		return othersSwipeOffsets.value[id] ?? 0;
	}

	function onOthersSwipeStart(id: string, event: TouchEvent) {
		const touch = event.touches[0];
		if (!touch) return;
		othersSwipeStartX = touch.clientX;
		othersSwipeStartOffset = othersSwipeOffset(id);
		othersSwipeActiveId = id;
		othersSwipeMoved = false;
		for (const key of Object.keys(othersSwipeOffsets.value)) {
			if (key !== id) othersSwipeOffsets.value[key] = 0;
		}
	}

	function onOthersSwipeMove(id: string, event: TouchEvent) {
		if (othersSwipeActiveId !== id) return;
		const touch = event.touches[0];
		if (!touch) return;
		const delta = touch.clientX - othersSwipeStartX;
		if (Math.abs(delta) > 6) othersSwipeMoved = true;
		othersSwipeOffsets.value[id] = Math.min(
			0,
			Math.max(-ITEM_SWIPE_DELETE_WIDTH, othersSwipeStartOffset + delta),
		);
	}

	async function onOthersSwipeEnd(id: string) {
		const offset = othersSwipeOffset(id);
		if (offset <= -ITEM_SWIPE_DELETE_WIDTH * 0.85) {
			await deleteOthersExpense(id);
			return;
		}
		othersSwipeOffsets.value[id] =
			offset < -ITEM_SWIPE_DELETE_WIDTH / 2 ? -ITEM_SWIPE_DELETE_WIDTH : 0;
		othersSwipeActiveId = "";
	}

	function openTabBudgetModal() {
		tabBudgetError.value = "";
		if (tabBudget.value) {
			tabBudgetAmount.value = String(tabBudget.value.budgetAllocated);
		} else {
			tabBudgetAmount.value = "";
		}
		showTabBudgetModal.value = true;
	}

	function closeTabBudgetModal() {
		tabBudgetError.value = "";
		showTabBudgetModal.value = false;
	}

	async function saveTabBudget() {
		if (activeTab.value !== "Expenses") return;
		const amount = Number(tabBudgetAmount.value);
		if (!tabBudgetAmount.value || Number.isNaN(amount) || amount < 0) {
			tabBudgetError.value = "Enter a valid amount";
			return;
		}
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) {
			tabBudgetError.value = "Add a cutoff first";
			return;
		}
		const expensesRuleAmount =
			activeCutoff.value?.allocations?.Expenses?.amount ?? 0;
		const expensesEntriesSum = cutoffId
			? budgetEntries.value
					.filter(
						(entry) =>
							entry.cutoffId === cutoffId &&
							entry.ruleName === "Expenses" &&
							!entry.parentBudgetEntryId,
					)
					.reduce((sum, entry) => sum + entry.amount, 0)
			: 0;
		const remainingBudget = expensesRuleAmount - expensesEntriesSum;
		if (amount > remainingBudget) {
			tabBudgetError.value = `Amount exceeds remaining budget (₱${Math.max(0, remainingBudget).toLocaleString("en-PH")} left)`;
			return;
		}
		savingTabBudget.value = true;
		try {
			if (tabBudget.value?.id) {
				await db.tabBudgets.update(tabBudget.value.id, {
					budgetAllocated: amount,
				});
			} else {
				await db.tabBudgets.add({
					id: createId(),
					cutoffId,
					monthKey: viewMonthKey.value,
					ruleName: "Expenses",
					budgetAllocated: amount,
					createdAt: new Date().toISOString(),
				});
			}
			await loadTabBudget();
			closeTabBudgetModal();
		} catch {
			tabBudgetError.value = "Could not save budget";
		} finally {
			savingTabBudget.value = false;
		}
	}

	function openTabBudgetItemModal() {
		tabBudgetItemEditId.value = "";
		tabBudgetExpenseName.value = "";
		tabBudgetExpenseAmount.value = "";
		tabBudgetItemError.value = "";
		showTabBudgetItemModal.value = true;
	}

	function onTabBudgetItemRowClick(
		expense: { expenseName: string; amount: number },
		id: string,
	) {
		if (tabBudgetSwipeOffset(id) < 0) {
			tabBudgetSwipeOffsets.value[id] = 0;
			return;
		}
		if (tabBudgetSwipeMoved) return;
		tabBudgetItemEditId.value = id;
		tabBudgetExpenseName.value = expense.expenseName;
		tabBudgetExpenseAmount.value = String(expense.amount);
		tabBudgetItemError.value = "";
		showTabBudgetItemModal.value = true;
	}

	function closeTabBudgetItemModal() {
		showTabBudgetItemModal.value = false;
		tabBudgetItemEditId.value = "";
		tabBudgetItemError.value = "";
	}

	async function saveTabBudgetItem() {
		const name = tabBudgetExpenseName.value.trim();
		const amount = Number(tabBudgetExpenseAmount.value);
		if (!name) {
			tabBudgetItemError.value = "Enter expense name";
			return;
		}
		if (!tabBudgetExpenseAmount.value || Number.isNaN(amount) || amount <= 0) {
			tabBudgetItemError.value = "Enter a valid amount";
			return;
		}
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) {
			tabBudgetItemError.value = "Add a cutoff first";
			return;
		}

		const oldAmount = tabBudgetItemEditId.value
			? (tabBudgetExpenses.value.find((e) => e.id === tabBudgetItemEditId.value)
					?.amount ?? 0)
			: 0;
		const currentSpent = tabBudgetExpenses.value.reduce(
			(sum, expense) => sum + expense.amount,
			0,
		);
		const previousSpent = currentSpent - oldAmount;
		const previousExcess = Math.max(0, previousSpent - tabBudgetAllocated.value);
		const excess =
			previousSpent + amount - tabBudgetAllocated.value - previousExcess;

		const doSave = async () => {
			savingTabBudgetItem.value = true;
			let sourceId = tabBudgetItemEditId.value;
			if (tabBudgetItemEditId.value) {
				await db.tabBudgetExpenses.update(tabBudgetItemEditId.value, {
					expenseName: name,
					amount,
				});
			} else {
				sourceId = createId();
				await db.tabBudgetExpenses.add({
					id: sourceId,
					cutoffId,
					monthKey: viewMonthKey.value,
					ruleName: "Expenses",
					expenseName: name,
					amount,
					createdAt: new Date().toISOString(),
				});
			}
			if (excess > 0 && sourceId) {
				await addUnexpectedExpense(
					name,
					excess,
					"budgetItems",
					sourceId,
					"Expenses",
				);
			}
			await loadTabBudget();
			savingTabBudgetItem.value = false;
			closeTabBudgetItemModal();
		};

		if (excess > 0) {
			requestExceedConfirm(excess, doSave);
			return;
		}
		await doSave();
	}

	async function deleteTabBudgetExpense(id: string) {
		await db.tabBudgetExpenses.delete(id);
		await db.unexpectedExpenses.where("sourceId").equals(id).delete();
		delete tabBudgetSwipeOffsets.value[id];
		await loadTabBudget();
		await loadUnexpectedExpenses();
	}

	function tabBudgetSwipeOffset(id: string) {
		return tabBudgetSwipeOffsets.value[id] ?? 0;
	}

	function onTabBudgetSwipeStart(id: string, event: TouchEvent) {
		const touch = event.touches[0];
		if (!touch) return;
		tabBudgetSwipeStartX = touch.clientX;
		tabBudgetSwipeStartOffset = tabBudgetSwipeOffset(id);
		tabBudgetSwipeActiveId = id;
		tabBudgetSwipeMoved = false;
		for (const key of Object.keys(tabBudgetSwipeOffsets.value)) {
			if (key !== id) tabBudgetSwipeOffsets.value[key] = 0;
		}
	}

	function onTabBudgetSwipeMove(id: string, event: TouchEvent) {
		if (tabBudgetSwipeActiveId !== id) return;
		const touch = event.touches[0];
		if (!touch) return;
		const delta = touch.clientX - tabBudgetSwipeStartX;
		if (Math.abs(delta) > 6) tabBudgetSwipeMoved = true;
		tabBudgetSwipeOffsets.value[id] = Math.min(
			0,
			Math.max(-ITEM_SWIPE_DELETE_WIDTH, tabBudgetSwipeStartOffset + delta),
		);
	}

	async function onTabBudgetSwipeEnd(id: string) {
		const offset = tabBudgetSwipeOffset(id);
		if (offset <= -ITEM_SWIPE_DELETE_WIDTH * 0.85) {
			await deleteTabBudgetExpense(id);
			return;
		}
		tabBudgetSwipeOffsets.value[id] =
			offset < -ITEM_SWIPE_DELETE_WIDTH / 2 ? -ITEM_SWIPE_DELETE_WIDTH : 0;
		tabBudgetSwipeActiveId = "";
	}

	// =============================================================================
	// INIT
	// =============================================================================
	onMounted(async () => {
		let existingRules = await db.rules.toArray();
		if (existingRules.length === 0) {
			await db.rules.bulkAdd(FIXED_RULES);
			existingRules = await db.rules.toArray();
		}
		rules.value = existingRules;
		await loadCutoffs();
		if (props.initialMonthKey) {
			viewMonthKey.value = props.initialMonthKey;
		} else {
			const activeList = cutoffs.value.filter((c) => c.status !== "finalized");
			if (activeList.length) {
				const active = activeList.reduce((latest, c) =>
					!latest || c.createdAt > latest.createdAt ? c : latest,
				);
				viewMonthKey.value = active.monthKey;
			}
		}
		await loadItemBuilders();
		await loadBudgetEntries();
		await loadOthers();
		await loadTabBudget();
		await loadUnexpectedExpenses();
		for (const cutoff of cutoffs.value) {
			if (cutoff.allocations) continue;
			const allocations = buildCutoffAllocations(cutoff.amount, rules.value);
			await db.cycleCutoffs.update(cutoff.id, { allocations });
			cutoff.allocations = allocations;
		}
	});

	watch(activeTab, () => {
		loadTabBudget();
	});

	watch(
		[
			budgetEntries,
			tabBudgetExpenses,
			othersExpenses,
			tabBudget,
			othersBudget,
			cutoffs,
		],
		() => {
			reconcileUnexpectedExpenses();
		},
	);
</script>

<template>
	<div
		class="mx-auto flex min-h-0 w-full max-w-[480px] flex-1 flex-col overflow-hidden items-stretch pt-0"
	>
		<PeriodNavSection
			:period-label="periodLabel"
			:can-go-prev="canGoPrev"
			:can-go-next="canGoNext"
			@prev="goPrev"
			@next="goNext"
		/>

		<div class="tracker-scroll min-h-0 flex-1">
			<div class="tracker-fixed shrink-0">
				<CutoffBudgetSection
					:budget-title="budgetTitle"
					:display-cutoff-date="displayCutoffDate"
					:display-amount="displayAmount"
					:display-amount-detail="displayAmountDetail"
					:display-spend-budget="displaySpendBudget"
					:display-spent="displaySpent"
					:progress-percent="progressPercent"
					:has-cutoff="!!activeCutoff"
					:progress-fill-color="progressFillColor"
					@open-modal="openModal"
				/>

				<TabsSection v-model:active-tab="activeTab" :tabs="tabs" />
			</div>
			<RuleSection
				:active-tab="activeTab"
				:active-rule-percent="activeRulePercent"
				:display-active-amount="displayActiveAmount"
				:display-rule-left="displayRuleLeft"
				:display-rule-spent="displayRuleSpent"
				:rule-progress-percent="ruleProgressPercent"
				:rule-over-budget="ruleOverBudget"
				:unexpected-excess-percent="unexpectedExcessPercent"
				:has-unexpected-excess="hasRuleUnexpectedBadge"
				:chart-key="`${activeCutoff?.id ?? 'none'}-${activeTab}`"
				:chart-data="chartData"
				:chart-options="chartOptions"
				:progress-fill-color="progressFillColor"
				:disabled="!activeCutoff"
				@open-item-modal="openItemModal"
				@open-unexpected-drawer="openUnexpectedDrawer"
			/>

			<ItemsSection
				:active-tab="activeTab"
				:entries="activeRuleEntries"
				:item-swipe-offset="itemSwipeOffset"
				:progress-fill-color="progressFillColor"
				@remove-swiped-item="removeSwipedItem"
				@item-swipe-start="onItemSwipeStart"
				@item-swipe-move="onItemSwipeMove"
				@item-swipe-end="onItemSwipeEnd"
				@item-row-click="onItemRowClick"
			/>

			<Divider
				margin-top="2rem"
				margin-bottom="2rem"
				v-if="activeTab === 'Expenses'"
			/>

			<template v-if="activeTab === 'Expenses'">
				<BudgetSection
					:active-tab="activeTab"
					:display-allocated="displayTabBudgetAllocated"
					:display-left="displayTabBudgetLeft"
					:display-spent="displayTabBudgetSpent"
					:progress-percent="tabBudgetProgressPercent"
					:over-budget="tabBudgetOverBudget"
					:has-budget="!!tabBudget"
					:progress-fill-color="progressFillColor"
					:disabled="!activeCutoff"
					@open-budget-modal="openTabBudgetModal"
				/>

				<OtherItemsSection
					title="Budget Items"
					:expenses="tabBudgetExpenses"
					:swipe-offset="tabBudgetSwipeOffset"
					:disabled="!activeCutoff"
					@open-item-modal="openTabBudgetItemModal"
					@delete-expense="deleteTabBudgetExpense"
					@swipe-start="onTabBudgetSwipeStart"
					@swipe-move="onTabBudgetSwipeMove"
					@swipe-end="onTabBudgetSwipeEnd"
					@item-row-click="onTabBudgetItemRowClick"
				/>

				<Divider margin-top="2rem" margin-bottom="2rem" />

				<OthersSection
					:display-allocated="displayOthersAllocated"
					:display-left="displayOthersLeft"
					:display-spent="displayOthersSpent"
					:progress-percent="othersProgressPercent"
					:over-budget="othersOverBudget"
					:has-budget="!!othersBudget"
					:progress-fill-color="progressFillColor"
					:disabled="!activeCutoff"
					@open-budget-modal="openOthersBudgetModal"
				/>

				<OtherItemsSection
					title="Other Items"
					:expenses="othersExpenses"
					:swipe-offset="othersSwipeOffset"
					:disabled="!activeCutoff"
					@open-item-modal="openOthersItemModal"
					@delete-expense="deleteOthersExpense"
					@swipe-start="onOthersSwipeStart"
					@swipe-move="onOthersSwipeMove"
					@swipe-end="onOthersSwipeEnd"
					@item-row-click="onOthersItemRowClick"
				/>
			</template>

			<Divider margin-top="2rem" margin-bottom="2rem" />

			<div class="tracker-finalize-bar w-[80%] mx-auto">
				<button
					type="button"
					class="finalize-btn"
					:class="{ 'is-disabled': !canFinalizeBudget }"
					:disabled="!canFinalizeBudget"
					@click="onFinalizeClick"
				>
					<span>{{ finalizeButtonLabel }}</span>
					<PaperAirplaneIcon class="finalize-btn-icon" />
				</button>
			</div>
		</div>

		<CutoffModal
			:show="showModal"
			:is-editing="isEditingCutoff"
			:error="formError"
			:options="cutoffOptions"
			:can-save="canSaveCutoff"
			:show-carry-over-option="showCarryOverOption"
			:carry-over-amount="availableCarryOver"
			v-model:amount="formAmount"
			v-model:name="formName"
			v-model:date="formDate"
			v-model:percents="formPercents"
			v-model:use-carry-over="formUseCarryOver"
			@close="closeModal"
			@save="saveCutoff"
		/>

		<AddItemModal
			:show="showItemModal && !showExceedModal"
			:error="itemFormError"
			:options="itemBuilderOptions"
			:saving="savingItem"
			v-model:item-id="itemFormId"
			v-model:amount="itemFormAmount"
			@close="closeItemModal"
			@save="saveItem"
			@create-item="openCreateItemDrawer"
		/>

		<EditItemDrawer
			:show="showEditItemModal && !showExceedModal"
			:name="editItemName"
			:icon="editItemIcon"
			:icon-wrap-class="editItemIconWrapClass"
			:has-child-items="editItemHasChildItems"
			:sub-items="editItemSubItems"
			:sub-item-swipe-offset="subItemSwipeOffset"
			:error="editItemError"
			:can-save="canSaveEditItem"
			:saving="savingEditItem"
			:remove-btn-color="RULE_COLORS.Expenses"
			v-model:amount="editItemAmount"
			@close="closeEditItemModal"
			@save="saveEditItem"
			@remove="removeEditItem"
			@add-sub-item="openSubItemModal"
			@delete-sub-item="deleteSubItem"
			@sub-item-row-click="onSubItemRowClick"
			@sub-item-swipe-start="onSubItemSwipeStart"
			@sub-item-swipe-move="onSubItemSwipeMove"
			@sub-item-swipe-end="onSubItemSwipeEnd"
		/>

		<ItemBuilderDrawer
			v-model:open="showCreateItemDrawer"
			:cat-expenses="activeTab === 'Expenses'"
			:cat-savings="activeTab === 'Savings'"
			:cat-wants="activeTab === 'Wants'"
			:saving="savingCreateItem"
			@save="saveCreateItem"
		/>

		<SubItemModal
			:show="showSubItemModal"
			:is-editing="!!subItemEditId"
			:error="subItemError"
			:can-save="canSaveSubItem"
			v-model:name="subItemName"
			v-model:amount="subItemAmount"
			@close="closeSubItemModal"
			@save="saveSubItem"
		/>

		<OthersBudgetModal
			:show="showOthersBudgetModal"
			:is-editing="isEditingOthersBudget"
			:error="othersBudgetError"
			:can-save="canSaveOthersBudget"
			v-model:amount="othersBudgetAmount"
			@close="closeOthersBudgetModal"
			@save="saveOthersBudget"
		/>

		<OthersItemModal
			:show="showOthersItemModal && !showExceedModal"
			:is-editing="!!othersItemEditId"
			:error="othersItemError"
			:can-save="canSaveOthersItem"
			v-model:name="othersExpenseName"
			v-model:amount="othersExpenseAmount"
			@close="closeOthersItemModal"
			@save="saveOthersItem"
		/>

		<TabBudgetModal
			:show="showTabBudgetModal"
			:is-editing="isEditingTabBudget"
			:error="tabBudgetError"
			:can-save="canSaveTabBudget"
			v-model:amount="tabBudgetAmount"
			@close="closeTabBudgetModal"
			@save="saveTabBudget"
		/>

		<TabBudgetItemModal
			:show="showTabBudgetItemModal && !showExceedModal"
			:is-editing="!!tabBudgetItemEditId"
			:error="tabBudgetItemError"
			:can-save="canSaveTabBudgetItem"
			v-model:name="tabBudgetExpenseName"
			v-model:amount="tabBudgetExpenseAmount"
			@close="closeTabBudgetItemModal"
			@save="saveTabBudgetItem"
		/>

		<UnexpectedDrawer
			:show="showUnexpectedDrawer"
			:items="activeRuleUnexpectedExpenses"
			:source-label="unexpectedSourceLabel"
			@close="closeUnexpectedDrawer"
		/>

		<ExceedModal
			:show="showExceedModal"
			:display-excess="displayExceedModalExcess"
			@close="closeExceedModal"
			@proceed="confirmExceedProceed"
		/>

		<FinalizeModal
			v-model:open="showFinalizeModal"
			:message="finalizeModalMessage"
			:allotted="displaySpendBudget"
			:excess="displayCutoffExcess"
			:excess-percent="cutoffExcessPercent"
			:summary="finalizeSummary"
			@confirmed="onFinalizeConfirmed"
		/>
	</div>
</template>

<style scoped>
	@import "./partials/sections/shared.css";

	.tracker-scroll {
		flex: 1 1 0;
		min-height: 0;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
		padding-bottom: calc(8.5rem + env(safe-area-inset-bottom));
	}

	.tracker-finalize-bar {
		/* position: fixed;
		left: 50%;
		bottom: calc(5.5rem + env(safe-area-inset-bottom)); */
		z-index: 40;
		max-width: 400px;
		/* padding: 0 1rem; */
		/* transform: translateX(-50%); */
	}

	.finalize-btn {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.85rem 1.25rem;
		border: 1px solid transparent;
		border-radius: 9999px;
		background-color: var(--color-primaryDark);
		color: var(--color-onColor);
		font-size: 0.95rem;
		font-family: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.finalize-btn.is-disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.finalize-btn-icon {
		width: 1.25rem;
		height: 1.25rem;
	}
</style>
