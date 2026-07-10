<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		label: string
		placeholder?: string
		mode?: 'text' | 'number' | 'both'
		disabled?: boolean
	}>(),
	{ placeholder: '', mode: 'both', disabled: false },
)

const model = defineModel<string>({ default: '' })

function onInput(event: Event) {
	const el = event.target as HTMLInputElement
	let value = el.value

	if (props.mode === 'number') {
		value = value.replace(/\D/g, '')
	} else if (props.mode === 'text') {
		value = value.replace(/[0-9]/g, '')
	}

	model.value = value
	el.value = value
}
</script>

<template>
	<label class="field">
		<span class="label">{{ label }}</span>
		<input
			:value="model"
			type="text"
			class="input"
			:placeholder="placeholder"
			:disabled="disabled"
			:inputmode="mode === 'number' ? 'numeric' : 'text'"
			@input="onInput"
		/>
	</label>
</template>

<style scoped>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.label {
		font-size: 1rem;
		color: var(--color-textPrimary);
	}

	.input {
		width: 100%;
		padding: 0.875rem 1.25rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		background: var(--color-inputBg);
		color: var(--color-inputText);
		font-size: 1rem;
		font-family: inherit;
		outline: none;
	}

	.input::placeholder {
		color: var(--color-textSecondary);
	}

	.input:focus {
		border-color: var(--color-textSecondary);
	}

	.input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
