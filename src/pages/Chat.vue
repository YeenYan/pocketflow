<script setup>
	import { ref, nextTick } from "vue";
	import { useRouter } from "vue-router";

	const router = useRouter();
	const input = ref("");
	const messages = ref([]);
	const loading = ref(false);
	const error = ref("");
	const messagesEl = ref(null);

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

	function onKeydown(e) {
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
		<header class="chat-header">
			<button type="button" class="back-btn" @click="router.push('/')">
				←
			</button>
			<h1 class="chat-title">Pocketflow Assistant</h1>
		</header>

		<div ref="messagesEl" class="messages">
			<div v-if="messages.length === 0" class="welcome">
				<h2>How can I help with your finances today?</h2>
				<p>Ask about budgeting, saving, debt, or spending habits.</p>
			</div>

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

		<div class="input-area">
			<p v-if="error" class="error">{{ error }}</p>
			<div class="input-box">
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
			</div>
			<p class="disclaimer">
				AI advice is for guidance only. Consult a professional for legal or tax
				matters.
			</p>
		</div>
	</div>
</template>

<style scoped>
	.chat {
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		background: #fff;
	}

	.chat-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #e5e5e5;
		background: #fff;
	}

	.back-btn {
		background: none;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		color: #1a1a1a;
		border-radius: 6px;
	}

	.back-btn:hover {
		background: #f0f0f0;
	}

	.chat-title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem 1rem;
	}

	.welcome {
		max-width: 640px;
		margin: 2rem auto;
		text-align: center;
		color: #555;
	}

	.welcome h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1a1a1a;
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
		color: #fff;
	}

	.message-row.user .avatar {
		background: #5436da;
	}

	.message-row.assistant .avatar {
		background: #19c37d;
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
		background: #f0f0f0;
		color: #1a1a1a;
	}

	.message-row.assistant .bubble {
		background: transparent;
		color: #1a1a1a;
		padding-left: 0;
	}

	.typing {
		color: #888;
		font-style: italic;
	}

	.input-area {
		padding: 0.75rem 1rem 1rem;
		border-top: 1px solid #e5e5e5;
		background: #fff;
	}

	.error {
		color: #c62828;
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
		padding: 0.5rem;
		border: 1px solid #d9d9d9;
		border-radius: 24px;
		background: #fff;
		box-shadow: 0 0 8px rgba(0, 0, 0, 0.05);
	}

	.input {
		flex: 1;
		border: none;
		outline: none;
		resize: none;
		font-size: 1rem;
		font-family: inherit;
		padding: 0.5rem 0.75rem;
		max-height: 120px;
		background: transparent;
	}

	.send-btn {
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		border: none;
		border-radius: 50%;
		background: #1a1a1a;
		color: #fff;
		font-size: 1.1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.send-btn:disabled {
		background: #d9d9d9;
		cursor: not-allowed;
	}

	.send-btn:not(:disabled):hover {
		background: #333;
	}

	.disclaimer {
		text-align: center;
		font-size: 0.75rem;
		color: #999;
		margin: 0.5rem 0 0;
	}
</style>
