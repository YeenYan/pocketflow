<script setup lang="ts">
	import { computed, onMounted, ref, watch } from "vue";
	import { PlusIcon } from "@heroicons/vue/24/outline";
	import Button from "../../components/button/Button.vue";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import ItemBuilderDrawer, {
		type ItemBuilderFormData,
	} from "../../components/item-builder/ItemBuilderDrawer.vue";
	import AmountField from "../../components/inputs/AmountField.vue";
	import SelectField from "../../components/inputs/SelectField.vue";
	import {
		createId,
		db,
		type IncomingBillBudget,
		type IncomingBillBudgetCategory,
		type IncomingBillItem,
		type IncomingBillItemCategory,
		type ItemBuilder,
	} from "../../db/budgetDb";
	import OtherItemsSection from "./partials/sections/OtherItemsSection.vue";

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

	const displayTotal = computed(() => {
		const itemsSum = items.value.reduce((sum, item) => sum + item.amount, 0);
		const budgetsSum = budgets.value.reduce(
			(sum, budget) => sum + budget.amount,
			0,
		);
		return formatAmount(itemsSum + budgetsSum);
	});

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

	onMounted(async () => {
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
			/>

			<GlassContainer class="mb-1">
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

			<GlassContainer class="mb-1">
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
			/>

			<GlassContainer class="mb-1">
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

		<ItemBuilderDrawer
			v-model:open="showCreateItemDrawer"
			:cat-expenses="formCategory === 'expense-main'"
			:cat-savings="formCategory === 'savings'"
			:cat-wants="false"
			:saving="savingCreateItem"
			@save="saveCreateItem"
		/>
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
</style>
