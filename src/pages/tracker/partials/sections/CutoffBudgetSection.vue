<script setup lang="ts">
	import { ref } from "vue";
	import {
		PlusIcon,
		PencilIcon,
		EyeIcon,
		EyeSlashIcon,
	} from "@heroicons/vue/24/outline";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";

	defineProps<{
		budgetTitle: string;
		displayCutoffDate: string;
		displayAmount: string;
		displayAmountDetail: string;
		displaySpendBudget: string;
		displaySpent: string;
		progressPercent: number;
		hasCutoff: boolean;
		progressFillColor: (percent: number) => string;
	}>();

	const emit = defineEmits<{
		openModal: [];
	}>();

	const hideAmount = ref(true);
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
		<div class="amount-row">
			<p class="mt-2 mb-0 text-[1.8rem] font-bold text-textPrimary">
				{{ hideAmount ? "••••••" : displayAmount }}
			</p>
			<button
				type="button"
				class="balance-eye-btn"
				aria-label="Toggle allotted budget visibility"
				@click="hideAmount = !hideAmount"
			>
				<EyeSlashIcon v-if="hideAmount" class="balance-eye-icon" />
				<EyeIcon v-else class="balance-eye-icon" />
			</button>
			<p v-if="!hideAmount && displayAmountDetail" class="amount-detail">
				{{ displayAmountDetail }}
			</p>
		</div>
		<div class="flex items-center justify-between mb-[.]">
			<p class="text-[0.85rem] text-textSecondary">
				Budget:
				<span class="text-textPrimary font-bold text-[.95rem]">{{
					hideAmount ? "••••••" : displaySpendBudget
				}}</span>
			</p>
			<div class="flex items-center justify-end gap-2">
				<p class="text-textPrimary font-bold text-[.95rem]">
					{{ displaySpent }}
				</p>
				<p class="progress-pct">( {{ progressPercent }}% ) spent</p>
			</div>
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

	.amount-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem 0.5rem;
	}

	.amount-detail {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-textSecondary);
	}

	.balance-eye-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem;
		border: none;
		background: none;
		color: var(--color-textSecondary);
		cursor: pointer;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.balance-eye-btn:hover {
		background: var(--color-surfaceHover);
	}

	.balance-eye-icon {
		width: 1.15rem;
		height: 1.15rem;
	}
</style>
