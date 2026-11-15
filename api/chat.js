const SYSTEM = `You are Amar AI App Builder, a senior full-stack engineer and product designer.
Turn the user's request into a useful, complete single-page web app.
Return ONLY a valid JSON object with exactly these keys: title, summary, files.
files must be an array of objects with path and content string properties.
Generate index.html, style.css, and app.js. Use semantic accessible HTML, responsive modern CSS, and vanilla JavaScript. No external build tools.
Make every visible control work. Use localStorage when sensible. Avoid placeholder-only output.
Do not claim deployment or backend capabilities that are not implemented.
For safety, do not generate credential theft, malware, phishing, exploit code, or covert surveillance.`;

function extractJson(text) {
  if (typeof text !== "string") return null;
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "Groq API key is not configured. Add GROQ_API_KEY in Vercel → Project Settings → Environment Variables, then redeploy." });
  }

  try {
    const { prompt, history = [] } = req.body || {};
    if (typeof prompt !== "string" || prompt.trim().length < 8) {
      return res.status(400).json({ error: "Describe your app in at least 8 characters." });
    }
    if (prompt.length > 12000) {
      return res.status(413).json({ error: "Prompt is too long (maximum 12,000 characters)." });
    }

    const model = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
    const messages = [
      { role: "system", content: SYSTEM },
      ...history.slice(-8).filter(m => m && ["user", "assistant"].includes(m.role)).map(m => ({
        role: m.role,
        content: String(m.text || "").slice(0, 6000)
      })),
      { role: "user", content: `Create the app described below. Return JSON only.\n\n${prompt.trim()}` }
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.25,
        max_completion_tokens: 12000,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || `Groq request failed (${response.status}).`;
      const status = response.status === 401 ? 401 : response.status === 429 ? 429 : 502;
      return res.status(status).json({ error: status === 401 ? "Groq rejected the API key. Check GROQ_API_KEY in Vercel." : status === 429 ? "Groq free-tier rate or token limit reached. Please wait and try again." : message });
    }

    const raw = data?.choices?.[0]?.message?.content;
    const result = extractJson(raw);
    if (!result || !Array.isArray(result.files) || !result.files.length) {
      return res.status(502).json({ error: "Groq returned an invalid app format. Please try again with a more specific description." });
    }

    const files = result.files
      .filter(f => f && typeof f.path === "string" && typeof f.content === "string" && !f.path.includes("..") && !f.path.startsWith("/"))
      .slice(0, 12);
    if (!files.length) return res.status(502).json({ error: "No valid project files were returned." });

    return res.status(200).json({
      title: String(result.title || "Your new app").slice(0, 100),
      summary: String(result.summary || "").slice(0, 500),
      files
    });
  } catch (error) {
    return res.status(500).json({ error: "Server error while contacting Groq. Please try again." });
  }
}
