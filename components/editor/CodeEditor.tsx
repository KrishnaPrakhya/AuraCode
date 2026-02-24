"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState, useEffect } from "react";
import { ReactPreview, type FileEntry } from "./ReactPreview";
import {
  Sparkles,
  Lightbulb,
  Code2,
  Eye,
  Loader2,
  Plus,
  X,
  Columns2,
  Send,
  ChevronDown,
} from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import type { ProgrammingLanguage } from "@/lib/types/database";
import type { Problem } from "@/lib/types/database";

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
  /** Returns the hint text so dialog can display it inline */
  onHintRequest: (level: number, question: string) => Promise<string>;
  hintsUsedCount?: number;
  problem?: Problem;
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
  hintsUsedCount = 0,
  isEvaluating,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const currentCodeRef = useRef(defaultValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activePane, setActivePane] = useState<"code" | "preview" | "split">(
    "split",
  );

  // ── Hint dialog state ────────────────────────────────────────────────────
  const MAX_HINTS = 10;
  const [showHintDialog, setShowHintDialog] = useState(false);
  const [hintQuestion, setHintQuestion] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [hintResponse, setHintResponse] = useState<string | null>(null);
  const hintInputRef = useRef<HTMLInputElement>(null);

  const QUICK_TAGS = ["useState", "useEffect", "filtering", "rendering", "props", "event handler"];

  // Close hint dialog and reset
  const closeHintDialog = () => {
    setShowHintDialog(false);
    setHintQuestion("");
    setHintResponse(null);
  };

  // Submit hint question
  const handleAskHint = useCallback(async () => {
    const q = hintQuestion.trim();
    if (!q || hintLoading) return;
    setHintLoading(true);
    setHintResponse(null);
    try {
      const hint = await onHintRequest(1, q);
      setHintResponse(hint || "No hint available right now. Try being more specific!");
    } catch {
      setHintResponse("Couldn't get a hint — please try again.");
    } finally {
      setHintLoading(false);
    }
  }, [hintQuestion, hintLoading, onHintRequest]);

  // Focus input when dialog opens
  useEffect(() => {
    if (showHintDialog) setTimeout(() => hintInputRef.current?.focus(), 50);
  }, [showHintDialog]);

  // ── Multi-file state ──────────────────────────────────────────────────────
  const [files, setFiles] = useState<FileEntry[]>([
    { name: "App.tsx", code: defaultValue },
  ]);
  const [activeFile, setActiveFile] = useState("App.tsx");
  const [newFileName, setNewFileName] = useState("");
  const [showNewFileInput, setShowNewFileInput] = useState(false);

  const currentFileCode =
    files.find((f) => f.name === activeFile)?.code ?? defaultValue;

  const monacoLang = language === "typescript" ? "typescript" : "javascript";

  // When resetKey changes (new problem loaded), reset to single App.tsx with fresh code
  useEffect(() => {
    currentCodeRef.current = defaultValue;
    setFiles([{ name: "App.tsx", code: defaultValue }]);
    setActiveFile("App.tsx");
    setShowNewFileInput(false);
  }, [resetKey, defaultValue]);

  // Monaco onChange — update current file + notify parent (App.tsx = main code for DB)
  const handleMonacoChange = useCallback(
    (v: string | undefined) => {
      const code = v ?? "";
      currentCodeRef.current = code;
      // Update only the active file in the files array
      setFiles((prev) =>
        prev.map((f) => (f.name === activeFile ? { ...f, code } : f)),
      );
      // Notify parent with the entry file's content (for DB save)
      onChange(code);
    },
    [onChange, activeFile],
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
      setShowHintDialog(true);
    },
    [],
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

  // ── File management ──────────────────────────────────────────────────────

  const handleSwitchFile = useCallback(
    (name: string) => {
      // Save Monaco's current content into files before switching
      if (editorRef.current) {
        const current = editorRef.current.getValue() as string;
        setFiles((prev) =>
          prev.map((f) =>
            f.name === activeFile ? { ...f, code: current } : f,
          ),
        );
      }
      setActiveFile(name);
    },
    [activeFile],
  );

  const handleAddFile = useCallback(() => {
    const raw = newFileName.trim();
    if (!raw) return;
    const name = raw.includes(".") ? raw : `${raw}.tsx`;
    if (files.some((f) => f.name === name)) return; // already exists
    const newFile: FileEntry = { name, code: `// ${name}\n` };
    setFiles((prev) => [...prev, newFile]);
    setActiveFile(name);
    setNewFileName("");
    setShowNewFileInput(false);
  }, [newFileName, files]);

  const handleDeleteFile = useCallback(
    (name: string) => {
      if (files.length === 1) return; // cannot delete last file
      setFiles((prev) => prev.filter((f) => f.name !== name));
      if (activeFile === name) {
        setActiveFile(files.find((f) => f.name !== name)?.name ?? "App.tsx");
      }
    },
    [files, activeFile],
  );

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      {/* ── Top toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-700/60 bg-[#0d1117] px-3 py-2">
        {/* Pane switcher */}
        <div className="flex items-center gap-0.5 rounded-lg bg-white/5 p-1">
          <button
            onClick={() => setActivePane("code")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              activePane === "code"
                ? "bg-violet-600 text-white shadow shadow-violet-500/25"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            Code
          </button>
          <button
            onClick={() => setActivePane("split")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              activePane === "split"
                ? "bg-violet-600 text-white shadow shadow-violet-500/25"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Columns2 className="h-3.5 w-3.5" />
            Split
          </button>
          <button
            onClick={() => setActivePane("preview")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              activePane === "preview"
                ? "bg-violet-600 text-white shadow shadow-violet-500/25"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Hint button — shows count + opens question dialog */}
          <div className="relative">
            <button
              onClick={() => hintsUsedCount < MAX_HINTS && setShowHintDialog((v) => !v)}
              disabled={isEvaluating || hintsUsedCount >= MAX_HINTS}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                hintsUsedCount >= MAX_HINTS
                  ? "border-slate-700 bg-slate-800/50 text-slate-500 cursor-not-allowed"
                  : showHintDialog
                  ? "border-amber-500/60 bg-amber-500/20 text-amber-200"
                  : "border-amber-500/25 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              }`}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Hint
              <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                hintsUsedCount >= MAX_HINTS ? "bg-slate-700 text-slate-400" : "bg-amber-500/25 text-amber-300"
              }`}>
                {hintsUsedCount}/{MAX_HINTS}
              </span>
              {hintsUsedCount < MAX_HINTS && <ChevronDown className={`h-3 w-3 transition-transform ${showHintDialog ? "rotate-180" : ""}`} />}
            </button>

            {/* Hint dialog dropdown */}
            {showHintDialog && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-80 rounded-xl border border-amber-700/40 bg-[#0d1117] shadow-2xl shadow-black/50">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-300">Ask for a Hint</span>
                  </div>
                  <button onClick={closeHintDialog} className="text-slate-500 hover:text-slate-300 transition">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {/* Question input */}
                  <div>
                    <p className="mb-2 text-xs text-slate-400">What are you stuck on? Be specific.</p>
                    <div className="flex gap-2">
                      <input
                        ref={hintInputRef}
                        value={hintQuestion}
                        onChange={(e) => setHintQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAskHint()}
                        placeholder="e.g. how do I filter the tasks array?"
                        disabled={hintLoading}
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500/60 disabled:opacity-50"
                      />
                      <button
                        onClick={handleAskHint}
                        disabled={!hintQuestion.trim() || hintLoading}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 transition"
                      >
                        {hintLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Quick tags */}
                  {!hintResponse && (
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_TAGS.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setHintQuestion(tag)}
                          className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-400 hover:border-amber-500/40 hover:text-amber-300 transition"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Loader */}
                  {hintLoading && (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-700/30 bg-amber-900/10 px-3 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                      <span className="text-xs text-amber-300/70">Getting your hint…</span>
                    </div>
                  )}

                  {/* Response */}
                  {hintResponse && !hintLoading && (
                    <div className="rounded-lg border border-amber-700/30 bg-amber-900/10 p-3">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                        <p className="text-xs leading-relaxed text-amber-100">{hintResponse}</p>
                      </div>
                      <button
                        onClick={() => { setHintResponse(null); setHintQuestion(""); setTimeout(() => hintInputRef.current?.focus(), 50); }}
                        className="mt-2 text-[11px] text-amber-500/60 hover:text-amber-400 transition"
                      >
                        Ask another →
                      </button>
                    </div>
                  )}

                  <p className="text-center text-[10px] text-slate-600">{MAX_HINTS - hintsUsedCount} hint{MAX_HINTS - hintsUsedCount !== 1 ? "s" : ""} remaining</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleEvaluate}
            disabled={isEvaluating}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-all shadow ${
              isEvaluating
                ? "bg-slate-700 opacity-70 cursor-not-allowed"
                : "bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/20"
            }`}
          >
            {isEvaluating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                &nbsp;Evaluating…
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

      {/* ── Editor + Preview Area ────────────────────────────────────────── */}
      {activePane === "split" ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
          {/* Code editor pane */}
          <ResizablePanel defaultSize={50} minSize={25} className="flex flex-col overflow-hidden border-r border-slate-700">
            {/* ── File tabs ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-0 overflow-x-auto border-b border-slate-700/60 bg-[#0d1117] scrollbar-none">
              {files.map((f) => (
                <div
                  key={f.name}
                  className={`group flex shrink-0 items-center gap-1.5 border-r border-slate-700 px-3 py-1.5 text-xs cursor-pointer transition ${
                    f.name === activeFile
                      ? "bg-slate-950 text-white border-b-2 border-b-violet-500"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                  onClick={() => handleSwitchFile(f.name)}
                >
                  <span>{f.name}</span>
                  {files.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(f.name);
                      }}
                      className="hidden group-hover:flex h-3.5 w-3.5 items-center justify-center rounded hover:bg-slate-600 text-slate-500 hover:text-red-400 transition"
                      title={`Delete ${f.name}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}

              {/* New file input / button */}
              {showNewFileInput ? (
                <div className="flex items-center gap-1 px-2">
                  <input
                    autoFocus
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddFile();
                      if (e.key === "Escape") {
                        setShowNewFileInput(false);
                        setNewFileName("");
                      }
                    }}
                    placeholder="Button.tsx"
                    className="w-28 rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={handleAddFile}
                    className="text-xs text-violet-400 hover:text-violet-300"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowNewFileInput(false);
                      setNewFileName("");
                    }}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewFileInput(true)}
                  className="flex shrink-0 items-center gap-1 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
                  title="New file"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Monaco — key includes activeFile so it remounts per file */}
            <MonacoEditor
              key={`${resetKey || "editor"}-${activeFile}`}
              height="100%"
              language={monacoLang}
              defaultValue={currentFileCode}
              onChange={handleMonacoChange}
              onMount={handleEditorMount}
              theme="vs-dark"
              path={`file:///sandbox/${activeFile}`}
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
          </ResizablePanel>

          <ResizableHandle withHandle className="w-1.5 bg-slate-800 hover:bg-violet-600/50 transition-colors" />

          {/* Preview pane */}
          <ResizablePanel defaultSize={50} minSize={20} className="overflow-hidden">
            <ReactPreview
              files={files}
              language={language === "typescript" ? "typescript" : "javascript"}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Code-only pane */}
          {activePane === "code" && (
            <div className="flex w-full flex-col overflow-hidden">
              {/* ── File tabs ─────────────────────────────────────────────── */}
              <div className="flex items-center gap-0 overflow-x-auto border-b border-slate-700/60 bg-[#0d1117] scrollbar-none">
                {files.map((f) => (
                  <div
                    key={f.name}
                    className={`group flex shrink-0 items-center gap-1.5 border-r border-slate-700 px-3 py-1.5 text-xs cursor-pointer transition ${
                      f.name === activeFile
                        ? "bg-slate-950 text-white border-b-2 border-b-violet-500"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                    onClick={() => handleSwitchFile(f.name)}
                  >
                    <span>{f.name}</span>
                    {files.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(f.name);
                        }}
                        className="hidden group-hover:flex h-3.5 w-3.5 items-center justify-center rounded hover:bg-slate-600 text-slate-500 hover:text-red-400 transition"
                        title={`Delete ${f.name}`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                ))}
                {showNewFileInput ? (
                  <div className="flex items-center gap-1 px-2">
                    <input
                      autoFocus
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddFile();
                        if (e.key === "Escape") { setShowNewFileInput(false); setNewFileName(""); }
                      }}
                      placeholder="Button.tsx"
                      className="w-28 rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-violet-500"
                    />
                    <button onClick={handleAddFile} className="text-xs text-violet-400 hover:text-violet-300">Add</button>
                    <button onClick={() => { setShowNewFileInput(false); setNewFileName(""); }} className="text-xs text-slate-500 hover:text-slate-300">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setShowNewFileInput(true)} className="flex shrink-0 items-center gap-1 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition" title="New file">
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
              <MonacoEditor
                key={`${resetKey || "editor"}-${activeFile}-solo`}
                height="100%"
                language={monacoLang}
                defaultValue={currentFileCode}
                onChange={handleMonacoChange}
                onMount={handleEditorMount}
                theme="vs-dark"
                path={`file:///sandbox/${activeFile}`}
                options={{ minimap: { enabled: false }, lineNumbers: "on", automaticLayout: true, fontSize: 14, wordWrap: "on", scrollBeyondLastLine: false, padding: { top: 16, bottom: 16 }, tabSize: 2 }}
              />
            </div>
          )}
          {/* Preview-only pane */}
          {activePane === "preview" && (
            <div className="w-full">
              <ReactPreview
                files={files}
                language={language === "typescript" ? "typescript" : "javascript"}
              />
            </div>
          )}
        </div>
      )}
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
