<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import { useRouter } from "vue-router";
	import { XMarkIcon, BanknotesIcon } from "@heroicons/vue/24/outline";
	import * as OutlineIcons from "@heroicons/vue/24/outline";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import Divider from "../../components/divider/Divider.vue";
	import SelectField from "../../components/inputs/SelectField.vue";
	import {
		db,
		type BudgetEntry,
		type CycleCutoff,
		type ItemBuilder,
	} from "../../db/budgetDb";

	const router = useRouter();

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
	const HISTORY_PREVIEW_LIMIT = 5;

	const itemBuilders = ref<ItemBuilder[]>([]);
	const budgetEntries = ref<BudgetEntry[]>([]);
	const cutoffs = ref<CycleCutoff[]>([]);
	const showHistoryDrawer = ref(false);
	const historyFilter = ref("all");

	function iconWrapClass(color?: string) {
		const value = color ?? DEFAULT_ITEM_COLOR;
		return (
			ITEM_COLOR_OPTIONS.find((entry) => entry.value === value)?.wrap ??
			ITEM_COLOR_OPTIONS.find((entry) => entry.value === DEFAULT_ITEM_COLOR)!.wrap
		);
	}

	function findBuilder(entry: BudgetEntry) {
		if (entry.itemBuilderId) {
			return itemBuilders.value.find((item) => item.id === entry.itemBuilderId);
		}
		return itemBuilders.value.find((item) => item.name === entry.name);
	}

	function cutoffLabel(cutoff: CycleCutoff) {
		const month = new Date(cutoff.monthKey + "-01T00:00:00").toLocaleDateString(
			"en-US",
			{ month: "long" },
		);
		const label =
			cutoff.label.charAt(0).toUpperCase() +
			cutoff.label.slice(1).replace("cutoff", "Cutoff");
		return `${label} of ${month}`;
	}

	function formatAmount(amount: number) {
		return `₱${amount.toLocaleString("en-PH")}`;
	}

	function formatSignedAmount(amount: number) {
		const prefix = amount >= 0 ? "+" : "-";
		return `${prefix}${formatAmount(Math.abs(amount))}`;
	}

	function itemSavedTotal(builder: ItemBuilder) {
		const parents = budgetEntries.value.filter(
			(entry) =>
				entry.ruleName === "Savings" &&
				!entry.parentBudgetEntryId &&
				(entry.itemBuilderId === builder.id || entry.name === builder.name),
		);
		if (builder.hasChildItems) {
			return parents.reduce((sum, parent) => {
				const children = budgetEntries.value.filter(
					(child) => child.parentBudgetEntryId === parent.id,
				);
				return (
					sum + children.reduce((childSum, child) => childSum + child.amount, 0)
				);
			}, 0);
		}
		return parents.reduce((sum, entry) => sum + entry.amount, 0);
	}

	const savingsItems = computed(() =>
		itemBuilders.value
			.filter((item) => item.categories.includes("Savings"))
			.map((item) => ({
				id: item.id,
				name: item.name,
				icon: item.icon ?? "HomeIcon",
				iconWrapClass: iconWrapClass(item.color),
				totalSaved: itemSavedTotal(item),
			})),
	);

	const savingsHistory = computed(() => {
		const cutoffMap = new Map(cutoffs.value.map((cutoff) => [cutoff.id, cutoff]));
		const rows: Array<{
			id: string;
			itemName: string;
			itemBuilderId: string;
			cutoffLabel: string;
			amount: number;
			createdAt: string;
			icon: string;
			iconWrapClass: string;
		}> = [];

		for (const entry of budgetEntries.value) {
			if (entry.ruleName !== "Savings") continue;

			if (entry.parentBudgetEntryId) {
				const parent = budgetEntries.value.find(
					(item) => item.id === entry.parentBudgetEntryId,
				);
				const builder = parent ? findBuilder(parent) : findBuilder(entry);
				const cutoff = cutoffMap.get(entry.cutoffId);
				if (!cutoff) continue;
				rows.push({
					id: entry.id,
					itemName: builder?.name ?? entry.name,
					itemBuilderId: builder?.id ?? "",
					cutoffLabel: cutoffLabel(cutoff),
					amount: entry.amount,
					createdAt: entry.createdAt,
					icon: builder?.icon ?? "HomeIcon",
					iconWrapClass: iconWrapClass(builder?.color),
				});
				continue;
			}

			const builder = findBuilder(entry);
			if (builder?.hasChildItems) continue;

			const cutoff = cutoffMap.get(entry.cutoffId);
			if (!cutoff) continue;
			rows.push({
				id: entry.id,
				itemName: builder?.name ?? entry.name,
				itemBuilderId: builder?.id ?? "",
				cutoffLabel: cutoffLabel(cutoff),
				amount: entry.amount,
				createdAt: entry.createdAt,
				icon: builder?.icon ?? "HomeIcon",
				iconWrapClass: iconWrapClass(builder?.color),
			});
		}

		return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	});

	const totalSavings = computed(() =>
		savingsItems.value.reduce((sum, item) => sum + item.totalSaved, 0),
	);

	const previewHistory = computed(() =>
		savingsHistory.value.slice(0, HISTORY_PREVIEW_LIMIT),
	);

	const historyFilterOptions = computed(() => [
		{ value: "all", label: "All Items" },
		...savingsItems.value.map((item) => ({
			value: item.id,
			label: item.name,
		})),
	]);

	const filteredDrawerHistory = computed(() => {
		if (historyFilter.value === "all") return savingsHistory.value;
		return savingsHistory.value.filter(
			(entry) => entry.itemBuilderId === historyFilter.value,
		);
	});

	function openHistoryDrawer() {
		historyFilter.value = "all";
		showHistoryDrawer.value = true;
	}

	function closeHistoryDrawer() {
		showHistoryDrawer.value = false;
	}

	onMounted(async () => {
		itemBuilders.value = await db.itemBuilders.toArray();
		budgetEntries.value = await db.budgetEntries.toArray();
		cutoffs.value = await db.cycleCutoffs.toArray();
	});
</script>

<template>
	<div class="page-shell">
		<header class="page-header">
			<button type="button" class="back-btn" @click="router.push('/me')">←</button>
		</header>

		<GlassContainer class="savings-combo" :padding="false">
			<div class="summary-header">
				<span
					class="summary-icon-wrap bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300"
				>
					<BanknotesIcon class="summary-icon" />
				</span>
				<div class="summary-main">
					<p class="summary-name">My Savings</p>
					<p class="summary-amount">{{ formatAmount(totalSavings) }}</p>
				</div>
			</div>

			<div class="savings-items-panel">
				<ul v-if="savingsItems.length" class="item-list">
					<li v-for="item in savingsItems" :key="item.id" class="item-cell">
						<span class="item-icon-wrap" :class="item.iconWrapClass">
							<component
								:is="OutlineIcons[item.icon as keyof typeof OutlineIcons]"
								class="item-icon"
							/>
						</span>
						<div class="item-row-main">
							<span class="item-row-meta">{{ formatAmount(item.totalSaved) }}</span>
							<span class="item-row-name">{{ item.name }}</span>
						</div>
					</li>
				</ul>
				<p v-else class="empty panel-empty">No savings items yet</p>
			</div>
		</GlassContainer>

		<Divider margin-top="1rem" margin-bottom="1rem" />

		<section class="section-block">
			<div class="section-header">
				<p class="section-title">Savings History</p>
				<button
					v-if="savingsHistory.length"
					type="button"
					class="see-more-btn"
					@click="openHistoryDrawer"
				>
					See More
				</button>
			</div>

			<ul v-if="previewHistory.length" class="history-list">
				<li v-for="entry in previewHistory" :key="entry.id" class="history-row">
					<span class="history-icon-wrap" :class="entry.iconWrapClass">
						<component
							:is="OutlineIcons[entry.icon as keyof typeof OutlineIcons]"
							class="history-icon"
						/>
					</span>
					<div class="history-main">
						<p class="history-name">{{ entry.itemName }}</p>
						<p class="history-cutoff">{{ entry.cutoffLabel }}</p>
					</div>
					<span
						class="history-amount"
						:class="entry.amount >= 0 ? 'text-progress-green' : 'text-progress-red'"
					>
						{{ formatSignedAmount(entry.amount) }}
					</span>
				</li>
			</ul>
			<p v-else class="empty">No savings history yet</p>
		</section>

		<Teleport to="body">
			<div
				v-if="showHistoryDrawer"
				class="drawer-overlay"
				@click.self="closeHistoryDrawer"
			>
				<GlassContainer class="drawer-sheet">
					<div class="drawer-handle" />
					<div class="drawer-header">
						<h2 class="drawer-title">Savings History</h2>
						<button
							type="button"
							class="drawer-close"
							aria-label="Close"
							@click="closeHistoryDrawer"
						>
							<XMarkIcon class="h-5 w-5" />
						</button>
					</div>

					<SelectField
						v-model="historyFilter"
						label="Filter by Item Name"
						:options="historyFilterOptions"
						:menu-z-index="70"
						class="history-filter"
					/>

					<ul v-if="filteredDrawerHistory.length" class="history-list">
						<li
							v-for="entry in filteredDrawerHistory"
							:key="entry.id"
							class="history-row"
						>
							<span class="history-icon-wrap" :class="entry.iconWrapClass">
								<component
									:is="OutlineIcons[entry.icon as keyof typeof OutlineIcons]"
									class="history-icon"
								/>
							</span>
							<div class="history-main">
								<p class="history-name">{{ entry.itemName }}</p>
								<p class="history-cutoff">{{ entry.cutoffLabel }}</p>
							</div>
							<span
								class="history-amount"
								:class="entry.amount >= 0 ? 'text-progress-green' : 'text-progress-red'"
							>
								{{ formatSignedAmount(entry.amount) }}
							</span>
						</li>
					</ul>
					<p v-else class="empty">No savings history yet</p>
				</GlassContainer>
			</div>
		</Teleport>
	</div>
</template>

<style scoped>
	@import "../tracker/partials/modals/drawer-shared.css";

	.page-shell {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		align-items: stretch;
		gap: 1rem;
		padding-top: 1rem;
		padding-bottom: calc(6rem + env(safe-area-inset-bottom));
		max-width: 480px;
		width: 100%;
		overflow-y: auto;
	}

	.page-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.back-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		color: var(--color-textPrimary);
		border-radius: 6px;
		font-size: 1.25rem;
	}

	.back-btn:hover {
		background: var(--color-surfaceHover);
	}

	.savings-combo {
		flex-shrink: 0;
		width: 100%;
		overflow: hidden;
		box-shadow: none;
	}

	.summary-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 1rem;
		background: color-mix(in srgb, var(--color-glass-bg) 55%, transparent);
		backdrop-filter: blur(var(--blur-glass));
		-webkit-backdrop-filter: blur(var(--blur-glass));
		border-bottom: 1px solid
			color-mix(in srgb, var(--color-glass-border) 50%, transparent);
	}

	.summary-icon-wrap {
		display: inline-flex;
		width: 2.5rem;
		height: 2.5rem;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border-radius: 0.65rem;
	}

	.summary-icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.summary-main {
		min-width: 0;
		flex: 1;
	}

	.summary-name {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-textSecondary);
	}

	.summary-amount {
		margin: 0.2rem 0 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-textPrimary);
	}

	.savings-items-panel {
		background: color-mix(in srgb, var(--color-glass-bg) 55%, transparent);
		backdrop-filter: blur(var(--blur-glass));
		-webkit-backdrop-filter: blur(var(--blur-glass));
	}

	.panel-empty {
		padding: 0.75rem 1rem;
	}

	.item-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
	}

	.item-cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		padding: 0.65rem 0.5rem;
		background: color-mix(in srgb, var(--color-bgBody) 95%, var(--color-surface) 5%);
	}

	.item-cell:last-child:nth-child(odd) {
		grid-column: 1 / -1;
		border-right: none;
	}

	.item-cell:nth-child(odd):not(:last-child:nth-child(odd)) {
		border-right: 1px solid
			color-mix(in srgb, var(--color-inputBorder) 40%, transparent);
	}

	.item-cell:not(:nth-last-child(-n + 2)) {
		border-bottom: 1px solid
			color-mix(in srgb, var(--color-inputBorder) 40%, transparent);
	}

	.item-icon-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.4rem;
		flex-shrink: 0;
	}

	.item-icon {
		width: 0.9rem;
		height: 0.9rem;
	}

	.item-row-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.item-row-name {
		font-size: 0.65rem;
		font-weight: 400;
		color: var(--color-textSecondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-row-meta {
		font-size: 0.8rem;
		color: var(--color-textPrimary);
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.section-block {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.section-title {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.see-more-btn {
		padding: 0;
		border: none;
		background: none;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-info);
		cursor: pointer;
		flex-shrink: 0;
	}

	.history-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.history-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 0;
		border-bottom: 1px solid
			color-mix(in srgb, var(--color-inputBorder) 40%, transparent);
	}

	.history-row:last-child {
		border-bottom: none;
	}

	.history-icon-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.history-icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.history-main {
		min-width: 0;
		flex: 1;
	}

	.history-name {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.history-cutoff {
		margin: 0.15rem 0 0;
		font-size: 0.75rem;
		color: var(--color-textSecondary);
	}

	.history-amount {
		flex-shrink: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.history-filter {
		width: 100%;
	}

	.empty {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-textSecondary);
	}
</style>
