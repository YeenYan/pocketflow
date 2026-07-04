<script setup lang="ts">
	import { useRoute } from "vue-router";
	import {
		RectangleGroupIcon,
		BanknotesIcon,
		ChartBarIcon,
		UserIcon,
	} from "@heroicons/vue/24/outline";
	import GlassContainer from "./containers/GlassContainer.vue";

	const route = useRoute();

	const items = [
		{ path: "/dashboard", label: "Dashboard", icon: RectangleGroupIcon },
		{ path: "/tracker", label: "Tracker", icon: BanknotesIcon },
		{ path: "/reports", label: "Reports", icon: ChartBarIcon },
		{ path: "/me", label: "Me", icon: UserIcon },
	];

	function isActive(path: string) {
		if (path === "/me") return route.path.startsWith("/me");
		return route.path === path;
	}
</script>

<template>
	<nav class="bottom-nav">
		<GlassContainer rounded="full" :padding="false" class="bottom-nav-pill">
			<router-link
				v-for="item in items"
				:key="item.path"
				:to="item.path"
				class="bottom-nav-item"
				:class="{ active: isActive(item.path) }"
				:aria-label="item.label"
			>
				<component :is="item.icon" class="bottom-nav-icon" />
				<span v-if="isActive(item.path)" class="bottom-nav-dot" />
			</router-link>
		</GlassContainer>
	</nav>
</template>
