<script setup lang="ts">
	import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";

	defineProps<{
		periodLabel: string;
		canGoPrev: boolean;
		canGoNext: boolean;
	}>();

	const emit = defineEmits<{
		prev: [];
		next: [];
	}>();
</script>

<template>
	<div class="mb-3 flex shrink-0 items-center justify-between">
		<GlassContainer
			as="button"
			type="button"
			rounded="full"
			:padding="false"
			class="period-btn"
			:class="{ disabled: !canGoPrev }"
			aria-label="Previous period"
			:disabled="!canGoPrev"
			@click="emit('prev')"
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
			@click="emit('next')"
		>
			<ChevronRightIcon class="h-5 w-5" />
		</GlassContainer>
	</div>
</template>

<style scoped>
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
</style>
