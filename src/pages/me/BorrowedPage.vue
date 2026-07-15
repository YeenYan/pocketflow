<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import { PlusIcon, XMarkIcon } from "@heroicons/vue/24/outline";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import InputField from "../../components/inputs/InputField.vue";
	import AmountField from "../../components/inputs/AmountField.vue";
	import Button from "../../components/button/Button.vue";
	import {
		createId,
		db,
		type DebtNote,
		type DebtNoteType,
		type DebtPayment,
	} from "../../db/budgetDb";

	const props = withDefaults(
		defineProps<{
			type?: DebtNoteType;
		}>(),
		{ type: "borrowed" },
	);

	const notes = ref<DebtNote[]>([]);
	const payments = ref<DebtPayment[]>([]);
	const showAddNoteModal = ref(false);
	const showDetailDrawer = ref(false);
	const showAddPaymentModal = ref(false);
	const selectedNote = ref<DebtNote | null>(null);
	const noteTitle = ref("");
	const noteAmount = ref("");
	const noteDate = ref("");
	const noteError = ref("");
	const savingNote = ref(false);
	const paymentAmount = ref("");
	const paymentDate = ref("");
	const paymentDescription = ref("");
	const paymentError = ref("");
	const savingPayment = ref(false);

	const CIRCLE_R = 42;
	const CIRCLE_C = 2 * Math.PI * CIRCLE_R;

	const isBorrowed = computed(() => props.type === "borrowed");

	const listNotes = computed(() =>
		notes.value
			.filter((n) => n.type === props.type)
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
	);

	const selectedPayments = computed(() => {
		if (!selectedNote.value) return [];
		return payments.value
			.filter((p) => p.debtNoteId === selectedNote.value!.id)
			.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
	});

	function paidTotal(noteId: string) {
		return payments.value
			.filter((p) => p.debtNoteId === noteId)
			.reduce((sum, p) => sum + p.amount, 0);
	}

	function progressPercent(note: DebtNote) {
		if (note.amount <= 0) return 0;
		return Math.min(100, Math.round((paidTotal(note.id) / note.amount) * 100));
	}

	function paymentCount(noteId: string) {
		return payments.value.filter((p) => p.debtNoteId === noteId).length;
	}

	function circleOffset(percent: number) {
		return CIRCLE_C * (1 - Math.min(100, Math.max(0, percent)) / 100);
	}

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
		notes.value = await db.debtNotes.toArray();
		payments.value = await db.debtPayments.toArray();
	}

	function openAddNoteModal() {
		noteTitle.value = "";
		noteAmount.value = "";
		noteDate.value = todayIso();
		noteError.value = "";
		showAddNoteModal.value = true;
	}

	function closeAddNoteModal() {
		showAddNoteModal.value = false;
		noteError.value = "";
	}

	const canSaveNote = computed(() => {
		const amount = Number(noteAmount.value);
		return (
			!savingNote.value &&
			!!noteTitle.value.trim() &&
			amount > 0 &&
			!!noteDate.value
		);
	});

	async function saveNote() {
		const title = noteTitle.value.trim();
		const amount = Number(noteAmount.value);
		const date = noteDate.value;
		if (!title || amount <= 0 || !date) {
			noteError.value = "Enter a title, amount, and date.";
			return;
		}
		savingNote.value = true;
		noteError.value = "";
		try {
			await db.debtNotes.add({
				id: createId(),
				type: props.type,
				title,
				amount,
				date,
				createdAt: new Date().toISOString(),
			});
			await loadData();
			showAddNoteModal.value = false;
		} catch {
			noteError.value = "Save failed. Please try again.";
		} finally {
			savingNote.value = false;
		}
	}

	function openDetail(note: DebtNote) {
		selectedNote.value = note;
		showDetailDrawer.value = true;
	}

	function closeDetail() {
		showDetailDrawer.value = false;
		selectedNote.value = null;
		showAddPaymentModal.value = false;
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
		return (
			!savingPayment.value &&
			amount > 0 &&
			!!paymentDate.value &&
			!!selectedNote.value
		);
	});

	async function savePayment() {
		const note = selectedNote.value;
		const amount = Number(paymentAmount.value);
		const date = paymentDate.value;
		const description = paymentDescription.value.trim();
		if (!note || amount <= 0 || !date) {
			paymentError.value = "Enter an amount and date.";
			return;
		}
		savingPayment.value = true;
		paymentError.value = "";
		try {
			await db.debtPayments.add({
				id: createId(),
				debtNoteId: note.id,
				amount,
				date,
				description,
				createdAt: new Date().toISOString(),
			});
			await loadData();
			selectedNote.value =
				notes.value.find((n) => n.id === note.id) ?? note;
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
	<div class="debt-page">
		<div class="cards-grid">
			<GlassContainer
				v-for="note in listNotes"
				:key="note.id"
				class="debt-card is-clickable"
				@click="openDetail(note)"
			>
				<div class="circle-wrap">
					<svg class="circle-svg" viewBox="0 0 100 100" aria-hidden="true">
						<circle
							class="circle-track"
							cx="50"
							cy="50"
							:r="CIRCLE_R"
							fill="none"
						/>
						<circle
							class="circle-progress"
							cx="50"
							cy="50"
							:r="CIRCLE_R"
							fill="none"
							:stroke-dasharray="CIRCLE_C"
							:stroke-dashoffset="circleOffset(progressPercent(note))"
							transform="rotate(-90 50 50)"
						/>
					</svg>
					<span class="circle-percent">{{ progressPercent(note) }}%</span>
				</div>
				<p class="card-title">{{ note.title }}</p>
				<p class="card-sub">
					{{ paymentCount(note.id) }}
					{{
						isBorrowed
							? paymentCount(note.id) === 1
								? "payment made"
								: "payments made"
							: paymentCount(note.id) === 1
								? "amount received"
								: "amounts received"
					}}
				</p>
			</GlassContainer>

			<button type="button" class="add-card" @click="openAddNoteModal">
				<PlusIcon class="add-card-icon" />
			</button>
		</div>

		<Teleport to="body">
			<div
				v-if="showAddNoteModal"
				class="modal-overlay"
				@click.self="closeAddNoteModal"
			>
				<GlassContainer class="modal">
					<h2 class="modal-title">
						{{ isBorrowed ? "Add Borrowed" : "Add Lent" }}
					</h2>
					<InputField
						v-model="noteTitle"
						label="Title or Name"
						placeholder="e.g. John"
						mode="both"
					/>
					<AmountField
						v-model="noteAmount"
						:label="isBorrowed ? 'Amount borrowed' : 'Amount lent'"
						placeholder="0"
					/>
					<label class="date-field">
						<span class="date-label">
							{{ isBorrowed ? "Date borrowed" : "Date lent" }}
						</span>
						<input v-model="noteDate" type="date" class="date-input" />
					</label>
					<p v-if="noteError" class="modal-error">{{ noteError }}</p>
					<div class="modal-actions">
						<Button block @click="closeAddNoteModal">Cancel</Button>
						<Button block :disabled="!canSaveNote" @click="saveNote">
							{{ savingNote ? "Saving..." : "Save" }}
						</Button>
					</div>
				</GlassContainer>
			</div>

			<div
				v-if="showDetailDrawer && selectedNote"
				class="drawer-overlay"
				@click.self="closeDetail"
			>
				<GlassContainer class="drawer-sheet">
					<div class="drawer-handle" />
					<div class="drawer-header">
						<h2 class="drawer-title">{{ selectedNote.title }}</h2>
						<button
							type="button"
							class="drawer-close"
							aria-label="Close"
							@click="closeDetail"
						>
							<XMarkIcon class="h-5 w-5" />
						</button>
					</div>

					<div class="detail-summary">
						<p class="detail-label">
							{{ isBorrowed ? "Total paid" : "Total received" }}
						</p>
						<p class="detail-amount">
							{{ formatAmount(paidTotal(selectedNote.id)) }}
							<span class="detail-of">
								of {{ formatAmount(selectedNote.amount) }}
							</span>
						</p>
						<p class="detail-date">
							{{ isBorrowed ? "Borrowed" : "Lent" }}
							{{ formatDate(selectedNote.date) }}
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

					<ul v-if="selectedPayments.length" class="payment-list">
						<li
							v-for="entry in selectedPayments"
							:key="entry.id"
							class="payment-row"
						>
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
						{{
							isBorrowed
								? "No payments yet"
								: "No received amounts yet"
						}}
					</p>
				</GlassContainer>
			</div>

			<div
				v-if="showAddPaymentModal"
				class="modal-overlay confirm-overlay"
				@click.self="closeAddPaymentModal"
			>
				<GlassContainer class="modal">
					<h2 class="modal-title">
						{{ isBorrowed ? "Add Payment" : "Add Received" }}
					</h2>
					<AmountField
						v-model="paymentAmount"
						label="Amount"
						placeholder="0"
					/>
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
						>
							{{ savingPayment ? "Saving..." : "Save" }}
						</Button>
					</div>
				</GlassContainer>
			</div>
		</Teleport>
	</div>
</template>

<style scoped>
	@import "../tracker/partials/modals/drawer-shared.css";

	.debt-page {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
	}

	.cards-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		padding-bottom: calc(6rem + env(safe-area-inset-bottom));
		overflow-y: auto;
		min-height: 0;
		flex: 1;
	}

	.debt-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		aspect-ratio: 1;
		text-align: center;
		box-shadow: none;
	}

	.debt-card.is-clickable {
		cursor: pointer;
	}

	.circle-wrap {
		position: relative;
		width: 5.5rem;
		height: 5.5rem;
	}

	.circle-svg {
		width: 100%;
		height: 100%;
	}

	.circle-track {
		stroke: var(--color-progress-track);
		stroke-width: 6;
	}

	.circle-progress {
		stroke: url(#debtProgress) var(--color-progress-green);
		stroke: var(--color-progress-green);
		stroke-width: 6;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.25s ease;
	}

	.circle-percent {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--color-textPrimary);
	}

	.card-title {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--color-textPrimary);
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.card-sub {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-textSecondary);
	}

	.add-card {
		display: flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 1;
		width: 100%;
		border-radius: 1rem;
		border: 1.5px dashed var(--color-inputBorder);
		background: var(--color-surface);
		color: var(--color-textSecondary);
		cursor: pointer;
	}

	.add-card:hover {
		background: var(--color-surfaceHover);
	}

	.add-card-icon {
		width: 1.75rem;
		height: 1.75rem;
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

	.confirm-overlay {
		z-index: 80;
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

	.detail-summary {
		padding: 0 1rem 0.75rem;
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

	.detail-date {
		margin: 0.35rem 0 0;
		font-size: 0.8rem;
		color: var(--color-textSecondary);
	}

	.detail-head-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0 1rem 0.75rem;
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
		padding: 0 1rem 1.5rem;
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
		padding: 0 1rem 1.5rem;
		font-size: 0.9rem;
		color: var(--color-textSecondary);
		text-align: center;
	}
</style>
