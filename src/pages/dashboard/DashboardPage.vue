<script setup lang="ts">
	import { ref } from "vue";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import InputField from "../../components/inputs/InputField.vue";
	import AmountField from "../../components/inputs/AmountField.vue";
	import SelectField from "../../components/inputs/SelectField.vue";

	const fullName = ref("Md.Abdur Rob");
	const age = ref("");
	const username = ref("");
	const amount = ref("");
	const category = ref("");

	const categories = [
		{ value: "food", label: "Food", hint: "Groceries" },
		{ value: "transport", label: "Transport", hint: "Commute" },
		{ value: "bills", label: "Bills", hint: "Utilities" },
		{ value: "health", label: "Health", hint: "Medical" },
		{ value: "shopping", label: "Shopping", hint: "Retail" },
		{ value: "entertainment", label: "Entertainment", hint: "Leisure" },
	];
</script>

<template>
	<div class="page-shell">
		<GlassContainer class="page">
			<div class="fields">
				<InputField v-model="age" label="Age" mode="number" placeholder="0" />
				<InputField
					v-model="username"
					label="Username"
					mode="both"
					placeholder="user123"
				/>
				<AmountField v-model="amount" label="Amount" placeholder="0.00" />
				<SelectField
					v-model="category"
					label="Category"
					:options="categories"
					placeholder="Choose category"
				/>
			</div>
		</GlassContainer>
	</div>
</template>

<style scoped>
	.page-shell {
		display: flex;
		flex: 1;
		min-height: 0;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.page {
		max-width: 480px;
		width: 100%;
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
