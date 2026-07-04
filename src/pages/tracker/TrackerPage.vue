<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import {
		PlusIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
	} from "@heroicons/vue/24/outline";
	import { Doughnut } from "vue-chartjs";
	import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import AmountField from "../../components/inputs/AmountField.vue";
	import SelectField from "../../components/inputs/SelectField.vue";
	import {
		db,
		FIXED_RULES,
		type CycleCutoff,
		type Rule,
		type RuleName,
	} from "../../db/budgetDb";

	ChartJS.register(ArcElement, Tooltip);

	const RULE_ORDER: RuleName[] = ["Expenses", "Savings", "Wants"];
	const RULE_COLORS: Record<RuleName, string> = {
		Expenses: "#d96b6b",
		Savings: "#99f6e4",
		Wants: "#c4b5fd",
	};

	const activeTab = ref<RuleName>("Expenses");
	const tabs = RULE_ORDER;

	const rules = ref<Rule[]>([]);
	const cutoffs = ref<CycleCutoff[]>([]);

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

	const orderedRules = computed(() =>
		RULE_ORDER.map(
			(name) =>
				rules.value.find((r) => r.name === name) ?? {
					name,
					percent: 0,
					itemCount: 0,
				},
		),
	);

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

	const totalAmount = computed(() =>
		viewCutoffs.value.reduce((sum, c) => sum + (c.amount || 0), 0),
	);

	const displayAmount = computed(() =>
		`₱${totalAmount.value.toLocaleString("en-PH")}`,
	);

	const displayDate = computed(() =>
		viewCutoffs.value.length > 0 ? viewMonthKey.value : "--",
	);

	const displayLabels = computed(() => {
		const labels = viewCutoffs.value.map((c) => c.label).filter((l) => l.trim());
		return labels.length > 0 ? labels.join(", ") : "--";
	});

	const chartData = computed(() => ({
		labels: orderedRules.value.map((r) => r.name),
		datasets: [
			{
				data: orderedRules.value.map((r) => r.percent),
				backgroundColor: orderedRules.value.map((r) => RULE_COLORS[r.name]),
				borderWidth: 0,
				spacing: 4,
				borderRadius: 8,
			},
		],
	}));

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: true,
		cutout: "72%",
		plugins: { legend: { display: false }, tooltip: { enabled: true } },
	};

	function todayDate() {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
	}

	async function loadCutoffs() {
		cutoffs.value = await db.cycleCutoffs.toArray();
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
			monthKey,
			slot,
			label: name,
			amount,
			createdAt: new Date().toISOString(),
		});
		await loadCutoffs();
		viewMonthKey.value = monthKey;
		saving.value = false;
		closeModal();
	}

	onMounted(async () => {
		let existingRules = await db.rules.toArray();
		if (existingRules.length === 0) {
			await db.rules.bulkAdd(FIXED_RULES);
			existingRules = await db.rules.toArray();
		}
		rules.value = existingRules;
		await loadCutoffs();
	});
</script>

<template>
	<div class="page-shell">
		<div class="period-nav">
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
			<span class="period-label">{{ periodLabel }}</span>
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

		<div class="top-row">
			<GlassContainer
				as="button"
				type="button"
				rounded="full"
				:padding="false"
				class="plus-btn"
				aria-label="Add"
				@click="openModal"
			>
				<PlusIcon class="h-5 w-5" />
			</GlassContainer>
		</div>

		<div class="chart-wrap">
			<Doughnut :data="chartData" :options="chartOptions" />
			<div class="chart-center">
				<p class="amount">{{ displayAmount }}</p>
				<p class="label">{{ displayDate }}</p>
				<p class="label">{{ displayLabels }}</p>
			</div>
		</div>

		<div class="tabs">
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

		<Teleport to="body">
			<div v-if="showModal" class="modal-overlay" @click.self="closeModal">
				<GlassContainer class="modal">
					<h2 class="modal-title">Add Cutoff</h2>

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
					<label class="field">
						<span class="field-label">Date</span>
						<input v-model="formDate" type="date" class="field-input" />
					</label>

					<p v-if="formError" class="error">{{ formError }}</p>

					<div class="modal-actions">
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
	</div>
</template>

<style scoped>
	.page-shell {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		align-items: stretch;
		padding-top: 0;
		max-width: 480px;
		width: 100%;
		margin: 0 auto;
	}

	.period-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

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

	.period-label {
		flex: 1;
		text-align: center;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.top-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		margin-bottom: 1rem;
	}

	.plus-btn {
		padding: 0.5rem;
		color: var(--color-onColor);
		background: var(--color-accentSolid);
	}

	.chart-wrap {
		position: relative;
		width: min(220px, 70vw);
		margin: 0 auto 1.5rem;
	}

	.chart-center {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.amount {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-textPrimary);
	}

	.label {
		margin: 0.15rem 0 0;
		font-size: 0.85rem;
		color: var(--color-textSecondary);
	}

	.tabs {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
	}

	.tab {
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: 9999px;
		background: none;
		font-size: 0.95rem;
		font-family: inherit;
		color: var(--color-textSecondary);
		cursor: pointer;
	}

	.tab.active {
		border-color: transparent;
		background: var(--color-textPrimary);
		color: var(--color-bg);
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: var(--color-overlay);
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

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.field-label {
		font-size: 1rem;
		color: var(--color-textPrimary);
	}

	.field-input {
		width: 100%;
		padding: 0.875rem 1.25rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		background: transparent;
		color: var(--color-inputText);
		font-size: 1rem;
		font-family: inherit;
		outline: none;
	}

	.field-input:focus {
		border-color: var(--color-textSecondary);
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
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
		background: var(--color-textPrimary);
		color: var(--color-bg);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error {
		margin: 0;
		color: #f87171;
		font-size: 0.875rem;
		text-align: center;
	}
</style>
