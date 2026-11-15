
import React, { useMemo } from "react";

export default function AppPreview({ files = {}, device = "desktop" }) {
  const preview = useMemo(() => {
    const get = (path) =>
      typeof files[path] === "string" ? files[path] : "";

    let html = get("index.html");

    if (!html) {
      return `<!doctype html><html><body>
        <h2>No index.html found</h2>
      </body></html>`;
    }

    const css = get("src/style.css") || get("style.css");
    const js = get("app.js");

    if (css) {
      const style = `<style>${css.replace(/<\/style/gi, "")}</style>`;
      html = html.includes("</head>")
        ? html.replace("</head>", style + "</head>")
        : style + html;
    }

    if (js) {
      const script = `<script>${js.replace(/<\/script/gi, "")}</script>`;
      html = html.includes("</body>")
        ? html.replace("</body>", script + "</body>")
        : html + script;
    }

    return html;
  }, [files]);

  return (
    <iframe
      title="Generated application preview"
      srcDoc={preview}
      sandbox="allow-scripts allow-forms allow-modals"
      style={{
        width: "100%",
        height: "100%",
        minHeight: 500,
        border: 0,
        background: "white",
        borderRadius: 12
      }}
    />
  );
}
