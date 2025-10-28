import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname)); // serve HTML and assets from project root

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: "No message provided" });

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return res.json({ reply: `Mock reply (no OPENAI_API_KEY set). You said: "${message}".` });
    }

    const body = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a concise assistant about Kachi and his portfolio." },
        { role: "user", content: message }
      ],
      max_tokens: 250,
      temperature: 0.3
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("OpenAI error", resp.status, t);
      return res.status(502).json({ error: "AI provider error" });
    }

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content || "No response.";
    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// Fallback to home for root
app.get("/", (_, res) => res.sendFile(path.join(__dirname, "index.html")));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
