const SYSTEM = `You are Amar AI App Builder, a senior full-stack engineer and product designer.
Turn the user's request into a useful, complete single-page web app.
Return ONLY a JSON object with keys: title, summary, files.
files must be an array of {path, content}. Generate index.html, style.css, and app.js.
Use semantic accessible HTML, responsive modern CSS, and vanilla JavaScript. No external build tools.
Make every visible control work. Use localStorage when sensible. Avoid placeholder-only output.
Do not claim deployment or backend capabilities that are not implemented.
For safety, do not generate credential theft, malware, phishing, exploit code, or covert surveillance.`;
const schema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    files: { type: "array", items: { type: "object", properties: {
      path: { type: "string" }, content: { type: "string" }
    }, required: ["path", "content"] } }
  },
  required: ["title", "summary", "files"]
};
function getOutputText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  const steps = Array.isArray(data?.steps) ? data.steps : (Array.isArray(data?.outputs) ? data.outputs : []);
  return steps.filter(s => s?.type === "model_output" || s?.type === "text")
    .flatMap(s => Array.isArray(s?.content) ? s.content : [s])
    .filter(c => c?.type === "text" && typeof c.text === "string")
    .map(c => c.text).join("\n");
}
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: "Gemini API key is not configured. Add GEMINI_API_KEY in Vercel Environment Variables." });
  try {
    const { prompt, history = [] } = req.body || {};
    if (typeof prompt !== "string" || prompt.trim().length < 8) return res.status(400).json({ error: "Describe the app you want in at least 8 characters." });
    if (prompt.length > 12000) return res.status(413).json({ error: "Prompt is too long (maximum 12,000 characters)." });
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const conversation = [
      ...history.slice(-8).map(m => `${m.role === "assistant" ? "Assistant" : "User"}: ${String(m.text).slice(0, 6000)}`),
      `User: ${prompt.trim()}`
    ].join("\n\n");
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY, "Api-Revision": "2026-05-20" },
      body: JSON.stringify({
        model,
        input: conversation,
        system_instruction: SYSTEM,
        response_format: { type: "TEXT", mime_type: "application/json", schema },
        store: false,
        generation_config: { temperature: 0.35, thinking_level: "medium" }
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "Gemini request failed." });
    const raw = getOutputText(data);
    let result;
    try { result = JSON.parse(raw); } catch { return res.status(502).json({ error: "The AI returned an invalid project format. Please try again." }); }
    if (!Array.isArray(result.files) || !result.files.length) return res.status(502).json({ error: "The AI did not return project files." });
    const files = result.files.filter(f => f && typeof f.path === "string" && typeof f.content === "string" && !f.path.includes("..") && !f.path.startsWith("/")).slice(0, 12);
    if (!files.length) return res.status(502).json({ error: "No safe project files were returned." });
    return res.status(200).json({ title: String(result.title || "Your new app").slice(0, 100), summary: String(result.summary || "").slice(0, 500), files });
  } catch {
    return res.status(500).json({ error: "Server error. Please try again." });
  }
}
