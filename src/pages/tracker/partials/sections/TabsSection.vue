<script setup lang="ts">
	import type { RuleName } from "../../../../db/budgetDb";

	defineProps<{
		tabs: RuleName[];
		activeTab: RuleName;
	}>();

	const emit = defineEmits<{
		"update:activeTab": [tab: RuleName];
	}>();
</script>

<template>
	<div class="mt-4 mb-4 flex w-full shrink-0 gap-2">
		<button
			v-for="tab in tabs"
			:key="tab"
			type="button"
			class="tab"
			:class="{ active: activeTab === tab }"
			@click="emit('update:activeTab', tab)"
		>
			{{ tab }}
		</button>
	</div>
</template>

<style scoped>
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
		background: var(--gradient-fill);
		color: #ffffff;
	}

	:global(.dark) .tab.active {
		background: var(--color-textPrimary);
		color: var(--color-bg);
	}
</style>
