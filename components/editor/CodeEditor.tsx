"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState, useEffect } from "react";
import { ReactPreview } from "./ReactPreview";
import { Sparkles, Lightbulb, Code2, Eye, Loader2 } from "lucide-react";
import type { ProgrammingLanguage } from "@/lib/types/database";

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(
  async () => {
    const { default: Editor } = await import("@monaco-editor/react");
    return Editor;
  },
  {
    loading: () => <EditorSkeleton />,
    ssr: false,
  },
);

interface CodeEditorProps {
  defaultValue: string;
  /** Change this when a new problem loads to remount Monaco with fresh starter code */
  resetKey?: string;
  onChange: (value: string) => void;
  language: ProgrammingLanguage;
  onEvaluate?: (code: string) => Promise<void>;
  onRun?: (code: string) => Promise<void>;
  onHintRequest: (level: number) => Promise<void>;
  isEvaluating?: boolean;
  isRunning?: boolean;
  testResults?: Array<{
    passed: boolean;
    test_case_index: number;
    execution_time_ms: number;
  }>;
  sessionId: string;
  userId: string;
}

/**
 * React Challenge Code Editor
 * Monaco editor (UNCONTROLLED) + debounced live preview + AI evaluation
 */
export function CodeEditor({
  defaultValue,
  resetKey,
  onChange,
  language,
  onEvaluate,
  onHintRequest,
  isEvaluating,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const currentCodeRef = useRef(defaultValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activePane, setActivePane] = useState<"code" | "preview" | "split">(
    "split",
  );
  // Debounced code for the preview pane — avoids re-rendering iframe on every keystroke
  const [previewCode, setPreviewCode] = useState(defaultValue);

  const monacoLang = language === "typescript" ? "typescript" : "javascript";

  // When resetKey changes (new problem loaded), sync preview immediately
  useEffect(() => {
    currentCodeRef.current = defaultValue;
    setPreviewCode(defaultValue);
  }, [resetKey, defaultValue]);

  // Monaco onChange — update ref + notify parent + debounce preview
  const handleMonacoChange = useCallback(
    (v: string | undefined) => {
      const code = v ?? "";
      currentCodeRef.current = code;
      onChange(code);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setPreviewCode(code), 600);
    },
    [onChange],
  );

  // Evaluate uses ref so it always has the latest code without depending on parent state
  const handleEvaluate = useCallback(async () => {
    if (!onEvaluate) return;
    try {
      await onEvaluate(currentCodeRef.current);
    } catch (error) {
      console.error("[editor] Evaluate error:", error);
    }
  }, [onEvaluate]);

  const handleHint = useCallback(
    async (level: number) => {
      try {
        await onHintRequest(level);
      } catch (error) {
        console.error("[editor] Hint error:", error);
      }
    },
    [onHintRequest],
  );

  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;

    // TypeScript/JSX compiler options for React
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
      allowSyntheticDefaultImports: true,
    });

    // Suppress type errors so red squiggles don't distract participants
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });

    // Add React type stubs so Monaco shows IntelliSense
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `declare const React: any;
       declare const useState: any;
       declare const useEffect: any;
       declare const useCallback: any;
       declare const useMemo: any;
       declare const useRef: any;
       declare const useContext: any;
       declare const createContext: any;`,
      "file:///react.d.ts",
    );

    editor.updateOptions({
      minimap: { enabled: false },
      lineNumbers: "on",
      scrollBeyondLastLine: false,
      automaticLayout: true,
      fontSize: 14,
      fontFamily: '"Fira Code", "Cascadia Code", Monaco, Menlo, monospace',
      fontLigatures: true,
      padding: { top: 16, bottom: 16 },
      formatOnPaste: true,
      formatOnType: false,
      wordWrap: "on",
      tabSize: 2,
    });
  }, []);

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-3 py-2">
        {/* Left: Pane switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-800 p-1">
          <button
            onClick={() => setActivePane("code")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              activePane === "code"
                ? "bg-slate-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            Code
          </button>
          <button
            onClick={() => setActivePane("split")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              activePane === "split"
                ? "bg-slate-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setActivePane("preview")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              activePane === "preview"
                ? "bg-slate-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleHint(1)}
            disabled={isEvaluating}
            className="flex items-center gap-1.5 rounded-lg bg-amber-900/30 border border-amber-700/40 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-900/50 disabled:opacity-50 transition"
            title="Get a React coaching hint"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Hint
          </button>
          <button
            onClick={handleEvaluate}
            disabled={isEvaluating}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-all shadow ${
              isEvaluating
                ? "bg-slate-600 opacity-60 cursor-not-allowed"
                : "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
            }`}
          >
            {isEvaluating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                &nbsp;Evaluating...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                &nbsp;AI Evaluate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor + Preview Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Code editor pane — keyed by resetKey so it remounts only on problem change */}
        {(activePane === "code" || activePane === "split") && (
          <div
            className={`flex flex-col overflow-hidden ${
              activePane === "split"
                ? "w-1/2 border-r border-slate-700"
                : "w-full"
            }`}
          >
            <MonacoEditor
              key={resetKey || "editor"}
              height="100%"
              language={monacoLang}
              defaultValue={defaultValue}
              onChange={handleMonacoChange}
              onMount={handleEditorMount}
              theme="vs-dark"
              path={`component-${resetKey || "default"}.${language === "typescript" ? "tsx" : "jsx"}`}
              options={{
                minimap: { enabled: false },
                lineNumbers: "on",
                automaticLayout: true,
                fontSize: 14,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                tabSize: 2,
              }}
            />
          </div>
        )}

        {/* Preview pane — receives debounced code, never triggers editor remount */}
        {(activePane === "preview" || activePane === "split") && (
          <div className={activePane === "split" ? "w-1/2" : "w-full"}>
            <ReactPreview
              code={previewCode}
              language={language === "typescript" ? "typescript" : "javascript"}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex h-full flex-col bg-slate-950">
      <div className="border-b border-slate-700 bg-slate-900 px-4 py-3">
        <div className="h-6 w-32 rounded bg-slate-700" />
      </div>
      <div className="flex-1 animate-pulse bg-slate-900" />
    </div>
  );
}
