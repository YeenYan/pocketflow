<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import { useRoute, useRouter } from "vue-router";
	import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
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

	const route = useRoute();
	const router = useRouter();

	const note = ref<DebtNote | null>(null);
	const payments = ref<DebtPayment[]>([]);
	const showAddPaymentModal = ref(false);
	const paymentAmount = ref("");
	const paymentDate = ref("");
	const paymentDescription = ref("");
	const paymentError = ref("");
	const savingPayment = ref(false);

	const isBorrowed = computed(() => note.value?.type === "borrowed");

	const notePayments = computed(() => {
		if (!note.value) return [];
		return payments.value
			.filter((p) => p.debtNoteId === note.value!.id)
			.sort(
				(a, b) =>
					b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
			);
	});

	const paidTotal = computed(() =>
		notePayments.value.reduce((sum, p) => sum + p.amount, 0),
	);

	const progressPercent = computed(() => {
		if (!note.value || note.value.amount <= 0) return 0;
		return Math.min(100, Math.round((paidTotal.value / note.value.amount) * 100));
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

	function openAddPaymentModal() {
		paymentAmount.value = "";
		paymentDate.value = todayIso();
		paymentDescription.value = "";
		paymentError.value = "";
		showAddPaymentModal.value = true;
	}

	function closeAddPaymentModal() {
		showAddPaymentModal.value = false;
		paymentError.value = "";
	}

	const canSavePayment = computed(() => {
		const amount = Number(paymentAmount.value);
		return !savingPayment.value && amount > 0 && !!paymentDate.value && !!note.value;
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
		savingPayment.value = true;
		paymentError.value = "";
		try {
			await db.debtPayments.add({
				id: createId(),
				debtNoteId: current.id,
				amount,
				date,
				description,
				createdAt: new Date().toISOString(),
			});
			await loadData();
			showAddPaymentModal.value = false;
		} catch {
			paymentError.value = "Save failed. Please try again.";
		} finally {
			savingPayment.value = false;
		}
	}

	onMounted(loadData);
</script>

<template>
	<div v-if="note" class="page-shell">
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
			<span class="header-spacer" />
		</header>

		<div class="detail-body">
			<div class="detail-summary">
				<p class="detail-label">
					{{ isBorrowed ? "Total paid" : "Total received" }}
				</p>
				<p class="detail-amount">
					{{ formatAmount(paidTotal) }}
					<span class="detail-of">of {{ formatAmount(note.amount) }}</span>
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
			</div>

			<div class="detail-head-row">
				<p class="history-title">
					{{ isBorrowed ? "Payments" : "Received" }}
				</p>
				<Button class="add-payment-btn" @click="openAddPaymentModal">
					{{ isBorrowed ? "Add Payment" : "Add Received" }}
				</Button>
			</div>

			<ul v-if="notePayments.length" class="payment-list">
				<li v-for="entry in notePayments" :key="entry.id" class="payment-row">
					<div class="payment-main">
						<p class="payment-amount">{{ formatAmount(entry.amount) }}</p>
						<p class="payment-desc">
							{{ entry.description || "—" }}
						</p>
					</div>
					<span class="payment-date">{{ formatDate(entry.date) }}</span>
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
						{{ isBorrowed ? "Add Payment" : "Add Received" }}
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
						<Button block :disabled="!canSavePayment" @click="savePayment">
							{{ savingPayment ? "Saving..." : "Save" }}
						</Button>
					</div>
				</GlassContainer>
			</div>
		</Teleport>
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

	.detail-body {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		padding-top: 1rem;
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
	}

	.detail-of {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-textSecondary);
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
	}

	.payment-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 0;
		border-top: 1px solid var(--color-inputBorder);
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
