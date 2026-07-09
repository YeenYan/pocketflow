<script setup lang="ts">
	import { ref, computed, onMounted, onUnmounted } from "vue";
	import { ChevronDownIcon } from "@heroicons/vue/24/outline";
	import * as OutlineIcons from "@heroicons/vue/24/outline";

	const props = withDefaults(
		defineProps<{
			label: string;
			options: {
				value: string;
				label: string;
				hint?: string;
				icon?: string;
				iconWrapClass?: string;
			}[];
			placeholder?: string;
			disabled?: boolean;
			menuZIndex?: number;
		}>(),
		{ placeholder: "Select", disabled: false, menuZIndex: 50 },
	);

	const model = defineModel<string>({ default: "" });

	const root = ref<HTMLElement | null>(null);
	const menuRef = ref<HTMLElement | null>(null);
	const triggerRef = ref<HTMLButtonElement | null>(null);
	const open = ref(false);
	const query = ref("");
	const menuStyle = ref({ top: "0px", left: "0px", width: "0px" });

	const selectedOption = computed(() =>
		props.options.find((option) => option.value === model.value),
	);

	const filteredOptions = computed(() => {
		const q = query.value.trim().toLowerCase();
		if (!q) return props.options;
		return props.options.filter(
			(option) =>
				option.label.toLowerCase().includes(q) ||
				option.hint?.toLowerCase().includes(q),
		);
	});

	function updateMenuPosition() {
		if (!triggerRef.value) return;
		const rect = triggerRef.value.getBoundingClientRect();
		menuStyle.value = {
			top: `${rect.bottom + 8}px`,
			left: `${rect.left}px`,
			width: `${rect.width}px`,
		};
	}

	function toggleOpen() {
		if (props.disabled) return;
		if (open.value) {
			open.value = false;
			query.value = "";
			return;
		}
		updateMenuPosition();
		open.value = true;
	}

	function selectOption(value: string) {
		model.value = value;
		open.value = false;
		query.value = "";
	}

	function onDocumentClick(event: MouseEvent) {
		const target = event.target as Node;
		if (root.value?.contains(target) || menuRef.value?.contains(target)) return;
		open.value = false;
		query.value = "";
	}

	onMounted(() => document.addEventListener("click", onDocumentClick));
	onUnmounted(() => document.removeEventListener("click", onDocumentClick));

	function iconComponent(name?: string) {
		if (!name) return null;
		return OutlineIcons[name as keyof typeof OutlineIcons] ?? null;
	}
</script>

<template>
	<div ref="root" class="field">
		<span class="label">{{ label }}</span>
		<button
			ref="triggerRef"
			type="button"
			class="trigger"
			:class="{ open, disabled }"
			:disabled="disabled"
			@click.stop="toggleOpen"
		>
			<span class="trigger-content">
				<span
					v-if="selectedOption?.icon && iconComponent(selectedOption.icon)"
					class="icon-wrap"
					:class="selectedOption.iconWrapClass"
				>
					<component
						:is="iconComponent(selectedOption.icon)"
						class="option-icon-inner"
					/>
				</span>
				<span class="trigger-text" :class="{ placeholder: !selectedOption }">
					{{ selectedOption?.label ?? placeholder }}
				</span>
			</span>
			<ChevronDownIcon class="arrow" :class="{ open }" />
		</button>

		<Teleport to="body">
			<div
				v-if="open"
				ref="menuRef"
				class="menu"
				:style="{ ...menuStyle, zIndex: menuZIndex }"
				@click.stop
			>
				<input
					v-model="query"
					type="text"
					class="menu-input"
					:placeholder="placeholder"
				/>
				<div class="menu-divider" />
				<ul class="menu-list">
					<li v-for="option in filteredOptions" :key="option.value">
						<button
							type="button"
							class="option flex items-center gap-3"
							:class="{ selected: option.value === model }"
							@click="selectOption(option.value)"
						>
							<span
								v-if="option.icon && iconComponent(option.icon)"
								class="icon-wrap"
								:class="option.iconWrapClass"
							>
								<component
									:is="iconComponent(option.icon)"
									class="option-icon-inner"
								/>
							</span>
							<span class="option-text">
								<span class="option-label">{{ option.label }}</span>
							</span>
						</button>
					</li>
					<li v-if="filteredOptions.length === 0" class="empty">No results</li>
				</ul>
			</div>
		</Teleport>
	</div>
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

	.trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		padding: 0.875rem 1.25rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		background: transparent;
		color: var(--color-inputText);
		font-size: 1rem;
		font-family: inherit;
		outline: none;
		cursor: pointer;
		text-align: left;
	}

	.trigger.open,
	.trigger:focus-visible {
		border-color: var(--color-textSecondary);
	}

	.trigger.disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.trigger-text.placeholder {
		color: var(--color-textSecondary);
	}

	.trigger-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.icon-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.375rem;
		flex-shrink: 0;
	}

	.option-icon-inner {
		width: 1.25rem;
		height: 1.25rem;
	}

	.arrow {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		color: var(--color-textSecondary);
		transition: transform 0.2s ease;
	}

	.arrow.open {
		transform: rotate(180deg);
	}

	.menu {
		position: fixed;
		z-index: 50;
		display: flex;
		flex-direction: column;
		max-height: min(16rem, calc(100dvh - 2rem));
		border-radius: 1rem;
		border: 1px solid var(--color-inputBorder);
		background: var(--color-surface);
		box-shadow: var(--shadow-md);
		overflow: hidden;
	}

	.menu-input {
		width: 100%;
		padding: 0.875rem 1rem;
		border: none;
		background: transparent;
		color: var(--color-inputText);
		font-size: 1rem;
		font-family: inherit;
		outline: none;
	}

	.menu-input::placeholder {
		color: var(--color-textSecondary);
	}

	.menu-divider {
		height: 1px;
		background: var(--color-inputBorder);
	}

	.menu-list {
		list-style: none;
		margin: 0;
		padding: 0.25rem 0;
		overflow-y: auto;
	}

	.option {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 0.75rem 1rem;
		border: none;
		background: transparent;
		font-family: inherit;
		text-align: left;
		cursor: pointer;
	}

	.option:hover,
	.option.selected {
		background: var(--color-surfaceHover);
	}

	.option-text {
		font-size: 1rem;
		font-weight: 600;
	}

	.option-label {
		color: var(--color-textPrimary);
	}

	.option-hint {
		color: var(--color-accent);
	}

	.empty {
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		color: var(--color-textSecondary);
	}
</style>
