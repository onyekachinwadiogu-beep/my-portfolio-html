// server.js — resilient demo version
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
app.use(express.static(__dirname));

// --- Simple site data for mock replies ---
const PROFILE = {
  name: "Kachi Nwadiogu",
  role: "Information Technology student",
  skills: ["HTML", "CSS", "JavaScript", "Node/Express", "AI APIs"],
  projects: ["AI Portfolio Website", "Employee Management System", "SpaceX API Viewer"]
};

// --- Health check ---
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    hasKey: !!process.env.OPENAI_API_KEY,
    demoMode: process.env.DEMO_MODE === "1"
  });
});

// --- Helper: build a friendly mock reply for class demos ---
function mockReply(userMsg) {
  const lower = (userMsg || "").toLowerCase();
  if (lower.includes("name")) return `You're chatting with ${PROFILE.name}.`;
  if (lower.includes("project"))
    return `Recent projects: ${PROFILE.projects.join(", ")}. Want details on one?`;
  if (lower.includes("skill"))
    return `Core skills: ${PROFILE.skills.join(", ")}. I also enjoy building AI features.`;
  return `I’m a demo assistant for ${PROFILE.name}, a ${PROFILE.role}. Ask about skills, projects, or the portfolio.`;
}

// --- AI Chat route with graceful fallback on 429 / no key ---
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "No message provided" });
    }

    // Force demo mode if requested
    if (process.env.DEMO_MODE === "1") {
      return res.json({ reply: mockReply(message) });
    }

    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      console.warn("[/api/chat] No OPENAI_API_KEY; returning demo reply.");
      return res.json({ reply: mockReply(message) });
    }

    const body = {
      // If you ever get model_not_found, switch to "gpt-3.5-turbo"
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
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("[OpenAI error]", resp.status, text);

      // Friendly fallback for class if quota/429 or any provider error
      if (resp.status === 429) {
        return res.json({
          reply: mockReply(message),
          note: "AI provider quota exceeded—showing demo reply."
        });
      }
      // Other non-OK: still give a demo response so the UI never blanks
      return res.json({
        reply: mockReply(message),
        note: `AI provider error (${resp.status})—showing demo reply.`
      });
    }

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content || mockReply(message);
    return res.json({ reply });
  } catch (err) {
    console.error("[/api/chat] Crash:", err);
    // Last-resort fallback
    return res.json({
      reply: mockReply(req.body?.message || ""),
      note: "Server error—showing demo reply."
    });
  }
});

// Root -> index.html
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
