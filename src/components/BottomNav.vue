<script setup lang="ts">
	import { useRoute, useRouter } from "vue-router";
	import {
		RectangleGroupIcon,
		BanknotesIcon,
		ChartBarIcon,
		UserIcon,
		PlusIcon,
	} from "@heroicons/vue/24/outline";
	import GlassContainer from "./containers/GlassContainer.vue";

	const route = useRoute();
	const router = useRouter();

	const leftItems = [
		{ path: "/dashboard", label: "Dashboard", icon: RectangleGroupIcon },
		{ path: "/tracker", label: "Tracker", icon: BanknotesIcon },
	];

	const rightItems = [
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
		<button
			type="button"
			class="bottom-nav-fab"
			aria-label="Add"
			@click="router.push('/tracker')"
		>
			<PlusIcon class="bottom-nav-fab-icon" />
		</button>
		<div class="bottom-nav-border">
			<GlassContainer rounded="full" :padding="false" class="bottom-nav-pill">
				<router-link
					v-for="item in leftItems"
					:key="item.path"
					:to="item.path"
					class="bottom-nav-item"
					:class="{ active: isActive(item.path) }"
				>
					<span class="bottom-nav-icon-wrap">
						<component :is="item.icon" class="bottom-nav-icon" />
					</span>
					<span class="bottom-nav-label">{{ item.label }}</span>
				</router-link>

				<div class="bottom-nav-fab-slot" aria-hidden="true" />

				<router-link
					v-for="item in rightItems"
					:key="item.path"
					:to="item.path"
					class="bottom-nav-item"
					:class="{ active: isActive(item.path) }"
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
