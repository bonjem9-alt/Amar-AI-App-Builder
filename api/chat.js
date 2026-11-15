const SYSTEM_PROMPT = `
You are Amar AI, a professional general-purpose AI app builder.

Build complete, functional applications from the user's request.
You can build education, Quran, business, IPTV, shopping, booking,
dashboard, games, productivity and other types of applications.

IMPORTANT OUTPUT RULES:
- Return ONLY one valid JSON object.
- Do not use Markdown or code fences.
- Do not write explanations outside the JSON.
- Every file must contain complete, usable source code.
- Use relative file paths only.
- Never invent API keys or secrets.
- Make the app responsive and mobile-first.
- Make buttons and controls functional.
- Include appropriate loading, error and empty states.
- Do not create unnecessary files.
- Return no more than 12 files.
- Keep each file compact without removing important functionality.

The exact JSON format is:
{
  "title": "Application name",
  "summary": "Short application description",
  "files": [
    {
      "path": "index.html",
      "content": "complete source code"
    }
  ],
  "setup": []
}

For React/Vite applications, include the required files:
- package.json
- index.html
- src/main.jsx
- src/App.jsx
- src/style.css

For simple applications, prefer HTML, CSS and JavaScript.

When modifying an existing application:
- Preserve its existing features.
- Do not remove working functionality.
- Modify only files that need changes.
- Return the complete contents of every modified file.

The response MUST be valid JSON.
`;

function send(res, status, data) {
  return res.status(status).json(data);
}

function extractJSON(value) {
  if (typeof value !== "string") {
    throw new Error("AI returned an empty response.");
  }

  let text = value.trim();

  text = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }

    throw new Error("AI did not return valid JSON.");
  }
}

function compactExistingFiles(existingFiles) {
  if (!existingFiles) return [];

  let entries = [];

  if (Array.isArray(existingFiles)) {
    entries = existingFiles.map((file) => [
      file?.path,
      file?.content
    ]);
  } else if (typeof existingFiles === "object") {
    entries = Object.entries(existingFiles).map(
      ([path, value]) => [
        path,
        typeof value === "string" ? value : value?.content
      ]
    );
  }

  const result = [];
  let totalCharacters = 0;
  const MAX_TOTAL = 7000;
  const MAX_PER_FILE = 1800;

  for (const [rawPath, rawContent] of entries) {
    if (typeof rawPath !== "string") continue;
    if (typeof rawContent !== "string") continue;

    const path = rawPath.trim();

    if (!path || path.startsWith("/") || path.includes("..")) {
      continue;
    }

    const remaining = MAX_TOTAL - totalCharacters;

    if (remaining <= 0) break;

    const content = rawContent.slice(
      0,
      Math.min(MAX_PER_FILE, remaining)
    );

    result.push({
      path,
      content
    });

    totalCharacters += content.length;
  }

  return result;
}

function validateFiles(files) {
  if (!Array.isArray(files)) {
    throw new Error("AI response does not contain a valid files array.");
  }

  const result = [];
  const usedPaths = new Set();

  for (const file of files.slice(0, 12)) {
    if (!file || typeof file !== "object") continue;

    const path =
      typeof file.path === "string" ? file.path.trim() : "";

    const content =
      typeof file.content === "string" ? file.content : "";

    if (!path || !content) continue;

    if (
      path.startsWith("/") ||
      path.includes("..") ||
      path.includes("\\") ||
      path.includes("\0")
    ) {
      continue;
    }

    if (usedPaths.has(path)) continue;

    usedPaths.add(path);

    result.push({
      path,
      content
    });
  }

  if (result.length === 0) {
    throw new Error("AI did not generate any usable application files.");
  }

  return result;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return send(res, 405, {
      error: "Only POST requests are supported."
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return send(res, 500, {
      error: "GROQ_API_KEY is missing in Vercel Environment Variables."
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const prompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";

    const mode =
      body.mode === "refine" ? "refine" : "create";

    if (!prompt) {
      return send(res, 400, {
        error: "Please enter an application description."
      });
    }

    if (prompt.length > 8000) {
      return send(res, 400, {
        error: "Your description is too long. Please shorten it."
      });
    }

    const existingFiles = compactExistingFiles(
      body.existingFiles
    );

    let userMessage = "";

    if (mode === "refine") {
      userMessage = `
TASK: Improve or fix the existing application.

USER INSTRUCTIONS:
${prompt}

EXISTING PROJECT FILES:
${JSON.stringify(existingFiles)}

Return complete contents of the files that need to be changed.
Preserve existing working features.
Return valid JSON only.
`;
    } else {
      userMessage = `
TASK: Create a new complete application.

APPLICATION REQUIREMENTS:
${prompt}

Create the application files now.
Return valid JSON only.
`;
    }

    const model =
      process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          temperature: 0.2,
          max_completion_tokens: 16000,
          reasoning_effort: "none",
          reasoning_format: "hidden",
          response_format: {
            type: "json_object"
          }
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const apiError = data?.error || {};
      const failedGeneration =
        apiError.failed_generation ||
        data?.failed_generation ||
        "";

      const errorMessage =
        apiError.message ||
        `Groq request failed (${response.status}).`;

      return send(res, response.status === 429 ? 429 : 502, {
        error: failedGeneration
          ? `Groq JSON generation failed: ${String(
              failedGeneration
            ).slice(0, 700)}`
          : errorMessage,
        model
      });
    }

    const choice = data?.choices?.[0];
    const message = choice?.message;
    const content = message?.content;

    if (!content) {
      return send(res, 502, {
        error: "The AI returned an empty response.",
        finish_reason: choice?.finish_reason || "unknown",
        model
      });
    }

    let generated;

    try {
      generated = extractJSON(content);
    } catch (error) {
      return send(res, 502, {
        error: error.message,
        finish_reason: choice?.finish_reason || "unknown",
        response_preview: String(content).slice(0, 1000),
        model
      });
    }

    let files;

    try {
      files = validateFiles(generated.files);
    } catch (error) {
      return send(res, 502, {
        error: error.message,
        model
      });
    }

    return send(res, 200, {
      success: true,
      title:
        typeof generated.title === "string"
          ? generated.title
          : "New Application",
      summary:
        typeof generated.summary === "string"
          ? generated.summary
          : "",
      files,
      setup: Array.isArray(generated.setup)
        ? generated.setup
        : [],
      model
    });

  } catch (error) {
    console.error("Amar AI API error:", error);

    return send(res, 500, {
      error:
        error?.message ||
        "An unexpected server error occurred."
    });
  }
}
