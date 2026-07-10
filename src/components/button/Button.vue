<script setup lang="ts">
	type ButtonVariant = "primary" | "shade" | "secondary" | "danger";
	type ButtonSize = "md" | "sm";

	withDefaults(
		defineProps<{
			variant?: ButtonVariant;
			size?: ButtonSize;
			type?: "button" | "submit" | "reset";
			disabled?: boolean;
			block?: boolean;
		}>(),
		{
			variant: "shade",
			size: "md",
			type: "button",
			disabled: false,
			block: false,
		},
	);
</script>

<template>
	<button
		:type="type"
		class="btn"
		:class="[variant, size, { block }]"
		:disabled="disabled"
	>
		<slot />
	</button>
</template>

<style scoped>
	.btn {
		padding: 0.75rem 1.25rem;
		border-radius: 9999px;
		border: 1px solid transparent;
		font-size: 0.95rem;
		font-family: inherit;
		cursor: pointer;
	}

	.btn.block {
		flex: 1;
	}

	.btn.shade {
		background: rgb(148 163 184 / 0.2);
		border-color: rgb(148 163 184 / 0.35);
		color: var(--color-textPrimary);
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.35);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	:global(.dark) .btn.shade {
		background: rgb(148 163 184 / 0.12);
		border-color: rgb(255 255 255 / 0.14);
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.18);
		color: var(--color-textPrimary);
	}

	.btn.primary {
		background-image: var(--gradient-fill);
		color: var(--color-onColor);
		border-color: rgb(147 197 253 / 0.45);
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.35);
	}

	:global(.dark) .btn.primary {
		background-image: var(--gradient-fill);
		border-color: rgb(147 197 253 / 0.35);
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.28);
	}

	.btn.secondary {
		border-color: var(--color-textPrimary);
		background: transparent;
		color: var(--color-textPrimary);
	}

	.btn.danger {
		background: #f87171;
		color: #fff;
	}

	.btn.sm {
		padding: 0.6rem 1rem;
		font-size: 0.875rem;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
