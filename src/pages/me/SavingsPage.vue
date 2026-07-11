<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import { useRouter } from "vue-router";
	import {
		XMarkIcon,
		EyeIcon,
		EyeSlashIcon,
		Bars3Icon,
	} from "@heroicons/vue/24/outline";
	import * as OutlineIcons from "@heroicons/vue/24/outline";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import SelectField from "../../components/inputs/SelectField.vue";
	import AmountField from "../../components/inputs/AmountField.vue";
	import Button from "../../components/button/Button.vue";
	import Divider from "../../components/divider/Divider.vue";
	import {
		createId,
		db,
		type BudgetEntry,
		type CycleCutoff,
		type ItemBuilder,
		type SavingsTransfer,
	} from "../../db/budgetDb";

	const router = useRouter();

	const ITEM_COLOR_OPTIONS = [
		{
			value: "slate-500",
			wrap:
				"bg-slate-500/15 dark:bg-slate-500/25 text-slate-700 dark:text-slate-200",
			cardWrap: "bg-slate-500/8 dark:bg-slate-500/12",
		},
		{
			value: "gray-500",
			wrap: "bg-gray-500/15 dark:bg-gray-500/25 text-gray-700 dark:text-gray-200",
			cardWrap: "bg-gray-500/8 dark:bg-gray-500/12",
		},
		{
			value: "zinc-500",
			wrap: "bg-zinc-500/15 dark:bg-zinc-500/25 text-zinc-700 dark:text-zinc-200",
			cardWrap: "bg-zinc-500/8 dark:bg-zinc-500/12",
		},
		{
			value: "neutral-500",
			wrap:
				"bg-neutral-500/15 dark:bg-neutral-500/25 text-neutral-700 dark:text-neutral-200",
			cardWrap: "bg-neutral-500/8 dark:bg-neutral-500/12",
		},
		{
			value: "stone-500",
			wrap:
				"bg-stone-500/15 dark:bg-stone-500/25 text-stone-700 dark:text-stone-200",
			cardWrap: "bg-stone-500/8 dark:bg-stone-500/12",
		},
		{
			value: "red-500",
			wrap: "bg-red-500/15 dark:bg-red-500/25 text-red-700 dark:text-red-300",
			cardWrap: "bg-red-500/8 dark:bg-red-500/12",
		},
		{
			value: "orange-500",
			wrap:
				"bg-orange-500/15 dark:bg-orange-500/25 text-orange-700 dark:text-orange-300",
			cardWrap: "bg-orange-500/8 dark:bg-orange-500/12",
		},
		{
			value: "amber-500",
			wrap:
				"bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300",
			cardWrap: "bg-amber-500/8 dark:bg-amber-500/12",
		},
		{
			value: "yellow-500",
			wrap:
				"bg-yellow-500/15 dark:bg-yellow-500/25 text-yellow-700 dark:text-yellow-300",
			cardWrap: "bg-yellow-500/8 dark:bg-yellow-500/12",
		},
		{
			value: "lime-500",
			wrap: "bg-lime-500/15 dark:bg-lime-500/25 text-lime-700 dark:text-lime-300",
			cardWrap: "bg-lime-500/8 dark:bg-lime-500/12",
		},
		{
			value: "green-500",
			wrap:
				"bg-green-500/15 dark:bg-green-500/25 text-green-700 dark:text-green-300",
			cardWrap: "bg-green-500/8 dark:bg-green-500/12",
		},
		{
			value: "emerald-500",
			wrap:
				"bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300",
			cardWrap: "bg-emerald-500/8 dark:bg-emerald-500/12",
		},
		{
			value: "teal-500",
			wrap: "bg-teal-500/15 dark:bg-teal-500/25 text-teal-700 dark:text-teal-300",
			cardWrap: "bg-teal-500/8 dark:bg-teal-500/12",
		},
		{
			value: "cyan-500",
			wrap: "bg-cyan-500/15 dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300",
			cardWrap: "bg-cyan-500/8 dark:bg-cyan-500/12",
		},
		{
			value: "sky-500",
			wrap: "bg-sky-500/15 dark:bg-sky-500/25 text-sky-700 dark:text-sky-300",
			cardWrap: "bg-sky-500/8 dark:bg-sky-500/12",
		},
		{
			value: "blue-500",
			wrap: "bg-blue-500/15 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300",
			cardWrap: "bg-blue-500/8 dark:bg-blue-500/12",
		},
		{
			value: "indigo-500",
			wrap:
				"bg-indigo-500/15 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300",
			cardWrap: "bg-indigo-500/8 dark:bg-indigo-500/12",
		},
		{
			value: "violet-500",
			wrap:
				"bg-violet-500/15 dark:bg-violet-500/25 text-violet-700 dark:text-violet-300",
			cardWrap: "bg-violet-500/8 dark:bg-violet-500/12",
		},
		{
			value: "purple-500",
			wrap:
				"bg-purple-500/15 dark:bg-purple-500/25 text-purple-700 dark:text-purple-300",
			cardWrap: "bg-purple-500/8 dark:bg-purple-500/12",
		},
		{
			value: "fuchsia-500",
			wrap:
				"bg-fuchsia-500/15 dark:bg-fuchsia-500/25 text-fuchsia-700 dark:text-fuchsia-300",
			cardWrap: "bg-fuchsia-500/8 dark:bg-fuchsia-500/12",
		},
		{
			value: "pink-500",
			wrap: "bg-pink-500/15 dark:bg-pink-500/25 text-pink-700 dark:text-pink-300",
			cardWrap: "bg-pink-500/8 dark:bg-pink-500/12",
		},
		{
			value: "rose-500",
			wrap: "bg-rose-500/15 dark:bg-rose-500/25 text-rose-700 dark:text-rose-300",
			cardWrap: "bg-rose-500/8 dark:bg-rose-500/12",
		},
	];

	const DEFAULT_ITEM_COLOR = "emerald-500";
	const HISTORY_PREVIEW_LIMIT = 5;

	const itemBuilders = ref<ItemBuilder[]>([]);
	const budgetEntries = ref<BudgetEntry[]>([]);
	const cutoffs = ref<CycleCutoff[]>([]);
	const savingsTransfers = ref<SavingsTransfer[]>([]);
	const showHistoryDrawer = ref(false);
	const showItemDrawer = ref(false);
	const showTransferModal = ref(false);
	const showTransferConfirm = ref(false);
	const showNoCutoffWarning = ref(false);
	const historyFilter = ref("all");
	const hideBalance = ref(true);
	const selectedItem = ref<{
		id: string;
		name: string;
		icon: string;
		iconWrapClass: string;
		totalSaved: number;
	} | null>(null);
	const transferRule = ref<"Expenses" | "Wants">("Expenses");
	const transferAmount = ref("");
	const transferError = ref("");
	const savingTransfer = ref(false);

	const transferRuleOptions = [
		{ value: "Expenses", label: "Expenses" },
		{ value: "Wants", label: "Wants" },
	];

	function iconWrapClass(color?: string) {
		const value = color ?? DEFAULT_ITEM_COLOR;
		return (
			ITEM_COLOR_OPTIONS.find((entry) => entry.value === value)?.wrap ??
			ITEM_COLOR_OPTIONS.find((entry) => entry.value === DEFAULT_ITEM_COLOR)!.wrap
		);
	}

	function cardWrapClass(color?: string) {
		const value = color ?? DEFAULT_ITEM_COLOR;
		return (
			ITEM_COLOR_OPTIONS.find((entry) => entry.value === value)?.cardWrap ??
			ITEM_COLOR_OPTIONS.find((entry) => entry.value === DEFAULT_ITEM_COLOR)!
				.cardWrap
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
		return `${month} - ${label}`;
	}

	function formatAmount(amount: number) {
		return `₱${Math.round(amount).toLocaleString("en-PH")}`;
	}

	function formatSignedAmount(amount: number) {
		const prefix = amount >= 0 ? "+" : "-";
		return `${prefix}${formatAmount(Math.abs(amount))}`;
	}

	function formatHistoryDate(iso: string) {
		const d = new Date(iso);
		const date = d.toLocaleDateString("en-US", {
			day: "numeric",
			month: "short",
		});
		const time = d.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});
		return `${date}, ${time}`;
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
				color: item.color ?? DEFAULT_ITEM_COLOR,
				iconWrapClass: iconWrapClass(item.color),
				cardWrapClass: cardWrapClass(item.color),
				totalSaved: itemSavedTotal(item),
			})),
	);

	const savingsHistory = computed(() => {
		const cutoffMap = new Map(cutoffs.value.map((cutoff) => [cutoff.id, cutoff]));
		const transferMap = new Map(
			savingsTransfers.value.map((transfer) => [transfer.budgetEntryId, transfer]),
		);
		const rows: Array<{
			id: string;
			itemName: string;
			itemBuilderId: string;
			historySubtitle: string;
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
				const transfer = transferMap.get(entry.id);
				rows.push({
					id: entry.id,
					itemName: builder?.name ?? entry.name,
					itemBuilderId: builder?.id ?? "",
					historySubtitle: transfer
						? `Used for ${transfer.targetRule}`
						: cutoffLabel(cutoff),
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
			const transfer = transferMap.get(entry.id);
			rows.push({
				id: entry.id,
				itemName: builder?.name ?? entry.name,
				itemBuilderId: builder?.id ?? "",
				historySubtitle: transfer
					? `Used for ${transfer.targetRule}`
					: cutoffLabel(cutoff),
				amount: entry.amount,
				createdAt: entry.createdAt,
				icon: builder?.icon ?? "HomeIcon",
				iconWrapClass: iconWrapClass(builder?.color),
			});
		}

		return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	});

	const activeCutoff = computed(() => {
		const list = cutoffs.value.filter((c) => c.status !== "finalized");
		if (list.length === 0) return null;
		return list.reduce((latest, c) =>
			!latest || c.createdAt > latest.createdAt ? c : latest,
		);
	});

	const itemHistory = computed(() => {
		if (!selectedItem.value) return [];
		return savingsHistory.value.filter(
			(entry) => entry.itemBuilderId === selectedItem.value!.id,
		);
	});

	const canConfirmTransfer = computed(() => {
		const amount = Number(transferAmount.value);
		return (
			!savingTransfer.value &&
			amount > 0 &&
			!!selectedItem.value &&
			amount <= selectedItem.value.totalSaved
		);
	});

	const totalSavings = computed(() =>
		savingsItems.value.reduce((sum, item) => sum + item.totalSaved, 0),
	);

	const savedLastCutoff = computed(() => {
		if (!cutoffs.value.length) return 0;
		const lastCutoff = cutoffs.value.reduce((latest, cutoff) =>
			!latest || cutoff.createdAt > latest.createdAt ? cutoff : latest,
		);
		let sum = 0;
		for (const entry of budgetEntries.value) {
			if (entry.ruleName !== "Savings" || entry.cutoffId !== lastCutoff.id)
				continue;
			if (entry.parentBudgetEntryId) {
				sum += entry.amount;
				continue;
			}
			const builder = findBuilder(entry);
			if (builder?.hasChildItems) continue;
			sum += entry.amount;
		}
		return sum;
	});

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

	function openItemDrawer(item: (typeof savingsItems.value)[number]) {
		selectedItem.value = item;
		showItemDrawer.value = true;
	}

	function closeItemDrawer() {
		showItemDrawer.value = false;
		selectedItem.value = null;
	}

	function onUseSavingsClick() {
		if (!activeCutoff.value) {
			showNoCutoffWarning.value = true;
			return;
		}
		transferRule.value = "Expenses";
		transferAmount.value = "";
		transferError.value = "";
		showTransferModal.value = true;
	}

	function closeTransferModal() {
		showTransferModal.value = false;
		transferError.value = "";
	}

	function closeTransferConfirm() {
		showTransferConfirm.value = false;
	}

	function openTransferConfirm() {
		const item = selectedItem.value;
		const amount = Number(transferAmount.value);
		if (!item || !activeCutoff.value || amount <= 0 || amount > item.totalSaved) {
			transferError.value = "Enter an amount up to your saved balance.";
			return;
		}
		transferError.value = "";
		showTransferConfirm.value = true;
	}

	function closeNoCutoffWarning() {
		showNoCutoffWarning.value = false;
	}

	async function loadPageData() {
		itemBuilders.value = await db.itemBuilders.toArray();
		budgetEntries.value = await db.budgetEntries.toArray();
		cutoffs.value = await db.cycleCutoffs.toArray();
		savingsTransfers.value = await db.savingsTransfers.toArray();
	}

	async function confirmTransfer() {
		const item = selectedItem.value;
		const cutoff = activeCutoff.value;
		const amount = Number(transferAmount.value);
		const targetRule = transferRule.value;
		if (!item || !cutoff || amount <= 0 || amount > item.totalSaved) {
			transferError.value = "Enter an amount up to your saved balance.";
			return;
		}

		savingTransfer.value = true;
		transferError.value = "";
		const entryId = createId();
		const now = new Date().toISOString();

		try {
			await db.transaction(
				"rw",
				[db.cycleCutoffs, db.budgetEntries, db.savingsTransfers],
				async () => {
					await db.savingsTransfers.add({
						id: createId(),
						itemBuilderId: item.id,
						cutoffId: cutoff.id,
						monthKey: cutoff.monthKey,
						targetRule,
						amount,
						budgetEntryId: entryId,
						createdAt: now,
					});

					await db.budgetEntries.add({
						id: entryId,
						cutoffId: cutoff.id,
						monthKey: cutoff.monthKey,
						ruleName: "Savings",
						name: item.name,
						amount: -amount,
						itemBuilderId: item.id,
						createdAt: now,
					});

					const freshCutoff = await db.cycleCutoffs.get(cutoff.id);
					if (!freshCutoff?.allocations) return;

					const allocations = {
						Expenses: { ...freshCutoff.allocations.Expenses },
						Savings: { ...freshCutoff.allocations.Savings },
						Wants: { ...freshCutoff.allocations.Wants },
					};
					allocations[targetRule] = {
						...allocations[targetRule],
						amount: allocations[targetRule].amount + amount,
					};
					await db.cycleCutoffs.update(cutoff.id, { allocations });
				},
			);

			await loadPageData();
			selectedItem.value =
				savingsItems.value.find((row) => row.id === item.id) ?? null;
			showTransferConfirm.value = false;
			showTransferModal.value = false;
		} catch {
			transferError.value = "Transfer failed. Please try again.";
			showTransferConfirm.value = false;
		} finally {
			savingTransfer.value = false;
		}
	}

	onMounted(loadPageData);
</script>

<template>
	<div class="page-shell">
		<header class="page-header">
			<button type="button" class="back-btn" @click="router.push('/me')">←</button>
			<h1 class="page-title">My Savings</h1>
			<span class="header-spacer" />
		</header>

		<GlassContainer class="balance-card">
			<p class="balance-label">Total Savings</p>

			<div class="balance-amount-row">
				<p class="balance-amount">
					<span class="balance-whole">{{
						hideBalance ? "••••••" : formatAmount(totalSavings)
					}}</span>
				</p>
				<button
					type="button"
					class="balance-eye-btn"
					aria-label="Toggle balance visibility"
					@click="hideBalance = !hideBalance"
				>
					<EyeSlashIcon v-if="hideBalance" class="balance-eye-icon" />
					<EyeIcon v-else class="balance-eye-icon" />
				</button>
			</div>

			<p class="balance-sub">
				{{ formatAmount(savedLastCutoff) }} total amount saved last cutoff
			</p>
		</GlassContainer>

		<div v-if="savingsItems.length" class="savings-items-grid">
			<div
				v-for="item in savingsItems"
				:key="item.id"
				class="goal-card is-clickable"
				:class="item.cardWrapClass"
				role="button"
				tabindex="0"
				@click="openItemDrawer(item)"
				@keydown.enter="openItemDrawer(item)"
			>
				<span class="goal-card-logo" :class="item.iconWrapClass">
					<component
						:is="OutlineIcons[item.icon as keyof typeof OutlineIcons]"
						class="goal-card-logo-icon"
					/>
				</span>
				<div class="goal-card-bottom">
					<p class="goal-card-type">Total Saved</p>
					<p class="goal-card-amount">{{ formatAmount(item.totalSaved) }}</p>
					<p class="goal-card-meta">{{ item.name }}</p>
				</div>
			</div>
		</div>

		<Divider marginTop="1rem" marginBottom="1rem" />

		<GlassContainer class="transactions-card" :padding="false">
			<div class="transactions-header">
				<p class="section-title">Saving History</p>
				<button
					v-if="savingsHistory.length"
					type="button"
					class="filter-btn"
					aria-label="Filter saving history"
					@click="openHistoryDrawer"
				>
					<Bars3Icon class="filter-icon" />
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
						<p class="history-cutoff">{{ entry.historySubtitle }}</p>
					</div>
					<div class="history-amount-col">
						<span
							class="history-amount"
							:class="entry.amount >= 0 ? 'text-progress-green' : 'text-progress-red'"
						>
							{{ formatSignedAmount(entry.amount) }}
						</span>
						<span class="history-date">{{ formatHistoryDate(entry.createdAt) }}</span>
					</div>
				</li>
			</ul>
			<p v-else class="empty transactions-empty">No savings history yet</p>
		</GlassContainer>

		<Teleport to="body">
			<div
				v-if="showItemDrawer && selectedItem"
				class="drawer-overlay"
				@click.self="closeItemDrawer"
			>
				<GlassContainer class="drawer-sheet">
					<div class="drawer-handle" />
					<div class="drawer-header">
						<h2 class="drawer-title">{{ selectedItem.name }}</h2>
						<button
							type="button"
							class="drawer-close"
							aria-label="Close"
							@click="closeItemDrawer"
						>
							<XMarkIcon class="h-5 w-5" />
						</button>
					</div>

					<div class="item-drawer-summary">
						<!-- <span class="item-drawer-icon" :class="selectedItem.iconWrapClass">
							<component
								:is="OutlineIcons[selectedItem.icon as keyof typeof OutlineIcons]"
								class="item-drawer-icon-svg"
							/>
						</span> -->
						<div class="item-drawer-main">
							<p class="item-drawer-label">Total Saved</p>
							<div class="item-drawer-amount-row">
								<p class="item-drawer-amount">
									{{ formatAmount(selectedItem.totalSaved) }}
								</p>
								<Button class="use-savings-btn" @click="onUseSavingsClick">
									Use savings
								</Button>
							</div>
						</div>
					</div>

					<p class="item-drawer-history-title">Saving History</p>
					<ul v-if="itemHistory.length" class="history-list">
						<li v-for="entry in itemHistory" :key="entry.id" class="history-row">
							<span class="history-icon-wrap" :class="entry.iconWrapClass">
								<component
									:is="OutlineIcons[entry.icon as keyof typeof OutlineIcons]"
									class="history-icon"
								/>
							</span>
							<div class="history-main">
								<p class="history-name">{{ entry.itemName }}</p>
								<p class="history-cutoff">{{ entry.historySubtitle }}</p>
							</div>
							<div class="history-amount-col">
								<span
									class="history-amount"
									:class="
										entry.amount >= 0 ? 'text-progress-green' : 'text-progress-red'
									"
								>
									{{ formatSignedAmount(entry.amount) }}
								</span>
								<span class="history-date">{{
									formatHistoryDate(entry.createdAt)
								}}</span>
							</div>
						</li>
					</ul>
					<p v-else class="empty">No savings history yet</p>
				</GlassContainer>
			</div>

			<div
				v-if="showHistoryDrawer"
				class="drawer-overlay"
				@click.self="closeHistoryDrawer"
			>
				<GlassContainer class="drawer-sheet">
					<div class="drawer-handle" />
					<div class="drawer-header">
						<h2 class="drawer-title">Saving History</h2>
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
								<p class="history-cutoff">{{ entry.historySubtitle }}</p>
							</div>
							<div class="history-amount-col">
								<span
									class="history-amount"
									:class="
										entry.amount >= 0 ? 'text-progress-green' : 'text-progress-red'
									"
								>
									{{ formatSignedAmount(entry.amount) }}
								</span>
								<span class="history-date">{{
									formatHistoryDate(entry.createdAt)
								}}</span>
							</div>
						</li>
					</ul>
					<p v-else class="empty">No savings history yet</p>
				</GlassContainer>
			</div>

			<div
				v-if="showNoCutoffWarning"
				class="modal-overlay"
				@click.self="closeNoCutoffWarning"
			>
				<GlassContainer class="modal">
					<h2 class="modal-title">No Active Cutoff</h2>
					<p class="modal-text">
						There is no active tracker or cutoff. Create or activate a cutoff first
						before using savings.
					</p>
					<div class="modal-actions">
						<Button block @click="closeNoCutoffWarning">OK</Button>
					</div>
				</GlassContainer>
			</div>

			<div
				v-if="showTransferModal"
				class="modal-overlay"
				@click.self="closeTransferModal"
			>
				<GlassContainer class="modal">
					<h2 class="modal-title">Use Savings</h2>
					<SelectField
						v-model="transferRule"
						label="Select a rule"
						:options="transferRuleOptions"
						:menu-z-index="80"
					/>
					<AmountField
						v-model="transferAmount"
						label="How much to transfer"
						placeholder="0"
					/>
					<p v-if="selectedItem" class="modal-hint">
						Available: {{ formatAmount(selectedItem.totalSaved) }}
					</p>
					<p v-if="transferError" class="modal-error">{{ transferError }}</p>
					<div class="modal-actions">
						<Button block @click="closeTransferModal">Cancel</Button>
						<Button
							block
							:disabled="!canConfirmTransfer"
							@click="openTransferConfirm"
						>
							Transfer
						</Button>
					</div>
				</GlassContainer>
			</div>

			<div
				v-if="showTransferConfirm"
				class="modal-overlay confirm-overlay"
				@click.self="closeTransferConfirm"
			>
				<GlassContainer class="modal">
					<h2 class="modal-title">Confirm Transfer</h2>
					<p v-if="selectedItem" class="modal-text">
						Transfer {{ formatAmount(Number(transferAmount)) }} from
						{{ selectedItem.name }} to {{ transferRule }}?
					</p>
					<div class="modal-actions">
						<Button block @click="closeTransferConfirm">Cancel</Button>
						<Button block :disabled="savingTransfer" @click="confirmTransfer">
							{{ savingTransfer ? "Transferring..." : "Confirm" }}
						</Button>
					</div>
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

	.page-title {
		flex: 1;
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		text-align: center;
		color: var(--color-textPrimary);
	}

	.header-spacer {
		width: 2rem;
	}

	.balance-card {
		flex-shrink: 0;
		width: 100%;
		padding: 1.25rem 1.1rem 1.1rem;
		box-shadow: none;
	}

	.balance-label {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-textSecondary);
	}

	.balance-amount-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 0.65rem;
	}

	.balance-amount {
		margin: 0;
		min-width: 0;
		line-height: 1;
	}

	.balance-whole {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-textPrimary);
		letter-spacing: -0.02em;
	}

	.balance-eye-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem;
		border: none;
		background: none;
		color: var(--color-textSecondary);
		cursor: pointer;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.balance-eye-btn:hover {
		background: var(--color-surfaceHover);
	}

	.balance-eye-icon {
		width: 1.15rem;
		height: 1.15rem;
	}

	.balance-sub {
		margin: 0.85rem 0 0;
		font-size: 0.78rem;
		color: var(--color-textSecondary);
	}

	.savings-items-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	.goal-card {
		min-height: 9.5rem;
		height: 100%;
		border-radius: 1.1rem;
		padding: 0.85rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 0.75rem;
		color: var(--color-textPrimary);
	}

	.goal-card.is-clickable {
		cursor: pointer;
		border: none;
		text-align: left;
	}

	.goal-card-logo {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.45rem;
		flex-shrink: 0;
	}

	.goal-card-logo-icon {
		width: 1rem;
		height: 1rem;
	}

	.goal-card-bottom {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.goal-card-type {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 400;
		opacity: 0.75;
	}

	.goal-card-amount {
		margin: 0;
		font-size: 1.6rem;
		font-weight: 700;
		line-height: 1.1;
	}

	.goal-card-meta {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.transactions-card {
		flex-shrink: 0;
		width: 100%;
		overflow: hidden;
		box-shadow: none;
	}

	.transactions-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 1rem 1rem 0.5rem;
	}

	.filter-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem;
		border: none;
		background: none;
		color: var(--color-textSecondary);
		cursor: pointer;
		border-radius: 0.45rem;
	}

	.filter-btn:hover {
		background: var(--color-surfaceHover);
		color: var(--color-textPrimary);
	}

	.filter-icon {
		width: 1.1rem;
		height: 1.1rem;
	}

	.transactions-empty {
		padding: 0.5rem 1rem 1rem;
	}

	.section-title {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.history-list {
		list-style: none;
		margin: 0;
		padding: 0 1rem 0.5rem;
		display: flex;
		flex-direction: column;
	}

	.history-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.85rem 0;
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
		border-radius: 0.75rem;
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
		font-size: 0.72rem;
		color: var(--color-textSecondary);
	}

	.history-amount-col {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.history-amount {
		font-size: 0.9rem;
		font-weight: 600;
	}

	.history-date {
		font-size: 0.65rem;
		color: var(--color-textSecondary);
	}

	.history-filter {
		width: 100%;
	}

	.empty {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-textSecondary);
	}

	.item-drawer-summary {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0 1rem;
	}

	.item-drawer-main {
		flex: 1;
		min-width: 0;
	}

	.item-drawer-amount-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 0.15rem;
	}

	.item-drawer-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.65rem;
		flex-shrink: 0;
	}

	.item-drawer-icon-svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.item-drawer-label {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-textSecondary);
	}

	.item-drawer-amount {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 700;
		color: var(--color-textPrimary);
	}

	.item-drawer-history-title {
		margin: 0;
		padding: 0 1rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.use-savings-btn {
		flex-shrink: 0;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 70;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: var(--color-overlay);
	}

	.confirm-overlay {
		z-index: 80;
	}

	.modal {
		width: 100%;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.modal-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-textPrimary);
		text-align: center;
	}

	.modal-text {
		margin: 0;
		font-size: 0.875rem;
		text-align: center;
		color: var(--color-textSecondary);
	}

	.modal-hint {
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-textSecondary);
	}

	.modal-error {
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-danger);
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
	}
</style>
