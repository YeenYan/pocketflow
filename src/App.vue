<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SunIcon, MoonIcon } from '@heroicons/vue/24/outline'
import GlassContainer from './components/containers/GlassContainer.vue'
import BottomNav from './components/BottomNav.vue'
import { useTheme } from './composables/useTheme'

const { currentTheme, toggleTheme } = useTheme()

const router = useRouter()
const route = useRoute()
const pageTransition = ref('page-forward')

const tabPaths = ['/dashboard', '/tracker', '/me']
const showNav = computed(() => route.path !== '/chat')

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
</script>

<template>
	<div class="glass-layout flex h-dvh flex-col">
		<header class="relative z-10 flex shrink-0 justify-end p-4 pt-[max(1rem,env(safe-area-inset-top))]">
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
			class="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-4"
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
