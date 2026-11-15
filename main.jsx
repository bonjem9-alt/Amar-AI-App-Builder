import React, { useMemo, useState } from "react";
import JSZip from "jszip";
import { createRoot } from "react-dom/client";
import { Sparkles, Plus, Search, LayoutDashboard, FolderKanban, Settings, CircleHelp, Bell, ChevronDown, WandSparkles, Smartphone, Monitor, Tablet, Code2, Eye, Download, Copy, Send, Rocket, PanelLeftClose, Clock3, Layers, Zap, Menu, X, Check, ExternalLink, Github, Globe, FileCode2, Trash2 } from "lucide-react";
import "./style.css";

const starters = [
  { icon: "🛍️", name: "Online store", desc: "A modern ecommerce storefront with products and cart", prompt: "Build a modern responsive online store with product cards, category filters, a shopping cart drawer, quantity controls, and checkout summary." },
  { icon: "📅", name: "Booking platform", desc: "Let customers book appointments with ease", prompt: "Build an appointment booking web app with service selection, date and time slots, customer details, and booking confirmation." },
  { icon: "📊", name: "Analytics dashboard", desc: "Visualize your metrics in a clean dashboard", prompt: "Build a responsive analytics dashboard with KPI cards, interactive charts, date filter, and recent activity table." },
  { icon: "🍽️", name: "Restaurant website", desc: "Showcase your menu and accept reservations", prompt: "Build a stylish restaurant website with menu categories, featured dishes, opening hours, reservation form, and location section." }
];
const starterCode = {
  "index.html": `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>My Amar App</title><link rel="stylesheet" href="style.css"></head>
<body><main class="card"><span class="eyebrow">BUILT WITH AMAR</span><h1>Your next idea starts here.</h1><p>Describe an app on the left and Amar AI will build it for you.</p><button id="hello">Try interaction</button><p id="message" aria-live="polite"></p></main><script src="app.js"></script></body></html>`,
  "style.css": `*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(135deg,#0b1020,#171d38);font-family:Inter,system-ui;color:#f7f8ff}.card{width:min(90%,560px);padding:48px;border:1px solid #343c60;border-radius:28px;background:#171d32;box-shadow:0 30px 90px #0006}h1{font-size:clamp(32px,6vw,54px);line-height:1.05;margin:14px 0}.eyebrow{color:#a99bff;font-size:12px;letter-spacing:2px}p{color:#a9b1c8;line-height:1.7}button{border:0;border-radius:12px;padding:13px 20px;background:#8067ff;color:white;font-weight:700;cursor:pointer}`,
  "app.js": `document.querySelector("#hello")?.addEventListener("click",()=>{document.querySelector("#message").textContent="Your app is interactive. Keep building! ✨";});`
};
function App(){
 const [active,setActive]=useState("New project"),[prompt,setPrompt]=useState(""),[busy,setBusy]=useState(false),[files,setFiles]=useState(starterCode),[selected,setSelected]=useState("index.html"),[preview,setPreview]=useState(false),[device,setDevice]=useState("desktop"),[error,setError]=useState(""),[projects,setProjects]=useState(()=>JSON.parse(localStorage.getItem("amar-projects")||"[]")),[projectName,setProjectName]=useState("Untitled project"),[mobileMenu,setMobileMenu]=useState(false),[copied,setCopied]=useState(false);
 const code=files[selected]||"";
 const previewDoc=useMemo(()=>{let html=files["index.html"]||""; const css=files["style.css"]||""; const js=files["app.js"]||""; html=html.replace("</head>",`<style>${css.replace(/<\/style/gi,"")}</style></head>`).replace(/<script[^>]*src=["']app.js["'][^>]*><\/script>/gi,""); return html.replace("</body>",`<script>${js.replace(/<\/script/gi,"")}</script></body>`);},[files]);
 async function build(p=prompt){
  if(p.trim().length<8){setError("Describe your app in at least 8 characters.");return;}
  setBusy(true);setError("");setPreview(false);
  try{
   const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:p})});
   const d=await r.json(); if(!r.ok) throw new Error(d.error||"AI request failed");
   const next={}; d.files.forEach(f=>next[f.path.split("/").pop()]=f.content);
   setFiles(next);setProjectName(d.title||"My new app");setSelected(Object.keys(next)[0]||"index.html");setPreview(true);setActive("Editor");
   const saved=[{id:Date.now(),name:d.title||"My new app",summary:d.summary||"",files:next,updated:new Date().toISOString()},...projects].slice(0,30);setProjects(saved);localStorage.setItem("amar-projects",JSON.stringify(saved));
  }catch(e){setError(e.message||"Could not reach the AI server.");}finally{setBusy(false);}
 }
 async function download(){const zip=new JSZip();Object.entries(files).forEach(([path,content])=>zip.file(path,content));zip.file("README.txt",`Created with Amar AI App Builder\nProject: ${projectName}\n\nOpen index.html in a browser.\n`);const blob=await zip.generateAsync({type:"blob"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=(projectName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"amar-app")+".zip";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function downloadHtml(){const blob=new Blob([previewDoc],{type:"text/html"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="index.html";a.click();URL.revokeObjectURL(a.href);}
 function openProject(p){setFiles(p.files);setProjectName(p.name);setActive("Editor");setPreview(true);}
 const nav=[["Workspace",LayoutDashboard],["New project",Plus],["My projects",FolderKanban]];
 return <div className="app-shell">
  <aside className={`sidebar ${mobileMenu?"show":""}`}><div className="brand"><div className="brand-mark"><Sparkles size={21}/></div><div><b>amar</b><small>AI APP BUILDER</small></div><button className="icon-btn close-menu" onClick={()=>setMobileMenu(false)}><X/></button></div>
   <button className="new-btn" onClick={()=>{setActive("New project");setPrompt("");setMobileMenu(false)}}><Plus size={17}/> Create new app</button>
   <div className="nav-label">WORKSPACE</div>{nav.map(([n,I])=><button key={n} className={`nav-item ${active===n?"active":""}`} onClick={()=>{setActive(n);setMobileMenu(false)}}><I size={18}/>{n}{n==="My projects"&&<span className="count">{projects.length}</span>}</button>)}
   <div className="nav-label space-top">PREFERENCES</div><button className="nav-item" onClick={()=>setError("Settings: add your API key in Vercel → Project Settings → Environment Variables.")}><Settings size={18}/>Settings</button><button className="nav-item" onClick={()=>setError("Help: describe your app, generate, edit files, preview, then export.")}><CircleHelp size={18}/>Help center</button>
   <div className="side-bottom"><div className="plan-card"><div className="plan-icon"><Zap size={16}/></div><b>Build without limits</b><p>Connect your Gemini API key to start creating.</p><button onClick={()=>setError("Add GEMINI_API_KEY in Vercel Environment Variables, then redeploy.")}>Configure AI <ExternalLink size={13}/></button></div><div className="profile"><div className="avatar">A</div><div><b>Amar Workspace</b><small>Personal plan</small></div><ChevronDown size={16}/></div></div>
  </aside>
  {mobileMenu&&<div className="scrim" onClick={()=>setMobileMenu(false)}></div>}
  <main className="main">
   <header className="topbar"><button className="icon-btn mobile-toggle" onClick={()=>setMobileMenu(true)}><Menu/></button><div className="crumb">Workspace <span>/</span> <b>{active}</b></div><div className="top-actions"><span className="status"><i></i> All systems normal</span><button className="icon-btn"><Bell size={18}/></button><div className="avatar small">A</div></div></header>
   {active==="New project"||active==="Workspace"?<section className="welcome">
    <div className="hero"><div className="hero-pill"><Sparkles size={13}/> YOUR AI-POWERED CREATIVE STUDIO</div><h1>Build something<br/><span>extraordinary.</span></h1><p>Describe your idea. Amar turns it into a working app — ready to preview, refine, and launch.</p>
     <div className="prompt-box"><div className="prompt-top"><WandSparkles size={18}/><span>Describe the app you want to create</span><span className="model-tag">Gemini AI <i></i></span></div><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="e.g. Build a modern fitness tracker with workout plans, progress charts, and a daily goals checklist..." rows="4"/><div className="prompt-bottom"><span>✦ Be specific for better results</span><button className="generate-btn" onClick={()=>build()} disabled={busy}>{busy?<><span className="spinner"></span> Building...</>:<><Sparkles size={16}/> Generate app <span>→</span></>}</button></div></div>
     {error&&<div className="error-msg">{error}</div>}
    </div>
    <div className="section-head"><div><h2>Start with a template</h2><p>Pick a starting point and make it yours.</p></div><span className="muted">4 templates</span></div>
    <div className="templates">{starters.map((s,i)=><button className="template" key={s.name} onClick={()=>{setPrompt(s.prompt);window.scrollTo({top:0,behavior:"smooth"})}}><div className={`template-icon t${i}`}>{s.icon}</div><b>{s.name}</b><p>{s.desc}</p><span className="template-arrow">↗</span></button>)}</div>
    <div className="feature-strip"><div><div className="feature-icon purple"><WandSparkles/></div><b>AI-powered generation</b><p>From a prompt to a working prototype.</p></div><div><div className="feature-icon blue"><Eye/></div><b>Instant live preview</b><p>See every change as you build.</p></div><div><div className="feature-icon green"><Code2/></div><b>Full code ownership</b><p>Edit and export your project files.</p></div></div>
   </section>:active==="My projects"?<section className="projects-page"><div className="page-title"><div><span className="eyebrow">YOUR WORKSPACE</span><h1>My projects</h1><p>All your creations, in one place.</p></div><button className="generate-btn" onClick={()=>setActive("New project")}><Plus size={16}/> New project</button></div>{projects.length===0?<div className="empty"><div className="empty-icon"><FolderKanban/></div><h3>No projects yet</h3><p>Your generated apps will appear here.</p><button className="generate-btn" onClick={()=>setActive("New project")}>Create your first app</button></div>:<div className="project-grid">{projects.map(p=><button className="project-card" key={p.id} onClick={()=>openProject(p)}><div className="project-preview"><Layers size={28}/><span>AMAR PROJECT</span></div><b>{p.name}</b><p>{p.summary}</p><small><Clock3 size={12}/> {new Date(p.updated).toLocaleDateString()}</small></button>)}</div>}</section>:<section className="editor-page">
    <div className="editor-toolbar"><div><button className="back-link" onClick={()=>setActive("New project")}>← Workspace</button><h2>{projectName}</h2></div><div className="editor-actions"><button className={`tab-btn ${!preview?"selected":""}`} onClick={()=>setPreview(false)}><Code2 size={15}/> Code</button><button className={`tab-btn ${preview?"selected":""}`} onClick={()=>setPreview(true)}><Eye size={15}/> Preview</button><button className="outline-btn" onClick={download}><Download size={15}/> Export project</button></div></div>
    <div className="editor-workspace"><div className="code-panel"><div className="panel-label"><span>PROJECT FILES</span><span>{Object.keys(files).length} files</span></div>{Object.keys(files).map(f=><button key={f} className={`file-row ${selected===f?"file-active":""}`} onClick={()=>setSelected(f)}><FileCode2 size={15}/>{f}</button>)}<div className="code-heading"><span>{selected}</span><button className="icon-btn" title="Copy code" onClick={()=>{navigator.clipboard?.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),1300)}}>{copied?<Check size={14}/>:<Copy size={14}/>}</button></div><textarea className="code-editor" spellCheck="false" value={code} onChange={e=>setFiles({...files,[selected]:e.target.value})}/></div>
     <div className="preview-panel"><div className="preview-head"><div><span className="live-dot"></span> LIVE PREVIEW</div><div className="device-switch"><button className={device==="desktop"?"on":""} onClick={()=>setDevice("desktop")}><Monitor size={15}/></button><button className={device==="tablet"?"on":""} onClick={()=>setDevice("tablet")}><Tablet size={15}/></button><button className={device==="mobile"?"on":""} onClick={()=>setDevice("mobile")}><Smartphone size={15}/></button></div><button className="icon-btn" onClick={downloadHtml} title="Download HTML"><Download size={15}/></button></div><div className="preview-canvas"><iframe title="App preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={previewDoc} className={`device-frame ${device}`}/></div></div>
    </div>
   </section>}
   <footer className="footer"><span>© 2026 Amar AI App Builder</span><span>Made for creators <span className="heart">✦</span></span></footer>
  </main>
 </div>
}
createRoot(document.getElementById("root")).render(<App/>);