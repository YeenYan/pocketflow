<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import {
		PlusIcon,
		PencilIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		XMarkIcon,
	} from "@heroicons/vue/24/outline";
	import * as OutlineIcons from "@heroicons/vue/24/outline";
	import { Doughnut } from "vue-chartjs";
	import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import AmountField from "../../components/inputs/AmountField.vue";
	import SelectField from "../../components/inputs/SelectField.vue";
	import InputField from "../../components/inputs/InputField.vue";
	import ToggleSwitch from "../../components/inputs/ToggleSwitch.vue";
	import CircleCheckbox from "../../components/inputs/CircleCheckbox.vue";
	import {
		buildCutoffAllocations,
		createId,
		db,
		FIXED_RULES,
		type CycleCutoff,
		type ItemBuilder,
		type BudgetEntry,
		type Rule,
		type RuleName,
	} from "../../db/budgetDb";

	const ICON_OPTIONS = Object.keys(OutlineIcons).filter((key) =>
		key.endsWith("Icon"),
	);

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
		if (percent > 75) return "var(--color-progress-red)";
		if (percent > 50) return "var(--color-progress-orange)";
		if (percent > 25) return "var(--color-progress-yellow)";
		return "var(--color-progress-green)";
	}

	// =============================================================================
	// STATE
	// =============================================================================
	const activeTab = ref<RuleName>("Expenses");
	const tabs = RULE_ORDER;

	const rules = ref<Rule[]>([]);
	const cutoffs = ref<CycleCutoff[]>([]);
	const itemBuilders = ref<ItemBuilder[]>([]);
	const budgetEntries = ref<BudgetEntry[]>([]);

	const now = new Date();
	const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const viewMonthKey = ref(currentMonthKey);

	const cutoffOptions = [
		{ value: "1st cutoff", label: "1st cutoff" },
		{ value: "2nd cutoff", label: "2nd cutoff" },
	];

	const showModal = ref(false);
	const formAmount = ref("");
	const formName = ref("");
	const formDate = ref("");
	const formError = ref("");
	const saving = ref(false);

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
	const editItemError = ref("");
	const savingEditItem = ref(false);

	const itemSwipeOffsets = ref<Record<string, number>>({});
	let itemSwipeStartX = 0;
	let itemSwipeStartOffset = 0;
	let itemSwipeActiveId = "";
	let itemSwipeMoved = false;

	const showCreateItemDrawer = ref(false);
	const createFormName = ref("");
	const createCatExpenses = ref(false);
	const createCatSavings = ref(false);
	const createCatWants = ref(false);
	const createIsActive = ref(true);
	const createHasChildItems = ref(false);
	const createIcon = ref("HomeIcon");
	const createColor = ref(DEFAULT_ITEM_COLOR);
	const createFormError = ref("");
	const savingCreateItem = ref(false);

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
		if (viewMonthKey.value >= currentMonthKey) return false;
		const index = monthKeys.value.indexOf(viewMonthKey.value);
		return index >= 0 && index < monthKeys.value.length - 1;
	});

	// =============================================================================
	// BUDGET SECTION — computed
	// =============================================================================
	const activeCutoff = computed(() => {
		const list = viewCutoffs.value;
		if (list.length === 0) return null;
		return list.reduce((latest, c) =>
			!latest || c.createdAt > latest.createdAt ? c : latest,
		);
	});

	const totalAmount = computed(() => activeCutoff.value?.amount || 0);

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

	const spentAmount = computed(() => {
		const cutoffId = activeCutoff.value?.id;
		if (!cutoffId) return 0;
		return budgetEntries.value
			.filter((entry) => entry.cutoffId === cutoffId)
			.reduce((sum, entry) => sum + entry.amount, 0);
	});

	const displaySpent = computed(
		() => `₱${spentAmount.value.toLocaleString("en-PH")} spent already`,
	);

	const progressPercent = computed(() => {
		if (totalAmount.value <= 0) return 0;
		return Math.min(
			100,
			Math.round((spentAmount.value / totalAmount.value) * 100),
		);
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
					entry.cutoffId === cutoffId && entry.ruleName === activeTab.value,
			)
			.map((entry) => {
				const builder = itemBuilders.value.find((item) => item.name === entry.name);
				const color = builder?.color ?? DEFAULT_ITEM_COLOR;
				const colorOption =
					ITEM_COLOR_OPTIONS.find((option) => option.value === color) ??
					ITEM_COLOR_OPTIONS.find((option) => option.value === DEFAULT_ITEM_COLOR)!;
				return {
					...entry,
					icon: builder?.icon ?? "HomeIcon",
					iconWrapClass: colorOption.wrap,
				};
			});
	});

	const ruleSpentAmount = computed(() =>
		activeRuleEntries.value.reduce((sum, entry) => sum + entry.amount, 0),
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

	const displayRuleLeft = computed(
		() => `₱${ruleLeftAmount.value.toLocaleString("en-PH")}`,
	);

	const itemBuilderOptions = computed(() =>
		itemBuilders.value
			.filter((item) => item.isActive && item.categories.includes(activeTab.value))
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
			}),
	);

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

	async function loadCutoffs() {
		cutoffs.value = await db.cycleCutoffs.toArray();
	}

	async function loadItemBuilders() {
		itemBuilders.value = await db.itemBuilders.toArray();
	}

	async function loadBudgetEntries() {
		budgetEntries.value = await db.budgetEntries.toArray();
	}

	async function reloadTracker() {
		await loadCutoffs();
		await loadItemBuilders();
		await loadBudgetEntries();
	}

	async function deleteBudgetEntry(id: string) {
		await db.budgetEntries.delete(id);
		await reloadTracker();
	}

	function goPrev() {
		const index = monthKeys.value.indexOf(viewMonthKey.value);
		if (index > 0) viewMonthKey.value = monthKeys.value[index - 1];
	}

	function goNext() {
		if (!canGoNext.value) return;
		const index = monthKeys.value.indexOf(viewMonthKey.value);
		if (index < monthKeys.value.length - 1) {
			viewMonthKey.value = monthKeys.value[index + 1];
		}
	}

	// =============================================================================
	// ADD CUTOFF MODAL — actions
	// =============================================================================
	function openModal() {
		formAmount.value = "";
		formName.value = "";
		formDate.value = todayDate();
		formError.value = "";
		showModal.value = true;
	}

	function closeModal() {
		formError.value = "";
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

		const monthKey = date.slice(0, 7);
		const slot = (name === "1st cutoff" ? 1 : 2) as 1 | 2;
		const existing = await db.cycleCutoffs
			.where("monthKey")
			.equals(monthKey)
			.toArray();

		if (existing.some((c) => c.slot === slot)) {
			formError.value = `${name} already exists for this month`;
			return;
		}

		saving.value = true;
		await db.cycleCutoffs.add({
			id: createId(),
			monthKey,
			slot,
			label: name,
			amount,
			date,
			allocations: buildCutoffAllocations(amount, rules.value),
			createdAt: new Date().toISOString(),
		});
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
		createFormName.value = "";
		createCatExpenses.value = activeTab.value === "Expenses";
		createCatSavings.value = activeTab.value === "Savings";
		createCatWants.value = activeTab.value === "Wants";
		createIsActive.value = true;
		createHasChildItems.value = false;
		createIcon.value = "HomeIcon";
		createColor.value = DEFAULT_ITEM_COLOR;
		createFormError.value = "";
		showCreateItemDrawer.value = true;
	}

	function closeCreateItemDrawer() {
		createFormError.value = "";
		showCreateItemDrawer.value = false;
	}

	async function saveCreateItem() {
		const name = createFormName.value.trim();
		const categories: RuleName[] = [];
		if (createCatExpenses.value) categories.push("Expenses");
		if (createCatSavings.value) categories.push("Savings");
		if (createCatWants.value) categories.push("Wants");

		if (!name) {
			createFormError.value = "Enter item name";
			return;
		}
		if (categories.length === 0) {
			createFormError.value = "Select at least one category";
			return;
		}

		savingCreateItem.value = true;
		const id = createId();
		await db.itemBuilders.add({
			id,
			name,
			categories,
			isActive: createIsActive.value,
			hasChildItems: createHasChildItems.value,
			icon: createIcon.value,
			color: createColor.value,
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

		savingItem.value = true;
		await db.budgetEntries.add({
			id: createId(),
			cutoffId: activeCutoff.value.id,
			monthKey: activeCutoff.value.monthKey,
			ruleName: activeTab.value,
			name: builder.name,
			amount,
			createdAt: new Date().toISOString(),
		});
		await loadBudgetEntries();
		savingItem.value = false;
		closeItemModal();
	}

	function openEditItemModal(
		entry: BudgetEntry & { icon: string; iconWrapClass: string },
	) {
		itemSwipeOffsets.value = {};
		itemSwipeActiveId = "";
		editItemId.value = entry.id;
		editItemName.value = entry.name;
		editItemIcon.value = entry.icon;
		editItemIconWrapClass.value = entry.iconWrapClass;
		editItemAmount.value = String(entry.amount);
		editItemError.value = "";
		showEditItemModal.value = true;
	}

	function closeEditItemModal() {
		editItemError.value = "";
		showEditItemModal.value = false;
	}

	async function saveEditItem() {
		const amount = Number(editItemAmount.value);
		if (!editItemAmount.value || Number.isNaN(amount) || amount <= 0) {
			editItemError.value = "Enter a valid amount";
			return;
		}

		savingEditItem.value = true;
		await db.budgetEntries.update(editItemId.value, { amount });
		await reloadTracker();
		savingEditItem.value = false;
		closeEditItemModal();
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

	function onItemRowClick(
		entry: BudgetEntry & { icon: string; iconWrapClass: string },
		id: string,
	) {
		if (itemSwipeOffset(id) < 0) {
			itemSwipeOffsets.value[id] = 0;
			return;
		}
		if (itemSwipeMoved) return;
		openEditItemModal(entry);
	}

	async function removeSwipedItem(id: string) {
		itemSwipeOffsets.value = {};
		itemSwipeActiveId = "";
		await deleteBudgetEntry(id);
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
		await loadItemBuilders();
		await loadBudgetEntries();
		for (const cutoff of cutoffs.value) {
			if (cutoff.allocations) continue;
			const allocations = buildCutoffAllocations(cutoff.amount, rules.value);
			await db.cycleCutoffs.update(cutoff.id, { allocations });
			cutoff.allocations = allocations;
		}
	});
</script>

<template>
	<div
		class="mx-auto flex min-h-0 w-full max-w-[480px] flex-1 flex-col overflow-hidden items-stretch pt-0"
	>
		<!-- ================================================================== -->
		<!-- PERIOD NAV                                                        -->
		<!-- ================================================================== -->
		<div class="mb-3 flex shrink-0 items-center justify-between">
			<GlassContainer
				as="button"
				type="button"
				rounded="full"
				:padding="false"
				class="period-btn"
				:class="{ disabled: !canGoPrev }"
				aria-label="Previous period"
				:disabled="!canGoPrev"
				@click="goPrev"
			>
				<ChevronLeftIcon class="h-5 w-5" />
			</GlassContainer>
			<span class="flex-1 text-center text-base font-semibold text-textPrimary">
				{{ periodLabel }}
			</span>
			<GlassContainer
				as="button"
				type="button"
				rounded="full"
				:padding="false"
				class="period-btn"
				:class="{ disabled: !canGoNext }"
				aria-label="Next period"
				:disabled="!canGoNext"
				@click="goNext"
			>
				<ChevronRightIcon class="h-5 w-5" />
			</GlassContainer>
		</div>

		<div class="tracker-fixed shrink-0">
			<!-- ================================================================== -->
			<!-- BUDGET SECTION                                                      -->
			<!-- ================================================================== -->
			<GlassContainer class="relative mt-[1rem]">
				<GlassContainer
					as="button"
					type="button"
					rounded="full"
					:padding="false"
					class="plus-btn absolute right-[.6rem] top-[.6rem]"
					:aria-label="activeCutoff ? 'Edit cutoff' : 'Add cutoff'"
					@click="openModal"
				>
					<PencilIcon v-if="activeCutoff" class="h-5 w-5" />
					<PlusIcon v-else class="h-5 w-5" />
				</GlassContainer>
				<p class="m-0 min-w-0 pr-12 text-[0.95rem] font-semibold text-textPrimary">
					{{ budgetTitle }}
				</p>
				<p class="mb-0 text-xs text-textSecondary">
					Cutoff Date: {{ displayCutoffDate }}
				</p>
				<p class="mt-2 mb-0 text-[1.8rem] font-bold text-textPrimary">
					{{ displayAmount }}
				</p>
				<div class="flex items-center justify-between mb-[.]">
					<p class="mt-[0.35rem] mb-0 text-[0.85rem] text-textSecondary">
						{{ displaySpent }}
					</p>
					<p class="progress-pct">{{ progressPercent }}%</p>
				</div>
				<div class="progress-track">
					<div
						class="progress-fill"
						:style="{
							width: progressPercent + '%',
							background: progressFillColor(progressPercent),
						}"
					/>
				</div>
			</GlassContainer>

			<!-- ================================================================== -->
			<!-- TABS                                                                -->
			<!-- ================================================================== -->
			<div class="mt-4 mb-4 flex w-full shrink-0 gap-2">
				<button
					v-for="tab in tabs"
					:key="tab"
					type="button"
					class="tab"
					:class="{ active: activeTab === tab }"
					@click="activeTab = tab"
				>
					{{ tab }}
				</button>
			</div>
		</div>

		<!-- ================================================================== -->
		<!-- SCROLLABLE CONTENT (rule + items)                                   -->
		<!-- ================================================================== -->
		<div class="tracker-scroll min-h-0 flex-1">
			<!-- ================================================================== -->
			<!-- RULE SECTION (chart + progress)                                     -->
			<!-- ================================================================== -->
			<GlassContainer class="relative mb-4">
				<GlassContainer
					as="button"
					type="button"
					rounded="full"
					:padding="false"
					class="plus-btn add-btn absolute right-[.6rem] top-[.6rem] p-[1rem]"
					aria-label="Add item"
					@click="openItemModal"
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
							:key="`${activeCutoff?.id ?? 'none'}-${activeTab}`"
							:data="chartData"
							:options="chartOptions"
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
								Budget for {{ activeTab }}
							</p>
							<p class="mt-[-.1rem] mb-0 text-[1.4rem] font-bold text-textPrimary">
								{{ displayActiveAmount }}
							</p>
						</div>
						<div>
							<p class="m-0 text-[0.85rem] text-textSecondary">Budget left</p>
							<p class="mt-[-.1rem] mb-0 text-[1.4rem] font-bold text-textPrimary">
								{{ displayRuleLeft }}
							</p>
						</div>
					</div>
				</div>

				<div class="rule-progress">
					<div class="flex items-center justify-between">
						<span class="rule-progress-spent">-{{ displayRuleSpent }} spent</span>
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
			</GlassContainer>

			<!-- ================================================================== -->
			<!-- ITEMS LIST SECTION                                                  -->
			<!-- ================================================================== -->
			<GlassContainer class="mb-4">
				<p class="m-0 mb-[1.5rem] text-sm text-textSecondary">Items</p>
				<ul v-if="activeRuleEntries.length" class="item-list">
					<li
						v-for="entry in activeRuleEntries"
						:key="entry.id"
						class="item-swipe-wrap"
						:class="{ 'is-swiped': itemSwipeOffset(entry.id) < 0 }"
					>
						<button
							type="button"
							class="item-swipe-delete"
							aria-label="Remove item"
							@click.stop="removeSwipedItem(entry.id)"
						>
							<component :is="OutlineIcons.TrashIcon" class="item-swipe-delete-icon" />
						</button>
						<div
							class="item-row"
							:class="{ 'is-swiped': itemSwipeOffset(entry.id) < 0 }"
							:style="{ transform: `translateX(${itemSwipeOffset(entry.id)}px)` }"
							@touchstart.passive="onItemSwipeStart(entry.id, $event)"
							@touchmove="onItemSwipeMove(entry.id, $event)"
							@touchend="onItemSwipeEnd(entry.id)"
							@click="onItemRowClick(entry, entry.id)"
						>
							<span class="item-icon-wrap" :class="entry.iconWrapClass">
								<component
									:is="OutlineIcons[entry.icon as keyof typeof OutlineIcons]"
									class="item-icon"
								/>
							</span>
							<div class="item-row-main">
								<span class="item-row-name">{{ entry.name }}</span>
							</div>
							<span class="item-row-amount">
								₱{{ entry.amount.toLocaleString("en-PH") }}
							</span>
						</div>
					</li>
				</ul>
				<p v-else class="m-0 text-sm text-textSecondary">No items yet</p>
			</GlassContainer>
		</div>

		<!-- ================================================================== -->
		<!-- ADD CUTOFF MODAL                                                    -->
		<!-- ================================================================== -->
		<Teleport to="body">
			<div
				v-if="showModal"
				class="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
				@click.self="closeModal"
			>
				<GlassContainer
					class="flex w-full min-w-0 max-w-[400px] flex-col gap-4 overflow-hidden"
				>
					<h2 class="m-0 text-center text-lg font-semibold text-textPrimary">
						Add Cutoff
					</h2>

					<AmountField
						v-model="formAmount"
						label="Cutoff Amount"
						placeholder="0.00"
					/>
					<SelectField
						v-model="formName"
						label="Name"
						:options="cutoffOptions"
						placeholder="Select cutoff"
					/>
					<label class="flex w-full min-w-0 flex-col gap-2 overflow-hidden">
						<span class="text-base text-textPrimary">Date</span>
						<input
							v-model="formDate"
							type="date"
							class="field-input field-input-date"
						/>
					</label>

					<p v-if="formError" class="m-0 text-center text-sm text-[#f87171]">
						{{ formError }}
					</p>

					<div class="flex gap-3">
						<button type="button" class="btn" @click="closeModal">Cancel</button>
						<button
							type="button"
							class="btn primary"
							:disabled="saving"
							@click="saveCutoff"
						>
							Save
						</button>
					</div>
				</GlassContainer>
			</div>
		</Teleport>

		<!-- ================================================================== -->
		<!-- ADD ITEM MODAL                                                      -->
		<!-- ================================================================== -->
		<Teleport to="body">
			<div
				v-if="showItemModal"
				class="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
				@click.self="closeItemModal"
			>
				<GlassContainer class="flex w-full min-w-0 max-w-[400px] flex-col gap-6">
					<div class="flex items-center justify-between gap-3">
						<h2 class="m-0 text-center text-lg font-semibold text-textPrimary">
							Add Item
						</h2>
						<button
							type="button"
							class="outline max-w-[11rem] py-[.6rem] px-[1rem] rounded-full"
							@click="openCreateItemDrawer"
						>
							+ Create New Item
						</button>
					</div>

					<SelectField
						v-model="itemFormId"
						label="Item Name"
						:options="itemBuilderOptions"
						placeholder="Search item"
					/>

					<AmountField v-model="itemFormAmount" label="Amount" placeholder="0.00" />

					<p v-if="itemFormError" class="m-0 text-center text-sm text-[#f87171]">
						{{ itemFormError }}
					</p>

					<div class="flex gap-3">
						<button type="button" class="btn" @click="closeItemModal">Cancel</button>
						<button
							type="button"
							class="btn primary"
							:disabled="savingItem"
							@click="saveItem"
						>
							Save
						</button>
					</div>
				</GlassContainer>
			</div>
		</Teleport>

		<!-- ================================================================== -->
		<!-- EDIT ITEM MODAL                                                     -->
		<!-- ================================================================== -->
		<Teleport to="body">
			<div
				v-if="showEditItemModal"
				class="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
				@click.self="closeEditItemModal"
			>
				<GlassContainer class="flex w-full min-w-0 max-w-[400px] flex-col gap-4">
					<h2 class="m-0 text-center text-lg font-semibold text-textPrimary">
						Edit Item
					</h2>

					<div class="flex items-center justify-center gap-3">
						<span class="item-icon-wrap" :class="editItemIconWrapClass">
							<component
								:is="OutlineIcons[editItemIcon as keyof typeof OutlineIcons]"
								class="item-icon"
							/>
						</span>
						<span class="edit-item-name">{{ editItemName }}</span>
					</div>

					<AmountField v-model="editItemAmount" label="Amount" placeholder="0.00" />

					<p v-if="editItemError" class="m-0 text-center text-sm text-[#f87171]">
						{{ editItemError }}
					</p>

					<div class="flex gap-3">
						<button
							type="button"
							class="btn danger"
							:disabled="savingEditItem"
							@click="removeEditItem"
						>
							Remove
						</button>
						<button
							type="button"
							class="btn primary"
							:disabled="savingEditItem"
							@click="saveEditItem"
						>
							Update
						</button>
					</div>
				</GlassContainer>
			</div>
		</Teleport>

		<!-- ================================================================== -->
		<!-- CREATE NEW ITEM DRAWER                                              -->
		<!-- ================================================================== -->
		<Teleport to="body">
			<div
				v-if="showCreateItemDrawer"
				class="fixed inset-0 z-[60] flex items-end justify-center bg-overlay"
				@click.self="closeCreateItemDrawer"
			>
				<GlassContainer
					class="drawer-sheet flex w-full max-w-[480px] flex-col gap-4 rounded-t-[1.25rem] rounded-b-none pb-6"
				>
					<div class="drawer-handle" />
					<div class="flex items-center justify-between gap-3">
						<h2 class="m-0 text-lg font-semibold text-textPrimary">
							Create New Item
						</h2>
						<button
							type="button"
							class="drawer-close"
							aria-label="Close"
							@click="closeCreateItemDrawer"
						>
							<XMarkIcon class="h-5 w-5" />
						</button>
					</div>

					<InputField
						v-model="createFormName"
						label="Name"
						placeholder="Item name"
						mode="text"
					/>

					<div class="subtitle-divider">
						<span>Categories</span>
					</div>

					<div class="flex flex-wrap gap-4">
						<CircleCheckbox v-model="createCatExpenses" label="Expenses" />
						<CircleCheckbox v-model="createCatSavings" label="Savings" />
						<CircleCheckbox v-model="createCatWants" label="Wants" />
					</div>

					<div class="subtitle-divider">
						<span>Settings</span>
					</div>

					<div class="flex items-center justify-between gap-3">
						<span class="text-base text-textPrimary">Active</span>
						<ToggleSwitch v-model="createIsActive" />
					</div>
					<div class="flex items-center justify-between gap-3">
						<span class="text-base text-textPrimary">Have child items</span>
						<ToggleSwitch v-model="createHasChildItems" />
					</div>

					<div class="subtitle-divider">
						<span>Color</span>
					</div>

					<div class="icon-grid">
						<button
							v-for="color in ITEM_COLOR_OPTIONS"
							:key="color.value"
							type="button"
							class="color-btn"
							:class="{ selected: createColor === color.value }"
							:title="color.value"
							@click="createColor = color.value"
						>
							<span class="color-swatch" :class="color.swatch" />
						</button>
					</div>

					<div class="subtitle-divider">
						<span>Icon</span>
					</div>

					<div class="icon-grid">
						<button
							v-for="iconName in ICON_OPTIONS"
							:key="iconName"
							type="button"
							class="icon-btn"
							:class="{ selected: createIcon === iconName }"
							:title="iconName"
							@click="createIcon = iconName"
						>
							<component
								:is="OutlineIcons[iconName as keyof typeof OutlineIcons]"
								class="h-5 w-5"
							/>
						</button>
					</div>

					<p v-if="createFormError" class="m-0 text-center text-sm text-[#f87171]">
						{{ createFormError }}
					</p>

					<div class="flex gap-3">
						<button type="button" class="btn" @click="closeCreateItemDrawer">
							Cancel
						</button>
						<button
							type="button"
							class="btn primary"
							:disabled="savingCreateItem"
							@click="saveCreateItem"
						>
							Save
						</button>
					</div>
				</GlassContainer>
			</div>
		</Teleport>
	</div>
</template>

<style scoped>
	/* ========================================================================= */
	/* PERIOD NAV                                                                 */
	/* ========================================================================= */
	.period-btn {
		padding: 0.5rem;
		color: var(--color-textPrimary);
		cursor: pointer;
	}

	.period-btn.disabled {
		opacity: 0.3;
		cursor: not-allowed;
		pointer-events: none;
	}

	.tracker-scroll {
		flex: 1 1 0;
		min-height: 0;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
		padding-bottom: calc(5.5rem + env(safe-area-inset-bottom));
	}

	/* ========================================================================= */
	/* BUDGET SECTION                                                             */
	/* ========================================================================= */
	.plus-btn {
		padding: 0.7rem;
		color: var(--color-onColor);
		background: var(--color-accentSolid);
		flex-shrink: 0;
	}

	.add-btn {
		padding: 1rem;
	}

	.progress-pct,
	.rule-progress-pct {
		margin: 0.35rem 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-textPrimary);
		text-align: right;
	}

	.progress-track {
		height: 0.5rem;
		border-radius: 9999px;
		background: var(--color-inputBorder);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: 9999px;
		transition:
			width 0.2s,
			background-color 0.2s;
	}

	/* ========================================================================= */
	/* TABS                                                                       */
	/* ========================================================================= */
	.tab {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 9999px;
		background: none;
		font-size: 0.95rem;
		font-family: inherit;
		color: var(--color-textSecondary);
		text-align: center;
		cursor: pointer;
	}

	.tab.active {
		border-color: transparent;
		background: var(--color-textPrimary);
		color: var(--color-bg);
	}

	/* ========================================================================= */
	/* RULE SECTION — chart + stats                                               */
	/* ========================================================================= */
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

	/* ========================================================================= */
	/* RULE SECTION — progress bar                                                */
	/* ========================================================================= */
	.rule-progress-track {
		height: 0.5rem;
		border-radius: 9999px;
		background: var(--color-inputBorder);
		overflow: hidden;
	}

	.rule-progress-fill {
		height: 100%;
		border-radius: 9999px;
		transition:
			width 0.2s,
			background-color 0.2s;
	}

	.rule-progress-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.rule-progress-spent {
		font-size: 0.85rem;
		color: var(--color-textSecondary);
	}

	.rule-progress-left {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	/* ========================================================================= */
	/* ITEMS LIST SECTION                                                         */
	/* ========================================================================= */
	.item-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.item-swipe-wrap {
		position: relative;
		overflow: hidden;
	}

	.item-swipe-delete {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 4.5rem;
		border: none;
		background: #f87171;
		color: #fff;
		cursor: pointer;
		visibility: hidden;
		pointer-events: none;
	}

	.item-swipe-wrap.is-swiped .item-swipe-delete {
		visibility: visible;
		pointer-events: auto;
	}

	.item-swipe-delete-icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.item-row {
		position: relative;
		z-index: 1;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 0;
		border-top: 1px solid var(--color-inputBorder);
		cursor: pointer;
		touch-action: pan-y;
		transition: transform 0.2s ease;
	}

	.item-swipe-wrap:first-child .item-row {
		border-top: none;
		padding-top: 0;
	}

	.item-row.is-swiped {
		background: var(--color-bgBody);
	}

	.item-icon-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.5rem;
		flex-shrink: 0;
	}

	.item-icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.item-row-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.item-row-name {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.edit-item-name {
		font-size: 1.4rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.item-row-meta {
		font-size: 0.8rem;
		color: var(--color-textSecondary);
	}

	.item-row-amount {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-textPrimary);
		flex-shrink: 0;
	}

	/* ========================================================================= */
	/* ADD CUTOFF MODAL                                                           */
	/* ========================================================================= */
	.field-input {
		width: 100%;
		min-width: 0;
		max-width: 100%;
		box-sizing: border-box;
		padding: 0.875rem 1.25rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		background: transparent;
		color: var(--color-inputText);
		font-size: 1rem;
		font-family: inherit;
		outline: none;
	}

	.field-input-date {
		display: block;
		-webkit-min-logical-width: 0;
	}

	.field-input-date::-webkit-date-and-time-value {
		min-width: 0;
		text-align: left;
	}

	.field-input:focus {
		border-color: var(--color-textSecondary);
	}

	.btn {
		flex: 1;
		padding: 0.75rem 1.25rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		background: transparent;
		color: var(--color-textPrimary);
		font-size: 0.95rem;
		font-family: inherit;
		cursor: pointer;
	}

	.btn.primary {
		border-color: transparent;
		background-color: var(--color-primaryDark);
		color: var(--color-onColor);
	}

	.btn.danger {
		border-color: transparent;
		background: #f87171;
		color: #fff;
	}

	.btn.outline {
		border-color: var(--color-textPrimary);
		background: transparent;
		color: var(--color-textPrimary);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* ========================================================================= */
	/* CREATE ITEM DRAWER                                                         */
	/* ========================================================================= */
	.drawer-sheet {
		max-height: 90dvh;
		overflow-y: auto;
		animation: drawer-up 0.28s ease-out;
	}

	.drawer-handle {
		width: 2.5rem;
		height: 0.25rem;
		margin: 0 auto;
		border-radius: 9999px;
		background: var(--color-inputBorder);
	}

	.drawer-close {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		border: none;
		border-radius: 50%;
		background: var(--color-inputBorder);
		color: var(--color-textPrimary);
		cursor: pointer;
	}

	.subtitle-divider {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.85rem;
		color: var(--color-textSecondary);
	}

	.subtitle-divider::before,
	.subtitle-divider::after {
		content: "";
		flex: 1;
		height: 1px;
		background: var(--color-inputBorder);
	}

	.icon-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(2.5rem, 1fr));
		gap: 0.5rem;
		max-height: 8rem;
		overflow-y: auto;
		padding: 0.25rem;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		border: 1px solid var(--color-inputBorder);
		border-radius: 0.5rem;
		background: transparent;
		color: var(--color-textSecondary);
		cursor: pointer;
	}

	.icon-btn.selected {
		border-color: var(--color-accentSolid);
		background: var(--color-accentSolid);
		color: var(--color-onColor);
	}

	.color-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem;
		border: 2px solid transparent;
		border-radius: 9999px;
		background: transparent;
		cursor: pointer;
	}

	.color-btn.selected {
		border-color: var(--color-textPrimary);
	}

	.color-swatch {
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
	}

	@keyframes drawer-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
</style>
