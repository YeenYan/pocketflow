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
	"You are Pocketflow's personal finance assistant. Give practical, clear advice on budgeting, saving, debt, and spending habits. Use plain language. Do not give legal or tax advice — suggest consulting a professional for that. If the user shares numbers, help them reason about tradeoffs; do not invent account data.";

const app = express();
const server = http.createServer(app);
app.use(express.json());

app.post("/api/chat", async (req, res) => {
	const apiKey = process.env.GROQ_API_KEY || env.GROQ_API_KEY;
	if (!apiKey) {
		res.status(500).json({ error: "GROQ_API_KEY is not set" });
		return;
	}

	const { messages } = req.body;
	if (!Array.isArray(messages)) {
		res.status(400).json({ error: "messages must be an array" });
		return;
	}

	try {
		const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "llama-3.3-70b-versatile",
				messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
			}),
		});

		const data = await response.json();
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
