# Amar AI App Builder

A general-purpose AI app-building workspace. It can generate and refine different kinds of web projects, keep a nested file tree, preview HTML projects, save project snapshots in the current browser, and export source files as ZIP.

## Stack
- React + Vite frontend
- Vercel serverless API route (`api/chat.js`)
- Groq Chat Completions API (server-side only)
- JSZip for project export

## Configure Groq
1. Create or rotate a Groq API key in your Groq account.
2. In Vercel, open Project → Settings → Environment Variables.
3. Add `GROQ_API_KEY` with the private key value.
4. Add `GROQ_MODEL` with `qwen/qwen3.8-27b` (or another model enabled for your Groq account).
5. Redeploy after saving environment variables.

Never put the key in `src/`, browser code, GitHub, or a public chat. If a key has been shared publicly, revoke it and create a replacement.

## Deploy on Vercel
1. Upload the contents of this project to your GitHub repository (not the ZIP archive itself).
2. Import that repository into Vercel.
3. Vercel should detect Vite. Build command: `npm run build`; output directory: `dist`.
4. Add the environment variables above and deploy.

## Run locally
Requires Node.js 20+.

```bash
npm install
npm run dev
```

The frontend runs locally. The `/api/chat` route is a Vercel serverless function; for local API testing use Vercel CLI (`vercel dev`) with a local `.env.local` containing the same variables. Never commit `.env.local`.

## Current capabilities and limits
- Generates general-purpose project files and preserves nested paths in the editor/export.
- Refinement sends the current project files to the model and asks it to preserve unrelated work.
- New apps are generated as standalone HTML/CSS/vanilla-JavaScript projects so the built-in preview can run them directly.
- The preview embeds the generated `style.css` and `app.js` into the iframe, so local relative file paths do not break the preview.
- Projects are saved in local browser storage on the current device; there is no user account or cloud sync yet.
- External database, authentication, payment, messaging, storage, and hosting services need their own setup. The AI may provide integration scaffolding and list setup requirements, but does not provision those services.
- Generated code must be reviewed and tested before production use. This builder does not claim that generated apps have passed automated tests or security review.
