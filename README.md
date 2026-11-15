# Amar AI App Builder

A responsive AI app-building workspace built with React + Vite and a Vercel serverless API route. Gemini Interactions API calls happen on the server; the API key is never shipped to the browser.

## Features
- Prompt-to-app generation using Gemini
- Generated project file explorer and editable code
- Sandboxed live preview (HTML/CSS/JS)
- Export generated project as a ZIP archive and preview as HTML
- Local project history in browser storage
- Responsive desktop / tablet / mobile layout
- Lucide icons and Amar visual identity

## Important hosting note
GitHub stores your source code; it does not run the private AI backend. This project is configured for Vercel because it supports the `/api` serverless function in this repository. You will need to connect the GitHub repository to Vercel once, then add your Gemini API key as an environment variable. After that, pushes to the connected branch deploy automatically.

## Deploy
1. Create a new GitHub repository and upload the contents of this ZIP (not the ZIP file itself).
2. In Vercel, import that GitHub repository.
3. In Vercel → Project Settings → Environment Variables, add:
   - `GEMINI_API_KEY` = your private Gemini API key
   - `GEMINI_MODEL` = `gemini-3.8-flash` (or a model currently enabled for your Gemini API project)
4. Deploy / redeploy. Open the generated Vercel URL.
5. To update the app later, push changes to GitHub; Vercel will redeploy.

## Run locally
Requires Node.js 20+.
```bash
npm install
npm run dev
```
The UI will load, but AI generation requires deployment with `GEMINI_API_KEY` configured. For local API testing, use Vercel CLI (`vercel dev`) after creating `.env.local` with the same environment variables. Never commit `.env.local`.

## Security
- Never paste API keys into frontend files, GitHub commits, or chat.
- Configure secrets in Vercel Environment Variables.
- The API route validates requests and limits prompt size.
- Generated preview runs in a sandboxed iframe.
- This is an MVP builder: generated apps are client-side HTML/CSS/JS projects. It does not yet provide hosted databases, authentication, or one-click publishing of each generated app.
