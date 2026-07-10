<script setup lang="ts">
	import { ref } from "vue";
	import TrackerPage from "./TrackerPage.vue";
	import IncomingBillsPage from "./IncomingBillsPage.vue";

	type MonitoringTab = "incoming-bills" | "budget-tracker";

	const activeTab = ref<MonitoringTab>("budget-tracker");
	const trackerMonthKey = ref("");

	function onMovedToTracker(monthKey: string) {
		trackerMonthKey.value = monthKey;
		activeTab.value = "budget-tracker";
	}
</script>

<template>
	<div class="monitoring-page">
		<div class="monitoring-tabs-wrap">
			<div class="monitoring-tabs">
				<button
					type="button"
					class="monitoring-tab"
					:class="{ active: activeTab === 'incoming-bills' }"
					@click="activeTab = 'incoming-bills'"
				>
					Incoming Bills
				</button>
				<button
					type="button"
					class="monitoring-tab"
					:class="{ active: activeTab === 'budget-tracker' }"
					@click="activeTab = 'budget-tracker'"
				>
					Budget Tracker
				</button>
			</div>
		</div>

		<TrackerPage
			v-if="activeTab === 'budget-tracker'"
			:initial-month-key="trackerMonthKey || undefined"
		/>
		<IncomingBillsPage v-else @moved-to-tracker="onMovedToTracker" />
	</div>
</template>

<style scoped>
	.monitoring-page {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
	}

	.monitoring-tabs-wrap {
		display: flex;
		justify-content: center;
		padding-top: 1rem;
		padding-bottom: 0.5rem;
	}

	.monitoring-tabs {
		display: flex;
		width: 100%;
		max-width: 480px;
		padding: 0.25rem;
		border: 1px solid var(--color-inputBorder);
		border-radius: 9999px;
		background: rgb(255 255 255 / 0.04);
	}

	:global(:root:not(.dark)) .monitoring-tabs {
		background: var(--color-surface);
		box-shadow: var(--shadow-sm);
	}

	.monitoring-tab {
		flex: 1;
		padding: 0.55rem 0.75rem;
		border: 0;
		border-radius: 9999px;
		background: transparent;
		color: var(--color-textSecondary);
		font-size: 0.875rem;
		font-family: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.monitoring-tab.active {
		background: var(--gradient-fill);
		color: #ffffff;
	}

	:global(.dark) .monitoring-tab.active {
		background: rgb(255 255 255 / 0.12);
		color: var(--color-textPrimary);
	}
</style>
