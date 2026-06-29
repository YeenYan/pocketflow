<script setup lang="ts">
	import { ref, computed, onMounted, onUnmounted } from "vue";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import FadeIn from "../../components/containers/FadeIn.vue";

	const currentDateTime = ref("");
	const isOnline = ref(navigator.onLine);
	const pwaStatus = ref("");
	const notificationStatus = ref("");

	let clockInterval: ReturnType<typeof setInterval> | null = null;

	function updateClock() {
		currentDateTime.value = new Date().toLocaleString();
	}

	function handleOnline() {
		isOnline.value = true;
	}

	function handleOffline() {
		isOnline.value = false;
	}

	function checkPwaStatus() {
		const isStandalone =
			window.matchMedia("(display-mode: standalone)").matches ||
			(window.navigator as Navigator & { standalone?: boolean }).standalone ===
				true;

		pwaStatus.value = isStandalone
			? "Running in installed PWA mode (standalone)"
			: "Running in browser mode";
	}

	async function testNotification() {
		if (!("Notification" in window)) {
			notificationStatus.value =
				"Notifications are not supported in this browser.";
			return;
		}

		const permission = await Notification.requestPermission();

		if (permission === "granted") {
			notificationStatus.value = "Notification permission granted.";
			new Notification("My Test App", {
				body: "PWA notification test successful!",
				icon: "/pwa-192x192.png",
			});
		} else if (permission === "denied") {
			notificationStatus.value = "Notification permission denied.";
		} else {
			notificationStatus.value = "Notification permission dismissed.";
		}
	}

	const statusClass = computed(() => (isOnline.value ? "online" : "offline"));
	const statusText = computed(() =>
		isOnline.value ? "Online Status" : "Offline Status",
	);

	onMounted(() => {
		updateClock();
		clockInterval = setInterval(updateClock, 1000);
		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		checkPwaStatus();
	});

	onUnmounted(() => {
		clearInterval(clockInterval);
		window.removeEventListener("online", handleOnline);
		window.removeEventListener("offline", handleOffline);
	});
</script>

<template>
	<div class="page-shell">
		<GlassContainer class="page">
			<FadeIn :delay="0">
				<h1 class="title">TEST APP</h1>
			</FadeIn>

			<FadeIn :delay="60">
				<p class="datetime">{{ currentDateTime }}</p>
			</FadeIn>

			<FadeIn :delay="120">
				<p class="success">PWA is working successfully</p>
			</FadeIn>

			<FadeIn :delay="180">
				<div class="status-indicator" :class="statusClass">
					<span class="status-dot"></span>
					{{ statusText }}
				</div>
			</FadeIn>

			<FadeIn :delay="240">
				<div class="actions">
					<button type="button" class="btn" @click="testNotification">
						Test Notification
					</button>

					<button type="button" class="btn btn-secondary" @click="checkPwaStatus">
						Check PWA Status
					</button>
				</div>
			</FadeIn>

			<FadeIn v-if="pwaStatus" :delay="300">
				<p class="info">{{ pwaStatus }}</p>
			</FadeIn>
			<FadeIn v-if="notificationStatus" :delay="300">
				<p class="info">{{ notificationStatus }}</p>
			</FadeIn>
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
		max-height: 100%;
		margin: 0 auto;
		text-align: center;
		overflow: hidden;
	}

	.title {
		font-size: clamp(1.25rem, 5vw, 1.75rem);
		margin: 0 0 0.5rem;
		color: var(--color-textPrimary);
	}

	.datetime {
		font-size: clamp(0.95rem, 3.5vw, 1.125rem);
		color: var(--color-textSecondary);
		margin: 0 0 0.5rem;
	}

	.success {
		font-size: 0.95rem;
		color: var(--color-success);
		font-weight: 600;
		margin: 0 0 1rem;
	}

	.status-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: 999px;
		font-weight: 600;
		margin-bottom: 1rem;
	}

	.status-indicator.online {
		background: var(--color-successBg);
		color: var(--color-successText);
	}

	.status-indicator.offline {
		background: var(--color-dangerBg);
		color: var(--color-dangerText);
	}

	.status-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: currentColor;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.btn {
		padding: 0.625rem 1rem;
		font-size: 0.95rem;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		background: var(--color-accentSolid);
		color: var(--color-onColor);
	}

	.btn:hover {
		background: var(--color-primaryDark);
	}

	.btn-secondary {
		background: var(--color-mutedSolid);
	}

	.btn-secondary:hover {
		background: var(--color-surfaceActive);
	}

	.info {
		font-size: 0.9rem;
		color: var(--color-textSecondary);
		margin: 0.5rem 0 0;
	}
</style>
