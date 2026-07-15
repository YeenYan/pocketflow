<script setup lang="ts">
	import { ref } from "vue";
	import { useRouter } from "vue-router";
	import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
	import BorrowedPage from "./BorrowedPage.vue";
	import LentPage from "./LentPage.vue";

	type DebtTab = "borrowed" | "lent";

	const router = useRouter();
	const activeTab = ref<DebtTab>("borrowed");
</script>

<template>
	<div class="page-shell">
		<header class="page-header mt-[-1rem]">
			<button
				type="button"
				class="back-btn"
				aria-label="Back"
				@click="router.push('/me')"
			>
				<ArrowLeftIcon class="h-5 w-5" />
			</button>
			<h1 class="page-title">Debt Note</h1>
			<span class="header-spacer" />
		</header>

		<div class="monitoring-tabs-wrap">
			<div class="monitoring-tabs">
				<button
					type="button"
					class="monitoring-tab"
					:class="{ active: activeTab === 'borrowed' }"
					@click="activeTab = 'borrowed'"
				>
					Borrowed
				</button>
				<button
					type="button"
					class="monitoring-tab"
					:class="{ active: activeTab === 'lent' }"
					@click="activeTab = 'lent'"
				>
					Lent
				</button>
			</div>
		</div>

		<div class="tab-body">
			<BorrowedPage v-if="activeTab === 'borrowed'" />
			<LentPage v-else />
		</div>
	</div>
</template>

<style scoped>
	.page-shell {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		align-items: stretch;
		gap: 0; 
		padding-top: 1rem;
		max-width: 480px;
		width: 100%;
	}

	.page-header {
		display: flex;
		flex-shrink: 0;
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

	.monitoring-tabs-wrap {
		display: flex;
		justify-content: center;
		padding-top: 1rem;
		padding-bottom: 0.5rem;
		flex-shrink: 0;
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

	.tab-body {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		padding-top: 0.75rem;
		overflow: hidden;
	}
</style>
