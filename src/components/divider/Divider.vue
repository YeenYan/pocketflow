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
		height: 0.8px;
		margin-left: auto;
		margin-right: auto;
		background: var(--color-inputBorder);
		opacity: 0.7;
	}
</style>
