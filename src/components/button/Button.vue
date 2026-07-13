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
		background: rgb(101 0 0 / 0.08);
		border-color: rgb(101 0 0 / 0.14);
		color: var(--color-textPrimary);
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.45);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	:global(.dark) .btn.shade {
		background: rgb(212 140 106 / 0.1);
		border-color: rgb(255 208 176 / 0.18);
		box-shadow: inset 0 1px 0 rgb(255 208 176 / 0.12);
		color: var(--color-textPrimary);
	}

	.btn.primary {
		background-image: var(--gradient-fill);
		color: var(--color-onColor);
		border-color: rgb(101 0 0 / 0.35);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.18),
			0 4px 14px rgb(101 0 0 / 0.22);
	}

	:global(.dark) .btn.primary {
		background-image: var(--gradient-fill);
		border-color: rgb(212 140 106 / 0.4);
		box-shadow: inset 0 1px 0 rgb(255 208 176 / 0.22);
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
