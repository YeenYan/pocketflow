<script setup lang="ts">
	import { onMounted, onUnmounted, ref } from "vue";
	import { useRouter } from "vue-router";
	import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import Button from "../../components/button/Button.vue";
	import {
		db,
		markAllNotificationsRead,
		markNotificationRead,
		type AppNotification,
	} from "../../db/budgetDb";

	const router = useRouter();
	const items = ref<AppNotification[]>([]);

	async function loadNotifications() {
		items.value = (await db.appNotifications.toArray()).sort((a, b) =>
			b.createdAt.localeCompare(a.createdAt),
		);
	}

	function formatWhen(value: string) {
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return "";
		return d.toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	}

	async function onItemClick(item: AppNotification) {
		if (item.read === 0) await markNotificationRead(item.id);
		await loadNotifications();
		if (item.type.startsWith("debt_") || item.linkId) {
			router.push("/me/debt-note");
		}
	}

	async function onMarkAllRead() {
		await markAllNotificationsRead();
		await loadNotifications();
	}

	onMounted(() => {
		void loadNotifications();
		window.addEventListener("app-notifications-changed", loadNotifications);
	});

	onUnmounted(() => {
		window.removeEventListener("app-notifications-changed", loadNotifications);
	});
</script>

<template>
	<div class="page-shell">
		<header class="page-header mt-[-1rem]">
			<button
				type="button"
				class="back-btn"
				aria-label="Back"
				@click="router.back()"
			>
				<ArrowLeftIcon class="h-5 w-5" />
			</button>
			<h1 class="page-title">Notifications</h1>
			<span class="header-spacer" />
		</header>

		<div class="body">
			<div v-if="items.length" class="toolbar">
				<Button variant="shade" @click="onMarkAllRead">Mark all read</Button>
			</div>

			<ul v-if="items.length" class="list">
				<li v-for="item in items" :key="item.id">
					<GlassContainer
						class="row"
						:class="{ unread: item.read === 0 }"
						@click="onItemClick(item)"
					>
						<div class="row-main">
							<p class="row-title">{{ item.title }}</p>
							<p class="row-body">{{ item.body }}</p>
							<p class="row-time">{{ formatWhen(item.createdAt) }}</p>
						</div>
						<span v-if="item.read === 0" class="unread-dot" />
					</GlassContainer>
				</li>
			</ul>
			<p v-else class="empty">No notifications yet</p>
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
		gap: 0.75rem;
		padding-bottom: calc(6rem + env(safe-area-inset-bottom));
	}

	.toolbar {
		display: flex;
		justify-content: flex-end;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		cursor: pointer;
	}

	.row.unread {
		border-color: color-mix(in srgb, var(--color-accentSolid) 35%, transparent);
	}

	.row-main {
		min-width: 0;
		flex: 1;
	}

	.row-title {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--color-textPrimary);
	}

	.row-body {
		margin: 0.25rem 0 0;
		font-size: 0.85rem;
		color: var(--color-textSecondary);
	}

	.row-time {
		margin: 0.35rem 0 0;
		font-size: 0.75rem;
		color: var(--color-textSecondary);
	}

	.unread-dot {
		width: 0.55rem;
		height: 0.55rem;
		margin-top: 0.35rem;
		border-radius: 9999px;
		background: var(--color-accentSolid);
		flex-shrink: 0;
	}

	.empty {
		margin: 1.5rem 0 0;
		text-align: center;
		color: var(--color-textSecondary);
		font-size: 0.9rem;
	}
</style>
