<script setup lang="ts">
	import { computed, onMounted, ref, watch } from "vue";
	import {
		ArchiveBoxXMarkIcon,
		PaperAirplaneIcon,
		PlusIcon,
		TrashIcon,
	} from "@heroicons/vue/24/outline";
	import Button from "../../components/button/Button.vue";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import Divider from "../../components/divider/Divider.vue";
	import ItemBuilderDrawer, {
		type ItemBuilderFormData,
	} from "../../components/item-builder/ItemBuilderDrawer.vue";
	import AmountField from "../../components/inputs/AmountField.vue";
	import SelectField from "../../components/inputs/SelectField.vue";
	import {
		buildCutoffAllocations,
		createId,
		db,
		FIXED_RULES,
		type CycleCutoff,
		type IncomingBillBudget,
		type IncomingBillBudgetCategory,
		type IncomingBillItem,
		type IncomingBillItemCategory,
		type ItemBuilder,
		type Rule,
		type RuleName,
	} from "../../db/budgetDb";
	import CutoffModal from "./partials/modals/CutoffModal.vue";
	import OtherItemsSection from "./partials/sections/OtherItemsSection.vue";

	const emit = defineEmits<{
		"moved-to-tracker": [monthKey: string];
	}>();

	const RULE_ORDER: RuleName[] = ["Expenses", "Savings", "Wants"];

	const ITEM_COLOR_OPTIONS = [
		{
			value: "slate-500",
			wrap:
				"bg-slate-500/15 dark:bg-slate-500/25 text-slate-700 dark:text-slate-200",
		},
		{
			value: "gray-500",
			wrap: "bg-gray-500/15 dark:bg-gray-500/25 text-gray-700 dark:text-gray-200",
		},
		{
			value: "zinc-500",
			wrap: "bg-zinc-500/15 dark:bg-zinc-500/25 text-zinc-700 dark:text-zinc-200",
		},
		{
			value: "neutral-500",
			wrap:
				"bg-neutral-500/15 dark:bg-neutral-500/25 text-neutral-700 dark:text-neutral-200",
		},
		{
			value: "stone-500",
			wrap:
				"bg-stone-500/15 dark:bg-stone-500/25 text-stone-700 dark:text-stone-200",
		},
		{
			value: "red-500",
			wrap: "bg-red-500/15 dark:bg-red-500/25 text-red-700 dark:text-red-300",
		},
		{
			value: "orange-500",
			wrap:
				"bg-orange-500/15 dark:bg-orange-500/25 text-orange-700 dark:text-orange-300",
		},
		{
			value: "amber-500",
			wrap:
				"bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300",
		},
		{
			value: "yellow-500",
			wrap:
				"bg-yellow-500/15 dark:bg-yellow-500/25 text-yellow-700 dark:text-yellow-300",
		},
		{
			value: "lime-500",
			wrap: "bg-lime-500/15 dark:bg-lime-500/25 text-lime-700 dark:text-lime-300",
		},
		{
			value: "green-500",
			wrap:
				"bg-green-500/15 dark:bg-green-500/25 text-green-700 dark:text-green-300",
		},
		{
			value: "emerald-500",
			wrap:
				"bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300",
		},
		{
			value: "teal-500",
			wrap: "bg-teal-500/15 dark:bg-teal-500/25 text-teal-700 dark:text-teal-300",
		},
		{
			value: "cyan-500",
			wrap: "bg-cyan-500/15 dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300",
		},
		{
			value: "sky-500",
			wrap: "bg-sky-500/15 dark:bg-sky-500/25 text-sky-700 dark:text-sky-300",
		},
		{
			value: "blue-500",
			wrap: "bg-blue-500/15 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300",
		},
		{
			value: "indigo-500",
			wrap:
				"bg-indigo-500/15 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300",
		},
		{
			value: "violet-500",
			wrap:
				"bg-violet-500/15 dark:bg-violet-500/25 text-violet-700 dark:text-violet-300",
		},
		{
			value: "purple-500",
			wrap:
				"bg-purple-500/15 dark:bg-purple-500/25 text-purple-700 dark:text-purple-300",
		},
		{
			value: "fuchsia-500",
			wrap:
				"bg-fuchsia-500/15 dark:bg-fuchsia-500/25 text-fuchsia-700 dark:text-fuchsia-300",
		},
		{
			value: "pink-500",
			wrap: "bg-pink-500/15 dark:bg-pink-500/25 text-pink-700 dark:text-pink-300",
		},
		{
			value: "rose-500",
			wrap: "bg-rose-500/15 dark:bg-rose-500/25 text-rose-700 dark:text-rose-300",
		},
		{
			value: "slate-700",
			wrap:
				"bg-slate-700/15 dark:bg-slate-700/25 text-slate-800 dark:text-slate-200",
		},
		{
			value: "gray-700",
			wrap: "bg-gray-700/15 dark:bg-gray-700/25 text-gray-800 dark:text-gray-200",
		},
		{
			value: "red-700",
			wrap: "bg-red-700/15 dark:bg-red-700/25 text-red-800 dark:text-red-300",
		},
		{
			value: "orange-700",
			wrap:
				"bg-orange-700/15 dark:bg-orange-700/25 text-orange-800 dark:text-orange-300",
		},
		{
			value: "amber-700",
			wrap:
				"bg-amber-700/15 dark:bg-amber-700/25 text-amber-800 dark:text-amber-300",
		},
		{
			value: "yellow-700",
			wrap:
				"bg-yellow-700/15 dark:bg-yellow-700/25 text-yellow-800 dark:text-yellow-300",
		},
		{
			value: "green-700",
			wrap:
				"bg-green-700/15 dark:bg-green-700/25 text-green-800 dark:text-green-300",
		},
		{
			value: "teal-700",
			wrap: "bg-teal-700/15 dark:bg-teal-700/25 text-teal-800 dark:text-teal-300",
		},
		{
			value: "blue-700",
			wrap: "bg-blue-700/15 dark:bg-blue-700/25 text-blue-800 dark:text-blue-300",
		},
		{
			value: "indigo-700",
			wrap:
				"bg-indigo-700/15 dark:bg-indigo-700/25 text-indigo-800 dark:text-indigo-300",
		},
		{
			value: "purple-700",
			wrap:
				"bg-purple-700/15 dark:bg-purple-700/25 text-purple-800 dark:text-purple-300",
		},
		{
			value: "pink-700",
			wrap: "bg-pink-700/15 dark:bg-pink-700/25 text-pink-800 dark:text-pink-300",
		},
		{
			value: "rose-700",
			wrap: "bg-rose-700/15 dark:bg-rose-700/25 text-rose-800 dark:text-rose-300",
		},
	];

	const DEFAULT_ITEM_COLOR = "emerald-500";
	const ITEM_SWIPE_DELETE_WIDTH = 72;

	type FormCategory =
		| "expense-main"
		| "cutoff"
		| "other-expenses"
		| "savings"
		| "wants";

	const CATEGORY_OPTIONS: { value: FormCategory; label: string }[] = [
		{ value: "expense-main", label: "Expense Main Items" },
		{ value: "cutoff", label: "Cutoff Budget" },
		{ value: "other-expenses", label: "Other Expenses Budget" },
		{ value: "savings", label: "Saving's Items" },
		{ value: "wants", label: "Wants Budget" },
	];

	const items = ref<IncomingBillItem[]>([]);
	const budgets = ref<IncomingBillBudget[]>([]);
	const itemBuilders = ref<ItemBuilder[]>([]);

	const showModal = ref(false);
	const formCategory = ref<FormCategory>("expense-main");
	const itemFormId = ref("");
	const formAmount = ref("");
	const formError = ref("");
	const saving = ref(false);

	const showCreateItemDrawer = ref(false);
	const savingCreateItem = ref(false);

	const rules = ref<Rule[]>([]);
	const cutoffs = ref<CycleCutoff[]>([]);

	const showResetConfirm = ref(false);
	const showActiveTrackerModal = ref(false);
	const showMoveConfirm = ref(false);

	const showCutoffModal = ref(false);
	const cutoffFormAmount = ref("");
	const cutoffFormName = ref("");
	const cutoffFormDate = ref("");
	const cutoffFormPercents = ref<{ name: RuleName; percent: number }[]>([]);
	const cutoffFormUseCarryOver = ref(false);
	const cutoffFormError = ref("");
	const cutoffSaving = ref(false);
	const editingCutoffId = ref("");
	const availableCarryOver = ref(0);

	const showEditModal = ref(false);
	const editType = ref<"budget" | "item">("budget");
	const editId = ref("");
	const editTitle = ref("");
	const editAmount = ref("");
	const editOriginalAmount = ref("");
	const editError = ref("");
	const editSaving = ref(false);

	const editChanged = computed(
		() => editAmount.value !== editOriginalAmount.value,
	);

	const expenseSwipeOffsets = ref<Record<string, number>>({});
	const savingsSwipeOffsets = ref<Record<string, number>>({});
	let expenseSwipeStartX = 0;
	let expenseSwipeStartOffset = 0;
	let expenseSwipeActiveId = "";
	let savingsSwipeStartX = 0;
	let savingsSwipeStartOffset = 0;
	let savingsSwipeActiveId = "";

	const cutoffBudget = computed(() =>
		budgets.value.find((b) => b.category === "cutoff"),
	);
	const otherExpensesBudget = computed(() =>
		budgets.value.find((b) => b.category === "other-expenses"),
	);
	const wantsBudget = computed(() =>
		budgets.value.find((b) => b.category === "wants"),
	);

	const incomingTotal = computed(() => {
		const itemsSum = items.value.reduce((sum, item) => sum + item.amount, 0);
		const budgetsSum = budgets.value.reduce(
			(sum, budget) => sum + budget.amount,
			0,
		);
		return itemsSum + budgetsSum;
	});

	const displayTotal = computed(() => formatAmount(incomingTotal.value));

	const canMoveToTracker = computed(
		() => items.value.length > 0 || budgets.value.length > 0,
	);

	const cutoffFormPercentTotal = computed(() =>
		cutoffFormPercents.value.reduce(
			(sum, rule) => sum + (Number(rule.percent) || 0),
			0,
		),
	);

	const cutoffOptions = computed(() => {
		const all = [
			{ value: "1st cutoff", label: "1st cutoff" },
			{ value: "2nd cutoff", label: "2nd cutoff" },
		];
		const monthKey = cutoffFormDate.value ? cutoffFormDate.value.slice(0, 7) : "";
		if (!monthKey) return all;
		const usedSlots = cutoffs.value
			.filter((c) => c.monthKey === monthKey && c.id !== editingCutoffId.value)
			.map((c) => c.slot);
		return all.filter(
			(opt) => !usedSlots.includes(opt.value === "1st cutoff" ? 1 : 2),
		);
	});

	const canSaveCutoff = computed(() => {
		if (cutoffSaving.value) return false;
		if (cutoffFormPercentTotal.value !== 100) return false;
		return true;
	});

	const previousCutoff = computed(() => {
		const sorted = [...cutoffs.value].sort((a, b) =>
			a.createdAt.localeCompare(b.createdAt),
		);
		return sorted.length ? sorted[sorted.length - 1] : null;
	});

	const showCarryOverOption = computed(() => availableCarryOver.value > 0);

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

	const expenseMainItems = computed(() =>
		items.value
			.filter((item) => item.category === "expense-main")
			.map((item) => ({
				id: item.id,
				expenseName: item.name,
				amount: item.amount,
				createdAt: item.createdAt,
			})),
	);

	const savingsItems = computed(() =>
		items.value
			.filter((item) => item.category === "savings")
			.map((item) => ({
				id: item.id,
				expenseName: item.name,
				amount: item.amount,
				createdAt: item.createdAt,
			})),
	);

	const availableCategoryOptions = computed(() =>
		CATEGORY_OPTIONS.filter((option) => {
			if (option.value === "cutoff" && cutoffBudget.value) return false;
			if (option.value === "other-expenses" && otherExpensesBudget.value)
				return false;
			if (option.value === "wants" && wantsBudget.value) return false;
			return true;
		}),
	);

	const isItemCategory = computed(
		() =>
			formCategory.value === "expense-main" || formCategory.value === "savings",
	);

	const itemBuilderRule = computed(() =>
		formCategory.value === "savings" ? "Savings" : "Expenses",
	);

	const itemBuilderOptions = computed(() => {
		const category = formCategory.value as IncomingBillItemCategory;
		const addedBuilderIds = new Set(
			items.value
				.filter((item) => item.category === category)
				.map((item) => item.itemBuilderId),
		);
		return itemBuilders.value
			.filter(
				(item) =>
					item.isActive &&
					item.categories.includes(itemBuilderRule.value) &&
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

	function formatAmount(amount: number) {
		return `₱${amount.toLocaleString("en-PH")}`;
	}

	function todayDate() {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
	}

	async function loadRules() {
		let existingRules = await db.rules.toArray();
		if (existingRules.length === 0) {
			await db.rules.bulkAdd(FIXED_RULES);
			existingRules = await db.rules.toArray();
		}
		rules.value = existingRules;
	}

	async function loadCutoffs() {
		cutoffs.value = await db.cycleCutoffs.toArray();
	}

	async function hasActiveTracker() {
		const all = await db.cycleCutoffs.toArray();
		return all.some((cutoff) => cutoff.status !== "finalized");
	}

	function openResetConfirm() {
		showResetConfirm.value = true;
	}

	function closeResetConfirm() {
		showResetConfirm.value = false;
	}

	async function confirmReset() {
		await db.incomingBillItems.clear();
		await db.incomingBillBudgets.clear();
		items.value = [];
		budgets.value = [];
		expenseSwipeOffsets.value = {};
		savingsSwipeOffsets.value = {};
		resetForm();
		closeResetConfirm();
	}

	async function onMoveClick() {
		if (!canMoveToTracker.value) return;
		if (await hasActiveTracker()) {
			showActiveTrackerModal.value = true;
			return;
		}
		showMoveConfirm.value = true;
	}

	function closeActiveTrackerModal() {
		showActiveTrackerModal.value = false;
	}

	function closeMoveConfirm() {
		showMoveConfirm.value = false;
	}

	async function openCutoffModal() {
		closeMoveConfirm();
		cutoffFormError.value = "";
		editingCutoffId.value = "";
		availableCarryOver.value = 0;
		cutoffFormUseCarryOver.value = false;
		cutoffFormAmount.value =
			incomingTotal.value > 0 ? String(incomingTotal.value) : "";
		cutoffFormName.value = "";
		cutoffFormDate.value = todayDate();
		cutoffFormPercents.value = RULE_ORDER.map((name) => ({
			name,
			percent: rules.value.find((rule) => rule.name === name)?.percent ?? 0,
		}));
		const previous = previousCutoff.value;
		if (previous && !previous.carryOverDecision) {
			availableCarryOver.value = await loadCarryOverForCutoff(previous);
		}
		showCutoffModal.value = true;
	}

	function closeCutoffModal() {
		cutoffFormError.value = "";
		editingCutoffId.value = "";
		cutoffFormUseCarryOver.value = false;
		showCutoffModal.value = false;
	}

	async function saveCutoffAndTransfer() {
		const amount = Number(cutoffFormAmount.value);
		const name = cutoffFormName.value.trim();
		const date = cutoffFormDate.value;

		if (!cutoffFormAmount.value || Number.isNaN(amount) || amount < 0) {
			cutoffFormError.value = "Enter a valid amount";
			return;
		}
		if (!name) {
			cutoffFormError.value = "Select a name";
			return;
		}
		if (!date) {
			cutoffFormError.value = "Enter a date";
			return;
		}
		if (cutoffFormPercentTotal.value !== 100) {
			cutoffFormError.value = "Rule percentages must total 100%";
			return;
		}

		const monthKey = date.slice(0, 7);
		const slot = (name === "1st cutoff" ? 1 : 2) as 1 | 2;
		const existing = await db.cycleCutoffs
			.where("monthKey")
			.equals(monthKey)
			.toArray();

		if (existing.some((c) => c.slot === slot)) {
			cutoffFormError.value = `${name} already exists for this month`;
			return;
		}

		cutoffSaving.value = true;
		const cutoffId = createId();
		const now = new Date().toISOString();
		let newCarryOver = 0;
		const previous = previousCutoff.value;
		if (previous && availableCarryOver.value > 0) {
			if (cutoffFormUseCarryOver.value) {
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
			id: cutoffId,
			monthKey,
			slot,
			label: name,
			amount,
			date,
			carryOverAmount: newCarryOver || undefined,
			allocations: buildCutoffAllocations(
				amount + newCarryOver,
				cutoffFormPercents.value,
			),
			createdAt: now,
			status: "active",
		});

		for (const item of items.value.filter(
			(entry) => entry.category === "expense-main",
		)) {
			await db.budgetEntries.add({
				id: createId(),
				cutoffId,
				monthKey,
				ruleName: "Expenses",
				name: item.name,
				amount: item.amount,
				itemBuilderId: item.itemBuilderId,
				createdAt: item.createdAt,
			});
		}

		if (cutoffBudget.value) {
			await db.tabBudgets.add({
				id: createId(),
				cutoffId,
				monthKey,
				ruleName: "Expenses",
				budgetAllocated: cutoffBudget.value.amount,
				createdAt: now,
			});
		}

		if (otherExpensesBudget.value) {
			await db.othersBudgets.add({
				id: createId(),
				cutoffId,
				monthKey,
				budgetAllocated: otherExpensesBudget.value.amount,
				createdAt: now,
			});
		}

		for (const item of items.value.filter(
			(entry) => entry.category === "savings",
		)) {
			await db.budgetEntries.add({
				id: createId(),
				cutoffId,
				monthKey,
				ruleName: "Savings",
				name: item.name,
				amount: item.amount,
				itemBuilderId: item.itemBuilderId,
				createdAt: item.createdAt,
			});
		}

		await db.incomingBillItems.clear();
		await db.incomingBillBudgets.clear();
		items.value = [];
		budgets.value = [];
		expenseSwipeOffsets.value = {};
		savingsSwipeOffsets.value = {};
		resetForm();
		await loadCutoffs();
		cutoffSaving.value = false;
		closeCutoffModal();
		emit("moved-to-tracker", monthKey);
	}

	async function loadItems() {
		items.value = await db.incomingBillItems.orderBy("createdAt").toArray();
	}

	async function loadBudgets() {
		budgets.value = await db.incomingBillBudgets.toArray();
	}

	async function loadItemBuilders() {
		itemBuilders.value = await db.itemBuilders.toArray();
	}

	function resetForm() {
		formCategory.value =
			availableCategoryOptions.value[0]?.value ?? "expense-main";
		itemFormId.value = "";
		formAmount.value = "";
		formError.value = "";
	}

	function openModal() {
		resetForm();
		showModal.value = true;
	}

	function closeModal() {
		formError.value = "";
		showModal.value = false;
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

	async function saveModal() {
		const amount = Number(formAmount.value);
		if (!formAmount.value || Number.isNaN(amount) || amount <= 0) {
			formError.value = "Enter a valid amount";
			return;
		}

		if (isItemCategory.value) {
			if (!itemFormId.value) {
				formError.value = "Select an item";
				return;
			}
			const builder = itemBuilders.value.find(
				(item) => item.id === itemFormId.value,
			);
			if (!builder) {
				formError.value = "Select an item";
				return;
			}

			saving.value = true;
			await db.incomingBillItems.add({
				id: createId(),
				category: formCategory.value as IncomingBillItemCategory,
				name: builder.name,
				itemBuilderId: builder.id,
				amount,
				createdAt: new Date().toISOString(),
			});
			await loadItems();
			saving.value = false;
			closeModal();
			return;
		}

		saving.value = true;
		await db.incomingBillBudgets.add({
			id: createId(),
			category: formCategory.value as IncomingBillBudgetCategory,
			amount,
			createdAt: new Date().toISOString(),
		});
		await loadBudgets();
		saving.value = false;
		closeModal();
	}

	function openBudgetEdit(
		budget: IncomingBillBudget | undefined,
		title: string,
	) {
		if (!budget) return;
		editType.value = "budget";
		editId.value = budget.id;
		editTitle.value = title;
		editAmount.value = String(budget.amount);
		editOriginalAmount.value = String(budget.amount);
		editError.value = "";
		showEditModal.value = true;
	}

	function openItemEdit(expense: { expenseName: string }, id: string) {
		editType.value = "item";
		editId.value = id;
		editTitle.value = expense.expenseName;
		const item = items.value.find((i) => i.id === id);
		editAmount.value = item ? String(item.amount) : "";
		editOriginalAmount.value = editAmount.value;
		editError.value = "";
		showEditModal.value = true;
	}

	function closeEditModal() {
		editError.value = "";
		showEditModal.value = false;
	}

	async function saveEdit() {
		const amount = Number(editAmount.value);
		if (!editAmount.value || Number.isNaN(amount) || amount <= 0) {
			editError.value = "Enter a valid amount";
			return;
		}
		editSaving.value = true;
		if (editType.value === "budget") {
			await db.incomingBillBudgets.update(editId.value, { amount });
			await loadBudgets();
		} else {
			await db.incomingBillItems.update(editId.value, { amount });
			await loadItems();
		}
		editSaving.value = false;
		closeEditModal();
	}

	async function removeEdit() {
		editSaving.value = true;
		await db.incomingBillBudgets.delete(editId.value);
		await loadBudgets();
		editSaving.value = false;
		closeEditModal();
	}

	async function deleteItem(id: string) {
		await db.incomingBillItems.delete(id);
		delete expenseSwipeOffsets.value[id];
		delete savingsSwipeOffsets.value[id];
		await loadItems();
	}

	function expenseSwipeOffset(id: string) {
		return expenseSwipeOffsets.value[id] ?? 0;
	}

	function savingsSwipeOffset(id: string) {
		return savingsSwipeOffsets.value[id] ?? 0;
	}

	function onExpenseSwipeStart(id: string, event: TouchEvent) {
		const touch = event.touches[0];
		if (!touch) return;
		expenseSwipeStartX = touch.clientX;
		expenseSwipeStartOffset = expenseSwipeOffset(id);
		expenseSwipeActiveId = id;
		for (const key of Object.keys(expenseSwipeOffsets.value)) {
			if (key !== id) expenseSwipeOffsets.value[key] = 0;
		}
	}

	function onExpenseSwipeMove(id: string, event: TouchEvent) {
		if (expenseSwipeActiveId !== id) return;
		const touch = event.touches[0];
		if (!touch) return;
		const delta = touch.clientX - expenseSwipeStartX;
		expenseSwipeOffsets.value[id] = Math.min(
			0,
			Math.max(-ITEM_SWIPE_DELETE_WIDTH, expenseSwipeStartOffset + delta),
		);
	}

	async function onExpenseSwipeEnd(id: string) {
		const offset = expenseSwipeOffset(id);
		if (offset <= -ITEM_SWIPE_DELETE_WIDTH * 0.85) {
			await deleteItem(id);
			return;
		}
		expenseSwipeOffsets.value[id] =
			offset < -ITEM_SWIPE_DELETE_WIDTH / 2 ? -ITEM_SWIPE_DELETE_WIDTH : 0;
		expenseSwipeActiveId = "";
	}

	function onSavingsSwipeStart(id: string, event: TouchEvent) {
		const touch = event.touches[0];
		if (!touch) return;
		savingsSwipeStartX = touch.clientX;
		savingsSwipeStartOffset = savingsSwipeOffset(id);
		savingsSwipeActiveId = id;
		for (const key of Object.keys(savingsSwipeOffsets.value)) {
			if (key !== id) savingsSwipeOffsets.value[key] = 0;
		}
	}

	function onSavingsSwipeMove(id: string, event: TouchEvent) {
		if (savingsSwipeActiveId !== id) return;
		const touch = event.touches[0];
		if (!touch) return;
		const delta = touch.clientX - savingsSwipeStartX;
		savingsSwipeOffsets.value[id] = Math.min(
			0,
			Math.max(-ITEM_SWIPE_DELETE_WIDTH, savingsSwipeStartOffset + delta),
		);
	}

	async function onSavingsSwipeEnd(id: string) {
		const offset = savingsSwipeOffset(id);
		if (offset <= -ITEM_SWIPE_DELETE_WIDTH * 0.85) {
			await deleteItem(id);
			return;
		}
		savingsSwipeOffsets.value[id] =
			offset < -ITEM_SWIPE_DELETE_WIDTH / 2 ? -ITEM_SWIPE_DELETE_WIDTH : 0;
		savingsSwipeActiveId = "";
	}

	watch(availableCategoryOptions, (options) => {
		if (!options.some((option) => option.value === formCategory.value)) {
			formCategory.value = options[0]?.value ?? "expense-main";
			itemFormId.value = "";
		}
	});

	watch(formCategory, () => {
		itemFormId.value = "";
		formError.value = "";
	});

	watch(cutoffFormDate, () => {
		if (
			cutoffFormName.value &&
			!cutoffOptions.value.some((opt) => opt.value === cutoffFormName.value)
		) {
			cutoffFormName.value = "";
		}
	});

	onMounted(async () => {
		await loadRules();
		await loadCutoffs();
		await loadItemBuilders();
		await loadItems();
		await loadBudgets();
	});
</script>

<template>
	<div
		class="mx-auto flex min-h-0 w-full max-w-[480px] flex-1 flex-col overflow-hidden items-stretch pt-0 mt-[2rem]"
	>
		<div class="incoming-scroll min-h-0 flex-1">
			<GlassContainer class="relative mb-4">
				<GlassContainer
					as="button"
					type="button"
					rounded="full"
					:padding="false"
					class="plus-btn absolute right-[.6rem] top-[.6rem]"
					aria-label="Add item or amount"
					@click="openModal"
				>
					<PlusIcon class="h-5 w-5" />
				</GlassContainer>
				<p class="m-0 min-w-0 pr-12 text-[0.95rem] font-semibold text-textPrimary">
					Incoming Bills
				</p>
				<p class="mt-2 mb-0 text-[1.8rem] font-bold text-textPrimary">
					{{ displayTotal }}
				</p>
			</GlassContainer>

			<OtherItemsSection
				title="Expense Main Items"
				:expenses="expenseMainItems"
				:swipe-offset="expenseSwipeOffset"
				hide-add-button
				hide-date
				@delete-expense="deleteItem"
				@swipe-start="onExpenseSwipeStart"
				@swipe-move="onExpenseSwipeMove"
				@swipe-end="onExpenseSwipeEnd"
				@item-row-click="openItemEdit"
			/>

			<GlassContainer
				class="mb-1"
				:class="{ 'cursor-pointer': cutoffBudget }"
				@click="cutoffBudget && openBudgetEdit(cutoffBudget, 'Cutoff Budget')"
			>
				<div class="flex items-center justify-between">
					<p class="m-0 text-sm text-textSecondary">Cutoff Budget</p>
					<p
						v-if="cutoffBudget"
						class="m-0 text-[.95rem] font-bold text-textPrimary"
					>
						{{ formatAmount(cutoffBudget.amount) }}
					</p>
				</div>
				<p v-if="!cutoffBudget" class="m-0 text-sm text-textSecondary">
					No amount yet
				</p>
			</GlassContainer>

			<GlassContainer
				class="mb-1"
				:class="{ 'cursor-pointer': otherExpensesBudget }"
				@click="
					otherExpensesBudget &&
					openBudgetEdit(otherExpensesBudget, 'Other Expenses Budget')
				"
			>
				<div class="flex items-center justify-between">
					<p class="m-0 text-sm text-textSecondary">Other Expenses Budget</p>
					<p
						v-if="otherExpensesBudget"
						class="m-0 text-[.95rem] font-bold text-textPrimary"
					>
						{{ formatAmount(otherExpensesBudget.amount) }}
					</p>
				</div>
				<p v-if="!otherExpensesBudget" class="m-0 text-sm text-textSecondary">
					No amount yet
				</p>
			</GlassContainer>

			<OtherItemsSection
				title="Saving's Items"
				:expenses="savingsItems"
				:swipe-offset="savingsSwipeOffset"
				hide-add-button
				hide-date
				@delete-expense="deleteItem"
				@swipe-start="onSavingsSwipeStart"
				@swipe-move="onSavingsSwipeMove"
				@swipe-end="onSavingsSwipeEnd"
				@item-row-click="openItemEdit"
			/>

			<GlassContainer
				class="mb-1"
				:class="{ 'cursor-pointer': wantsBudget }"
				@click="wantsBudget && openBudgetEdit(wantsBudget, 'Wants Budget')"
			>
				<div class="flex items-center justify-between">
					<p class="m-0 text-sm text-textSecondary">Wants Budget</p>
					<p v-if="wantsBudget" class="m-0 text-[.95rem] font-bold text-textPrimary">
						{{ formatAmount(wantsBudget.amount) }}
					</p>
				</div>
				<p v-if="!wantsBudget" class="m-0 text-sm text-textSecondary">
					No amount yet
				</p>
			</GlassContainer>

			<Divider margin-top="2rem" margin-bottom="1.5rem" />

			<div class="incoming-actions">
				<button
					type="button"
					class="move-btn"
					:class="{ 'is-disabled': !canMoveToTracker }"
					:disabled="!canMoveToTracker"
					@click="onMoveClick"
				>
					<span>Move to Tracker</span>
					<PaperAirplaneIcon class="move-btn-icon" />
				</button>
				<button
					type="button"
					class="reset-btn"
					aria-label="Reset all entries"
					@click="openResetConfirm"
				>
					<ArchiveBoxXMarkIcon class="reset-btn-icon" />
				</button>
			</div>
		</div>

		<Teleport to="body">
			<div
				v-if="showModal"
				class="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
				@click.self="closeModal"
			>
				<GlassContainer class="flex w-full min-w-0 max-w-[400px] flex-col gap-6">
					<div class="flex items-center justify-between gap-3">
						<h2 class="m-0 text-center text-lg font-semibold text-textPrimary">
							Add Item
						</h2>
						<Button
							v-if="isItemCategory"
							variant="secondary"
							size="sm"
							class="max-w-[11rem]"
							@click="openCreateItemDrawer"
						>
							+ Create New Item
						</Button>
					</div>

					<SelectField
						v-model="formCategory"
						label="Category"
						:options="availableCategoryOptions"
						placeholder="Select category"
					/>

					<template v-if="isItemCategory">
						<SelectField
							v-model="itemFormId"
							label="Item Name"
							:options="itemBuilderOptions"
							placeholder="Search item"
						/>
					</template>

					<AmountField v-model="formAmount" label="Amount" placeholder="0.00" />

					<p v-if="formError" class="m-0 text-center text-sm text-[#f87171]">
						{{ formError }}
					</p>

					<div class="flex gap-3">
						<Button block variant="shade" @click="closeModal">Cancel</Button>
						<Button
							variant="primary"
							block
							:disabled="saving || !availableCategoryOptions.length"
							@click="saveModal"
						>
							Save
						</Button>
					</div>
				</GlassContainer>
			</div>
		</Teleport>

		<Teleport to="body">
			<div
				v-if="showEditModal"
				class="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
				@click.self="closeEditModal"
			>
				<GlassContainer class="flex w-full min-w-0 max-w-[400px] flex-col gap-6">
					<h2 class="m-0 text-center text-lg font-semibold text-textPrimary">
						Update {{ editTitle }}
					</h2>

					<div class="flex items-end gap-3">
						<AmountField
							v-model="editAmount"
							label="Amount"
							placeholder="0.00"
							class="flex-1"
						/>
						<button
							v-if="editType === 'budget'"
							type="button"
							class="remove-amount-btn"
							aria-label="Remove amount"
							:disabled="editSaving"
							@click="removeEdit"
						>
							<TrashIcon class="h-5 w-5" />
						</button>
					</div>

					<p v-if="editError" class="m-0 text-center text-sm text-[#f87171]">
						{{ editError }}
					</p>

					<div class="flex gap-3">
						<Button block variant="shade" @click="closeEditModal">Cancel</Button>
						<Button
							variant="primary"
							block
							:disabled="editSaving || !editChanged"
							@click="saveEdit"
						>
							Save
						</Button>
					</div>
				</GlassContainer>
			</div>
		</Teleport>

		<ItemBuilderDrawer
			v-model:open="showCreateItemDrawer"
			:cat-expenses="formCategory === 'expense-main'"
			:cat-savings="formCategory === 'savings'"
			:cat-wants="false"
			:saving="savingCreateItem"
			@save="saveCreateItem"
		/>

		<CutoffModal
			:show="showCutoffModal"
			:is-editing="false"
			:error="cutoffFormError"
			:options="cutoffOptions"
			:can-save="canSaveCutoff"
			:show-carry-over-option="showCarryOverOption"
			:carry-over-amount="availableCarryOver"
			v-model:amount="cutoffFormAmount"
			v-model:name="cutoffFormName"
			v-model:date="cutoffFormDate"
			v-model:percents="cutoffFormPercents"
			v-model:use-carry-over="cutoffFormUseCarryOver"
			@close="closeCutoffModal"
			@save="saveCutoffAndTransfer"
		/>

		<Teleport to="body">
			<div
				v-if="showResetConfirm"
				class="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
				@click.self="closeResetConfirm"
			>
				<GlassContainer class="flex w-full min-w-0 max-w-[400px] flex-col gap-4">
					<h2 class="m-0 text-center text-lg font-semibold text-textPrimary">
						Reset Entries
					</h2>
					<p class="m-0 text-center text-sm text-textSecondary">
						Are you sure you want to reset all entered data on this page?
					</p>
					<div class="flex gap-3">
						<Button block variant="shade" @click="closeResetConfirm">Cancel</Button>
						<Button variant="danger" block @click="confirmReset">Reset</Button>
					</div>
				</GlassContainer>
			</div>
		</Teleport>

		<Teleport to="body">
			<div
				v-if="showActiveTrackerModal"
				class="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
				@click.self="closeActiveTrackerModal"
			>
				<GlassContainer class="flex w-full min-w-0 max-w-[400px] flex-col gap-4">
					<h2 class="m-0 text-center text-lg font-semibold text-textPrimary">
						Active Tracker Found!
					</h2>
					<p class="m-0 text-center text-sm text-textSecondary">
						You cannot process this request while a budget tracker is in progress.
						Finalize the active tracker first.
					</p>
					<Button block variant="primary" @click="closeActiveTrackerModal">
						OK
					</Button>
				</GlassContainer>
			</div>
		</Teleport>

		<Teleport to="body">
			<div
				v-if="showMoveConfirm"
				class="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
				@click.self="closeMoveConfirm"
			>
				<GlassContainer class="flex w-full min-w-0 max-w-[400px] flex-col gap-4">
					<h2 class="m-0 text-center text-lg font-semibold text-textPrimary">
						Move to Budget Tracker
					</h2>
					<p class="m-0 text-center text-sm text-textSecondary">
						Are you sure you want to move all details to active budget tracking on the
						Budget Tracker page?
					</p>
					<div class="flex gap-3">
						<Button block variant="shade" @click="closeMoveConfirm">Cancel</Button>
						<Button variant="primary" block @click="openCutoffModal">
							Continue
						</Button>
					</div>
				</GlassContainer>
			</div>
		</Teleport>
	</div>
</template>

<style scoped>
	@import "./partials/sections/shared.css";

	.incoming-scroll {
		flex: 1 1 0;
		min-height: 0;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
		padding: 0 0 calc(2rem + env(safe-area-inset-bottom));
	}

	.remove-amount-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.875rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		background: transparent;
		color: #f87171;
		cursor: pointer;
		flex-shrink: 0;
	}

	.remove-amount-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.incoming-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 80%;
		margin: 0 auto 5rem;
	}

	.move-btn {
		display: flex;
		flex: 1;
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

	.move-btn.is-disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.move-btn-icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.reset-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.85rem;
		border: 1px solid var(--color-inputBorder);
		border-radius: 9999px;
		background: transparent;
		color: #f87171;
		cursor: pointer;
		flex-shrink: 0;
	}

	.reset-btn-icon {
		width: 1.25rem;
		height: 1.25rem;
	}
</style>
