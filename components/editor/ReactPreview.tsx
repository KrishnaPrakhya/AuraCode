"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, AlertCircle, ExternalLink } from "lucide-react";

export interface FileEntry {
  name: string;
  code: string;
}

interface ReactPreviewProps {
  /** Single-file mode */
  code?: string;
  /** Multi-file mode — all files rendered together */
  files?: FileEntry[];
  language?: "javascript" | "typescript";
}

// ---------------------------------------------------------------------------
// Code preprocessing — strips ES module syntax so code runs in a plain
// browser <script> where React & friends are already globals from CDN.
// ---------------------------------------------------------------------------

function preprocessCode(raw: string): string {
  return (
    raw
      // import React / import { useState } / import * as X / import './foo'
      .replace(
        /^import\s+(?:type\s+)?(?:[^'";\n]*\s+from\s+)?['"][^'"]*['"];?[ \t]*$/gm,
        "",
      )
      // export default function App  →  function App
      .replace(/\bexport\s+default\s+function\s+/g, "function ")
      // export default class App  →  class App
      .replace(/\bexport\s+default\s+class\s+/g, "class ")
      // export default SomeName;  →  (removed)
      .replace(/^export\s+default\s+\w+;?\s*$/gm, "")
      // export function X  →  function X
      .replace(/\bexport\s+function\s+/g, "function ")
      // export const / let / var  →  const / let / var
      .replace(/\bexport\s+(const|let|var)\s+/g, "$1 ")
      // export class X  →  class X
      .replace(/\bexport\s+class\s+/g, "class ")
      // export type { ... }  (remove)
      .replace(/^export\s+type\s+\{[^}]*\};?\s*$/gm, "")
      // export { X, Y }  (remove)
      .replace(/^export\s+\{[^}]*\};?\s*$/gm, "")
  );
}

function combineFiles(files: FileEntry[]): string {
  if (files.length === 0) return "";
  if (files.length === 1) return preprocessCode(files[0].code);

  const entryNames = ["App.tsx", "App.jsx", "index.tsx", "index.jsx"];
  const entry =
    files.find((f) => entryNames.includes(f.name)) ?? files[files.length - 1];
  const helpers = files.filter((f) => f !== entry);

  return [
    ...helpers.map(
      (f) =>
        `// ─── ${f.name} ─────────────────────────────────\n${preprocessCode(f.code)}`,
    ),
    `// ─── ${entry.name} ────────────────────────────────\n${preprocessCode(entry.code)}`,
  ].join("\n\n");
}

function buildDocument(combinedCode: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin:0; padding:12px; font-family:system-ui,sans-serif; background:#fff; color:#111; }
    * { box-sizing:border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="error-display" style="display:none;color:#dc2626;background:#fef2f2;border:1px solid #fca5a5;padding:12px;border-radius:6px;font-family:monospace;font-size:13px;white-space:pre-wrap;"></div>

  <script type="text/babel" data-presets="react,typescript">
    // Hooks & helpers available as globals — no import needed
    const {
      useState, useEffect, useCallback, useMemo, useRef,
      useContext, createContext, useReducer, useId,
      Fragment, memo, forwardRef, lazy, Suspense,
    } = React;

    try {
      ${combinedCode}

      const rootEl = document.getElementById('root');
      const ComponentToRender =
        typeof App !== 'undefined' ? App :
        typeof default_1 !== 'undefined' ? default_1 :
        null;

      if (ComponentToRender) {
        ReactDOM.createRoot(rootEl).render(React.createElement(ComponentToRender));
      } else {
        rootEl.innerHTML = \`<div style="color:#6b7280;padding:24px;text-align:center">
          <p style="font-size:14px">Export a default component named <strong>App</strong> to see a preview.</p>
          <pre style="font-size:12px;margin-top:8px;background:#f3f4f6;padding:8px;border-radius:4px">export default function App() {\\n  return &lt;div&gt;Hello World&lt;/div&gt;\\n}</pre>
        </div>\`;
      }
    } catch(e) {
      const errEl = document.getElementById('error-display');
      document.getElementById('root').style.display = 'none';
      errEl.style.display = 'block';
      errEl.textContent = e.toString();
      window.parent.postMessage({ type: 'preview-error', message: e.toString() }, '*');
    }
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Live React Preview
 * • Supports single-file (`code`) and multi-file (`files`) modes.
 * • Automatically strips import/export syntax — hooks just work.
 * • React 18 + Babel + Tailwind loaded from CDN — no bundler needed.
 */
export function ReactPreview({
  code,
  files,
  language = "typescript",
}: ReactPreviewProps) {
  const _ = language; // suppress unused warning
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const combinedCode =
    files && files.length > 0
      ? combineFiles(files)
      : preprocessCode(code ?? "");

  function renderPreview(combined: string) {
    const doc = buildDocument(combined);
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    if (iframeRef.current) {
      iframeRef.current.src = url;
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }

  useEffect(() => {
    if (!combinedCode.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsLoading(true);
    setError(null);
    debounceRef.current = setTimeout(() => {
      try {
        renderPreview(combinedCode);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Preview error");
      } finally {
        setIsLoading(false);
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinedCode]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "preview-error") setError(e.data.message);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const refresh = () => {
    renderPreview(combinedCode);
    setError(null);
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <span className="text-xs font-medium text-slate-500">Live Preview</span>
          {isLoading && <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />}
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 transition"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-3 py-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <pre className="flex-1 overflow-x-auto text-xs text-red-700 whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {!combinedCode.trim() ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <ExternalLink className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-400">Start writing React code to see a live preview</p>
            <p className="mt-1 text-xs text-slate-400">
              Export a default component named{" "}
              <code className="rounded bg-slate-100 px-1">App</code>
            </p>
          </div>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          className="flex-1 w-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title="React Preview"
        />
      )}
    </div>
  );
}
