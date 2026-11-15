
const SYSTEM = `You are Amar AI, a professional general-purpose app builder. Build any app requested: education, Quran, business, IPTV, shopping, booking, dashboards, games and more.

Return ONLY valid JSON:
{"title":"App name","summary":"Short description","files":[{"path":"relative/file/path","content":"complete file content"}],"setup":[]}

Create functional, responsive, mobile-first applications. Prefer simple HTML/CSS/JavaScript unless React or another framework is needed. For React/Vite include package.json, index.html, src/main.jsx and src/style.css. Make buttons work. Include useful validation and error states. Never invent API keys. Keep file paths safe and relative. Return no more than 18 files. For refinement preserve existing functionality and modify only necessary files.`;

function extractJson(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(cleaned);
  } catch {}

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {}
  }

  return null;
}

function validPath(path) {
  return typeof path === "string" &&
    path.length < 180 &&
    !path.startsWith("/") &&
    !path.includes("..") &&
    !path.includes("\\") &&
    path.split("/").every(
      part => part && part !== "." && part !== ".."
    );
}

export default async function handler(req, res) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.ALLOWED_ORIGIN || "*"
  );
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  const key = process.env.GROQ_API_KEY;

  if (!key) {
    return res.status(503).json({
      error: "GROQ_API_KEY is missing in Vercel Environment Variables."
    });
  }

  try {
    const body = req.body || {};
    const prompt = body.prompt;

    if (
      typeof prompt !== "string" ||
      prompt.trim().length < 8
    ) {
      return res.status(400).json({
        error: "Please describe your app in at least 8 characters."
      });
    }

    const mode = body.mode === "refine" ? "refine" : "create";

    const promptLimit = mode === "refine" ? 3000 : 5000;

    if (prompt.length > promptLimit) {
      return res.status(413).json({
        error: `Your description is too long. Please keep it below ${promptLimit} characters.`
      });
    }

    // Keep the total existing project content small.
    const existing =
      body.existingFiles &&
      typeof body.existingFiles === "object"
        ? body.existingFiles
        : {};

    const safeExisting = [];
    let remaining = mode === "refine" ? 6000 : 0;

    if (mode === "refine") {
      for (const [path, content] of Object.entries(existing)) {
        if (
          typeof path !== "string" ||
          typeof content !== "string" ||
          remaining <= 0 ||
          !validPath(path)
        ) continue;

        const text = content.slice(0, remaining);

        safeExisting.push({
          path,
          content: text
        });

        remaining -= text.length;
      }
    }

    const userContent = mode === "refine"
      ? `Update this existing project. Preserve its purpose and working features. Return complete contents for changed files.

EXISTING FILES:
${JSON.stringify(safeExisting)}

REQUEST:
${prompt}`
      : `Build a complete, working application from this request. Choose an appropriate architecture and generate all required files.

REQUEST:
${prompt}`;

    const model =
      process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userContent }
          ],
          temperature: 0.2,
          max_completion_tokens: 12000,
          response_format: {
            type: "json_object"
          }
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.error?.message || "";

      if (response.status === 429) {
        return res.status(429).json({
          error: "Groq usage limit reached. Wait 60 seconds and try again. If it continues, reduce the prompt size or check your Groq limits."
        });
      }

      if (response.status === 401) {
        return res.status(401).json({
          error: "Groq API key rejected. Check GROQ_API_KEY in Vercel."
        });
      }

      return res.status(502).json({
        error: message || `AI request failed (${response.status}).`
      });
    }

    const result = extractJson(
      data?.choices?.[0]?.message?.content
    );

    if (!result || !Array.isArray(result.files)) {
      return res.status(502).json({
        error: "AI did not return valid project files. Please try again."
      });
    }

    const seen = new Set();

    const files = result.files
      .filter(file =>
        file &&
        validPath(file.path) &&
        typeof file.content === "string" &&
        !seen.has(file.path) &&
        seen.add(file.path)
      )
      .slice(0, 18);

    if (!files.length) {
      return res.status(502).json({
        error: "No valid files were generated."
      });
    }

    return res.status(200).json({
      title: String(result.title || "Amar App").slice(0, 90),
      summary: String(result.summary || "").slice(0, 700),
      files,
      setup: Array.isArray(result.setup)
        ? result.setup.slice(0, 10).map(
            item => String(item).slice(0, 300)
          )
        : []
    });

  } catch (error) {
    console.error("Amar API error:", error);

    return res.status(500).json({
      error: "Server error while generating the app. Please try again."
    });
  }
}
