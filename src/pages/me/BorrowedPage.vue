<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import { useRouter } from "vue-router";
	import { PlusIcon } from "@heroicons/vue/24/outline";
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

	const router = useRouter();

	const notes = ref<DebtNote[]>([]);
	const payments = ref<DebtPayment[]>([]);
	const showAddNoteModal = ref(false);
	const noteTitle = ref("");
	const noteAmount = ref("");
	const noteDate = ref("");
	const noteError = ref("");
	const savingNote = ref(false);

	const CIRCLE_R = 42;
	const CIRCLE_C = 2 * Math.PI * CIRCLE_R;

	const isBorrowed = computed(() => props.type === "borrowed");

	const listNotes = computed(() =>
		notes.value
			.filter((n) => n.type === props.type)
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
	);

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
		router.push(`/me/debt-note/${note.id}`);
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
						<circle class="circle-track" cx="50" cy="50" :r="CIRCLE_R" fill="none" />
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
		</Teleport>
	</div>
</template>

<style scoped>
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
