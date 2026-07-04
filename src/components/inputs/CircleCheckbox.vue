<script setup lang="ts">
defineProps<{ label: string }>();

const model = defineModel<boolean>({ default: false });
</script>

<template>
	<label class="circle-check">
		<input v-model="model" type="checkbox" class="sr-only" />
		<span class="circle" :class="{ checked: model }" />
		<span class="text">{{ label }}</span>
	</label>
</template>

<style scoped>
	.circle-check {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		user-select: none;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	.circle {
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		border: 2px solid var(--color-inputBorder);
		flex-shrink: 0;
		transition:
			border-color 0.15s,
			background 0.15s;
	}

	.circle.checked {
		border-color: var(--color-accentSolid);
		background: var(--color-accentSolid);
		box-shadow: inset 0 0 0 3px var(--color-bg);
	}

	.text {
		font-size: 0.95rem;
		color: var(--color-textPrimary);
	}
</style>
