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
		background: var(--color-surface);
		border-color: var(--color-border);
		color: var(--color-textPrimary);
		box-shadow: var(--shadow-sm);
	}

	:global(.dark) .btn.shade {
		background: rgb(148 163 184 / 0.14);
		border-color: transparent;
		box-shadow: none;
		color: var(--color-textPrimary);
	}

	.btn.primary {
		background-color: var(--color-primaryDark);
		background-image: var(--gradient-fill);
		color: var(--color-onColor);
	}

	:global(.dark) .btn.primary {
		background-image: none;
		background-color: var(--color-primaryDark);
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
