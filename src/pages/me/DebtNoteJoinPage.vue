<script setup lang="ts">
	import { onMounted, ref } from "vue";
	import { useRoute, useRouter } from "vue-router";
	import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import InputField from "../../components/inputs/InputField.vue";
	import Button from "../../components/button/Button.vue";
	import { claimDebtInvite } from "../../firebase";

	const route = useRoute();
	const router = useRouter();

	const inviteCode = ref("");
	const error = ref("");
	const joining = ref(false);

	onMounted(() => {
		const code = String(route.query.code ?? "");
		if (code) inviteCode.value = code.toUpperCase();
	});

	async function joinDebt() {
		error.value = "";
		joining.value = true;
		try {
			const note = await claimDebtInvite(inviteCode.value);
			router.replace(`/me/debt-note/${note.id}`);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Could not join this debt.";
		} finally {
			joining.value = false;
		}
	}
</script>

<template>
	<div class="page-shell">
		<header class="page-header mt-[-1rem]">
			<button
				type="button"
				class="back-btn"
				aria-label="Back"
				@click="router.push('/me/debt-note')"
			>
				<ArrowLeftIcon class="h-5 w-5" />
			</button>
			<h1 class="page-title">Join Debt</h1>
			<span class="header-spacer" />
		</header>

		<div class="body">
			<p class="hint">
				Enter the invite code from the lender, or open a shared QR link.
			</p>
			<GlassContainer class="card">
				<InputField
					v-model="inviteCode"
					label="Invite code"
					placeholder="e.g. AB12CD"
					mode="both"
				/>
				<p v-if="error" class="error">{{ error }}</p>
				<Button block :disabled="joining || !inviteCode.trim()" @click="joinDebt">
					{{ joining ? "Joining..." : "Join as Borrowed" }}
				</Button>
			</GlassContainer>
		</div>
	</div>
</template>

<style scoped>
	.page-shell {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		align-items: stretch;
		gap: 0;
		padding-top: 1rem;
		max-width: 480px;
		width: 100%;
	}

	.page-header {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: 0.75rem;
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.7rem;
		border: 1px solid var(--color-inputBorder);
		border-radius: 9999px;
		background: transparent;
		color: var(--color-textPrimary);
		cursor: pointer;
		flex-shrink: 0;
	}

	.back-btn:hover {
		background: var(--color-surfaceHover);
	}

	.page-title {
		flex: 1;
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		text-align: center;
		color: var(--color-textPrimary);
	}

	.header-spacer {
		width: 2rem;
	}

	.body {
		padding-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.hint {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-textSecondary);
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.error {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-progress-red);
	}
</style>
