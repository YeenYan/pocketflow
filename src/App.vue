<script setup lang="ts">
	import { computed, ref, onMounted, onUnmounted } from "vue";
	import { useRoute, useRouter } from "vue-router";
	import {
		SunIcon,
		MoonIcon,
		BellIcon,
		ChatBubbleLeftRightIcon,
		SwatchIcon,
	} from "@heroicons/vue/24/outline";
	import GlassContainer from "./components/containers/GlassContainer.vue";
	import BottomNav from "./components/BottomNav.vue";
	import { useTheme } from "./composables/useTheme";
	import { db, sessionUnlocked, setSessionUnlocked } from "./db/budgetDb";
	import image1 from "./assets/img/image_1.webp";
	import image2 from "./assets/img/image_2.webp";
	import image3 from "./assets/img/image_3.webp";
	import headOnly from "./assets/img/head_only.webp";
	import appIcon from "./assets/img/App_Icon.webp";

	const { currentTheme, toggleTheme } = useTheme();

	// TEMP_HOO_THEME: delete with CSS block in design-system.css
	const hooThemeOn = ref(false);
	function toggleHooTheme() {
		hooThemeOn.value = !hooThemeOn.value;
		document.documentElement.classList.toggle("theme-hoo", hooThemeOn.value);
	}

	const router = useRouter();
	const route = useRoute();
	const pageTransition = ref("page-forward");
	const layoutStyle = ref<Record<string, string>>({});

	function preloadImage(src: string) {
		return new Promise<void>((resolve) => {
			if (!src) {
				resolve();
				return;
			}
			const img = new Image();
			img.onload = () => resolve();
			img.onerror = () => resolve();
			img.src = src;
		});
	}

	async function preloadAppImages() {
		const startedAt = Date.now();
		const profile = await db.userProfiles.get(1);
		const urls = [image1, image2, image3, headOnly, appIcon];
		if (profile?.photoUrl) urls.push(profile.photoUrl);
		await Promise.all(urls.map((url) => preloadImage(url)));
		const remaining = 2000 - (Date.now() - startedAt);
		if (remaining > 0) {
			await new Promise((resolve) => setTimeout(resolve, remaining));
		}
		document.getElementById("boot-loader")?.remove();
	}

	function syncLayoutViewport() {
		const viewport = window.visualViewport;
		if (!viewport) return;
		layoutStyle.value = {
			height: `${viewport.height}px`,
			top: `${viewport.offsetTop}px`,
		};
	}

	async function onVisibilityChange() {
		if (document.visibilityState === "hidden") {
			const profile = await db.userProfiles.get(1);
			if (profile?.lockEnabled && profile.onboardingCompleted) {
				setSessionUnlocked(false);
			}
			return;
		}

		if (document.visibilityState !== "visible") return;

		const profile = await db.userProfiles.get(1);
		if (
			profile?.onboardingCompleted &&
			profile.lockEnabled &&
			!sessionUnlocked &&
			route.path !== "/lock" &&
			route.path !== "/onboarding"
		) {
			router.push("/lock");
		}
	}

	onMounted(() => {
		syncLayoutViewport();
		window.visualViewport?.addEventListener("resize", syncLayoutViewport);
		window.visualViewport?.addEventListener("scroll", syncLayoutViewport);
		document.addEventListener("visibilitychange", onVisibilityChange);
		preloadAppImages();
	});

	onUnmounted(() => {
		window.visualViewport?.removeEventListener("resize", syncLayoutViewport);
		window.visualViewport?.removeEventListener("scroll", syncLayoutViewport);
		document.removeEventListener("visibilitychange", onVisibilityChange);
	});

	const tabPaths = ["/dashboard", "/tracker", "/reports", "/me"];
	const hideAllChrome = computed(() =>
		["/onboarding", "/lock"].includes(route.path),
	);
	const showNav = computed(() => !hideAllChrome.value && route.path !== "/chat");

	router.beforeEach((to, from) => {
		if (to.path === "/chat") {
			pageTransition.value = "page-forward";
			return;
		}
		if (from.path === "/chat") {
			pageTransition.value = "page-back";
			return;
		}
		const toIdx = tabPaths.indexOf(to.path);
		const fromIdx = tabPaths.indexOf(from.path);
		pageTransition.value =
			toIdx >= 0 && fromIdx >= 0 && toIdx < fromIdx ? "page-back" : "page-forward";
	});

	async function testNotification() {
		if (!("Notification" in window)) return;

		const permission = await Notification.requestPermission();

		if (permission === "granted") {
			new Notification("My Test App", {
				body: "PWA notification test successful!",
				icon: "/pwa-192x192.png",
			});
		}
	}
</script>

<template>
	<div class="glass-layout flex flex-col" :style="layoutStyle">
		<header
			class="relative z-10 flex shrink-0 justify-end gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))]"
		>
			<GlassContainer
				v-if="showNav"
				as="button"
				type="button"
				rounded="full"
				:padding="false"
				class="p-2 text-textSecondary hover:bg-surfaceHover"
				aria-label="Open financial assistant"
				@click="router.push('/chat')"
			>
				<ChatBubbleLeftRightIcon class="h-5 w-5" />
			</GlassContainer>
			<GlassContainer
				v-if="!hideAllChrome"
				as="button"
				type="button"
				rounded="full"
				:padding="false"
				class="p-2 text-textSecondary hover:bg-surfaceHover"
				aria-label="Test notification"
				@click="testNotification"
			>
				<BellIcon class="h-5 w-5" />
			</GlassContainer>
			<GlassContainer
				as="button"
				type="button"
				rounded="full"
				:padding="false"
				class="p-2 text-textSecondary hover:bg-surfaceHover"
				:aria-label="
					currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
				"
				@click="toggleTheme"
			>
				<SunIcon v-if="currentTheme === 'dark'" class="h-5 w-5" />
				<MoonIcon v-else class="h-5 w-5" />
			</GlassContainer>
			<!-- TEMP_HOO_THEME: delete with CSS block in design-system.css -->
			<GlassContainer
				as="button"
				type="button"
				rounded="full"
				:padding="false"
				class="p-2 text-textSecondary hover:bg-surfaceHover"
				:class="hooThemeOn ? 'text-accentSolid' : ''"
				:aria-label="hooThemeOn ? 'Turn off HOO theme' : 'Turn on HOO theme'"
				@click="toggleHooTheme"
			>
				<SwatchIcon class="h-5 w-5" />
			</GlassContainer>
		</header>
		<main
			class="relative z-10 flex min-h-0 flex-1 flex-col"
			:class="[
				route.path === '/lock' ? 'px-0' : 'px-4',
				route.path === '/dashboard' ||
				route.path === '/tracker' ||
				route.path === '/reports' ||
				route.path === '/me/items' ||
				route.path === '/me/savings' ||
				route.path === '/me/debt-note'
					? 'overflow-hidden pb-0'
					: [
							showNav
								? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]'
								: 'pb-[max(1rem,env(safe-area-inset-bottom))]',
							'overflow-y-auto',
						],
			]"
		>
			<router-view v-slot="{ Component, route: viewRoute }">
				<Transition :name="pageTransition" mode="out-in">
					<component :is="Component" :key="viewRoute.path" class="page-view" />
				</Transition>
			</router-view>
		</main>
		<BottomNav v-if="showNav" />
	</div>
</template>
