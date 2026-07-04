<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import {
		PlusIcon,
		PencilIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
	} from "@heroicons/vue/24/outline";
	import { Doughnut } from "vue-chartjs";
	import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import AmountField from "../../components/inputs/AmountField.vue";
	import SelectField from "../../components/inputs/SelectField.vue";
	import {
		buildCutoffAllocations,
		createId,
		db,
		FIXED_RULES,
		type CycleCutoff,
		type Rule,
		type RuleName,
	} from "../../db/budgetDb";

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

	// =============================================================================
	// STATE
	// =============================================================================
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

	const spentAmount = computed(() => 0);

	const displaySpent = computed(
		() => `₱${spentAmount.value.toLocaleString("en-PH")} spent already`,
	);

	const progressPercent = computed(() => {
		if (totalAmount.value <= 0) return 0;
		return Math.min(100, (spentAmount.value / totalAmount.value) * 100);
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

	const ruleSpentAmount = computed(() => 0);

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
					name === activeTab.value
						? RULE_COLORS[name]
						: RULE_COLORS_MUTED[name],
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
		class="mx-auto flex w-full max-w-[480px] flex-1 min-h-0 flex-col items-stretch pt-0"
	>
		<!-- ================================================================== -->
		<!-- PERIOD NAV                                                        -->
		<!-- ================================================================== -->
		<div class="mb-3 flex items-center justify-between">
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
			<p class="mt-[0.35rem] mb-[.3rem] text-[0.85rem] text-textSecondary">
				{{ displaySpent }}
			</p>
			<div class="progress-track">
				<div class="progress-fill" :style="{ width: progressPercent + '%' }" />
			</div>
		</GlassContainer>

		<!-- ================================================================== -->
		<!-- DIVIDER (budget → tabs)                                             -->
		<!-- ================================================================== -->
		<div class="my-[1.5rem] h-px bg-inputBorder" />

		<!-- ================================================================== -->
		<!-- TABS                                                                -->
		<!-- ================================================================== -->
		<div class="mb-4 flex w-full gap-2">
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

		<!-- ================================================================== -->
		<!-- RULE SECTION (chart + progress)                                     -->
		<!-- ================================================================== -->
		<GlassContainer class="relative mb-4">
			<GlassContainer
				as="button"
				type="button"
				rounded="full"
				:padding="false"
				class="plus-btn absolute right-[.6rem] top-[.6rem]"
				aria-label="Add"
			>
				<PlusIcon class="h-5 w-5" />
			</GlassContainer>
			<p
				class="m-0 mb-4 min-w-0 pr-12 text-[0.95rem] font-semibold text-textPrimary"
			>
				{{ activeTab }}
			</p>

			<div class="chart-wrap">
				<Doughnut
					:key="`${activeCutoff?.id ?? 'none'}-${activeTab}`"
					:data="chartData"
					:options="chartOptions"
				/>
				<div class="chart-center">
					<p class="m-0 text-[0.85rem] font-semibold text-textPrimary">
						{{ activeRulePercent }}%
					</p>
					<p class="mt-[0.15rem] mb-0 text-[0.85rem] text-textSecondary">
						{{ activeTab }}
					</p>
					<p class="mt-[0.15rem] mb-0 text-[1.4rem] font-bold text-textPrimary">
						{{ displayActiveAmount }}
					</p>
				</div>
			</div>

			<div class="rule-progress">
				<p class="rule-progress-pct">%{{ ruleProgressPercent }}</p>
				<div class="rule-progress-track">
					<div
						class="rule-progress-fill"
						:style="{
							width: ruleProgressPercent + '%',
							background: RULE_COLORS[activeTab],
						}"
					/>
				</div>
				<div class="rule-progress-meta">
					<span class="rule-progress-spent">-{{ displayRuleSpent }} spent</span>
					<span class="rule-progress-left">{{ displayRuleLeft }} left</span>
				</div>
			</div>
		</GlassContainer>

		<!-- ================================================================== -->
		<!-- ADD CUTOFF MODAL                                                    -->
		<!-- ================================================================== -->
		<Teleport to="body">
			<div
				v-if="showModal"
				class="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
				@click.self="closeModal"
			>
				<GlassContainer class="flex w-full min-w-0 max-w-[400px] flex-col gap-4">
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
					<label class="flex w-full min-w-0 flex-col gap-2">
						<span class="text-base text-textPrimary">Date</span>
						<input v-model="formDate" type="date" class="field-input" />
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

	/* ========================================================================= */
	/* BUDGET SECTION                                                             */
	/* ========================================================================= */
	.plus-btn {
		padding: 0.7rem;
		color: var(--color-onColor);
		background: var(--color-accentSolid);
		flex-shrink: 0;
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
		background: var(--color-accentSolid);
		transition: width 0.2s;
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
	/* RULE SECTION — chart                                                       */
	/* ========================================================================= */
	.chart-wrap {
		position: relative;
		width: min(170px, 50vw);
		margin: 0 auto 1.25rem;
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

	/* ========================================================================= */
	/* RULE SECTION — progress bar                                                */
	/* ========================================================================= */
	.rule-progress-pct {
		margin: 0 0 0.35rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-textPrimary);
		text-align: right;
	}

	.rule-progress-track {
		height: 0.5rem;
		border-radius: 9999px;
		background: var(--color-inputBorder);
		overflow: hidden;
	}

	.rule-progress-fill {
		height: 100%;
		border-radius: 9999px;
		transition: width 0.2s;
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
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-textPrimary);
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
		background: var(--color-textPrimary);
		color: var(--color-bg);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
