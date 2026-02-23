"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, AlertCircle, ExternalLink } from "lucide-react";

interface ReactPreviewProps {
  code: string;
  language?: "javascript" | "typescript";
}

/**
 * Live React Preview Component
 * Renders user JSX/TSX in a sandboxed iframe using Babel + React CDN.
 * Zero extra npm packages needed — fully in-browser transpilation.
 */
export function ReactPreview({
  code,
  language = "typescript",
}: ReactPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildDocument(userCode: string): string {
    // Strip TypeScript type annotations so Babel (JSX-only preset) can handle them
    // We use @babel/standalone with the typescript preset
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <!-- React 18 -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <!-- Babel standalone for JSX/TSX transpilation -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- Tailwind CSS for instant styling -->
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 12px; font-family: system-ui, sans-serif; background: #fff; color: #111; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="error-display" style="display:none; color: #dc2626; background: #fef2f2; border: 1px solid #fca5a5; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; white-space: pre-wrap;"></div>

  <script type="text/babel" data-presets="react,typescript">
    const { useState, useEffect, useCallback, useMemo, useRef, useContext, createContext, Fragment } = React;

    try {
      ${userCode}

      // Try to find a default export — render it
      const rootEl = document.getElementById('root');
      if (typeof App !== 'undefined') {
        ReactDOM.createRoot(rootEl).render(React.createElement(App));
      } else if (typeof default_1 !== 'undefined') {
        ReactDOM.createRoot(rootEl).render(React.createElement(default_1));
      } else {
        rootEl.innerHTML = '<div style="color:#6b7280;padding:24px;text-align:center"><p style="font-size:14px">Export a default component named <strong>App</strong> to see a preview.</p><pre style="font-size:12px;margin-top:8px;background:#f3f4f6;padding:8px;border-radius:4px">export default function App() {\\n  return &lt;div&gt;Hello World&lt;/div&gt;\\n}</pre></div>';
      }
    } catch(e) {
      const errEl = document.getElementById('error-display');
      const rootEl = document.getElementById('root');
      rootEl.style.display = 'none';
      errEl.style.display = 'block';
      errEl.textContent = e.toString();

      // Also post message to parent for error display
      window.parent.postMessage({ type: 'preview-error', message: e.toString() }, '*');
    }
  </script>
</body>
</html>`;
  }

  useEffect(() => {
    if (!code.trim()) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsLoading(true);
    setError(null);

    debounceRef.current = setTimeout(() => {
      try {
        const doc = buildDocument(code);
        const blob = new Blob([doc], { type: "text/html" });
        const url = URL.createObjectURL(blob);

        if (iframeRef.current) {
          iframeRef.current.src = url;
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }
        setIsLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Preview error");
        setIsLoading(false);
      }
    }, 600); // 600ms debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [code]);

  // Listen for errors posted from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "preview-error") {
        setError(e.data.message);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const refresh = () => {
    const doc = buildDocument(code);
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    if (iframeRef.current) {
      iframeRef.current.src = url;
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
    setError(null);
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Preview toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <span className="text-xs font-medium text-slate-500">
            Live Preview
          </span>
          {isLoading && (
            <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
          )}
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 transition"
          title="Refresh preview"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-3 py-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <pre className="flex-1 overflow-x-auto text-xs text-red-700 whitespace-pre-wrap">
            {error}
          </pre>
        </div>
      )}

      {/* Empty state */}
      {!code.trim() ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <ExternalLink className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-400">
              Start writing React code to see a live preview
            </p>
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
