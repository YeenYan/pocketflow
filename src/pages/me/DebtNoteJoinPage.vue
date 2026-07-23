<script setup lang="ts">
	import { nextTick, onMounted, onUnmounted, ref } from "vue";
	import { useRoute, useRouter } from "vue-router";
	import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
	import { Html5Qrcode } from "html5-qrcode";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import InputField from "../../components/inputs/InputField.vue";
	import Button from "../../components/button/Button.vue";
	import { claimDebtInvite } from "../../firebase";

	const route = useRoute();
	const router = useRouter();

	const inviteCode = ref("");
	const error = ref("");
	const joining = ref(false);
	const scanning = ref(false);
	const scanError = ref("");
	let scanner: Html5Qrcode | null = null;

	onMounted(() => {
		const code = String(route.query.code ?? "");
		if (code) inviteCode.value = code.toUpperCase();
	});

	onUnmounted(() => {
		void stopScan();
	});

	function parseInvitePayload(raw: string) {
		const text = raw.trim();
		try {
			const url = new URL(text);
			const fromQuery = url.searchParams.get("code");
			if (fromQuery) return fromQuery.toUpperCase();
		} catch {
			/* plain code */
		}
		return text.toUpperCase();
	}

	async function stopScan() {
		if (!scanner) {
			scanning.value = false;
			return;
		}
		try {
			await scanner.stop();
		} catch {
			/* ignore */
		}
		try {
			await scanner.clear();
		} catch {
			/* ignore */
		}
		scanner = null;
		scanning.value = false;
	}

	async function startScan() {
		error.value = "";
		scanError.value = "";
		scanning.value = true;
		await nextTick();
		try {
			scanner = new Html5Qrcode("join-qr-reader");
			await scanner.start(
				{ facingMode: "environment" },
				{ fps: 10, qrbox: { width: 220, height: 220 } },
				async (decoded) => {
					inviteCode.value = parseInvitePayload(decoded);
					await stopScan();
				},
				() => {},
			);
		} catch {
			scanError.value = "Camera unavailable. Enter the code manually.";
			await stopScan();
		}
	}

	async function joinDebt() {
		error.value = "";
		joining.value = true;
		try {
			await stopScan();
			const note = await claimDebtInvite(inviteCode.value);
			router.replace(`/me/debt-note/${note.id}`);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Could not join this debt.";
		} finally {
			joining.value = false;
		}
	}
</script>

<template>
	<div class="page-shell">
		<header class="page-header mt-[-1rem]">
			<button
				type="button"
				class="back-btn"
				aria-label="Back"
				@click="router.push('/me/debt-note')"
			>
				<ArrowLeftIcon class="h-5 w-5" />
			</button>
			<h1 class="page-title">Join Debt</h1>
			<span class="header-spacer" />
		</header>

		<div class="body">
			<p class="hint">
				Scan the lender's QR code, or enter the invite code manually.
			</p>
			<GlassContainer class="card">
				<div v-if="scanning" class="scanner-wrap">
					<div id="join-qr-reader" class="scanner" />
					<Button block variant="shade" @click="stopScan">Stop scanning</Button>
				</div>
				<Button v-else block variant="shade" @click="startScan">Scan QR code</Button>
				<p v-if="scanError" class="error">{{ scanError }}</p>

				<InputField
					v-model="inviteCode"
					label="Invite code"
					placeholder="e.g. AB12CD"
					mode="both"
				/>
				<p v-if="error" class="error">{{ error }}</p>
				<Button block :disabled="joining || !inviteCode.trim()" @click="joinDebt">
					{{ joining ? "Joining..." : "Join as Borrowed" }}
				</Button>
			</GlassContainer>
		</div>
	</div>
</template>

<style scoped>
	.page-shell {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		align-items: stretch;
		gap: 0;
		padding-top: 1rem;
		max-width: 480px;
		width: 100%;
	}

	.page-header {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: 0.75rem;
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.7rem;
		border: 1px solid var(--color-inputBorder);
		border-radius: 9999px;
		background: transparent;
		color: var(--color-textPrimary);
		cursor: pointer;
		flex-shrink: 0;
	}

	.back-btn:hover {
		background: var(--color-surfaceHover);
	}

	.page-title {
		flex: 1;
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		text-align: center;
		color: var(--color-textPrimary);
	}

	.header-spacer {
		width: 2rem;
	}

	.body {
		padding-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.hint {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-textSecondary);
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.scanner-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.scanner {
		overflow: hidden;
		border-radius: 0.75rem;
		min-height: 220px;
	}

	.error {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-progress-red);
	}
</style>
