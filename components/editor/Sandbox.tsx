"use client";

import { useEffect, useState, useCallback } from "react";
import { CodeEditor } from "./CodeEditor";
import { ProblemPanel } from "./ProblemPanel";
import { PairProgrammer } from "./PairProgrammer";
import { AIEvaluationPanel, type EvaluationResult } from "./AIEvaluationPanel";
import { useCodeEditor } from "@/lib/hooks/useCodeEditor";
import { problemRepository } from "@/lib/supabase/repositories/problems";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Zap, Save, CheckCheck, CloudUpload } from "lucide-react";
import type { Problem, ProgrammingLanguage } from "@/lib/types/database";

// localStorage keys for persisting per-user, per-problem state
const codeKey = (userId: string, problemId: string) =>
  `aura_code_${userId}_${problemId}`;
const hintsKey = (userId: string, problemId: string) =>
  `aura_hints_${userId}_${problemId}`;

interface SandboxProps {
  problemId: string;
  sessionId: string;
  userId: string;
  userName?: string;
}

const STARTER_CODE = `import { useState } from 'react';

interface Task {
  id: number;
  text: string;
  completed: boolean;
}

type Filter = 'all' | 'active' | 'completed';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const addTask = () => {
    if (!input.trim()) return;
    setTasks(prev => [...prev, { id: Date.now(), text: input.trim(), completed: false }]);
    setInput('');
  };

  // TODO: implement toggleTask, deleteTask, filteredTasks

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Task Manager</h1>
        {/* Build your UI here */}
      </div>
    </div>
  );
}`;

const DEMO_CHALLENGE_MARKDOWN = `# Task Manager Challenge

Build a **fully functional React Task Manager** component using TypeScript and Tailwind CSS.

## What to Build

A task manager where users can:
- Add new tasks via an input field
- Mark tasks as complete/incomplete
- Filter tasks by: **All**, **Active**, **Completed**
- Delete individual tasks
- See a count of remaining tasks

## Tips
- Use \`useState\` to manage the tasks array and filter state
- Use \`Array.filter\` for the filter logic
- Each task should have: \`id\`, \`text\`, \`completed\`
- Export your component as \`export default function App()\``;

// Default React challenge shown when no DB problem is found
const DEMO_CHALLENGE: Problem = {
  id: "demo",
  title: "Build a Task Manager",
  description:
    "Create a functional React Task Manager app. Users should be able to add tasks, mark them as complete, filter by status, and delete tasks. Style it cleanly using Tailwind CSS.",
  markdown_content: DEMO_CHALLENGE_MARKDOWN,
  difficulty: 2,
  time_limit_minutes: 45,
  points_available: 100,
  starter_code: STARTER_CODE,
  language: "typescript",
  test_cases: [],
  requirements: [
    "Add new tasks via an input field",
    "Mark tasks as complete/incomplete with a checkbox",
    "Filter tasks by All / Active / Completed",
    "Delete individual tasks",
    "Show remaining task count",
    "Export default function App()",
  ],
  created_by: "system",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_active: true,
  hint_strategy: "progressive",
};

/**
 * React Challenge Sandbox
 * Full environment: challenge brief + code editor/preview + AI evaluation + pair programmer
 */
export function Sandbox({
  problemId,
  sessionId,
  userId,
  userName,
}: SandboxProps) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [hintsUsedCount, setHintsUsedCount] = useState(0);
  const [aiEvalCount, setAiEvalCount] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationResult | null>(null);
  const [showPairProgrammer, setShowPairProgrammer] = useState(false);
  // Track whether we successfully registered this session in the DB
  const [dbSessionCreated, setDbSessionCreated] = useState(false);
  // Code persistence
  const [initialEditorCode, setInitialEditorCode] = useState("");
  const [lastSavedCode, setLastSavedCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const {
    code,
    setCode,
    recordCodeChange,
    recordCodeRun,
    recordHintRequest,
    markExecutionComplete,
  } = useCodeEditor({
    sessionId,
    userId,
    initialCode: "",
    language: "typescript",
  });

  const hasUnsavedChanges = code !== lastSavedCode && code.trim() !== "";

  // Create (or refresh) the DB session record for this participant.
  // Pass restoredHints so we can immediately sync any previously-saved count back to DB.
  const createDbSession = useCallback(
    async (loadedProblem: Problem, restoredHints = 0) => {
      // Skip DB registration for the demo/fallback challenge — it has no real DB row
      if (loadedProblem.id === "demo") return;
      try {
        const res = await fetch("/api/sandbox/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            userId,
            problemId: loadedProblem.id,
            userName: userName || `Participant ${userId.slice(0, 6)}`,
            userEmail: `sandbox-${userId.replace(/-/g, "").slice(0, 8)}@aura.local`,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.warn("[sandbox] createDbSession failed:", res.status, err);
          return;
        }
        setDbSessionCreated(true);
        console.log("[sandbox] Session registered in DB:", sessionId);

        // If the user had saved hints/score, sync them back to the DB row.
        // (ignoreDuplicates means existing rows keep their old zeros — needs an explicit PATCH)
        if (restoredHints > 0) {
          await fetch(`/api/sandbox/session/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ total_hints_used: restoredHints }),
          }).catch(() => {});
        }
      } catch (e) {
        console.warn("[sandbox] createDbSession network error:", e);
        // best-effort — local session still works
      }
    },
    [sessionId, userId, userName],
  );

  // Update DB session metrics (hints, score)
  const updateDbSession = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!dbSessionCreated) return;
      try {
        await fetch(`/api/sandbox/session/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
      } catch {
        // best-effort
      }
    },
    [sessionId, dbSessionCreated],
  );

  // Subscribe to admin Realtime broadcasts — updates challenge live
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("problem-broadcast")
      .on("broadcast", { event: "problem-push" }, ({ payload }) => {
        if (payload?.id) {
          setProblem(payload as Problem);
          const p = payload as Problem;
          // Restore any previously saved code for this problem, else use starter
          const saved = localStorage.getItem(codeKey(userId, p.id));
          const startCode = saved || p.starter_code || "";
          setCode(startCode);
          setInitialEditorCode(startCode);
          setLastSavedCode(startCode);
          let restoredHintCount = 0;
          try {
            const savedHints = localStorage.getItem(hintsKey(userId, p.id));
            if (savedHints) {
              const parsed: string[] = JSON.parse(savedHints);
              setHints(parsed);
              setHintsUsedCount(parsed.length);
              restoredHintCount = parsed.length;
            } else {
              setHints([]);
              setHintsUsedCount(0);
            }
          } catch {
            setHints([]);
            setHintsUsedCount(0);
          }
          setAiEvalCount(0);
          setDbSessionCreated(false);
          createDbSession(p, restoredHintCount);
          console.log("[sandbox] Live challenge received:", p.title);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load problem — priority order:
  // 1. Admin API (latest active problem, works even if page opened after broadcast)
  // 2. Specific DB lookup by problemId
  // 3. Demo fallback
  useEffect(() => {
    async function loadProblem() {
      try {
        setLoading(true);
        setError(null);

        // Try fetching the most recently active problem from admin API
        try {
          const res = await fetch("/api/admin/problems");
          if (res.ok) {
            const problems: Problem[] = await res.json();
            if (problems.length > 0) {
              // Most recent problem (API returns newest first)
              const latest = problems[0];
              setProblem(latest);
              // Restore saved code if this user has worked on it before
              const saved = localStorage.getItem(codeKey(userId, latest.id));
              const startCode = saved || latest.starter_code || "";
              setCode(startCode);
              setInitialEditorCode(startCode);
              setLastSavedCode(startCode);
              // Restore hints
              let restoredHintCount = 0;
              try {
                const savedHints = localStorage.getItem(
                  hintsKey(userId, latest.id),
                );
                if (savedHints) {
                  const parsed: string[] = JSON.parse(savedHints);
                  setHints(parsed);
                  setHintsUsedCount(parsed.length);
                  restoredHintCount = parsed.length;
                }
              } catch {}
              createDbSession(latest, restoredHintCount);
              return;
            }
          }
        } catch {
          // admin API unavailable, try direct DB lookup
        }

        // Fallback: look up by the passed problemId
        try {
          const p = await problemRepository.getById(problemId);
          if (p) {
            setProblem(p);
            const saved = localStorage.getItem(codeKey(userId, p.id));
            const startCode = saved || p.starter_code || "";
            setCode(startCode);
            setInitialEditorCode(startCode);
            setLastSavedCode(startCode);
            let restoredHintCount = 0;
            try {
              const savedHints = localStorage.getItem(hintsKey(userId, p.id));
              if (savedHints) {
                const parsed: string[] = JSON.parse(savedHints);
                setHints(parsed);
                setHintsUsedCount(parsed.length);
                restoredHintCount = parsed.length;
              }
            } catch {}
            createDbSession(p, restoredHintCount);
            return;
          }
        } catch {
          // not in DB, use demo
        }

        const saved = localStorage.getItem(codeKey(userId, "demo"));
        const startCode = saved || DEMO_CHALLENGE.starter_code || "";
        setProblem(DEMO_CHALLENGE);
        setCode(startCode);
        setInitialEditorCode(startCode);
        setLastSavedCode(startCode);
      } catch (err) {
        console.error("[sandbox] Error loading:", err);
        setError(
          `Failed to load challenge: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      } finally {
        setLoading(false);
      }
    }
    loadProblem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId]);

  const handleCodeChange = useCallback(
    async (newCode: string) => {
      setCode(newCode);
      try {
        await recordCodeChange(newCode, 0, 0, 0, 0, "");
      } catch {}
    },
    [setCode, recordCodeChange],
  );

  // Save code to localStorage + DB session
  const handleSave = useCallback(
    async (codeToSave?: string) => {
      const saveCode = codeToSave ?? code;
      if (!problem || !saveCode.trim()) return;
      setIsSaving(true);
      try {
        const pid = problem.id;
        localStorage.setItem(codeKey(userId, pid), saveCode);
        localStorage.setItem(hintsKey(userId, pid), JSON.stringify(hints));
        setLastSavedCode(saveCode);
        // Persist hints + metrics to DB session on save
        if (dbSessionCreated) {
          await fetch(`/api/sandbox/session/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              total_hints_used: hintsUsedCount,
            }),
          }).catch(() => {});
        }
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2000);
      } finally {
        setIsSaving(false);
      }
    },
    [code, problem, userId, hints, hintsUsedCount, dbSessionCreated, sessionId],
  );

  // Ctrl+S / Cmd+S keyboard shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  // AI Evaluation
  const handleEvaluate = useCallback(
    async (codeToEvaluate: string) => {
      if (!problem) return;
      try {
        setIsEvaluating(true);
        await recordCodeRun(codeToEvaluate);

        const requirements: string[] =
          (problem as any).requirements ||
          problem.test_cases.map((tc) => tc.description).filter(Boolean);

        const response = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: codeToEvaluate,
            language: problem.language,
            challenge_title: problem.title,
            challenge_description: problem.description,
            requirements,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody.error || "Evaluation failed");
        }

        const result: EvaluationResult = await response.json();
        setEvaluationResult(result);
        const newEvalCount = aiEvalCount + 1;
        setAiEvalCount(newEvalCount);

        // Persist score to DB session via server route
        await updateDbSession({
          points_earned: result.overall_score,
          total_hints_used: hintsUsedCount,
          ai_pair_programmer_used: true,
        });
      } catch (err) {
        console.error("[sandbox] Evaluation error:", err);
        setError(
          `Evaluation failed: ${err instanceof Error ? err.message : "Unknown"}`,
        );
      } finally {
        setIsEvaluating(false);
        markExecutionComplete();
      }
    },
    [
      problem,
      sessionId,
      hints.length,
      hintsUsedCount,
      aiEvalCount,
      recordCodeRun,
      markExecutionComplete,
      updateDbSession,
    ],
  );

  // AI Hints / Coaching
  const handleHintRequest = useCallback(
    async (level: number) => {
      if (!problem) return;
      try {
        await recordHintRequest(level);

        const response = await fetch("/api/hints/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problem_id: problem.id,
            session_id: sessionId,
            user_id: userId,
            current_code: code,
            hint_level: level,
            previous_attempts: hints.length,
            challenge_title: problem.title,
            challenge_description: problem.description,
            requirements:
              (problem as any).requirements ||
              problem.test_cases.map((tc) => tc.description).filter(Boolean),
          }),
        });

        if (!response.ok) throw new Error("Hint generation failed");
        const { hint } = await response.json();
        setHints((prev) => [...prev, hint]);
        const newHintCount = hintsUsedCount + 1;
        setHintsUsedCount(newHintCount);
        await updateDbSession({ total_hints_used: newHintCount });
      } catch (err) {
        console.error("[sandbox] Hint error:", err);
      }
    },
    [
      code,
      problem,
      sessionId,
      userId,
      hints.length,
      recordHintRequest,
      updateDbSession,
    ],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-violet-500" />
          </div>
          <p className="text-sm text-slate-400">Loading challenge...</p>
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950">
        <p className="text-red-400">{error || "Challenge not found"}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-slate-950">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-slate-700/50 bg-slate-900 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500">
            <span className="text-xs font-bold text-white">A</span>
          </div>
          <span className="text-sm font-semibold text-slate-200">AuraCode</span>
          <span className="text-slate-600">/</span>
          <span className="text-sm text-slate-400">{problem.title}</span>
          {userName && (
            <>
              <span className="text-slate-600">/</span>
              <span className="rounded-full bg-violet-900/40 px-2 py-0.5 text-xs font-medium text-violet-300">
                {userName}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Save indicator / button */}
          {savedFlash ? (
            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-3 py-1.5 text-xs font-medium text-emerald-300">
              <CheckCheck className="h-3.5 w-3.5" />
              Saved!
            </span>
          ) : hasUnsavedChanges ? (
            <button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-900/40 transition disabled:opacity-50"
            >
              {isSaving ? (
                <CloudUpload className="h-3.5 w-3.5 animate-pulse" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </button>
          ) : null}
          <button
            onClick={() => setShowPairProgrammer(true)}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/40 transition"
          >
            <Zap className="h-3.5 w-3.5" />
            AI Pair Programmer
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden gap-px bg-slate-800">
        {/* Challenge brief */}
        <div className="w-[300px] shrink-0 overflow-hidden bg-slate-950">
          <ProblemPanel problem={problem} hints={hints} />
        </div>

        {/* Editor + preview */}
        <div className="flex-1 overflow-hidden bg-slate-950">
          <CodeEditor
            defaultValue={initialEditorCode}
            resetKey={problem?.id || "demo"}
            onChange={handleCodeChange}
            language={problem.language as ProgrammingLanguage}
            onEvaluate={handleEvaluate}
            onHintRequest={handleHintRequest}
            isEvaluating={isEvaluating}
            sessionId={sessionId}
            userId={userId}
          />
        </div>
      </div>

      {/* AI Evaluation panel (modal) */}
      {evaluationResult && (
        <AIEvaluationPanel
          result={evaluationResult}
          onClose={() => setEvaluationResult(null)}
        />
      )}

      {/* Pair programmer modal */}
      {showPairProgrammer && (
        <PairProgrammer
          userCode={code}
          problemTitle={problem.title}
          problemDescription={problem.description}
          language={problem.language}
          onClose={() => setShowPairProgrammer(false)}
        />
      )}
    </div>
  );
}
