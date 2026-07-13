<script setup lang="ts">
const model = defineModel<boolean>({ default: false });

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });

const emit = defineEmits<{ change: [] }>();

const inputId = `toggle-${Math.random().toString(36).slice(2, 9)}`;

function onChange() {
	emit("change");
}
</script>

<template>
	<div class="container">
		<input
			:id="inputId"
			v-model="model"
			type="checkbox"
			class="checkbox"
			:disabled="disabled"
			@change="onChange"
		/>
		<label class="switch" :for="inputId">
			<span class="slider"></span>
		</label>
	</div>
</template>

<style scoped>
	.container {
		width: 51px;
		height: 31px;
		position: relative;
		flex-shrink: 0;
	}

	.checkbox {
		opacity: 0;
		width: 0;
		height: 0;
		position: absolute;
	}

	.switch {
		width: 100%;
		height: 100%;
		display: block;
		background-color: #e9e9eb;
		border-radius: 16px;
		cursor: pointer;
		transition: all 0.2s ease-out;
	}

	.slider {
		width: 27px;
		height: 27px;
		position: absolute;
		left: calc(50% - 27px / 2 - 10px);
		top: calc(50% - 27px / 2);
		border-radius: 50%;
		background: #ffffff;
		box-shadow:
			0 3px 8px rgba(0, 0, 0, 0.15),
			0 3px 1px rgba(0, 0, 0, 0.06);
		transition: all 0.2s ease-out;
		cursor: pointer;
	}

	.checkbox:checked + .switch {
		background-color: #34c759;
	}

	:global(:root:not(.dark)) .checkbox:checked + .switch {
		background-color: var(--color-primary);
	}

	.checkbox:checked + .switch .slider {
		left: calc(50% - 27px / 2 + 10px);
		top: calc(50% - 27px / 2);
	}

	.checkbox:disabled + .switch {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
