<script setup lang="ts">
	defineProps<{
		periodLabel: string;
		canGoPrev: boolean;
		canGoNext: boolean;
	}>();

	defineEmits<{
		prev: [];
		next: [];
	}>();
</script>

<template>
	<div class="mb-3 flex shrink-0 items-center justify-center">
		<span class="text-center text-base font-semibold text-textPrimary">
			{{ periodLabel }}
		</span>
	</div>
</template>
