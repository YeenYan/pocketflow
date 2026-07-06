<script setup lang="ts">
	import { PlusIcon, PencilIcon } from "@heroicons/vue/24/outline";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";

	defineProps<{
		budgetTitle: string;
		displayCutoffDate: string;
		displayAmount: string;
		displaySpent: string;
		progressPercent: number;
		hasCutoff: boolean;
		progressFillColor: (percent: number) => string;
	}>();

	const emit = defineEmits<{
		openModal: [];
	}>();
</script>

<template>
	<GlassContainer class="relative mt-[1rem]">
		<GlassContainer
			as="button"
			type="button"
			rounded="full"
			:padding="false"
			class="plus-btn absolute right-[.6rem] top-[.6rem]"
			:aria-label="hasCutoff ? 'Edit cutoff' : 'Add cutoff'"
			@click="emit('openModal')"
		>
			<PencilIcon v-if="hasCutoff" class="h-5 w-5" />
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
		<div class="flex items-center justify-between mb-[.]">
			<p class="mt-[0.35rem] mb-0 text-[0.85rem] text-textSecondary">
				{{ displaySpent }}
			</p>
			<p class="progress-pct">{{ progressPercent }}%</p>
		</div>
		<div class="progress-track">
			<div
				class="progress-fill"
				:style="{
					width: progressPercent + '%',
					background: progressFillColor(progressPercent),
				}"
			/>
		</div>
	</GlassContainer>
</template>

<style scoped>
	@import "./shared.css";
</style>
