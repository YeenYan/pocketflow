<script setup lang="ts">
	import GlassContainer from "../../components/containers/GlassContainer.vue";
</script>

<template>
	<div class="page-shell">
		<GlassContainer class="page">
			<h1 class="title">Reports</h1>
		</GlassContainer>
	</div>
</template>

<style scoped>
	.page-shell {
		display: flex;
		flex: 1;
		min-height: 0;
		align-items: flex-start;
		justify-content: flex-start;
		padding-top: 1rem;
	}

	.page {
		max-width: 480px;
		width: 100%;
		text-align: center;
	}

	.title {
		font-size: clamp(1.25rem, 5vw, 1.75rem);
		margin: 0;
		color: var(--color-textPrimary);
	}
</style>
