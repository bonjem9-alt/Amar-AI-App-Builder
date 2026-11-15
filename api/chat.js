const SYSTEM = `You are Amar AI App Builder, an expert product engineer and UI/UX designer. Your job is to turn the user's description into a complete, usable web app that can run immediately inside Amar's built-in HTML iframe preview.

CRITICAL OUTPUT COMPATIBILITY:
- Generate a standalone browser app using ONLY plain HTML, CSS, and vanilla JavaScript.
- ALWAYS return these exact three core files: index.html, style.css, app.js.
- Do NOT generate React, JSX, TypeScript, Vite, npm dependencies, import statements, module bundlers, or build-step requirements. The built-in preview does not compile those.
- index.html must link to style.css and app.js using relative paths: <link rel="stylesheet" href="style.css"> and <script src="app.js"></script>.
- Do not use external local files, local imports, or package dependencies. If extra files are genuinely useful, keep them optional and ensure the app still runs from the three core files.
- Build multi-page experiences as a single-page app with working navigation and sections/views, so it runs directly in the preview.

FUNCTIONAL QUALITY:
- Build the actual app requested, not a generic landing page or static mockup.
- Every visible button, menu, tab, form, filter, search box, toggle, and navigation item must do something meaningful.
- Implement real client-side behavior in app.js. Use localStorage for appropriate persistence such as settings, favorites, cart, notes, and progress.
- Include realistic sample content where needed so the app is useful immediately.
- Add form validation, helpful empty states, loading/error feedback where appropriate, and mobile-first responsive styling.
- Use accessible semantic HTML, labels, keyboard-friendly controls, and clear focus states.
- Make the design polished and consistent with the user's requested style and audience.
- Do not leave TODOs, dead buttons, placeholder-only screens, or comments instead of implementation.

INTEGRATIONS AND HONESTY:
- Do not invent API keys or claim that external services are connected.
- If the requested app normally needs a backend, database, authentication, payments, live IPTV streams, maps, email, or another external service, make the preview fully usable with a clearly labelled local/demo mode and explain the exact external setup in the setup array. Never expose secrets in browser code.
- Do not pretend a payment, booking, message, login, or external API action succeeded when it was only simulated locally.
- Use public, stable external resources only when necessary; the app must remain understandable if they are unavailable.

RESPONSE FORMAT:
Return ONLY valid JSON in this exact shape:
{"title":"App name","summary":"Short description","files":[{"path":"index.html","content":"complete HTML"},{"path":"style.css","content":"complete CSS"},{"path":"app.js","content":"complete JavaScript"}],"setup":["Only genuine external setup steps, if needed"]}
- Include the complete contents of all three core files, never diffs or partial snippets.
- Keep file paths relative and normalized, without .., leading slash, backslashes, or duplicate paths.
- You may return up to 8 files total, but the three required files must always be present.
- Keep code concise but fully implemented; avoid unnecessary commentary outside JSON.
- Never claim that code has been tested or deployed unless that actually happened.
- Do not generate malware, phishing, credential theft, exploit code, or covert surveillance.`;
function extractJson(s){if(typeof s!=='string')return null;const t=s.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');try{return JSON.parse(t)}catch{}const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1))}catch{}}return null}
function validPath(p){return typeof p==='string'&&p.length<180&&!p.startsWith('/')&&!p.includes('..')&&!p.includes('\\')&&!p.split('/').some(x=>!x||x==='.'||x==='..')}
export default async function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin',process.env.ALLOWED_ORIGIN||'*');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');
 if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const key=process.env.GROQ_API_KEY;if(!key)return res.status(503).json({error:'Groq API key is missing. Add GROQ_API_KEY in Vercel Environment Variables, then redeploy.'});
 try{
  const body=req.body||{};const prompt=body.prompt;
  if(typeof prompt!=='string'||prompt.trim().length<8)return res.status(400).json({error:'Please describe the app or change in at least 8 characters.'});
  if(prompt.length>14000)return res.status(413).json({error:'Prompt is too long. Maximum is 14,000 characters.'});
  const mode=body.mode==='refine'?'refine':'create';const existing=body.existingFiles&&typeof body.existingFiles==='object'?body.existingFiles:{};
  const safeExisting=Object.entries(existing).slice(0,18).map(([path,content])=>({path:String(path).slice(0,180),content:String(content).slice(0,9000)}));
  const history=Array.isArray(body.history)?body.history.slice(-4).filter(x=>x&&['user','assistant'].includes(x.role)).map(x=>({role:x.role,content:String(x.content||'').slice(0,2500)})):[];
  const userContent=mode==='refine'?`REFINE THE EXISTING PROJECT. Keep its current purpose, branding, working features and unrelated files. Apply the user's requested changes. Return the FULL updated file contents for every file you return, not diffs. Existing project files:\n${JSON.stringify(safeExisting)}\n\nRequested changes:\n${prompt}`:`CREATE A NEW GENERAL-PURPOSE APP from this request. Decide suitable pages, features and architecture.\n\nRequest:\n${prompt}`;
  const model=process.env.GROQ_MODEL||'qwen/qwen3.8-27b';
  const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model,messages:[{role:'system',content:SYSTEM},...history,{role:'user',content:userContent}],temperature:0.2,max_completion_tokens:16000,response_format:{type:'json_object'}})});
  const data=await response.json().catch(()=>({}));if(!response.ok){const msg=data?.error?.message||`Groq request failed (${response.status})`;return res.status(response.status===401?401:response.status===429?429:502).json({error:response.status===401?'Groq rejected the API key. Check the private GROQ_API_KEY in Vercel.':response.status===429?'Groq rate or usage limit reached. Wait a little and try again.':msg});}
  const result=extractJson(data?.choices?.[0]?.message?.content);if(!result||!Array.isArray(result.files))return res.status(502).json({error:'The AI response did not contain a valid project file list. Try again with a clearer request.'});
  const seen=new Set();const files=result.files.filter(f=>f&&validPath(f.path)&&typeof f.content==='string'&&!seen.has(f.path)&&seen.add(f.path)).slice(0,24);
  if(!files.length)return res.status(502).json({error:'No valid project files were returned. Please try again.'});
  return res.status(200).json({title:String(result.title||'Amar App').slice(0,90),summary:String(result.summary||'').slice(0,700),files,setup:Array.isArray(result.setup)?result.setup.slice(0,12).map(x=>String(x).slice(0,300)):[]});
 }catch(e){return res.status(500).json({error:'Server error while generating the project. Please retry.'});}
}
