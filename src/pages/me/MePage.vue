<script setup lang="ts">
	import { onMounted, ref } from "vue";
	import { useRouter } from "vue-router";
	import {
		ChevronRightIcon,
		BookOpenIcon,
		BanknotesIcon,
		ChartPieIcon,
	} from "@heroicons/vue/24/outline";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import Divider from "../../components/divider/Divider.vue";
	import { db } from "../../db/budgetDb";

	const router = useRouter();
	const displayName = ref("");
	const photoUrl = ref("");
	const itemsCount = ref(0);

	onMounted(async () => {
		const profile = await db.userProfiles.get(1);
		if (profile) {
			displayName.value = profile.displayName;
			photoUrl.value = profile.photoUrl || "";
		}
		const items = await db.itemBuilders.toArray();
		itemsCount.value = items.filter((item) => item.isActive).length;
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

		<Divider />

		<div class="menu-grid">
			<GlassContainer class="menu-tile is-clickable" @click="router.push('/me/items')">
				<span class="tile-icon-box tile-icon-box-items">
					<BookOpenIcon class="tile-icon" />
				</span>
				<p class="tile-title">My Items</p>
				<p class="tile-subtitle">{{ itemsCount }} items | Manage</p>
			</GlassContainer>

			<GlassContainer class="menu-tile is-clickable" @click="router.push('/me/savings')">
				<span class="tile-icon-box tile-icon-box-savings">
					<BanknotesIcon class="tile-icon" />
				</span>
				<p class="tile-title">My Savings</p>
				<p class="tile-subtitle">Track | Goals</p>
			</GlassContainer>

			<GlassContainer
				class="menu-tile is-clickable"
				@click="router.push('/me/analytics')"
			>
				<span class="tile-icon-box tile-icon-box-analytics">
					<ChartPieIcon class="tile-icon" />
				</span>
				<p class="tile-title">Analytics</p>
				<p class="tile-subtitle">Insights | Trends</p>
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
		gap: 0;
		align-items: flex-start;
		justify-content: flex-start;
		padding-top: 1rem;
		max-width: 480px;
		width: 100%;
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

	.menu-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		width: 100%;
	}

	.menu-tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.625rem;
		aspect-ratio: 1;
		box-shadow: none;
		text-align: center;
	}

	.menu-tile.is-clickable {
		cursor: pointer;
	}

	.tile-icon-box {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.625rem;
		flex-shrink: 0;
	}

	.tile-icon-box-items {
		background: rgba(59, 130, 246, 0.15);
	}

	.tile-icon-box-items .tile-icon {
		color: #3b82f6;
	}

	.tile-icon-box-savings {
		background: rgba(16, 185, 129, 0.15);
	}

	.tile-icon-box-savings .tile-icon {
		color: #10b981;
	}

	.tile-icon-box-analytics {
		background: rgba(168, 85, 247, 0.15);
	}

	.tile-icon-box-analytics .tile-icon {
		color: #a855f7;
	}

	.tile-icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.tile-title {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.tile-subtitle {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-textSecondary);
	}
</style>
