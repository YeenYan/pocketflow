<script setup lang="ts">
	withDefaults(
		defineProps<{
			marginTop?: string;
			marginBottom?: string;
		}>(),
		{
			marginTop: "1.5rem",
			marginBottom: "1.5rem",
		},
	);
</script>

<template>
	<div class="divider" :style="{ marginTop, marginBottom }" />
</template>

<style scoped>
	.divider {
		width: 80%;
		height: 1px;
		min-height: 1px;
		flex-shrink: 0;
		margin-left: auto;
		margin-right: auto;
		background: color-mix(in srgb, var(--color-inputBorder) 40%, transparent);
	}
</style>
