import { ref, readonly } from 'vue'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'pocketflow-theme'
const VALID_THEMES: ReadonlyArray<ThemeMode> = ['light', 'dark']

function isValidTheme(value: unknown): value is ThemeMode {
	return typeof value === 'string' && VALID_THEMES.includes(value as ThemeMode)
}

function getStoredTheme(): ThemeMode {
	if (typeof window === 'undefined') return 'light'
	const stored = localStorage.getItem(STORAGE_KEY)
	return isValidTheme(stored) ? stored : 'light'
}

function applyThemeClass(theme: ThemeMode): void {
	if (typeof document === 'undefined') return
	const { classList } = document.documentElement
	if (theme === 'dark') {
		if (!classList.contains('dark')) classList.add('dark')
	} else {
		classList.remove('dark')
	}
}

function persistTheme(theme: ThemeMode): void {
	if (typeof window === 'undefined') return
	localStorage.setItem(STORAGE_KEY, theme)
}

const currentTheme = ref<ThemeMode>(getStoredTheme())

function setTheme(theme: ThemeMode): void {
	if (currentTheme.value === theme) return
	currentTheme.value = theme
	applyThemeClass(theme)
	persistTheme(theme)
}

function toggleTheme(): void {
	setTheme(currentTheme.value === 'light' ? 'dark' : 'light')
}

export function initTheme(): void {
	const theme = getStoredTheme()
	currentTheme.value = theme
	applyThemeClass(theme)
}

export function useTheme() {
	return {
		currentTheme: readonly(currentTheme),
		toggleTheme,
		setTheme,
	} as const
}
