<script setup lang="ts">
	import { onMounted, ref } from "vue";
	import { useRouter } from "vue-router";
	import { ChevronRightIcon } from "@heroicons/vue/24/outline";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import { db } from "../../db/budgetDb";

	const router = useRouter();
	const displayName = ref("");
	const photoUrl = ref("");

	onMounted(async () => {
		const profile = await db.userProfiles.get(1);
		if (!profile) return;
		displayName.value = profile.displayName;
		photoUrl.value = profile.photoUrl || "";
	});
</script>

<template>
	<div class="page-shell">
		<GlassContainer class="profile-card" @click="router.push('/me/account')">
			<img v-if="photoUrl" :src="photoUrl" alt="" class="avatar" />
			<div v-else class="avatar placeholder">
				{{ displayName.charAt(0) || "?" }}
			</div>
			<div class="profile-info">
				<p class="name">{{ displayName }}</p>
				<p class="greeting">Welcome back!</p>
			</div>
			<span class="account-link">
				Account
				<ChevronRightIcon class="chevron" />
			</span>
		</GlassContainer>
	</div>
</template>

<style scoped>
	.page-shell {
		display: flex;
		flex: 1;
		min-height: 0;
		align-items: flex-start;
		justify-content: flex-start;
		padding-top: 1rem;
	}

	.profile-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		max-width: 480px;
		width: 100%;
		cursor: pointer;
	}

	.avatar {
		width: 56px;
		height: 56px;
		border-radius: 9999px;
		object-fit: cover;
		flex-shrink: 0;
	}

	.avatar.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-inputBorder);
		color: var(--color-textPrimary);
		font-size: 1.25rem;
		font-weight: 600;
	}

	.profile-info {
		flex: 1;
		min-width: 0;
		text-align: left;
	}

	.name {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.greeting {
		margin: 0.125rem 0 0;
		font-size: 0.875rem;
		color: var(--color-textSecondary);
	}

	.account-link {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
		font-size: 0.875rem;
		color: var(--color-textSecondary);
	}

	.chevron {
		width: 1rem;
		height: 1rem;
	}
</style>
