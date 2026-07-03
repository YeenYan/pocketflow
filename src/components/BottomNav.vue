<script setup lang="ts">
	import { computed } from "vue";
	import { useRoute } from "vue-router";
	import {
		RectangleGroupIcon,
		BanknotesIcon,
		UserIcon,
	} from "@heroicons/vue/24/outline";
	import GlassContainer from "./containers/GlassContainer.vue";

	const route = useRoute();

	const items = [
		{ path: "/dashboard", label: "Dashboard", icon: RectangleGroupIcon },
		{ path: "/tracker", label: "Tracker", icon: BanknotesIcon },
		{ path: "/me", label: "Me", icon: UserIcon },
	];

	const activeIndex = computed(() => {
		const idx = items.findIndex((item) =>
			item.path === "/me"
				? route.path.startsWith("/me")
				: route.path === item.path,
		);
		return idx >= 0 ? idx : 0;
	});

	const indicatorStyle = computed(() => ({
		transform: `translateX(${activeIndex.value * 100}%)`,
	}));
</script>

<template>
	<nav class="bottom-nav">
		<div class="bottom-nav-border">
			<GlassContainer rounded="full" :padding="false" class="bottom-nav-pill">
				<div class="bottom-nav-indicator" :style="indicatorStyle" />
				<router-link
					v-for="item in items"
					:key="item.path"
					:to="item.path"
					class="bottom-nav-item"
					:class="{ active: route.path === item.path }"
				>
					<span class="bottom-nav-icon-wrap">
						<component :is="item.icon" class="bottom-nav-icon" />
					</span>
					<span class="bottom-nav-label">{{ item.label }}</span>
				</router-link>
			</GlassContainer>
		</div>
	</nav>
</template>
