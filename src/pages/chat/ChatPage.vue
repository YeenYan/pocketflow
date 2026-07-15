<script setup lang="ts">
	import { ref, nextTick, onMounted } from "vue";
	import { useRouter } from "vue-router";
	import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import FadeIn from "../../components/containers/FadeIn.vue";
	import { db, type RuleName } from "../../db/budgetDb";
	import pokoImg from "../../assets/img/image_3.webp";
	import pokoHead from "../../assets/img/head_only.webp";

	const router = useRouter();
	const input = ref("");
	const messages = ref<{ role: "user" | "assistant"; content: string }[]>([]);
	const loading = ref(false);
	const error = ref("");
	const messagesEl = ref<HTMLElement | null>(null);
	const inputEl = ref<HTMLTextAreaElement | null>(null);
	const photoUrl = ref("");
	const displayName = ref("");

	onMounted(async () => {
		const profile = await db.userProfiles.get(1);
		if (profile) {
			displayName.value = profile.displayName;
			photoUrl.value = profile.photoUrl || "";
		}
	});

	async function buildBudgetContext() {
		const profile = await db.userProfiles.get(1);
		const cutoffs = await db.cycleCutoffs.toArray();
		const budgetEntries = await db.budgetEntries.toArray();
		const itemBuilders = await db.itemBuilders.toArray();
		const tabBudgets = await db.tabBudgets.toArray();
		const tabBudgetExpenses = await db.tabBudgetExpenses.toArray();
		const othersBudgets = await db.othersBudgets.toArray();
		const othersExpenses = await db.othersExpenses.toArray();
		const incomingBillItems = await db.incomingBillItems.toArray();
		const incomingBillBudgets = await db.incomingBillBudgets.toArray();
		const savingsTransfers = await db.savingsTransfers.toArray();
		const ruleExtraBudgets = await db.ruleExtraBudgets.toArray();
		const unexpectedExpenses = await db.unexpectedExpenses.toArray();

		const lines: string[] = [];
		if (profile?.displayName) {
			lines.push(`User: ${profile.displayName}`);
		}

		const sortedCutoffs = [...cutoffs].sort((a, b) =>
			a.createdAt.localeCompare(b.createdAt),
		);
		if (!sortedCutoffs.length) {
			lines.push("No cutoffs found.");
			if (incomingBillItems.length || incomingBillBudgets.length) {
				const categoryLabels: Record<string, string> = {
					"expense-main": "Expense Main Items",
					savings: "Saving's Items",
					cutoff: "Cutoff Budget",
					"other-expenses": "Other Expenses Budget",
					wants: "Wants Budget",
				};
				lines.push("");
				lines.push(
					"Incoming bills (planned for next cutoff, not yet spent or allotted):",
				);
				for (const item of incomingBillItems) {
					const label = categoryLabels[item.category] ?? item.category;
					lines.push(
						`- ${item.name} (${label}): ₱${item.amount.toLocaleString("en-PH")}`,
					);
				}
				for (const budget of incomingBillBudgets) {
					const label = categoryLabels[budget.category] ?? budget.category;
					lines.push(`- ${label}: ₱${budget.amount.toLocaleString("en-PH")}`);
				}
				const incomingTotal =
					incomingBillItems.reduce((sum, i) => sum + i.amount, 0) +
					incomingBillBudgets.reduce((sum, b) => sum + b.amount, 0);
				lines.push(
					`Incoming bills total: ₱${incomingTotal.toLocaleString("en-PH")}`,
				);
			}
			return lines.join("\n");
		}

		const ruleNames: RuleName[] = ["Expenses", "Savings", "Wants"];
		const byYear: Record<
			string,
			{
				cutoffCount: number;
				income: number;
				expensesAllotted: number;
				expensesSpent: number;
				savingsAllotted: number;
				savingsSpent: number;
				wantsAllotted: number;
				wantsSpent: number;
				overspentCutoffs: number;
			}
		> = {};
		const cutoffBlocks: string[][] = [];

		for (const cutoff of sortedCutoffs) {
			const cutoffId = cutoff.id;
			const tabSpent = tabBudgetExpenses
				.filter((e) => e.cutoffId === cutoffId && e.ruleName === "Expenses")
				.reduce((sum, e) => sum + e.amount, 0);
			const othersSpent = othersExpenses
				.filter((e) => e.cutoffId === cutoffId)
				.reduce((sum, e) => sum + e.amount, 0);
			const year = cutoff.monthKey.slice(0, 4);
			if (!byYear[year]) {
				byYear[year] = {
					cutoffCount: 0,
					income: 0,
					expensesAllotted: 0,
					expensesSpent: 0,
					savingsAllotted: 0,
					savingsSpent: 0,
					wantsAllotted: 0,
					wantsSpent: 0,
					overspentCutoffs: 0,
				};
			}
			const yearTotals = byYear[year];
			yearTotals.cutoffCount += 1;
			yearTotals.income += cutoff.amount;

			const block: string[] = [];
			const status = cutoff.status === "finalized" ? "finalized" : "active";
			block.push(`--- ${cutoff.label} · ${cutoff.monthKey} (${status}) ---`);
			block.push(`Income: ₱${cutoff.amount.toLocaleString("en-PH")}`);

			let expensesAllotted = 0;
			let expensesSpent = 0;
			let wantsAllotted = 0;
			let wantsSpent = 0;

			for (const rule of ruleNames) {
				const allotted = cutoff.allocations?.[rule]?.amount ?? 0;
				const entriesSum = budgetEntries
					.filter(
						(e) =>
							e.cutoffId === cutoffId && e.ruleName === rule && !e.parentBudgetEntryId,
					)
					.reduce((sum, e) => sum + e.amount, 0);
				const spent =
					rule === "Expenses" ? entriesSum + tabSpent + othersSpent : entriesSum;
				block.push(
					`${rule}: allotted ₱${allotted.toLocaleString("en-PH")}, spent ₱${spent.toLocaleString("en-PH")}`,
				);
				if (rule === "Expenses") {
					expensesAllotted = allotted;
					expensesSpent = spent;
					yearTotals.expensesAllotted += allotted;
					yearTotals.expensesSpent += spent;
				} else if (rule === "Savings") {
					yearTotals.savingsAllotted += allotted;
					yearTotals.savingsSpent += spent;
				} else {
					wantsAllotted = allotted;
					wantsSpent = spent;
					yearTotals.wantsAllotted += allotted;
					yearTotals.wantsSpent += spent;
				}
			}

			if (expensesSpent > expensesAllotted || wantsSpent > wantsAllotted) {
				yearTotals.overspentCutoffs += 1;
			}

			const cutoffTransfers = savingsTransfers.filter(
				(t) => t.cutoffId === cutoffId,
			);
			if (cutoffTransfers.length) {
				block.push("Savings transfers (used savings):");
				for (const transfer of cutoffTransfers) {
					const item = itemBuilders.find((b) => b.id === transfer.itemBuilderId);
					block.push(
						`- ${item?.name ?? "Savings item"}: ₱${transfer.amount.toLocaleString("en-PH")} to ${transfer.targetRule}`,
					);
				}
			}

			const cutoffExtras = ruleExtraBudgets.filter(
				(e) => e.cutoffId === cutoffId,
			);
			if (cutoffExtras.length) {
				block.push("Extra budget / add savings:");
				for (const extra of cutoffExtras) {
					const item = extra.itemBuilderId
						? itemBuilders.find((b) => b.id === extra.itemBuilderId)
						: null;
					const itemLabel = item ? ` (${item.name})` : "";
					block.push(
						`- ${extra.ruleName}${itemLabel}: ${extra.label} ₱${extra.amount.toLocaleString("en-PH")}`,
					);
				}
			}

			const cutoffUnexpected = unexpectedExpenses.filter(
				(u) => u.cutoffId === cutoffId,
			);
			if (cutoffUnexpected.length) {
				block.push("Unexpected expenses:");
				for (const u of cutoffUnexpected) {
					block.push(
						`- ${u.itemName} (${u.ruleName}): exceeded by ₱${u.excessAmount.toLocaleString("en-PH")} on ${u.date}`,
					);
				}
			}

			cutoffBlocks.push(block);
		}

		lines.push("Yearly totals (pre-computed):");
		for (const year of Object.keys(byYear).sort()) {
			const y = byYear[year];
			lines.push(`${year} (${y.cutoffCount} cutoffs):`);
			lines.push(`- Income: ₱${y.income.toLocaleString("en-PH")}`);
			lines.push(
				`- Expenses: allotted ₱${y.expensesAllotted.toLocaleString("en-PH")}, spent ₱${y.expensesSpent.toLocaleString("en-PH")}`,
			);
			lines.push(
				`- Savings: allotted ₱${y.savingsAllotted.toLocaleString("en-PH")}, saved ₱${y.savingsSpent.toLocaleString("en-PH")}`,
			);
			lines.push(
				`- Wants: allotted ₱${y.wantsAllotted.toLocaleString("en-PH")}, spent ₱${y.wantsSpent.toLocaleString("en-PH")}`,
			);
			lines.push(`- Cutoffs over budget: ${y.overspentCutoffs}`);
		}

		lines.push("");
		lines.push("Recent cutoffs (last 6):");
		for (const block of cutoffBlocks.slice(-6)) {
			lines.push(...block);
		}

		if (incomingBillItems.length || incomingBillBudgets.length) {
			const categoryLabels: Record<string, string> = {
				"expense-main": "Expense Main Items",
				savings: "Saving's Items",
				cutoff: "Cutoff Budget",
				"other-expenses": "Other Expenses Budget",
				wants: "Wants Budget",
			};
			lines.push("");
			lines.push(
				"Incoming bills (planned for next cutoff, not yet spent or allotted):",
			);
			for (const item of incomingBillItems) {
				const label = categoryLabels[item.category] ?? item.category;
				lines.push(
					`- ${item.name} (${label}): ₱${item.amount.toLocaleString("en-PH")}`,
				);
			}
			for (const budget of incomingBillBudgets) {
				const label = categoryLabels[budget.category] ?? budget.category;
				lines.push(`- ${label}: ₱${budget.amount.toLocaleString("en-PH")}`);
			}
			const incomingTotal =
				incomingBillItems.reduce((sum, i) => sum + i.amount, 0) +
				incomingBillBudgets.reduce((sum, b) => sum + b.amount, 0);
			lines.push(
				`Incoming bills total: ₱${incomingTotal.toLocaleString("en-PH")}`,
			);
		}

		const activeList = cutoffs.filter((c) => c.status !== "finalized");
		const activeCutoff =
			activeList.length === 0
				? null
				: activeList.reduce((latest, c) =>
						!latest || c.createdAt > latest.createdAt ? c : latest,
					);

		const savingsItems = itemBuilders.filter((item) =>
			item.categories.includes("Savings"),
		);
		if (savingsItems.length) {
			const transferEntryIds = new Set(
				savingsTransfers.map((t) => t.budgetEntryId),
			);
			const extraEntryIds = new Set(
				ruleExtraBudgets
					.filter((e) => e.budgetEntryId)
					.map((e) => e.budgetEntryId!),
			);
			const countsTowardSavings = (entry: (typeof budgetEntries)[number]) => {
				const cutoff = cutoffs.find((c) => c.id === entry.cutoffId);
				if (cutoff?.status === "finalized") return true;
				return (
					transferEntryIds.has(entry.id) || extraEntryIds.has(entry.id)
				);
			};

			lines.push("");
			lines.push("My Savings:");
			for (const item of savingsItems) {
				const saved = budgetEntries
					.filter(
						(e) =>
							e.ruleName === "Savings" &&
							!e.parentBudgetEntryId &&
							countsTowardSavings(e) &&
							(e.itemBuilderId === item.id || e.name === item.name),
					)
					.reduce((sum, e) => sum + e.amount, 0);
				const wallet = item.bankWallet?.trim();
				lines.push(
					`- ${item.name}: ₱${saved.toLocaleString("en-PH")} saved${wallet ? `, bank/wallet: ${wallet}` : ""}`,
				);
			}

			const extraLabelMap = new Map(
				ruleExtraBudgets
					.filter((e) => e.budgetEntryId)
					.map((e) => [e.budgetEntryId!, e.label]),
			);
			const transferMap = new Map(
				savingsTransfers.map((t) => [t.budgetEntryId, t]),
			);
			const savingsHistory: Array<{
				itemName: string;
				subtitle: string;
				amount: number;
				createdAt: string;
			}> = [];
			for (const entry of budgetEntries) {
				if (entry.ruleName !== "Savings" || entry.parentBudgetEntryId) continue;
				if (!countsTowardSavings(entry)) continue;
				const builder = entry.itemBuilderId
					? itemBuilders.find((b) => b.id === entry.itemBuilderId)
					: itemBuilders.find((b) => b.name === entry.name);
				if (builder?.hasChildItems) continue;
				const transfer = transferMap.get(entry.id);
				const cutoff = cutoffs.find((c) => c.id === entry.cutoffId);
				const month = cutoff
					? new Date(cutoff.monthKey + "-01T00:00:00").toLocaleDateString(
							"en-US",
							{ month: "long" },
						)
					: "";
				const cutoffLabel = cutoff
					? `${month} - ${cutoff.label.charAt(0).toUpperCase() + cutoff.label.slice(1).replace("cutoff", "Cutoff")}`
					: "";
				savingsHistory.push({
					itemName: builder?.name ?? entry.name,
					subtitle: transfer
						? `Used for ${transfer.targetRule}`
						: (extraLabelMap.get(entry.id) ?? cutoffLabel),
					amount: entry.amount,
					createdAt: entry.createdAt,
				});
			}
			savingsHistory.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
			if (savingsHistory.length) {
				lines.push("Savings history (recent):");
				for (const row of savingsHistory.slice(0, 15)) {
					const sign = row.amount >= 0 ? "+" : "-";
					lines.push(
						`- ${row.itemName} (${row.subtitle}): ${sign}₱${Math.abs(row.amount).toLocaleString("en-PH")}`,
					);
				}
			}
		}

		if (!activeCutoff) {
			return lines.join("\n");
		}

		const cutoffId = activeCutoff.id;
		lines.push("");
		lines.push("Active cutoff detail:");
		lines.push(`Active cutoff month: ${activeCutoff.monthKey}`);
		lines.push(
			`Active cutoff: ${activeCutoff.label}, total income ₱${activeCutoff.amount.toLocaleString("en-PH")}`,
		);
		if (activeCutoff.date) {
			lines.push(`Cutoff date: ${activeCutoff.date}`);
		}

		const tabBudget = tabBudgets.find(
			(b) => b.cutoffId === cutoffId && b.ruleName === "Expenses",
		);
		const tabExpenses = tabBudgetExpenses.filter(
			(e) => e.cutoffId === cutoffId && e.ruleName === "Expenses",
		);
		const tabAllocated = tabBudget?.budgetAllocated ?? 0;
		const tabSpent = tabExpenses.reduce((sum, e) => sum + e.amount, 0);

		const othersBudget = othersBudgets.find((b) => b.cutoffId === cutoffId);
		const othersExpenseList = othersExpenses.filter(
			(e) => e.cutoffId === cutoffId,
		);
		const othersAllocated = othersBudget?.budgetAllocated ?? 0;
		const othersSpent = othersExpenseList.reduce((sum, e) => sum + e.amount, 0);

		const expensesEntriesSum = budgetEntries
			.filter(
				(e) =>
					e.cutoffId === cutoffId &&
					e.ruleName === "Expenses" &&
					!e.parentBudgetEntryId,
			)
			.reduce((sum, e) => sum + e.amount, 0);
		const wantsEntriesSum = budgetEntries
			.filter(
				(e) =>
					e.cutoffId === cutoffId &&
					e.ruleName === "Wants" &&
					!e.parentBudgetEntryId,
			)
			.reduce((sum, e) => sum + e.amount, 0);
		const spendBudgetAllotted =
			(activeCutoff.allocations?.Expenses?.amount ?? 0) +
			(activeCutoff.allocations?.Wants?.amount ?? 0);
		const spendBudgetSpent =
			expensesEntriesSum + wantsEntriesSum + tabSpent + othersSpent;
		const spendBudgetRemaining = Math.max(
			0,
			spendBudgetAllotted - spendBudgetSpent,
		);
		lines.push(
			`Spend budget remaining (Expenses + Wants): ₱${spendBudgetRemaining.toLocaleString("en-PH")} of ₱${spendBudgetAllotted.toLocaleString("en-PH")} allotted (₱${spendBudgetSpent.toLocaleString("en-PH")} spent)`,
		);

		for (const rule of ruleNames) {
			const allotted = activeCutoff.allocations?.[rule]?.amount ?? 0;
			const entriesSum = budgetEntries
				.filter(
					(e) =>
						e.cutoffId === cutoffId && e.ruleName === rule && !e.parentBudgetEntryId,
				)
				.reduce((sum, e) => sum + e.amount, 0);
			const spent =
				rule === "Expenses" ? entriesSum + tabSpent + othersSpent : entriesSum;
			const left = Math.max(0, allotted - spent);
			lines.push(
				`${rule}: allotted ₱${allotted.toLocaleString("en-PH")}, spent ₱${spent.toLocaleString("en-PH")}, remaining ₱${left.toLocaleString("en-PH")}`,
			);
		}

		lines.push(
			`Budget for this Cutoff: allotted ₱${tabAllocated.toLocaleString("en-PH")}, spent ₱${tabSpent.toLocaleString("en-PH")}`,
		);
		lines.push(
			`Budget for Other expenses: allotted ₱${othersAllocated.toLocaleString("en-PH")}, spent ₱${othersSpent.toLocaleString("en-PH")}`,
		);

		const mainItems = budgetEntries.filter(
			(e) => e.cutoffId === cutoffId && !e.parentBudgetEntryId,
		);
		if (mainItems.length) {
			lines.push("Main items:");
			for (const entry of mainItems) {
				const builder = entry.itemBuilderId
					? itemBuilders.find((item) => item.id === entry.itemBuilderId)
					: itemBuilders.find((item) => item.name === entry.name);
				const name = builder?.name ?? entry.name;
				let itemLine = `- ${name} (${entry.ruleName}): ₱${entry.amount.toLocaleString("en-PH")}`;
				if (builder?.hasChildItems) {
					const childrenSpent = budgetEntries
						.filter((child) => child.parentBudgetEntryId === entry.id)
						.reduce((sum, child) => sum + child.amount, 0);
					itemLine += `, child items used ₱${childrenSpent.toLocaleString("en-PH")}`;
				}
				lines.push(itemLine);
			}
		}

		const recent: Array<{
			name: string;
			amount: number;
			createdAt: string;
		}> = [];
		for (const entry of budgetEntries) {
			if (entry.cutoffId !== cutoffId) continue;
			const builder = entry.itemBuilderId
				? itemBuilders.find((item) => item.id === entry.itemBuilderId)
				: itemBuilders.find((item) => item.name === entry.name);
			recent.push({
				name: builder?.name ?? entry.name,
				amount: entry.amount,
				createdAt: entry.createdAt,
			});
		}
		for (const expense of tabExpenses) {
			recent.push({
				name: expense.expenseName,
				amount: expense.amount,
				createdAt: expense.createdAt,
			});
		}
		for (const expense of othersExpenseList) {
			recent.push({
				name: expense.expenseName,
				amount: expense.amount,
				createdAt: expense.createdAt,
			});
		}
		recent.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		if (recent.length) {
			lines.push("Recent items:");
			for (const item of recent.slice(0, 10)) {
				lines.push(`- ${item.name}: ₱${item.amount.toLocaleString("en-PH")}`);
			}
		}

		const toWithdrawRows: { name: string; amount: number }[] = [];
		for (const entry of budgetEntries) {
			if (
				entry.cutoffId !== cutoffId ||
				!entry.toWithdraw ||
				entry.parentBudgetEntryId
			) {
				continue;
			}
			const builder = entry.itemBuilderId
				? itemBuilders.find((item) => item.id === entry.itemBuilderId)
				: itemBuilders.find((item) => item.name === entry.name);
			toWithdrawRows.push({
				name: builder?.name ?? entry.name,
				amount: entry.withdrawAmount ?? entry.amount,
			});
		}
		if (tabBudget?.toWithdraw) {
			toWithdrawRows.push({
				name: "Budget",
				amount: tabBudget.withdrawAmount ?? tabBudget.budgetAllocated,
			});
		}
		for (const expense of tabExpenses) {
			if (!expense.toWithdraw) continue;
			toWithdrawRows.push({
				name: expense.expenseName,
				amount: expense.withdrawAmount ?? expense.amount,
			});
		}
		if (othersBudget?.toWithdraw) {
			toWithdrawRows.push({
				name: "Others",
				amount: othersBudget.withdrawAmount ?? othersBudget.budgetAllocated,
			});
		}
		for (const expense of othersExpenseList) {
			if (!expense.toWithdraw) continue;
			toWithdrawRows.push({
				name: expense.expenseName,
				amount: expense.withdrawAmount ?? expense.amount,
			});
		}
		if (toWithdrawRows.length) {
			lines.push("To withdraw (marked for withdrawal):");
			for (const row of toWithdrawRows) {
				lines.push(`- ${row.name}: ₱${row.amount.toLocaleString("en-PH")}`);
			}
			const toWithdrawTotal = toWithdrawRows.reduce((sum, row) => sum + row.amount, 0);
			lines.push(
				`To withdraw total: ₱${toWithdrawTotal.toLocaleString("en-PH")}`,
			);
		}

		const activeUnexpected = unexpectedExpenses.filter(
			(u) => u.cutoffId === cutoffId,
		);
		if (activeUnexpected.length) {
			lines.push("Unexpected expenses (active cutoff):");
			for (const u of activeUnexpected) {
				lines.push(
					`- ${u.itemName} (${u.ruleName}): exceeded by ₱${u.excessAmount.toLocaleString("en-PH")} on ${u.date}`,
				);
			}
		}

		const activeTransfers = savingsTransfers.filter((t) => t.cutoffId === cutoffId);
		if (activeTransfers.length) {
			lines.push("Use savings (active cutoff):");
			for (const transfer of activeTransfers) {
				const item = itemBuilders.find((b) => b.id === transfer.itemBuilderId);
				lines.push(
					`- ${item?.name ?? "Savings item"}: ₱${transfer.amount.toLocaleString("en-PH")} to ${transfer.targetRule}`,
				);
			}
		}

		const activeAddSavings = ruleExtraBudgets.filter(
			(e) => e.cutoffId === cutoffId && e.ruleName === "Savings",
		);
		if (activeAddSavings.length) {
			lines.push("Add savings (active cutoff):");
			for (const extra of activeAddSavings) {
				const item = extra.itemBuilderId
					? itemBuilders.find((b) => b.id === extra.itemBuilderId)
					: null;
				lines.push(
					`- ${item?.name ?? "Savings item"}: ${extra.label} ₱${extra.amount.toLocaleString("en-PH")}`,
				);
			}
		}

		return lines.join("\n");
	}

	async function sendMessage() {
		const text = input.value.trim();
		if (!text || loading.value) return;

		messages.value.push({ role: "user", content: text });
		input.value = "";
		error.value = "";
		loading.value = true;
		await nextTick();
		resizeInput();
		await scrollToBottom();

		try {
			const context = await buildBudgetContext();
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: messages.value, context }),
			});

			const data = await response.json();
			if (!response.ok) {
				error.value = data.error || "Something went wrong.";
				return;
			}

			messages.value.push({ role: "assistant", content: data.reply });
		} catch {
			error.value = "Could not reach the assistant. Check your connection.";
		} finally {
			loading.value = false;
			await scrollToBottom();
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	function resizeInput() {
		const el = inputEl.value;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
	}

	async function scrollToBottom() {
		await nextTick();
		if (messagesEl.value) {
			messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
		}
	}
</script>

<template>
	<div class="chat">
		<header class="page-header mt-[-1rem]">
			<button
				type="button"
				class="back-btn"
				aria-label="Back"
				@click="router.push('/dashboard')"
			>
				<ArrowLeftIcon class="h-5 w-5" />
			</button>
			<h1 class="page-title">Chat with Poko</h1>
			<span class="header-spacer" />
		</header>

		<div ref="messagesEl" class="messages">
			<FadeIn v-if="messages.length === 0" :delay="80">
				<div class="tip-card">
					<img :src="pokoImg" alt="" class="tip-mascot" />
					<div class="tip-bubble">
						<p class="tip-name">Poko</p>
						<p class="tip-message">How can I help with your finances today?</p>
						<p class="tip-sub">
							Ask about your budget, spending, savings, or habits.
						</p>
					</div>
				</div>
			</FadeIn>

			<div
				v-for="(msg, i) in messages"
				:key="i"
				class="message-row"
				:class="msg.role"
			>
				<img
					v-if="msg.role === 'assistant'"
					:src="pokoHead"
					alt=""
					class="avatar avatar-img"
				/>
				<img
					v-else-if="photoUrl"
					:src="photoUrl"
					alt=""
					class="avatar avatar-img"
				/>
				<div v-else class="avatar">{{ displayName.charAt(0) || "?" }}</div>
				<div class="bubble">{{ msg.content }}</div>
			</div>

			<div v-if="loading" class="message-row assistant">
				<img :src="pokoHead" alt="" class="avatar avatar-img" />
				<div class="bubble typing">Thinking...</div>
			</div>
		</div>

		<FadeIn :delay="160">
			<div class="input-area">
				<p v-if="error" class="error">{{ error }}</p>
				<GlassContainer rounded="3xl" class="input-box">
					<textarea
						ref="inputEl"
						v-model="input"
						class="input"
						placeholder="Message Poko..."
						rows="1"
						:disabled="loading"
						@input="resizeInput"
						@keydown="onKeydown"
					></textarea>
					<button
						type="button"
						class="send-btn"
						:disabled="loading || !input.trim()"
						@click="sendMessage"
					>
						↑
					</button>
				</GlassContainer>
				<p class="disclaimer">
					AI advice is for guidance only. Consult a professional for legal or tax
					matters.
				</p>
			</div>
		</FadeIn>
	</div>
</template>

<style scoped>
	.chat {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		overflow: hidden;
		padding-top: 1rem;
	}

	.page-header {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
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

	.messages {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 1rem;
	}

	.tip-card {
		display: flex;
		width: 100%;
		max-width: 480px;
		align-items: flex-end;
		gap: 0.35rem;
		margin: 0.5rem auto 1.5rem;
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
		font-size: 0.85rem;
		line-height: 1.35;
		font-weight: 600;
		color: #1f2937;
	}

	.tip-sub {
		margin: 0.35rem 0 0;
		font-size: 0.75rem;
		line-height: 1.35;
		color: #4b5563;
	}

	.message-row {
		display: flex;
		gap: 0.75rem;
		max-width: 768px;
		margin: 0 auto 1.5rem;
		padding: 0 0.5rem;
	}

	.message-row.user {
		flex-direction: row-reverse;
	}

	.avatar {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		border-radius: 9999px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--color-onColor);
		overflow: hidden;
	}

	.avatar-img {
		object-fit: cover;
		background: transparent;
	}

	.message-row.user .avatar:not(.avatar-img) {
		background: var(--color-userAvatar);
	}

	.message-row.assistant .avatar:not(.avatar-img) {
		background: var(--color-accentSolid);
	}

	.bubble {
		padding: 0.75rem 1rem;
		border-radius: 12px;
		line-height: 1.5;
		font-size: 0.95rem;
		white-space: pre-wrap;
		word-break: break-word;
		max-width: calc(100% - 48px);
	}

	.message-row.user .bubble {
		background: var(--color-surfaceHover);
		color: var(--color-textPrimary);
	}

	.message-row.assistant .bubble {
		background: transparent;
		color: var(--color-textPrimary);
		padding-left: 0;
	}

	.typing {
		color: var(--color-muted);
		font-style: italic;
	}

	.input-area {
		padding: 0 0 0.25rem;
		flex-shrink: 0;
	}

	.error {
		color: var(--color-dangerText);
		font-size: 0.85rem;
		margin: 0 0 0.5rem;
		text-align: center;
	}

	.input-box {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
		max-width: 768px;
		margin: 0 auto;
	}

	.input {
		flex: 1;
		border: none;
		outline: none;
		resize: vertical;
		font-size: 1rem;
		font-family: inherit;
		line-height: 1.5;
		padding: 0.25rem 0.5rem;
		min-height: 2rem;
		max-height: 160px;
		overflow-y: auto;
		background: transparent;
		color: var(--color-textPrimary);
	}

	.send-btn {
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		border: none;
		border-radius: 50%;
		background: var(--gradient-fill);
		color: var(--color-onColor);
		font-size: 1.1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	:global(.dark) .send-btn {
		background: var(--color-textPrimary);
	}

	.send-btn:disabled {
		background: var(--color-disabled);
		cursor: not-allowed;
	}

	.send-btn:not(:disabled):hover {
		filter: brightness(1.05);
	}

	:global(.dark) .send-btn:not(:disabled):hover {
		filter: none;
		background: var(--color-textSecondary);
	}

	.disclaimer {
		text-align: center;
		font-size: 0.75rem;
		color: var(--color-muted);
		margin: 0.5rem 0 0;
	}
</style>
