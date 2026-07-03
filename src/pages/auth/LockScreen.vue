<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import GlassContainer from '../../components/containers/GlassContainer.vue'
import InputField from '../../components/inputs/InputField.vue'
import { db, setSessionUnlocked } from '../../db/budgetDb'
import { verifyPin } from '../../utils/pinHash'
import { unlockWithBiometric } from '../../utils/biometric'

const router = useRouter()

const pin = ref('')
const pinError = ref('')
const useBiometric = ref(false)
const displayName = ref('')
const photoUrl = ref('')
const unlocking = ref(false)

watch(pin, (v) => {
	if (v.length > 5) pin.value = v.slice(0, 5)
})

onMounted(async () => {
	const profile = await db.userProfiles.get(1)
	if (!profile) return
	displayName.value = profile.displayName
	photoUrl.value = profile.photoUrl || ''
	useBiometric.value = profile.useBiometric
})

async function unlockWithPin() {
	if (pin.value.length !== 5) {
		pinError.value = 'Enter your 5-digit PIN'
		return
	}

	const profile = await db.userProfiles.get(1)
	if (!profile) return

	const ok = await verifyPin(pin.value, profile.pinHash)
	if (!ok) {
		pinError.value = 'Wrong PIN'
		pin.value = ''
		return
	}

	pinError.value = ''
	setSessionUnlocked(true)
	router.push('/dashboard')
}

async function unlockWithFaceId() {
	if (unlocking.value) return
	unlocking.value = true
	const ok = await unlockWithBiometric()
	unlocking.value = false
	if (!ok) return

	setSessionUnlocked(true)
	router.push('/dashboard')
}
</script>

<template>
	<div class="page-shell">
		<GlassContainer class="page">
			<div class="profile">
				<img v-if="photoUrl" :src="photoUrl" alt="" class="avatar" />
				<div v-else class="avatar placeholder">{{ displayName.charAt(0) || '?' }}</div>
				<p class="name">{{ displayName }}</p>
			</div>

			<InputField
				v-model="pin"
				label="PIN"
				mode="number"
				placeholder="•••••"
			/>
			<p v-if="pinError" class="error">{{ pinError }}</p>

			<button type="button" class="btn primary" @click="unlockWithPin">
				Unlock
			</button>

			<button
				v-if="useBiometric"
				type="button"
				class="btn"
				:disabled="unlocking"
				@click="unlockWithFaceId"
			>
				Unlock with Face ID
			</button>
		</GlassContainer>
	</div>
</template>

<style scoped>
.page-shell {
	display: flex;
	flex: 1;
	min-height: 0;
	align-items: center;
	justify-content: center;
}

.page {
	max-width: 480px;
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: 1rem;
	text-align: center;
}

.profile {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.5rem;
	margin-bottom: 0.5rem;
}

.avatar {
	width: 72px;
	height: 72px;
	border-radius: 9999px;
	object-fit: cover;
}

.avatar.placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color-inputBorder);
	color: var(--color-textPrimary);
	font-size: 1.5rem;
	font-weight: 600;
}

.name {
	margin: 0;
	font-size: 1.125rem;
	color: var(--color-textPrimary);
}

.btn {
	padding: 0.875rem 1.25rem;
	border-radius: 9999px;
	border: 1px solid var(--color-inputBorder);
	background: transparent;
	color: var(--color-textPrimary);
	font-size: 1rem;
	font-family: inherit;
	cursor: pointer;
}

.btn.primary {
	border-color: transparent;
	background: var(--color-textPrimary);
	color: var(--color-bg);
}

.btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.error {
	margin: 0;
	color: #f87171;
	font-size: 0.875rem;
	text-align: left;
}
</style>
