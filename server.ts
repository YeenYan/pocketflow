import express from "express";
import http from "http";
import { createServer as createViteServer } from "vite";
import { loadEnv } from "vite";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.argv.includes("--prod");
const env = loadEnv(isProd ? "production" : "development", __dirname, "");

const SYSTEM_PROMPT =
	"You are Pocketflow's personal finance assistant built into the user's budgeting app. The app sends you their real budget records in each request, including pre-computed yearly totals. You MUST answer budget questions using those records. Never say you cannot access their data, that you are only text-based, or that they need to share numbers you already have. Use the pre-computed yearly totals for year analysis instead of recalculating totals yourself. Use plain language. Do not give legal or tax advice. Never ask for or reference PINs, passwords, lock settings, or other credentials.";

const app = express();
const server = http.createServer(app);
app.use(express.json());

app.post("/api/chat", async (req, res) => {
	const apiKey = process.env.GROQ_API_KEY || env.GROQ_API_KEY;
	if (!apiKey) {
		res.status(500).json({ error: "GROQ_API_KEY is not set" });
		return;
	}

	const { messages, context } = req.body as {
		messages?: unknown;
		context?: unknown;
	};
	if (!Array.isArray(messages)) {
		res.status(400).json({ error: "messages must be an array" });
		return;
	}

	const systemContent =
		typeof context === "string" && context.trim()
			? `${SYSTEM_PROMPT}\n\n--- Pocketflow budget records (use these figures) ---\n${context}\n--- End of records ---`
			: `${SYSTEM_PROMPT}\n\nNo budget records were provided for this message. Tell the user you could not load their cutoff data and suggest they open the Tracker and confirm an active cutoff is set.`;

	const chatMessages = messages.filter(
		(m): m is { role: string; content: string } =>
			!!m &&
			typeof m === "object" &&
			(m as { role?: string }).role !== "system" &&
			typeof (m as { content?: string }).content === "string",
	);

	try {
		const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "llama-3.3-70b-versatile",
				messages: [{ role: "system", content: systemContent }, ...chatMessages],
			}),
		});

		const data = (await response.json()) as {
			error?: { message?: string };
			choices: { message: { content: string } }[];
		};
		if (!response.ok) {
			res
				.status(response.status)
				.json({ error: data.error?.message || "AI request failed" });
			return;
		}

		res.json({ reply: data.choices[0].message.content });
	} catch {
		res.status(500).json({ error: "Failed to reach AI service" });
	}
});

if (isProd) {
	app.use(express.static(path.join(__dirname, "dist")));
	app.get(/^(?!\/api).*/, (_req, res) => {
		res.sendFile(path.join(__dirname, "dist", "index.html"));
	});
} else {
	const vite = await createViteServer({
		server: {
			middlewareMode: true,
			hmr: { server },
		},
		appType: "spa",
	});
	app.use(vite.middlewares);
}

const port = process.env.PORT || 3000;
server.listen(port, () => {
	console.log(`Pocketflow running at http://localhost:${port}`);
});
