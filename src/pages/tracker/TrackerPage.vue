<script setup lang="ts">
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import FadeIn from "../../components/containers/FadeIn.vue";
</script>

<template>
	<div class="page-shell">
		<GlassContainer class="page">
			<FadeIn :delay="0">
				<h1 class="title">Tracker</h1>
			</FadeIn>
		</GlassContainer>
	</div>
</template>

<style scoped>
	.page-shell {
		display: flex;
		flex: 1;
		min-height: 0;
		align-items: center;
		justify-content: center;
		overflow: hidden;
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
