<script setup lang="ts">
	import { computed, onMounted, onUnmounted, ref } from "vue";
	import { useRoute, useRouter } from "vue-router";
	import {
		ArrowLeftIcon,
		QrCodeIcon,
		TrashIcon,
	} from "@heroicons/vue/24/outline";
	import QRCode from "qrcode";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import InputField from "../../components/inputs/InputField.vue";
	import AmountField from "../../components/inputs/AmountField.vue";
	import Button from "../../components/button/Button.vue";
	import {
		createId,
		db,
		type DebtNote,
		type DebtPayment,
	} from "../../db/budgetDb";
	import {
		createDebtInvite,
		deleteDebtPaymentCloud,
		ensureFirebaseAuth,
		listenDebtLinkRemoval,
		markLocalNoteLinked,
		pullDebtPayments,
		pushDebtPayment,
		removeDebtLinkCloud,
		updateDebtPaymentCloud,
	} from "../../firebase";

	const route = useRoute();
	const router = useRouter();

	const SWIPE_DELETE_WIDTH = 72;

	const note = ref<DebtNote | null>(null);
	const payments = ref<DebtPayment[]>([]);
	const showAddPaymentModal = ref(false);
	const editingPaymentId = ref("");
	const paymentAmount = ref("");
	const paymentDate = ref("");
	const paymentDescription = ref("");
	const paymentError = ref("");
	const savingPayment = ref(false);
	const showDeleteConfirm = ref(false);
	const pendingDeleteId = ref("");
	const pendingDeleteLabel = ref("");
	const deleting = ref(false);
	const showApprovalModal = ref(false);
	const approvalEntry = ref<DebtPayment | null>(null);
	const approvalBusy = ref(false);
	const showRemoveEntryConfirm = ref(false);
	const removingEntry = ref(false);
	const showShareModal = ref(false);
	const shareBusy = ref(false);
	const shareError = ref("");
	const qrDataUrl = ref("");
	const shareCode = ref("");
	const syncToast = ref("");
	const loading = ref(true);
	let initialLoaded = false;

	const swipeOffsets = ref<Record<string, number>>({});
	let swipeStartX = 0;
	let swipeStartOffset = 0;
	let swipeActiveId = "";
	let swipeMoved = false;
	let stopPaymentsListen: (() => void) | null = null;
	let stopLinkListen: (() => void) | null = null;

	const isBorrowed = computed(() => note.value?.type === "borrowed");
	const isLinked = computed(
		() =>
			!!note.value?.linkId &&
			(note.value.syncStatus === "linked" || note.value.syncStatus === "pending"),
	);
	const canRemoveEntry = computed(() => {
		if (!note.value) return false;
		if (note.value.type === "lent") return true;
		return !note.value.linkId;
	});
	const removeEntryWarnsLinked = computed(
		() =>
			note.value?.type === "lent" &&
			!!note.value.linkId &&
			(note.value.syncStatus === "linked" || note.value.syncStatus === "pending"),
	);

	function isCountedPayment(p: DebtPayment) {
		return !p.status || p.status === "approved";
	}

	const notePayments = computed(() => {
		if (!note.value) return [];
		return payments.value
			.filter((p) => p.debtNoteId === note.value!.id && p.status !== "rejected")
			.sort(
				(a, b) =>
					b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
			);
	});

	const paidTotal = computed(() =>
		notePayments.value
			.filter(isCountedPayment)
			.reduce((sum, p) => sum + p.amount, 0),
	);

	const progressPercent = computed(() => {
		if (!note.value || note.value.amount <= 0) return 0;
		return Math.min(100, Math.round((paidTotal.value / note.value.amount) * 100));
	});

	const isFullyPaid = computed(
		() =>
			!!note.value &&
			note.value.amount > 0 &&
			paidTotal.value >= note.value.amount,
	);

	const canShare = computed(
		() => note.value?.type === "lent" && !isFullyPaid.value,
	);

	const linkStatusLabel = computed(() => {
		if (!note.value?.linkId) return "";
		if (note.value.syncStatus === "linked") return "Linked";
		if (note.value.syncStatus === "pending") return "Waiting for borrower";
		return "Shared";
	});

	function formatAmount(amount: number) {
		return `₱${Math.round(amount).toLocaleString("en-PH")}`;
	}

	function formatDate(value: string) {
		if (!value) return "";
		const d = new Date(value + "T00:00:00");
		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}

	function todayIso() {
		return new Date().toISOString().slice(0, 10);
	}

	async function loadData() {
		const id = String(route.params.id ?? "");
		note.value = (await db.debtNotes.get(id)) ?? null;
		if (!note.value) {
			router.replace("/me/debt-note");
			return;
		}
		payments.value = await db.debtPayments
			.where("debtNoteId")
			.equals(id)
			.toArray();
	}

	async function loadDataWithLoader() {
		if (!initialLoaded) loading.value = true;
		try {
			await loadData();
			if (note.value?.linkId) {
				try {
					await markLocalNoteLinked(note.value.linkId);
					const stillThere = await db.debtNotes.get(
						String(route.params.id ?? ""),
					);
					if (!stillThere) {
						router.replace("/me/debt-note");
						return;
					}
					await pullDebtPayments(note.value.linkId, note.value.id);
					await loadData();
				} catch {
					/* offline / rules */
				}
				startCloudListen();
			}
		} finally {
			loading.value = false;
			initialLoaded = true;
		}
	}

	function startCloudListen() {
		stopPaymentsListen?.();
		stopPaymentsListen = null;
		stopLinkListen?.();
		stopLinkListen = null;
		const current = note.value;
		if (!current?.linkId) return;

		// Payments sync once via global listener; this page only refreshes UI.
		const onPaymentsChanged = () => {
			void loadData();
		};
		window.addEventListener("app-debt-payments-changed", onPaymentsChanged);
		stopPaymentsListen = () => {
			window.removeEventListener("app-debt-payments-changed", onPaymentsChanged);
		};

		stopLinkListen = listenDebtLinkRemoval(current.linkId, async () => {
			const linkId = current.linkId!;
			const local = await db.debtNotes.where("linkId").equals(linkId).first();
			if (!local) {
				router.replace("/me/debt-note");
				return;
			}
			const pays = await db.debtPayments
				.where("debtNoteId")
				.equals(local.id)
				.toArray();
			for (const p of pays) await db.debtPayments.delete(p.id);
			await db.debtNotes.delete(local.id);
			const body = "A linked debt entry was removed.";
			if ("Notification" in window && Notification.permission === "granted") {
				new Notification("Debt Note removed", {
					body,
					icon: "/pwa-192x192.png",
				});
			}
			router.replace("/me/debt-note");
		});
	}

	function openAddPaymentModal() {
		if (isFullyPaid.value) return;
		editingPaymentId.value = "";
		paymentAmount.value = "";
		paymentDate.value = todayIso();
		paymentDescription.value = "";
		paymentError.value = "";
		showAddPaymentModal.value = true;
	}

	function openEditPayment(entry: DebtPayment) {
		swipeOffsets.value = {};
		swipeActiveId = "";
		editingPaymentId.value = entry.id;
		paymentAmount.value = String(entry.amount);
		paymentDate.value = entry.date;
		paymentDescription.value = entry.description;
		paymentError.value = "";
		showAddPaymentModal.value = true;
	}

	function closeAddPaymentModal() {
		showAddPaymentModal.value = false;
		editingPaymentId.value = "";
		paymentError.value = "";
	}

	const canSavePayment = computed(() => {
		const amount = Number(paymentAmount.value);
		return (
			!savingPayment.value && amount > 0 && !!paymentDate.value && !!note.value
		);
	});

	async function savePayment() {
		const current = note.value;
		const amount = Number(paymentAmount.value);
		const date = paymentDate.value;
		const description = paymentDescription.value.trim();
		if (!current || amount <= 0 || !date) {
			paymentError.value = "Enter an amount and date.";
			return;
		}
		const excludeId = editingPaymentId.value || "";
		const usedTowardTotal = notePayments.value
			.filter((p) => p.id !== excludeId)
			.reduce((sum, p) => sum + p.amount, 0);
		if (usedTowardTotal + amount > current.amount) {
			paymentError.value = "Cannot add payment. Amount exceeds the total.";
			return;
		}
		savingPayment.value = true;
		paymentError.value = "";
		try {
			const user = current.linkId ? await ensureFirebaseAuth() : null;
			if (editingPaymentId.value) {
				const existing = await db.debtPayments.get(editingPaymentId.value);
				if (existing?.status === "pending") {
					paymentError.value = "Pending payments cannot be edited.";
					return;
				}
				await db.debtPayments.update(editingPaymentId.value, {
					amount,
					date,
					description,
				});
				const entry = await db.debtPayments.get(editingPaymentId.value);
				if (current.linkId && entry?.cloudPaymentId) {
					await updateDebtPaymentCloud(current.linkId, entry.cloudPaymentId, {
						amount,
						date,
						description,
					});
				}
			} else {
				const paymentId = createId();
				// Borrower on a linked note must wait for lender approval.
				const needsApproval =
					!!current.linkId && current.type === "borrowed";
				const payment: DebtPayment = {
					id: paymentId,
					debtNoteId: current.id,
					amount,
					date,
					description,
					createdAt: new Date().toISOString(),
					createdByUid: user?.uid,
					status: needsApproval ? "pending" : "approved",
				};
				// Write local first (with cloudPaymentId) so snapshot listeners update
				// this row instead of inserting a duplicate when push lands.
				if (current.linkId && user) {
					payment.cloudPaymentId = paymentId;
					payment.syncedAt = new Date().toISOString();
				}
				await db.debtPayments.add(payment);
				if (current.linkId && user) {
					await pushDebtPayment(current.linkId, payment, user.uid);
				}
			}
			await loadData();
			showAddPaymentModal.value = false;
			editingPaymentId.value = "";
		} catch {
			paymentError.value = "Save failed. Please try again.";
		} finally {
			savingPayment.value = false;
		}
	}

	function swipeOffset(id: string) {
		return swipeOffsets.value[id] ?? 0;
	}

	function onSwipeStart(id: string, event: TouchEvent) {
		if (isFullyPaid.value) return;
		const touch = event.touches[0];
		if (!touch) return;
		swipeStartX = touch.clientX;
		swipeStartOffset = swipeOffset(id);
		swipeActiveId = id;
		swipeMoved = false;
		for (const key of Object.keys(swipeOffsets.value)) {
			if (key !== id) swipeOffsets.value[key] = 0;
		}
	}

	function onSwipeMove(id: string, event: TouchEvent) {
		if (swipeActiveId !== id) return;
		const touch = event.touches[0];
		if (!touch) return;
		const delta = touch.clientX - swipeStartX;
		if (Math.abs(delta) > 6) swipeMoved = true;
		swipeOffsets.value[id] = Math.min(
			0,
			Math.max(-SWIPE_DELETE_WIDTH, swipeStartOffset + delta),
		);
	}

	async function onSwipeEnd(id: string) {
		const offset = swipeOffset(id);
		if (offset <= -SWIPE_DELETE_WIDTH * 0.85) {
			await requestDeletePayment(id);
			return;
		}
		swipeOffsets.value[id] = 0;
		swipeActiveId = "";
	}

	function onRowClick(entry: DebtPayment) {
		if (isFullyPaid.value) return;
		if (swipeMoved) {
			swipeMoved = false;
			return;
		}
		if (swipeOffset(entry.id) < 0) {
			swipeOffsets.value[entry.id] = 0;
			return;
		}
		if (entry.status === "pending" && note.value?.type === "lent" && isLinked.value) {
			openApprovalModal(entry);
			return;
		}
		if (entry.status === "pending") return;
		openEditPayment(entry);
	}

	function openApprovalModal(entry: DebtPayment) {
		approvalEntry.value = entry;
		showApprovalModal.value = true;
	}

	function closeApprovalModal() {
		showApprovalModal.value = false;
		approvalEntry.value = null;
	}

	async function decidePayment(decision: "approved" | "rejected") {
		const current = note.value;
		const entry = approvalEntry.value;
		if (!current?.linkId || !entry?.cloudPaymentId) return;
		approvalBusy.value = true;
		try {
			await db.debtPayments.update(entry.id, { status: decision });
			await updateDebtPaymentCloud(current.linkId, entry.cloudPaymentId, {
				status: decision,
			});
			if (decision === "rejected") {
				await deleteDebtPaymentCloud(current.linkId, entry.cloudPaymentId);
				await db.debtPayments.delete(entry.id);
			}
			await loadData();
			closeApprovalModal();
		} catch {
			syncToast.value = "Could not update payment. Try again.";
			window.setTimeout(() => {
				if (syncToast.value === "Could not update payment. Try again.") {
					syncToast.value = "";
				}
			}, 3000);
		} finally {
			approvalBusy.value = false;
		}
	}

	async function requestDeletePayment(id: string) {
		const entry = payments.value.find((p) => p.id === id);
		if (!entry) return;
		swipeOffsets.value[id] = 0;
		pendingDeleteId.value = id;
		pendingDeleteLabel.value = formatAmount(entry.amount);
		showDeleteConfirm.value = true;
	}

	function closeDeleteConfirm() {
		showDeleteConfirm.value = false;
		pendingDeleteId.value = "";
		pendingDeleteLabel.value = "";
	}

	async function confirmDeletePayment() {
		if (!pendingDeleteId.value) return;
		deleting.value = true;
		const id = pendingDeleteId.value;
		const entry = await db.debtPayments.get(id);
		const current = note.value;
		if (current?.linkId && entry?.cloudPaymentId) {
			try {
				await deleteDebtPaymentCloud(current.linkId, entry.cloudPaymentId);
			} catch {
				/* local delete still proceeds */
			}
		}
		await db.debtPayments.delete(id);
		swipeOffsets.value[id] = 0;
		await loadData();
		deleting.value = false;
		closeDeleteConfirm();
	}

	async function openShareModal() {
		if (!note.value || note.value.type !== "lent") return;
		shareBusy.value = true;
		shareError.value = "";
		showShareModal.value = true;
		try {
			const result = await createDebtInvite(note.value);
			await loadData();
			shareCode.value = result.inviteCode;
			const joinUrl = `${window.location.origin}/me/debt-note/join?code=${result.inviteCode}`;
			qrDataUrl.value = await QRCode.toDataURL(joinUrl, {
				width: 220,
				margin: 1,
			});
		} catch (err) {
			shareError.value =
				err instanceof Error ? err.message : "Could not create invite.";
		} finally {
			shareBusy.value = false;
		}
	}

	function closeShareModal() {
		showShareModal.value = false;
		shareError.value = "";
	}

	async function copyShareCode() {
		if (!shareCode.value) return;
		try {
			await navigator.clipboard.writeText(shareCode.value);
			syncToast.value = "Invite code copied";
			window.setTimeout(() => {
				if (syncToast.value === "Invite code copied") syncToast.value = "";
			}, 2000);
		} catch {
			/* ignore */
		}
	}

	function openRemoveEntryConfirm() {
		if (!canRemoveEntry.value) return;
		showRemoveEntryConfirm.value = true;
	}

	function closeRemoveEntryConfirm() {
		showRemoveEntryConfirm.value = false;
	}

	async function confirmRemoveEntry() {
		const current = note.value;
		if (!current || !canRemoveEntry.value) return;
		removingEntry.value = true;
		try {
			stopLinkListen?.();
			stopLinkListen = null;
			stopPaymentsListen?.();
			stopPaymentsListen = null;

			if (current.type === "lent" && current.linkId) {
				await removeDebtLinkCloud(current.linkId, current.inviteCode);
			}
			const pays = await db.debtPayments
				.where("debtNoteId")
				.equals(current.id)
				.toArray();
			for (const p of pays) await db.debtPayments.delete(p.id);
			await db.debtNotes.delete(current.id);
			showRemoveEntryConfirm.value = false;
			router.replace("/me/debt-note");
		} catch {
			syncToast.value = "Could not remove entry. Try again.";
			window.setTimeout(() => {
				if (syncToast.value === "Could not remove entry. Try again.") {
					syncToast.value = "";
				}
			}, 3000);
		} finally {
			removingEntry.value = false;
		}
	}

	onMounted(() => {
		void loadDataWithLoader();
	});

	onUnmounted(() => {
		stopPaymentsListen?.();
		stopPaymentsListen = null;
		stopLinkListen?.();
		stopLinkListen = null;
	});
</script>

<template>
	<div class="page-shell">
		<Teleport to="body">
			<div v-if="loading" class="fetch-loader-page" aria-busy="true">
				<div class="fetch-loader" aria-label="Loading"></div>
			</div>
		</Teleport>
		<template v-if="!loading && note">
		<header class="page-header mt-[-1rem]">
			<button
				type="button"
				class="back-btn"
				aria-label="Back"
				@click="router.push('/me/debt-note')"
			>
				<ArrowLeftIcon class="h-5 w-5" />
			</button>
			<h1 class="page-title">{{ note.title }}</h1>
			<button
				v-if="canShare"
				type="button"
				class="share-btn"
				aria-label="Share invite"
				@click="openShareModal"
			>
				<QrCodeIcon class="h-5 w-5" />
			</button>
			<button
				v-if="canRemoveEntry"
				type="button"
				class="share-btn"
				aria-label="Remove entry"
				@click="openRemoveEntryConfirm"
			>
				<TrashIcon class="h-5 w-5" />
			</button>
			<span v-if="!canRemoveEntry && !canShare" class="header-spacer" />
		</header>

		<div class="detail-body">
			<p v-if="syncToast" class="sync-toast">{{ syncToast }}</p>
			<div class="detail-summary">
				<p class="detail-label">
					{{ isBorrowed ? "Total paid" : "Total received" }}
				</p>
				<p class="detail-amount">
					{{ formatAmount(paidTotal) }}
					<span class="detail-of">of {{ formatAmount(note.amount) }}</span>
					<span v-if="isFullyPaid" class="completed-chip">Completed</span>
				</p>
				<div class="progress-track">
					<div
						class="progress-fill"
						:style="{
							width: progressPercent + '%',
							background: 'var(--color-progress-green)',
						}"
					/>
				</div>
				<p class="detail-date">
					{{ isBorrowed ? "Borrowed" : "Lent" }}
					{{ formatDate(note.date) }}
				</p>
				<p v-if="linkStatusLabel" class="link-status">{{ linkStatusLabel }}</p>
			</div>

			<div class="detail-head-row">
				<p class="history-title">
					{{ isBorrowed ? "Payments" : "Received" }}
				</p>
				<Button
					v-if="!isFullyPaid"
					class="add-payment-btn"
					@click="openAddPaymentModal"
				>
					Add Payment
				</Button>
			</div>

			<ul v-if="notePayments.length" class="payment-list">
				<li
					v-for="entry in notePayments"
					:key="entry.id"
					class="item-swipe-wrap"
					:class="{ 'is-swiped': !isFullyPaid && swipeOffset(entry.id) < 0 }"
				>
					<button
						v-if="!isFullyPaid"
						type="button"
						class="item-swipe-delete"
						aria-label="Delete"
						@click.stop="requestDeletePayment(entry.id)"
					>
						<TrashIcon class="item-swipe-delete-icon" />
					</button>
					<div
						class="payment-row"
						:class="{
							'is-swiped': !isFullyPaid && swipeOffset(entry.id) < 0,
							'is-pending': entry.status === 'pending',
							'is-readonly': isFullyPaid,
						}"
						:style="
							isFullyPaid
								? undefined
								: { transform: `translateX(${swipeOffset(entry.id)}px)` }
						"
						@touchstart.passive="onSwipeStart(entry.id, $event)"
						@touchmove="onSwipeMove(entry.id, $event)"
						@touchend="onSwipeEnd(entry.id)"
						@click="onRowClick(entry)"
					>
						<div class="payment-main">
							<p class="payment-amount">{{ formatAmount(entry.amount) }}</p>
							<p class="payment-desc">
								{{ entry.description || "—" }}
							</p>
							<p v-if="entry.status === 'pending'" class="payment-status">
								Pending Approval
							</p>
						</div>
						<span class="payment-date">{{ formatDate(entry.date) }}</span>
					</div>
				</li>
			</ul>
			<p v-else class="empty">
				{{ isBorrowed ? "No payments yet" : "No received amounts yet" }}
			</p>
		</div>

		<Teleport to="body">
			<div
				v-if="showAddPaymentModal"
				class="modal-overlay"
				@click.self="closeAddPaymentModal"
			>
				<GlassContainer class="modal">
					<h2 class="modal-title">
						{{ editingPaymentId ? "Edit Payment" : "Add Payment" }}
					</h2>
					<AmountField v-model="paymentAmount" label="Amount" placeholder="0" />
					<label class="date-field">
						<span class="date-label">
							{{ isBorrowed ? "Date of payment" : "Date received" }}
						</span>
						<input v-model="paymentDate" type="date" class="date-input" />
					</label>
					<InputField
						v-model="paymentDescription"
						label="Description"
						placeholder="e.g. Partial payment"
						mode="both"
					/>
					<p v-if="paymentError" class="modal-error">{{ paymentError }}</p>
					<div class="modal-actions">
						<Button block @click="closeAddPaymentModal">Cancel</Button>
						<Button
							block
							:disabled="!canSavePayment"
							@click="savePayment"
							variant="primary"
						>
							{{ savingPayment ? "Saving..." : "Save" }}
						</Button>
					</div>
				</GlassContainer>
			</div>

			<div
				v-if="showDeleteConfirm"
				class="modal-overlay"
				@click.self="closeDeleteConfirm"
			>
				<GlassContainer class="modal">
					<h2 class="modal-title">
						{{ isBorrowed ? "Remove Payment" : "Remove Received" }}
					</h2>
					<p class="modal-text">
						Are you sure you want to remove
						<strong>{{ pendingDeleteLabel }}</strong
						>?
					</p>
					<div class="modal-actions">
						<Button block variant="shade" @click="closeDeleteConfirm">Cancel</Button>
						<Button
							variant="danger"
							block
							:disabled="deleting"
							@click="confirmDeletePayment"
						>
							{{ deleting ? "Removing..." : "Remove" }}
						</Button>
					</div>
				</GlassContainer>
			</div>

			<div
				v-if="showApprovalModal && approvalEntry"
				class="modal-overlay"
				@click.self="closeApprovalModal"
			>
				<GlassContainer class="modal">
					<h2 class="modal-title">Review Payment</h2>
					<p class="modal-text">
						<strong>{{ formatAmount(approvalEntry.amount) }}</strong>
						on {{ formatDate(approvalEntry.date) }}
					</p>
					<p class="modal-text">
						{{ approvalEntry.description || "No description" }}
					</p>
					<p class="modal-text">Accept this payment from the borrower?</p>
					<div class="modal-actions">
						<Button
							block
							variant="shade"
							:disabled="approvalBusy"
							@click="closeApprovalModal"
						>
							Cancel
						</Button>
						<Button
							block
							variant="danger"
							:disabled="approvalBusy"
							@click="decidePayment('rejected')"
						>
							{{ approvalBusy ? "Saving..." : "Reject" }}
						</Button>
						<Button
							block
							variant="primary"
							:disabled="approvalBusy"
							@click="decidePayment('approved')"
						>
							{{ approvalBusy ? "Saving..." : "Accept" }}
						</Button>
					</div>
				</GlassContainer>
			</div>

			<div
				v-if="showRemoveEntryConfirm"
				class="modal-overlay"
				@click.self="closeRemoveEntryConfirm"
			>
				<GlassContainer class="modal">
					<h2 class="modal-title">Remove entry</h2>
					<p class="modal-text">
						<template v-if="removeEntryWarnsLinked">
							This will also remove the linked Borrowed entry for the other person and
							notify them. Continue?
						</template>
						<template v-else>
							Are you sure you want to remove
							<strong>{{ note?.title }}</strong
							>?
						</template>
					</p>
					<div class="modal-actions">
						<Button block variant="shade" @click="closeRemoveEntryConfirm">
							Cancel
						</Button>
						<Button
							variant="danger"
							block
							:disabled="removingEntry"
							@click="confirmRemoveEntry"
						>
							{{ removingEntry ? "Removing..." : "Remove" }}
						</Button>
					</div>
				</GlassContainer>
			</div>

			<div
				v-if="showShareModal"
				class="modal-overlay"
				@click.self="closeShareModal"
			>
				<GlassContainer class="modal share-modal">
					<h2 class="modal-title">Share invite</h2>
					<p class="modal-text">
						Bob can scan this QR or enter the code to create a mirrored Borrowed note.
					</p>
					<p v-if="shareBusy" class="modal-text">Creating invite...</p>
					<img
						v-if="qrDataUrl && !shareBusy"
						:src="qrDataUrl"
						alt="Debt invite QR"
						class="qr-image"
					/>
					<p v-if="shareCode" class="share-code">{{ shareCode }}</p>
					<p v-if="shareError" class="modal-error">{{ shareError }}</p>
					<div class="modal-actions">
						<Button block variant="shade" @click="closeShareModal">Close</Button>
						<Button block :disabled="!shareCode" @click="copyShareCode">
							Copy code
						</Button>
					</div>
				</GlassContainer>
			</div>
		</Teleport>
		</template>
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
		overflow-x: hidden;
	}

	.fetch-loader-page {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-overlay);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	/* https://uiverse.io/doniaskima/rare-falcon-68 */
	.fetch-loader {
		--c1: #673b14;
		--c2: #f8b13b;
		width: 40px;
		height: 80px;
		border-top: 4px solid var(--c1);
		border-bottom: 4px solid var(--c1);
		background: linear-gradient(
				90deg,
				var(--c1) 2px,
				var(--c2) 0 5px,
				var(--c1) 0
			)
			50% / 7px 8px no-repeat;
		display: grid;
		overflow: hidden;
		animation: fetch-l5-0 2s infinite linear;
	}

	.fetch-loader::before,
	.fetch-loader::after {
		content: "";
		grid-area: 1 / 1;
		width: 75%;
		height: calc(50% - 4px);
		margin: 0 auto;
		border: 2px solid var(--c1);
		border-top: 0;
		box-sizing: content-box;
		border-radius: 0 0 40% 40%;
		-webkit-mask:
			linear-gradient(#000 0 0) bottom / 4px 2px no-repeat,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: destination-out;
		mask-composite: exclude;
		background:
			linear-gradient(var(--d, 0deg), var(--c2) 50%, #0000 0) bottom / 100% 205%,
			linear-gradient(var(--c2) 0 0) center / 0 100%;
		background-repeat: no-repeat;
		animation: inherit;
		animation-name: fetch-l5-1;
	}

	.fetch-loader::after {
		transform-origin: 50% calc(100% + 2px);
		transform: scaleY(-1);
		--s: 3px;
		--d: 180deg;
	}

	@keyframes fetch-l5-0 {
		80% {
			transform: rotate(0);
		}
		100% {
			transform: rotate(0.5turn);
		}
	}

	@keyframes fetch-l5-1 {
		10%,
		70% {
			background-size: 100% 205%, var(--s, 0) 100%;
		}
		70%,
		100% {
			background-position: top, center;
		}
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

	.share-btn {
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

	.share-btn:hover {
		background: var(--color-surfaceHover);
	}

	.sync-toast {
		margin: 0 0 0.75rem;
		padding: 0.65rem 0.85rem;
		border-radius: 0.75rem;
		background: var(--color-surfaceHover);
		color: var(--color-textPrimary);
		font-size: 0.85rem;
	}

	.link-status {
		margin: 0.35rem 0 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-progress-green);
	}

	.share-modal {
		align-items: center;
		text-align: center;
	}

	.qr-image {
		width: 220px;
		height: 220px;
		border-radius: 0.75rem;
		background: #fff;
	}

	.share-code {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: var(--color-textPrimary);
	}

	.detail-body {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		padding-top: 1rem;
		overflow-x: hidden;
		overflow-y: auto;
		padding-bottom: calc(6rem + env(safe-area-inset-bottom));
	}

	.detail-summary {
		padding: 0 0 1rem;
	}

	.detail-label {
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-textSecondary);
	}

	.detail-amount {
		margin: 0.2rem 0 0;
		font-size: 1.35rem;
		font-weight: 700;
		color: var(--color-textPrimary);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.45rem;
	}

	.detail-of {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-textSecondary);
	}

	.completed-chip {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.2rem 0.55rem;
		border-radius: 9999px;
		color: var(--color-progress-green);
		background: rgba(16, 185, 129, 0.12);
		border: 1px solid rgba(16, 185, 129, 0.28);
	}

	.progress-track {
		height: 0.5rem;
		border-radius: 9999px;
		background: var(--color-progress-track);
		border: 1px solid var(--color-progress-track-border);
		box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.6);
		overflow: hidden;
		margin-top: 0.55rem;
	}

	.progress-fill {
		height: 100%;
		border-radius: 9999px;
		transition: width 0.2s;
	}

	.detail-date {
		margin: 0.55rem 0 0;
		font-size: 0.8rem;
		color: var(--color-textSecondary);
	}

	.detail-head-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0 0 0.75rem;
	}

	.history-title {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-textPrimary);
	}

	.add-payment-btn {
		flex-shrink: 0;
	}

	.payment-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
		overflow-x: hidden;
	}

	.item-swipe-wrap {
		position: relative;
		overflow: hidden;
	}

	.item-swipe-delete {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 4.5rem;
		border: none;
		background: #f87171;
		color: #fff;
		cursor: pointer;
		visibility: hidden;
		pointer-events: none;
	}

	.item-swipe-wrap.is-swiped .item-swipe-delete {
		visibility: visible;
		pointer-events: auto;
	}

	.item-swipe-delete-icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.payment-row {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 0;
		border-top: 1px solid var(--color-inputBorder);
		cursor: pointer;
		touch-action: pan-y;
		transition: transform 0.2s ease;
		background: transparent;
	}

	.payment-row.is-swiped {
		background: var(--color-surfaceHover);
	}

	.payment-main {
		min-width: 0;
	}

	.payment-amount {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--color-textPrimary);
	}

	.payment-desc {
		margin: 0.15rem 0 0;
		font-size: 0.8rem;
		color: var(--color-textSecondary);
	}

	.payment-status {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-accentText);
	}

	.payment-row.is-pending {
		opacity: 0.92;
	}

	.payment-row.is-readonly {
		cursor: default;
		pointer-events: none;
	}

	.payment-date {
		flex-shrink: 0;
		font-size: 0.75rem;
		color: var(--color-textSecondary);
	}

	.empty {
		margin: 0;
		padding: 0.5rem 0 1.5rem;
		font-size: 0.9rem;
		color: var(--color-textSecondary);
		text-align: center;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 70;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: var(--color-overlay);
	}

	.modal {
		width: 100%;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.modal-title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-textPrimary);
	}

	.modal-text {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-textSecondary);
		text-align: center;
	}

	.modal-text strong {
		color: var(--color-textPrimary);
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
	}

	.modal-error {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-progress-red);
	}

	.date-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.date-label {
		font-size: 1rem;
		color: var(--color-textPrimary);
	}

	.date-input {
		width: 100%;
		padding: 0.875rem 1.25rem;
		border-radius: 9999px;
		border: 1px solid var(--color-inputBorder);
		background: var(--color-inputBg);
		color: var(--color-inputText);
		font-size: 1rem;
		font-family: inherit;
		outline: none;
	}
</style>
