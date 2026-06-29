<script setup lang="ts">
	import { ref, nextTick } from "vue";
	import { useRouter } from "vue-router";
	import GlassContainer from "../../components/containers/GlassContainer.vue";
	import FadeIn from "../../components/containers/FadeIn.vue";

	const router = useRouter();
	const input = ref("");
	const messages = ref<{ role: "user" | "assistant"; content: string }[]>([]);
	const loading = ref(false);
	const error = ref("");
	const messagesEl = ref<HTMLElement | null>(null);

	async function sendMessage() {
		const text = input.value.trim();
		if (!text || loading.value) return;

		messages.value.push({ role: "user", content: text });
		input.value = "";
		error.value = "";
		loading.value = true;
		await scrollToBottom();

		try {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: messages.value }),
			});

			const data = await response.json();
			if (!response.ok) {
				error.value = data.error || "Something went wrong.";
				return;
			}

			messages.value.push({ role: "assistant", content: data.reply });
		} catch {
			error.value = "Could not reach the assistant. Check your connection.";
		} finally {
			loading.value = false;
			await scrollToBottom();
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	async function scrollToBottom() {
		await nextTick();
		if (messagesEl.value) {
			messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
		}
	}
</script>

<template>
	<div class="chat">
		<FadeIn :delay="0">
			<GlassContainer as="header" rounded="2xl" class="chat-header">
				<button type="button" class="back-btn" @click="router.push('/dashboard')">
					←
				</button>
				<h1 class="chat-title">Pocketflow Assistant</h1>
			</GlassContainer>
		</FadeIn>

		<div ref="messagesEl" class="messages">
			<FadeIn v-if="messages.length === 0" :delay="80">
				<div class="welcome">
					<h2>How can I help with your finances today?</h2>
					<p>Ask about budgeting, saving, debt, or spending habits.</p>
				</div>
			</FadeIn>

			<div
				v-for="(msg, i) in messages"
				:key="i"
				class="message-row"
				:class="msg.role"
			>
				<div class="avatar">{{ msg.role === "user" ? "You" : "PF" }}</div>
				<div class="bubble">{{ msg.content }}</div>
			</div>

			<div v-if="loading" class="message-row assistant">
				<div class="avatar">PF</div>
				<div class="bubble typing">Thinking...</div>
			</div>
		</div>

		<FadeIn :delay="160">
			<div class="input-area">
				<p v-if="error" class="error">{{ error }}</p>
				<GlassContainer rounded="3xl" class="input-box">
					<textarea
						v-model="input"
						class="input"
						placeholder="Message Pocketflow Assistant..."
						rows="1"
						:disabled="loading"
						@keydown="onKeydown"
					></textarea>
					<button
						type="button"
						class="send-btn"
						:disabled="loading || !input.trim()"
						@click="sendMessage"
					>
						↑
					</button>
				</GlassContainer>
				<p class="disclaimer">
					AI advice is for guidance only. Consult a professional for legal or tax
					matters.
				</p>
			</div>
		</FadeIn>
	</div>
</template>

<style scoped>
	.chat {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		overflow: hidden;
	}

	.chat-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
		flex-shrink: 0;
	}

	.back-btn {
		background: none;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		color: var(--color-textPrimary);
		border-radius: 6px;
	}

	.back-btn:hover {
		background: var(--color-surfaceHover);
	}

	.chat-title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}

	.messages {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 1rem;
	}

	.welcome {
		max-width: 640px;
		margin: 2rem auto;
		text-align: center;
		color: var(--color-textSecondary);
	}

	.welcome h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-textPrimary);
		margin: 0 0 0.5rem;
	}

	.welcome p {
		margin: 0;
		font-size: 0.95rem;
	}

	.message-row {
		display: flex;
		gap: 0.75rem;
		max-width: 768px;
		margin: 0 auto 1.5rem;
		padding: 0 0.5rem;
	}

	.message-row.user {
		flex-direction: row-reverse;
	}

	.avatar {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--color-onColor);
	}

	.message-row.user .avatar {
		background: var(--color-userAvatar);
	}

	.message-row.assistant .avatar {
		background: var(--color-accentSolid);
	}

	.bubble {
		padding: 0.75rem 1rem;
		border-radius: 12px;
		line-height: 1.5;
		font-size: 0.95rem;
		white-space: pre-wrap;
		word-break: break-word;
		max-width: calc(100% - 48px);
	}

	.message-row.user .bubble {
		background: var(--color-surfaceHover);
		color: var(--color-textPrimary);
	}

	.message-row.assistant .bubble {
		background: transparent;
		color: var(--color-textPrimary);
		padding-left: 0;
	}

	.typing {
		color: var(--color-muted);
		font-style: italic;
	}

	.input-area {
		padding: 0 0 0.25rem;
		flex-shrink: 0;
	}

	.error {
		color: var(--color-dangerText);
		font-size: 0.85rem;
		margin: 0 0 0.5rem;
		text-align: center;
	}

	.input-box {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
		max-width: 768px;
		margin: 0 auto;
	}

	.input {
		flex: 1;
		border: none;
		outline: none;
		resize: none;
		font-size: 1rem;
		font-family: inherit;
		padding: 0.25rem 0.5rem;
		max-height: 120px;
		background: transparent;
		color: var(--color-textPrimary);
	}

	.send-btn {
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		border: none;
		border-radius: 50%;
		background: var(--color-textPrimary);
		color: var(--color-onColor);
		font-size: 1.1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.send-btn:disabled {
		background: var(--color-disabled);
		cursor: not-allowed;
	}

	.send-btn:not(:disabled):hover {
		background: var(--color-textSecondary);
	}

	.disclaimer {
		text-align: center;
		font-size: 0.75rem;
		color: var(--color-muted);
		margin: 0.5rem 0 0;
	}
</style>
