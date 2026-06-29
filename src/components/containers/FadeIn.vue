<script setup lang="ts">
withDefaults(
	defineProps<{
		as?: string
		delay?: number
	}>(),
	{ as: 'div', delay: 0 },
)
</script>

<template>
	<component
		:is="as"
		class="fade-in"
		:style="{ animationDelay: `${delay}ms` }"
	>
		<slot />
	</component>
</template>
