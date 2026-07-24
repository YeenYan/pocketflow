<script setup lang="ts">
	import { nextTick, onMounted, onUnmounted, ref } from "vue";
	import { useRoute, useRouter } from "vue-router";
	import { ArrowLeftIcon, QrCodeIcon } from "@heroicons/vue/24/outline";
	import { Html5Qrcode } from "html5-qrcode";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import InputField from "../../components/inputs/InputField.vue";
	import Button from "../../components/button/Button.vue";
	import Divider from "../../components/divider/Divider.vue";
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
				<template v-else>
					<div class="qr-frame">
						<div class="qr-icon-wrap">
							<QrCodeIcon class="qr-icon" />
						</div>

						<!-- Scan lines: one phase-driven group; trails stay below main when moving up, above when moving down -->
						<div class="scan-lines scan-phase">
							<div
								class="scan-line scan-line--trail"
								style="--ti: 3; opacity: 0.3"
							></div>
							<div
								class="scan-line scan-line--trail"
								style="--ti: 2; opacity: 0.4"
							></div>
							<div
								class="scan-line scan-line--trail"
								style="--ti: 1; opacity: 0.5"
							></div>
							<div class="scan-line scan-line--main"></div>
						</div>

						<div class="qr-corner qr-corner--tl">
							<div class="qr-corner-h"></div>
							<div class="qr-corner-v"></div>
						</div>
						<div class="qr-corner qr-corner--tr">
							<div class="qr-corner-h"></div>
							<div class="qr-corner-v"></div>
						</div>
						<div class="qr-corner qr-corner--bl">
							<div class="qr-corner-h"></div>
							<div class="qr-corner-v"></div>
						</div>
						<div class="qr-corner qr-corner--br">
							<div class="qr-corner-h"></div>
							<div class="qr-corner-v"></div>
						</div>
					</div>
					<Button
						block
						variant="primary"
						@click="startScan"
						class="max-w-[12rem] w-full mx-auto"
						>Scan QR code</Button
					>
				</template>
				<p v-if="scanError" class="error">{{ scanError }}</p>

				<Divider margin-top="2rem" margin-bottom="2rem" />

				<InputField
					v-model="inviteCode"
					label="Enter Invite code"
					placeholder="e.g. AB12CD"
					mode="both"
				/>
				<p v-if="error" class="error">{{ error }}</p>
				<Button
					block
					:disabled="joining || !inviteCode.trim()"
					@click="joinDebt"
					class="max-w-[12rem] w-full mx-auto"
				>
					{{ joining ? "Joining..." : "Join as Borrower" }}
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

	.qr-frame {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: 9rem;
		height: 9rem;
		margin: 0.5rem auto 1.5rem;
	}

	.qr-icon-wrap {
		max-width: 7rem;
		color: var(--color-primary);
		opacity: 0.85;
	}

	.qr-icon {
		width: 5rem;
		height: 5rem;
	}

	.scan-lines {
		pointer-events: none;
		position: absolute;
		left: 50%;
		top: 50%;
		width: 95%;
		transform: translate(-50%, -50%);
	}

	/*
	  Shared --phase (0→1) drives the whole group. Main follows cos; trail offset uses sin²
	  so offsets vanish at turnarounds (no jump when flipping above/below).
	*/
	.scan-line {
		position: absolute;
		inset-inline: 0;
		border-radius: 9999px;
		background: var(--color-primary);
		will-change: transform;
	}

	.scan-phase {
		--trail-gap: 0.45rem;
		height: 0;
		animation: scan-phase 1.2s linear infinite;
	}

	.scan-line--main {
		padding-block: 0.15rem;
		transform: translateY(calc(3.5rem * cos(2 * pi * var(--phase))));
	}

	.scan-line--trail {
		padding-block: 0.2rem;
		transform: translateY(
			calc(
				3.5rem * cos(2 * pi * var(--phase)) + var(--ti) * var(--trail-gap) *
					sin(2 * pi * var(--phase)) * sin(2 * pi * var(--phase)) *
					sign(0.5 - var(--phase))
			)
		);
	}

	@keyframes scan-phase {
		from {
			--phase: 0;
		}
		to {
			--phase: 1;
		}
	}

	.qr-corner {
		position: absolute;
	}

	.qr-corner-h {
		width: 1.6rem;
		height: 0.4rem;
		background: var(--color-primary);
	}

	.qr-corner-v {
		width: 0.4rem;
		height: 1.4rem;
		margin-top: -0.1rem;
		background: var(--color-primary);
	}

	.qr-corner--tl {
		top: 0;
		left: 0;
	}

	.qr-corner--tr {
		top: -0.1rem;
		right: 0.1rem;
		transform: rotate(90deg);
	}

	.qr-corner--tr .qr-corner-v {
		height: 1.3rem;
	}

	.qr-corner--bl {
		bottom: -0.2rem;
		left: 0;
		transform: rotate(-90deg);
	}

	.qr-corner--br {
		bottom: -0.2rem;
		right: 0;
		transform: rotate(180deg);
	}

	.error {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-progress-red);
	}
</style>

<style>
	/* @property must be global so --phase animates smoothly between numeric endpoints */
	@property --phase {
		syntax: "<number>";
		inherits: true;
		initial-value: 0;
	}
</style>
