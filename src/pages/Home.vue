<script setup>
	import { ref, computed, onMounted, onUnmounted } from "vue";

	// Reactive state for live clock display
	const currentDateTime = ref("");
	const isOnline = ref(navigator.onLine);
	const pwaStatus = ref("");
	const notificationStatus = ref("");

	// Update date/time every second
	let clockInterval = null;

	function updateClock() {
		currentDateTime.value = new Date().toLocaleString();
	}

	// Listen for browser online/offline events
	function handleOnline() {
		isOnline.value = true;
	}

	function handleOffline() {
		isOnline.value = false;
	}

	// Detect whether app runs in installed PWA mode or regular browser tab
	function checkPwaStatus() {
		const isStandalone =
			window.matchMedia("(display-mode: standalone)").matches ||
			window.navigator.standalone === true;

		pwaStatus.value = isStandalone
			? "Running in installed PWA mode (standalone)"
			: "Running in browser mode";
	}

	// Request notification permission and show a local notification
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

	// Visual indicator class based on connection state
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
	<main class="home">
		<h1 class="title">TEST APP</h1>

		<p class="datetime">{{ currentDateTime }}</p>

		<p class="success">PWA is working successfully</p>

		<!-- Visible online/offline indicator -->
		<div class="status-indicator" :class="statusClass">
			<span class="status-dot"></span>
			{{ statusText }}
		</div>

		<div class="actions">
			<button type="button" class="btn" @click="testNotification">
				Test Notification
			</button>

			<button type="button" class="btn btn-secondary" @click="checkPwaStatus">
				Check PWA Status
			</button>
		</div>

		<p v-if="pwaStatus" class="info">{{ pwaStatus }}</p>
		<p v-if="notificationStatus" class="info">{{ notificationStatus }}</p>

		<router-link to="/chat" class="chat-widget" aria-label="Open financial assistant">
			<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
				<path
					d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"
				/>
			</svg>
		</router-link>
	</main>
</template>

<style scoped>
	.home {
		max-width: 480px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		text-align: center;
	}

	.title {
		font-size: 1.75rem;
		margin: 0 0 1rem;
		color: #1a1a1a;
	}

	.datetime {
		font-size: 1.125rem;
		color: #555;
		margin: 0 0 1rem;
	}

	.success {
		font-size: 1rem;
		color: #2e7d32;
		font-weight: 600;
		margin: 0 0 1.5rem;
	}

	.status-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: 999px;
		font-weight: 600;
		margin-bottom: 1.5rem;
	}

	.status-indicator.online {
		background: #e8f5e9;
		color: #2e7d32;
	}

	.status-indicator.offline {
		background: #ffebee;
		color: #c62828;
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
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.btn {
		padding: 0.75rem 1.25rem;
		font-size: 1rem;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		background: #1976d2;
		color: #fff;
	}

	.btn:hover {
		background: #1565c0;
	}

	.btn-secondary {
		background: #455a64;
	}

	.btn-secondary:hover {
		background: #37474f;
	}

	.info {
		font-size: 0.9rem;
		color: #666;
		margin: 0.5rem 0 0;
	}

	.chat-widget {
		position: fixed;
		right: 1.25rem;
		bottom: 1.25rem;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: #19c37d;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		text-decoration: none;
	}

	.chat-widget:hover {
		background: #15a86a;
	}
</style>
