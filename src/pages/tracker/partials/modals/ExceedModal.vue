<script setup lang="ts">
	import Button from "../../../../components/button/Button.vue";
	import GlassContainer from "../../../../components/containers/GlassContainer.vue";

	defineProps<{
		show: boolean;
		displayExcess: string;
	}>();

	const emit = defineEmits<{
		close: [];
		proceed: [];
	}>();
</script>

<template>
	<Teleport to="body">
		<div
			v-if="show"
			class="fixed inset-0 z-[80] flex items-center justify-center bg-overlay p-4"
			@click.self="emit('close')"
		>
			<GlassContainer class="flex w-full min-w-0 max-w-[400px] flex-col gap-4">
				<h2 class="m-0 text-center text-lg font-semibold text-textPrimary">
					Budget Exceeded
				</h2>
				<p class="m-0 text-center text-sm text-textSecondary">
					This amount exceeds your allotted budget by
					<span class="font-bold text-textPrimary">{{ displayExcess }}</span>.
				</p>
				<p class="m-0 text-center text-sm text-textSecondary">
					Do you want to proceed?
				</p>
				<div class="flex gap-3">
					<Button block variant="shade" @click="emit('close')">Cancel</Button>
					<Button variant="primary" block @click="emit('proceed')">
						Proceed
					</Button>
				</div>
			</GlassContainer>
		</div>
	</Teleport>
</template>
