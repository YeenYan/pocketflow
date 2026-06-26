const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

const SYSTEM_PROMPT =
	"You are Pocketflow's personal finance assistant. Give practical, clear advice on budgeting, saving, debt, and spending habits. Use plain language. Do not give legal or tax advice — suggest consulting a professional for that. If the user shares numbers, help them reason about tradeoffs; do not invent account data.";

let engine = null;
let initPromise = null;
let loadProgress = 0;

export function isWebGPUSupported() {
	return typeof navigator !== "undefined" && !!navigator.gpu;
}

export function isAIReady() {
	return engine !== null;
}

export function getLoadProgress() {
	return loadProgress;
}

export async function initializeAI(onProgress) {
	if (engine) return engine;
	if (initPromise) return initPromise;

	if (!isWebGPUSupported()) {
		throw new Error(
			"This browser does not support WebGPU. Offline AI is unavailable.",
		);
	}

	initPromise = (async () => {
		let CreateMLCEngine;
		try {
			({ CreateMLCEngine } = await import("@mlc-ai/web-llm"));
		} catch {
			initPromise = null;
			throw new Error("Model failed to load. Try again on Wi-Fi.");
		}

		try {
			engine = await CreateMLCEngine(MODEL_ID, {
				initProgressCallback: (report) => {
					loadProgress = Math.round((report.progress || 0) * 100);
					if (onProgress) onProgress(loadProgress, report.text);
				},
			});
			localStorage.setItem("pocketflow-webllm-ready", "1");
			return engine;
		} catch (err) {
			engine = null;
			initPromise = null;
			if (err.name === "RangeError" || err.message?.includes("memory")) {
				throw new Error("Not enough device memory to load the AI model.");
			}
			throw new Error("Model failed to load. Try again on Wi-Fi.");
		}
	})();

	return initPromise;
}

export async function sendMessage(messages) {
	if (!engine) {
		await initializeAI();
	}

	const reply = await engine.chat.completions.create({
		messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
		temperature: 0.7,
		max_tokens: 512,
	});

	return reply.choices[0].message.content;
}
