<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SunIcon, MoonIcon, BellIcon } from '@heroicons/vue/24/outline'
import GlassContainer from './components/containers/GlassContainer.vue'
import BottomNav from './components/BottomNav.vue'
import { useTheme } from './composables/useTheme'
import { db, sessionUnlocked, setSessionUnlocked } from './db/budgetDb'

const { currentTheme, toggleTheme } = useTheme()

const router = useRouter()
const route = useRoute()
const pageTransition = ref('page-forward')
const layoutStyle = ref<Record<string, string>>({})

function syncLayoutViewport() {
	const viewport = window.visualViewport
	if (!viewport) return
	layoutStyle.value = {
		height: `${viewport.height}px`,
		top: `${viewport.offsetTop}px`,
	}
}

async function onVisibilityChange() {
	if (document.visibilityState === 'hidden') {
		const profile = await db.userProfiles.get(1)
		if (profile?.lockEnabled && profile.onboardingCompleted) {
			setSessionUnlocked(false)
		}
		return
	}

	if (document.visibilityState !== 'visible') return

	const profile = await db.userProfiles.get(1)
	if (
		profile?.onboardingCompleted &&
		profile.lockEnabled &&
		!sessionUnlocked &&
		route.path !== '/lock' &&
		route.path !== '/onboarding'
	) {
		router.push('/lock')
	}
}

onMounted(() => {
	syncLayoutViewport()
	window.visualViewport?.addEventListener('resize', syncLayoutViewport)
	window.visualViewport?.addEventListener('scroll', syncLayoutViewport)
	document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
	window.visualViewport?.removeEventListener('resize', syncLayoutViewport)
	window.visualViewport?.removeEventListener('scroll', syncLayoutViewport)
	document.removeEventListener('visibilitychange', onVisibilityChange)
})

const tabPaths = ['/dashboard', '/tracker', '/me']
const hideAllChrome = computed(() =>
	['/onboarding', '/lock'].includes(route.path),
)
const showNav = computed(() => !hideAllChrome.value && route.path !== '/chat')

router.beforeEach((to, from) => {
	if (to.path === '/chat') {
		pageTransition.value = 'page-forward'
		return
	}
	if (from.path === '/chat') {
		pageTransition.value = 'page-back'
		return
	}
	const toIdx = tabPaths.indexOf(to.path)
	const fromIdx = tabPaths.indexOf(from.path)
	pageTransition.value =
		toIdx >= 0 && fromIdx >= 0 && toIdx < fromIdx ? 'page-back' : 'page-forward'
})

async function testNotification() {
	if (!('Notification' in window)) return

	const permission = await Notification.requestPermission()

	if (permission === 'granted') {
		new Notification('My Test App', {
			body: 'PWA notification test successful!',
			icon: '/pwa-192x192.png',
		})
	}
}
</script>

<template>
	<div class="glass-layout flex flex-col" :style="layoutStyle">
		<header
			class="relative z-10 flex shrink-0 justify-end gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))]"
		>
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
				:aria-label="currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
				@click="toggleTheme"
			>
				<SunIcon v-if="currentTheme === 'dark'" class="h-5 w-5" />
				<MoonIcon v-else class="h-5 w-5" />
			</GlassContainer>
		</header>
		<main
			class="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4"
			:class="showNav ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]' : 'pb-[max(1rem,env(safe-area-inset-bottom))]'"
		>
			<router-view v-slot="{ Component, route: viewRoute }">
				<Transition :name="pageTransition" mode="out-in">
					<component :is="Component" :key="viewRoute.path" class="page-view" />
				</Transition>
			</router-view>
		</main>
		<BottomNav v-if="showNav" />
		<router-link
			v-if="showNav"
			to="/chat"
			class="chat-widget glass"
			aria-label="Open financial assistant"
		>
			<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
				<path
					d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"
				/>
			</svg>
		</router-link>
	</div>
</template>
