<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import { useRouter } from "vue-router";
	import {
		PlusIcon,
		ArrowsUpDownIcon,
		ArrowLeftIcon,
	} from "@heroicons/vue/24/outline";
	import * as OutlineIcons from "@heroicons/vue/24/outline";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import SelectField from "../../components/inputs/SelectField.vue";
	import Button from "../../components/button/Button.vue";
	import ItemBuilderDrawer, {
		type ItemBuilderFormData,
	} from "../../components/item-builder/ItemBuilderDrawer.vue";
	import {
		createId,
		db,
		type ItemBuilder,
		type RuleName,
	} from "../../db/budgetDb";

	const router = useRouter();

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
		{
			value: "slate-700",
			swatch: "bg-slate-700",
			wrap:
				"bg-slate-700/15 dark:bg-slate-700/25 text-slate-800 dark:text-slate-200",
		},
		{
			value: "gray-700",
			swatch: "bg-gray-700",
			wrap: "bg-gray-700/15 dark:bg-gray-700/25 text-gray-800 dark:text-gray-200",
		},
		{
			value: "red-700",
			swatch: "bg-red-700",
			wrap: "bg-red-700/15 dark:bg-red-700/25 text-red-800 dark:text-red-300",
		},
		{
			value: "orange-700",
			swatch: "bg-orange-700",
			wrap:
				"bg-orange-700/15 dark:bg-orange-700/25 text-orange-800 dark:text-orange-300",
		},
		{
			value: "amber-700",
			swatch: "bg-amber-700",
			wrap:
				"bg-amber-700/15 dark:bg-amber-700/25 text-amber-800 dark:text-amber-300",
		},
		{
			value: "yellow-700",
			swatch: "bg-yellow-700",
			wrap:
				"bg-yellow-700/15 dark:bg-yellow-700/25 text-yellow-800 dark:text-yellow-300",
		},
		{
			value: "green-700",
			swatch: "bg-green-700",
			wrap:
				"bg-green-700/15 dark:bg-green-700/25 text-green-800 dark:text-green-300",
		},
		{
			value: "teal-700",
			swatch: "bg-teal-700",
			wrap: "bg-teal-700/15 dark:bg-teal-700/25 text-teal-800 dark:text-teal-300",
		},
		{
			value: "blue-700",
			swatch: "bg-blue-700",
			wrap: "bg-blue-700/15 dark:bg-blue-700/25 text-blue-800 dark:text-blue-300",
		},
		{
			value: "indigo-700",
			swatch: "bg-indigo-700",
			wrap:
				"bg-indigo-700/15 dark:bg-indigo-700/25 text-indigo-800 dark:text-indigo-300",
		},
		{
			value: "purple-700",
			swatch: "bg-purple-700",
			wrap:
				"bg-purple-700/15 dark:bg-purple-700/25 text-purple-800 dark:text-purple-300",
		},
		{
			value: "pink-700",
			swatch: "bg-pink-700",
			wrap: "bg-pink-700/15 dark:bg-pink-700/25 text-pink-800 dark:text-pink-300",
		},
		{
			value: "rose-700",
			swatch: "bg-rose-700",
			wrap: "bg-rose-700/15 dark:bg-rose-700/25 text-rose-800 dark:text-rose-300",
		},
	];

	const DEFAULT_ITEM_COLOR = "emerald-500";
	const SWIPE_DELETE_WIDTH = 72;
	const RULE_ORDER: RuleName[] = ["Expenses", "Savings", "Wants"];
	const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
	const FILTER_OPTIONS = [
		{ value: "All", label: "All" },
		{ value: "Expenses", label: "Expenses" },
		{ value: "Savings", label: "Savings" },
		{ value: "Wants", label: "Wants" },
	];

	const itemBuilders = ref<ItemBuilder[]>([]);
	const activeFilter = ref<RuleName | "All">("All");
	const sortOrder = ref<"asc" | "desc">("asc");
	const showDrawer = ref(false);
	const editingItem = ref<ItemBuilder | null>(null);
	const saving = ref(false);
	const showDeleteConfirm = ref(false);
	const pendingDeleteId = ref("");
	const pendingDeleteName = ref("");
	const deleting = ref(false);

	const swipeOffsets = ref<Record<string, number>>({});
	let swipeStartX = 0;
	let swipeStartOffset = 0;
	let swipeActiveId = "";
	let swipeMoved = false;

	const listItems = computed(() => {
		let items = itemBuilders.value;
		if (activeFilter.value !== "All") {
			items = items.filter((item) => item.categories.includes(activeFilter.value));
		}
		items = [...items].sort((a, b) => {
			const cmp = a.name.localeCompare(b.name);
			return sortOrder.value === "asc" ? cmp : -cmp;
		});
		return items.map((item) => {
			const color = item.color ?? DEFAULT_ITEM_COLOR;
			const colorOption =
				ITEM_COLOR_OPTIONS.find((entry) => entry.value === color) ??
				ITEM_COLOR_OPTIONS.find((entry) => entry.value === DEFAULT_ITEM_COLOR)!;
			return {
				...item,
				icon: item.icon ?? "HomeIcon",
				iconWrapClass: colorOption.wrap,
				categoriesLabel: item.categories.join(", "),
			};
		});
	});

	onMounted(loadItems);

	async function loadItems() {
		itemBuilders.value = await db.itemBuilders.toArray();
	}

	function openCreateDrawer() {
		editingItem.value = null;
		showDrawer.value = true;
	}

	function openEditDrawer(item: ItemBuilder) {
		swipeOffsets.value = {};
		swipeActiveId = "";
		editingItem.value = item;
		showDrawer.value = true;
	}

	function closeDrawer() {
		editingItem.value = null;
		showDrawer.value = false;
	}

	async function saveItem(data: ItemBuilderFormData) {
		saving.value = true;
		if (editingItem.value) {
			const oldName = editingItem.value.name;
			const id = editingItem.value.id;
			await db.itemBuilders.update(id, data);
			await db.budgetEntries
				.where("itemBuilderId")
				.equals(id)
				.modify({ name: data.name });
			if (oldName !== data.name) {
				const legacy = await db.budgetEntries
					.filter(
						(e) => e.name === oldName && !e.parentBudgetEntryId && !e.itemBuilderId,
					)
					.toArray();
				for (const entry of legacy) {
					await db.budgetEntries.update(entry.id, {
						name: data.name,
						itemBuilderId: id,
					});
				}
			}
		} else {
			await db.itemBuilders.add({
				id: createId(),
				...data,
				createdAt: new Date().toISOString(),
			});
		}
		await loadItems();
		saving.value = false;
		closeDrawer();
	}

	async function isItemUsedInTracker(id: string, name: string) {
		const byId = await db.budgetEntries
			.where("itemBuilderId")
			.equals(id)
			.filter((e) => !e.parentBudgetEntryId && e.monthKey === currentMonthKey)
			.count();
		if (byId > 0) return true;
		return (
			(await db.budgetEntries
				.filter(
					(e) =>
						e.name === name &&
						!e.parentBudgetEntryId &&
						!e.itemBuilderId &&
						e.monthKey === currentMonthKey,
				)
				.count()) > 0
		);
	}

	async function deleteTrackerEntriesForItem(id: string, name: string) {
		const byId = await db.budgetEntries
			.where("itemBuilderId")
			.equals(id)
			.filter((e) => !e.parentBudgetEntryId && e.monthKey === currentMonthKey)
			.toArray();
		const byName = await db.budgetEntries
			.filter(
				(e) =>
					e.name === name &&
					!e.parentBudgetEntryId &&
					!e.itemBuilderId &&
					e.monthKey === currentMonthKey,
			)
			.toArray();
		const seen = new Set<string>();
		for (const entry of [...byId, ...byName]) {
			if (seen.has(entry.id)) continue;
			seen.add(entry.id);
			await db.budgetEntries
				.where("parentBudgetEntryId")
				.equals(entry.id)
				.delete();
			await db.budgetEntries.delete(entry.id);
		}
	}

	async function requestDeleteItem(id: string) {
		const item = itemBuilders.value.find((entry) => entry.id === id);
		if (!item) return;
		swipeOffsets.value[id] = 0;
		if (await isItemUsedInTracker(id, item.name)) {
			pendingDeleteId.value = id;
			pendingDeleteName.value = item.name;
			showDeleteConfirm.value = true;
			return;
		}
		await deleteItem(id);
	}

	function closeDeleteConfirm() {
		showDeleteConfirm.value = false;
		pendingDeleteId.value = "";
		pendingDeleteName.value = "";
	}

	async function confirmDeleteItem() {
		if (!pendingDeleteId.value) return;
		deleting.value = true;
		const id = pendingDeleteId.value;
		const name = pendingDeleteName.value;
		await deleteTrackerEntriesForItem(id, name);
		await db.itemBuilders.delete(id);
		swipeOffsets.value[id] = 0;
		await loadItems();
		deleting.value = false;
		closeDeleteConfirm();
	}

	async function deleteItem(id: string) {
		await db.itemBuilders.delete(id);
		swipeOffsets.value[id] = 0;
		await loadItems();
	}

	function swipeOffset(id: string) {
		return swipeOffsets.value[id] ?? 0;
	}

	function onSwipeStart(id: string, event: TouchEvent) {
		const touch = event.touches[0];
		if (!touch) return;
		swipeStartX = touch.clientX;
		swipeStartOffset = swipeOffset(id);
		swipeActiveId = id;
		swipeMoved = false;
		for (const key of Object.keys(swipeOffsets.value)) {
			if (key !== id) swipeOffsets.value[key] = 0;
		}
	}

	function onSwipeMove(id: string, event: TouchEvent) {
		if (swipeActiveId !== id) return;
		const touch = event.touches[0];
		if (!touch) return;
		const delta = touch.clientX - swipeStartX;
		if (Math.abs(delta) > 6) swipeMoved = true;
		swipeOffsets.value[id] = Math.min(
			0,
			Math.max(-SWIPE_DELETE_WIDTH, swipeStartOffset + delta),
		);
	}

	async function onSwipeEnd(id: string) {
		const offset = swipeOffset(id);
		if (offset <= -SWIPE_DELETE_WIDTH * 0.85) {
			await requestDeleteItem(id);
			return;
		}
		swipeOffsets.value[id] = 0;
		swipeActiveId = "";
	}

	function onRowClick(item: ItemBuilder, id: string) {
		if (swipeMoved) {
			swipeMoved = false;
			return;
		}
		if (swipeOffset(id) < 0) {
			swipeOffsets.value[id] = 0;
			return;
		}
		openEditDrawer(item);
	}
</script>

<template>
	<div class="page-shell">
		<header class="page-header relative">
			<button
				type="button"
				class="back-btn"
				aria-label="Back"
				@click="router.push('/me')"
			>
				<ArrowLeftIcon class="h-5 w-5" />
			</button>
			<h1 class="page-title">My Items</h1>
			<span class="header-spacer" />
			<GlassContainer
				as="button"
				type="button"
				rounded="full"
				:padding="false"
				class="plus-btn absolute right-0 top-0"
				aria-label="Create item"
				@click="openCreateDrawer"
			>
				<PlusIcon class="h-4 w-4" />
			</GlassContainer>
		</header>

		<div class="toolbar">
			<SelectField
				v-model="activeFilter"
				label="Filter by Rule"
				:options="FILTER_OPTIONS"
				class="toolbar-filter"
			/>
			<button
				type="button"
				class="sort-btn"
				:aria-label="sortOrder === 'asc' ? 'Sort name A-Z' : 'Sort name Z-A'"
				@click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
			>
				<ArrowsUpDownIcon class="h-5 w-5" />
			</button>
		</div>

		<div class="items-header">
			<p class="items-title">Items</p>
		</div>

		<div class="items-scroll">
			<ul v-if="listItems.length" class="item-list">
				<li
					v-for="item in listItems"
					:key="item.id"
					class="item-swipe-wrap"
					:class="{ 'is-swiped': swipeOffset(item.id) < 0 }"
				>
					<button
						type="button"
						class="item-swipe-delete"
						aria-label="Delete item"
						@click.stop="requestDeleteItem(item.id)"
					>
						<component :is="OutlineIcons.TrashIcon" class="item-swipe-delete-icon" />
					</button>
					<GlassContainer
						class="item-glass"
						:class="{
							'is-swiped': swipeOffset(item.id) < 0,
							inactive: !item.isActive,
						}"
						:style="{ transform: `translateX(${swipeOffset(item.id)}px)` }"
						@touchstart.passive="onSwipeStart(item.id, $event)"
						@touchmove="onSwipeMove(item.id, $event)"
						@touchend="onSwipeEnd(item.id)"
						@click="onRowClick(item, item.id)"
					>
						<span class="item-icon-wrap" :class="item.iconWrapClass">
							<component
								:is="OutlineIcons[item.icon as keyof typeof OutlineIcons]"
								class="item-icon"
							/>
						</span>
						<div class="item-row-main">
							<span class="item-row-name">{{ item.name }}</span>
							<span class="item-row-meta">{{ item.categoriesLabel }}</span>
							<span v-if="item.hasChildItems" class="item-row-label">
								Has child items
							</span>
						</div>
					</GlassContainer>
				</li>
			</ul>
			<p v-else class="empty">No items yet</p>
		</div>

		<ItemBuilderDrawer
			v-model:open="showDrawer"
			:item="editingItem"
			:cat-expenses="activeFilter === 'All' || activeFilter === 'Expenses'"
			:cat-savings="activeFilter === 'Savings'"
			:cat-wants="activeFilter === 'Wants'"
			:saving="saving"
			@save="saveItem"
		/>

		<Teleport to="body">
			<div
				v-if="showDeleteConfirm"
				class="fixed inset-0 z-[70] flex items-center justify-center bg-overlay p-4"
				@click.self="closeDeleteConfirm"
			>
				<GlassContainer class="flex w-full min-w-0 max-w-[400px] flex-col gap-4">
					<h2 class="m-0 text-center text-lg font-semibold text-textPrimary">
						Remove Item
					</h2>
					<p class="m-0 text-center text-sm text-textSecondary">
						<strong class="text-textPrimary">{{ pendingDeleteName }}</strong> is used
						in the current cutoff. Removing it will also remove it from the current
						cutoff and may affect your budget calculations. Past cutoffs will not be
						affected. Are you sure?
					</p>
					<div class="flex gap-3">
						<Button block variant="shade" @click="closeDeleteConfirm">Cancel</Button>
						<Button
							variant="danger"
							block
							:disabled="deleting"
							@click="confirmDeleteItem"
						>
							Remove
						</Button>
					</div>
				</GlassContainer>
			</div>
		</Teleport>
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

	.toolbar {
		display: flex;
		align-items: flex-end;
		gap: 0.75rem;
		width: 100%;
	}

	.toolbar-filter {
		flex: 1;
		min-width: 0;
	}

	.sort-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.875rem;
		border: 1px solid var(--color-inputBorder);
		border-radius: 9999px;
		background: transparent;
		color: var(--color-textPrimary);
		cursor: pointer;
		flex-shrink: 0;
	}

	.plus-btn {
		padding: 0.7rem;
		color: var(--color-onColor);
		background: var(--color-accentSolid);
		flex-shrink: 0;
	}

	.items-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.items-title {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.items-scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding-bottom: calc(6rem + env(safe-area-inset-bottom));
	}

	.empty {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-textSecondary);
	}

	.item-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.item-swipe-wrap {
		position: relative;
		overflow: hidden;
		border-radius: 1rem;
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

	.item-glass {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: color-mix(
			in srgb,
			var(--color-glass-bg) 55%,
			transparent
		) !important;
		border-color: color-mix(
			in srgb,
			var(--color-glass-border) 50%,
			transparent
		) !important;
		box-shadow: none;
		cursor: pointer;
		touch-action: pan-y;
		transition: transform 0.2s ease;
	}

	.item-glass.is-swiped {
		background: color-mix(
			in srgb,
			var(--color-glass-bg) 80%,
			transparent
		) !important;
	}

	.item-glass.inactive {
		opacity: 0.5;
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

	.item-row-meta {
		font-size: 0.8rem;
		color: var(--color-textSecondary);
	}

	.item-row-label {
		font-size: 0.75rem;
		color: var(--color-textSecondary);
	}
</style>
