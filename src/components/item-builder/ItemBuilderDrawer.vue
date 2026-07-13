<script setup lang="ts">
	import { computed, ref, watch } from "vue";
	import {
		XMarkIcon,
		ArrowsPointingOutIcon,
		ArrowsPointingInIcon,
	} from "@heroicons/vue/24/outline";
	import * as OutlineIcons from "@heroicons/vue/24/outline";
	import Button from "../button/Button.vue";
	import GlassContainer from "../containers/GlassContainer.vue";
	import InputField from "../inputs/InputField.vue";
	import AmountField from "../inputs/AmountField.vue";
	import ToggleSwitch from "../inputs/ToggleSwitch.vue";
	import CircleCheckbox from "../inputs/CircleCheckbox.vue";
	import type { ItemBuilder, RuleName } from "../../db/budgetDb";

	export type ItemBuilderFormData = {
		name: string;
		categories: RuleName[];
		isActive: boolean;
		hasChildItems: boolean;
		icon: string;
		color: string;
		hasTarget: boolean;
		targetAmount: number;
	};

	const ICON_OPTIONS = Object.keys(OutlineIcons).filter((key) =>
		key.endsWith("Icon"),
	);

	const ITEM_COLOR_OPTIONS = [
		{ value: "slate-500", swatch: "bg-slate-500" },
		{ value: "gray-500", swatch: "bg-gray-500" },
		{ value: "zinc-500", swatch: "bg-zinc-500" },
		{ value: "neutral-500", swatch: "bg-neutral-500" },
		{ value: "stone-500", swatch: "bg-stone-500" },
		{ value: "red-500", swatch: "bg-red-500" },
		{ value: "orange-500", swatch: "bg-orange-500" },
		{ value: "amber-500", swatch: "bg-amber-500" },
		{ value: "yellow-500", swatch: "bg-yellow-500" },
		{ value: "lime-500", swatch: "bg-lime-500" },
		{ value: "green-500", swatch: "bg-green-500" },
		{ value: "emerald-500", swatch: "bg-emerald-500" },
		{ value: "teal-500", swatch: "bg-teal-500" },
		{ value: "cyan-500", swatch: "bg-cyan-500" },
		{ value: "sky-500", swatch: "bg-sky-500" },
		{ value: "blue-500", swatch: "bg-blue-500" },
		{ value: "indigo-500", swatch: "bg-indigo-500" },
		{ value: "violet-500", swatch: "bg-violet-500" },
		{ value: "purple-500", swatch: "bg-purple-500" },
		{ value: "fuchsia-500", swatch: "bg-fuchsia-500" },
		{ value: "pink-500", swatch: "bg-pink-500" },
		{ value: "rose-500", swatch: "bg-rose-500" },
		{ value: "slate-700", swatch: "bg-slate-700" },
		{ value: "gray-700", swatch: "bg-gray-700" },
		{ value: "red-700", swatch: "bg-red-700" },
		{ value: "orange-700", swatch: "bg-orange-700" },
		{ value: "amber-700", swatch: "bg-amber-700" },
		{ value: "yellow-700", swatch: "bg-yellow-700" },
		{ value: "green-700", swatch: "bg-green-700" },
		{ value: "teal-700", swatch: "bg-teal-700" },
		{ value: "blue-700", swatch: "bg-blue-700" },
		{ value: "indigo-700", swatch: "bg-indigo-700" },
		{ value: "purple-700", swatch: "bg-purple-700" },
		{ value: "pink-700", swatch: "bg-pink-700" },
		{ value: "rose-700", swatch: "bg-rose-700" },
	];

	const DEFAULT_ITEM_COLOR = "emerald-500";

	const open = defineModel<boolean>("open", { default: false });

	const props = withDefaults(
		defineProps<{
			item?: ItemBuilder | null;
			catExpenses?: boolean;
			catSavings?: boolean;
			catWants?: boolean;
			saving?: boolean;
		}>(),
		{
			item: null,
			catExpenses: true,
			catSavings: false,
			catWants: false,
			saving: false,
		},
	);

	const emit = defineEmits<{
		save: [data: ItemBuilderFormData];
	}>();

	const formName = ref("");
	const formCatExpenses = ref(false);
	const formCatSavings = ref(false);
	const formCatWants = ref(false);
	const formIsActive = ref(true);
	const formHasChildItems = ref(false);
	const formHasTarget = ref(false);
	const formTargetAmount = ref("");
	const formIcon = ref("HomeIcon");
	const formColor = ref(DEFAULT_ITEM_COLOR);
	const formError = ref("");
	const iconExpanded = ref(false);

	const isEditing = computed(() => !!props.item);

	const isSavingsOnly = computed(
		() => formCatSavings.value && !formCatExpenses.value && !formCatWants.value,
	);

	const formUnchanged = computed(() => {
		const item = props.item;
		if (!item) return false;
		const targetAmount = formHasTarget.value ? Number(formTargetAmount.value) : 0;
		return (
			formName.value.trim() === item.name &&
			formCatExpenses.value === item.categories.includes("Expenses") &&
			formCatSavings.value === item.categories.includes("Savings") &&
			formCatWants.value === item.categories.includes("Wants") &&
			formIsActive.value === item.isActive &&
			formHasChildItems.value === item.hasChildItems &&
			formHasTarget.value === !!item.hasTarget &&
			targetAmount === (item.targetAmount ?? 0) &&
			formIcon.value === (item.icon ?? "HomeIcon") &&
			formColor.value === (item.color ?? DEFAULT_ITEM_COLOR)
		);
	});

	const canSave = computed(() => {
		if (props.saving) return false;
		if (isEditing.value) return !formUnchanged.value;
		return true;
	});

	function resetForm() {
		formName.value = "";
		formCatExpenses.value = props.catExpenses;
		formCatSavings.value = props.catSavings;
		formCatWants.value = props.catWants;
		formIsActive.value = true;
		formHasChildItems.value = false;
		formHasTarget.value = false;
		formTargetAmount.value = "";
		formIcon.value = "HomeIcon";
		formColor.value = DEFAULT_ITEM_COLOR;
		formError.value = "";
	}

	function loadItem(item: ItemBuilder) {
		formName.value = item.name;
		formCatExpenses.value = item.categories.includes("Expenses");
		formCatSavings.value = item.categories.includes("Savings");
		formCatWants.value = item.categories.includes("Wants");
		formIsActive.value = item.isActive;
		formHasChildItems.value = item.hasChildItems;
		formHasTarget.value = !!item.hasTarget;
		formTargetAmount.value =
			item.hasTarget && item.targetAmount ? String(item.targetAmount) : "";
		formIcon.value = item.icon ?? "HomeIcon";
		formColor.value = item.color ?? DEFAULT_ITEM_COLOR;
		formError.value = "";
	}

	watch(open, (isOpen) => {
		if (!isOpen) {
			formError.value = "";
			iconExpanded.value = false;
			return;
		}
		if (props.item) loadItem(props.item);
		else resetForm();
	});

	watch(isSavingsOnly, (savingsOnly) => {
		if (!savingsOnly) {
			formHasTarget.value = false;
			formTargetAmount.value = "";
		}
	});

	function close() {
		open.value = false;
	}

	function save() {
		const name = formName.value.trim();
		const categories: RuleName[] = [];
		if (formCatExpenses.value) categories.push("Expenses");
		if (formCatSavings.value) categories.push("Savings");
		if (formCatWants.value) categories.push("Wants");

		if (!name) {
			formError.value = "Enter item name";
			return;
		}
		if (categories.length === 0) {
			formError.value = "Select at least one category";
			return;
		}

		const hasTarget = isSavingsOnly.value && formHasTarget.value;
		const targetAmount = hasTarget ? Number(formTargetAmount.value) : 0;
		if (
			hasTarget &&
			(!formTargetAmount.value || Number.isNaN(targetAmount) || targetAmount <= 0)
		) {
			formError.value = "Enter a valid target amount";
			return;
		}

		emit("save", {
			name,
			categories,
			isActive: formIsActive.value,
			hasChildItems: formHasChildItems.value,
			icon: formIcon.value,
			color: formColor.value,
			hasTarget,
			targetAmount: hasTarget ? targetAmount : 0,
		});
	}
</script>

<template>
	<Teleport to="body">
		<div v-if="open" class="drawer-overlay" @click.self="close">
			<GlassContainer class="drawer-sheet">
				<div>
					<div class="drawer-handle" />

					<div class="drawer-header">
						<h2 class="drawer-title">
							{{ isEditing ? "Edit Item" : "Create New Item" }}
						</h2>
						<button
							type="button"
							class="drawer-close"
							aria-label="Close"
							@click="close"
						>
							<XMarkIcon class="h-5 w-5" />
						</button>
					</div>

					<div class="grid gap-5 overflow-y-scroll max-h-[90dvh] pb-[8rem]">
						<template v-if="!iconExpanded">
							<InputField
								v-model="formName"
								label="Name"
								placeholder="Item name"
								mode="both"
							/>

							<div class="subtitle-divider">
								<span>Categories</span>
							</div>

							<div class="category-row">
								<CircleCheckbox v-model="formCatExpenses" label="Expenses" />
								<CircleCheckbox v-model="formCatSavings" label="Savings" />
								<CircleCheckbox v-model="formCatWants" label="Wants" />
							</div>

							<div class="subtitle-divider">
								<span>Settings</span>
							</div>

							<div class="toggle-row">
								<span>Active</span>
								<ToggleSwitch v-model="formIsActive" />
							</div>
							<div class="toggle-row">
								<span>Have child items</span>
								<ToggleSwitch v-model="formHasChildItems" />
							</div>
							<template v-if="isSavingsOnly">
								<div class="toggle-row">
									<span>Have target / Goal</span>
									<ToggleSwitch v-model="formHasTarget" />
								</div>
								<AmountField
									v-if="formHasTarget"
									v-model="formTargetAmount"
									label="Target Amount"
									placeholder="0.00"
								/>
							</template>
						</template>

						<template v-if="!iconExpanded">
							<div class="section-row">
								<div class="subtitle-divider section-divider">
									<span>Color</span>
								</div>
							</div>

							<div class="color-grid">
								<button
									v-for="color in ITEM_COLOR_OPTIONS"
									:key="color.value"
									type="button"
									class="color-btn"
									:class="{ selected: formColor === color.value }"
									:title="color.value"
									@click="formColor = color.value"
								>
									<span class="color-swatch" :class="color.swatch" />
								</button>
							</div>
						</template>

						<div class="section-row">
							<div class="subtitle-divider section-divider">
								<span>Icon</span>
							</div>
							<button
								type="button"
								class="expand-btn"
								:aria-label="iconExpanded ? 'Minimize icons' : 'Maximize icons'"
								@click="iconExpanded = !iconExpanded"
							>
								<ArrowsPointingInIcon v-if="iconExpanded" class="h-4 w-4" />
								<ArrowsPointingOutIcon v-else class="h-4 w-4" />
							</button>
						</div>

						<div class="icon-grid" :class="{ expanded: iconExpanded }">
							<button
								v-for="iconName in ICON_OPTIONS"
								:key="iconName"
								type="button"
								class="icon-btn"
								:class="{ selected: formIcon === iconName }"
								:title="iconName"
								@click="formIcon = iconName"
							>
								<component
									:is="OutlineIcons[iconName as keyof typeof OutlineIcons]"
									class="h-5 w-5"
								/>
							</button>
						</div>

						<p v-if="formError" class="form-error">{{ formError }}</p>

						<div class="drawer-actions">
							<Button block variant="shade" @click="close">Cancel</Button>
							<Button variant="primary" block :disabled="!canSave" @click="save">
								{{ isEditing ? "Update" : "Save" }}
							</Button>
						</div>
					</div>
				</div>
			</GlassContainer>
		</div>
	</Teleport>
</template>

<style scoped>
	.drawer-overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		background: var(--color-overlay);
	}

	.drawer-sheet {
		display: flex;
		width: 100%;
		max-width: 480px;
		max-height: 90dvh;
		flex-direction: column;
		gap: 1rem;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		border-top-left-radius: 1.25rem;
		border-top-right-radius: 1.25rem;
		padding-bottom: 1.5rem;
		animation: drawer-up 0.28s ease-out;
	}

	.drawer-handle {
		width: 2.5rem;
		height: 0.25rem;
		margin: 0 auto;
		border-radius: 9999px;
		background: var(--color-inputBorder);
	}

	.drawer-header {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0;
		background: var(--color-surface);
	}

	.drawer-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.drawer-close {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		border: none;
		border-radius: 50%;
		background: var(--color-inputBorder);
		color: var(--color-textPrimary);
		cursor: pointer;
	}

	.category-row {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		color: var(--color-textPrimary);
	}

	.subtitle-divider {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.subtitle-divider::before,
	.subtitle-divider::after {
		content: "";
		flex: 1;
		height: 1px;
		background: var(--color-border);
	}

	.section-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.section-divider {
		flex: 1;
		min-width: 0;
	}

	.expand-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem;
		border: none;
		border-radius: 0.375rem;
		background: transparent;
		color: var(--color-textSecondary);
		cursor: pointer;
		flex-shrink: 0;
	}

	.icon-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(2.5rem, 1fr));
		gap: 0.5rem;
		max-height: calc((90dvh - 10rem) / 4);
		min-height: 15rem;
		overflow-y: auto;
		padding: 0.25rem;
	}

	.icon-grid.expanded {
		max-height: calc(90dvh - 10rem);
	}

	.color-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.4rem;
		padding: 0.25rem;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: transparent;
		color: var(--color-textPrimary);
		cursor: pointer;
	}

	.icon-btn.selected {
		border-color: var(--color-accentSolid);
		background: var(--color-accentSolid);
		color: var(--color-onColor);
	}

	.color-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem;
		border: 2px solid transparent;
		border-radius: 9999px;
		background: transparent;
		cursor: pointer;
	}

	.color-btn.selected {
		border-color: var(--color-textPrimary);
	}

	.color-swatch {
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
	}

	.form-error {
		margin: 0;
		text-align: center;
		font-size: 0.875rem;
		color: #f87171;
	}

	.drawer-actions {
		display: flex;
		gap: 0.75rem;
	}

	@keyframes drawer-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
</style>
