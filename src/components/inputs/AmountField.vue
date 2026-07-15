<script setup lang="ts">
import { computed, nextTick } from 'vue'

withDefaults(
	defineProps<{
		label: string
		placeholder?: string
		disabled?: boolean
	}>(),
	{ placeholder: '0', disabled: false },
)

const model = defineModel<string>({ default: '' })

function formatWithCommas(raw: string) {
	if (!raw) return ''
	const parts = raw.split('.')
	const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
	if (parts.length > 1) return `${intPart}.${parts[1]}`
	return intPart
}

const displayValue = computed(() => formatWithCommas(model.value))

function onInput(event: Event) {
	const el = event.target as HTMLInputElement
	const cursor = el.selectionStart ?? el.value.length
	const digitsBeforeCursor = el.value
		.slice(0, cursor)
		.replace(/[^\d.]/g, '').length

	let value = el.value.replace(/[^\d.]/g, '')
	const parts = value.split('.')
	if (parts.length > 2) {
		value = `${parts[0]}.${parts.slice(1).join('')}`
	}

	model.value = value

	nextTick(() => {
		const formatted = formatWithCommas(value)
		let pos = 0
		let digits = 0
		while (pos < formatted.length && digits < digitsBeforeCursor) {
			if (/[\d.]/.test(formatted[pos]!)) digits++
			pos++
		}
		el.setSelectionRange(pos, pos)
	})
}
</script>

<template>
	<label class="field">
		<span class="label">{{ label }}</span>
		<div class="input-wrap">
			<span class="peso">₱</span>
			<input
				:value="displayValue"
				type="text"
				class="input"
				:placeholder="placeholder"
				:disabled="disabled"
				inputmode="decimal"
				@input="onInput"
			/>
		</div>
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

	.input-wrap {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		width: 100%;
		padding: 0.875rem 1.25rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		background: var(--color-inputBg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.2);
	}

	.input-wrap:focus-within {
		border-color: var(--color-textSecondary);
	}

	.peso {
		font-size: 1rem;
		color: var(--color-textSecondary);
		flex-shrink: 0;
	}

	.input {
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		color: var(--color-inputText);
		font-size: 1rem;
		font-family: inherit;
		outline: none;
	}

	.input::placeholder {
		color: var(--color-textSecondary);
	}

	.input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
