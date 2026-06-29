<script setup lang="ts">
import { SunIcon, MoonIcon } from '@heroicons/vue/24/outline'
import { useTheme } from './composables/useTheme'

const { currentTheme, toggleTheme } = useTheme()
</script>

<template>
	<div class="min-h-screen bg-bg text-textPrimary">
		<header class="flex justify-end border-b border-border px-4 py-2">
			<button
				type="button"
				class="rounded-lg border border-border bg-surface p-2 text-textSecondary hover:bg-surfaceHover"
				:aria-label="currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
				@click="toggleTheme"
			>
				<SunIcon v-if="currentTheme === 'dark'" class="h-5 w-5" />
				<MoonIcon v-else class="h-5 w-5" />
			</button>
		</header>
		<router-view />
	</div>
</template>
