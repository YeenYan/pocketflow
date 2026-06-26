import * as localAI from "./localAI.js";

let usingOffline = false;

export function isOfflineMode() {
	return usingOffline;
}

export function isAIReady() {
	return localAI.isAIReady();
}

export function getLoadProgress() {
	return localAI.getLoadProgress();
}

export async function initializeAI(onProgress) {
	return localAI.initializeAI(onProgress);
}

async function chatGroq(messages) {
	const response = await fetch("/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ messages }),
	});
	const data = await response.json();
	if (!response.ok) {
		throw new Error(data.error || "Groq request failed");
	}
	return data.reply;
}

export async function chat(messages) {
	usingOffline = false;

	if (navigator.onLine) {
		try {
			return await chatGroq(messages);
		} catch {
			// fall through to local AI
		}
	}

	usingOffline = true;

	if (!localAI.isWebGPUSupported()) {
		if (navigator.onLine) {
			throw new Error(
				"Cloud AI unavailable and this device does not support offline AI (WebGPU).",
			);
		}
		throw new Error(
			"You are offline. This device does not support offline AI (WebGPU).",
		);
	}

	return localAI.sendMessage(messages);
}
