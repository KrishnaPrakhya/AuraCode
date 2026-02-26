"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { CodeEditor } from "./CodeEditor";
import { ProblemPanel } from "./ProblemPanel";
import { PairProgrammer } from "./PairProgrammer";
import { AIEvaluationPanel, type EvaluationResult } from "./AIEvaluationPanel";
import { useCodeEditor } from "@/lib/hooks/useCodeEditor";
import { problemRepository } from "@/lib/supabase/repositories/problems";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  Zap,
  Save,
  CheckCheck,
  CloudUpload,
  Timer,
  Trophy,
} from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import type { Problem, ProgrammingLanguage } from "@/lib/types/database";

// localStorage keys for persisting per-user, per-problem state
const codeKey = (userId: string, problemId: string) =>
  `aura_code_${userId}_${problemId}`;
const hintsKey = (userId: string, problemId: string) =>
  `aura_hints_${userId}_${problemId}`;

// Penalty constants — must stay in sync with components/admin/ParticipantMonitor.tsx
const HINT_PENALTY_PER_USE = 3;      // -3 pts per hint used
const AI_COACH_PENALTY_PER_USE = 10; // -10 pts per AI Coach open (more than hint)
const AI_COACH_MAX_USES = 2;         // hard limit: user can open AI Coach at most 2×

interface SandboxProps {
  problemId: string;
  sessionId: string;
  userId: string;
  userName?: string;
  /** When present, enables team mode — each member gets equal turn time */
  teamMembers?: string[];
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
  teamMembers,
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
  // Track AI Coach usage count — max 2 opens per session; each open deducts marks
  const [aiCoachUses, setAiCoachUses] = useState(0);
  // Track whether we successfully registered this session in the DB
  const [dbSessionCreated, setDbSessionCreated] = useState(false);
  // Gemini API key settings panel
  const [showKeySettings, setShowKeySettings] = useState(false);
  const [keyInputValue, setKeyInputValue] = useState("");
  // Code persistence
  const [initialEditorCode, setInitialEditorCode] = useState("");
  const [lastSavedCode, setLastSavedCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Countdown timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Team mode turn tracking
  const isTeamMode = Array.isArray(teamMembers) && teamMembers.length > 1;
  const [currentMemberIdx, setCurrentMemberIdx] = useState(0);
  const [memberTurnSeconds, setMemberTurnSeconds] = useState(0);
  const [showHandoff, setShowHandoff] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (showHandoff) return; // pause ticking during handoff screen
      setElapsedSeconds((s) => s + 1);
      if (isTeamMode) setMemberTurnSeconds((s) => s + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHandoff, isTeamMode]);

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
            ...(isTeamMode && teamMembers?.length ? { teamMembers } : {}),
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
    [sessionId, userId, userName, isTeamMode, teamMembers],
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

  /** Called every time the user opens AuraCoach — max 2 opens; increments count + persists to DB */
  const handleAICoachOpen = useCallback(async () => {
    if (aiCoachUses >= AI_COACH_MAX_USES) return; // limit already reached
    const newCount = aiCoachUses + 1;
    setAiCoachUses(newCount);
    // Immediately persist so admin sees updated count in real-time
    await updateDbSession({
      ai_pair_programmer_used: true,
      ai_coach_uses: newCount,
    });
  }, [aiCoachUses, updateDbSession]);

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
          headers: {
            "Content-Type": "application/json",
            ...(typeof window !== 'undefined' && localStorage.getItem('aura_gemini_key')
              ? { 'x-gemini-key': localStorage.getItem('aura_gemini_key')! }
              : {}),
          },
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

        // Compute penalties:
        //   Hint penalty  : total_hints_used × HINT_PENALTY_PER_USE  (-3 pts each)
        //   Coach penalty : aiCoachUses       × AI_COACH_PENALTY_PER_USE (-10 pts each)
        // AI Coach penalty > Hint penalty by design (admins can see breakdown).
        const hintPenalty = hintsUsedCount * HINT_PENALTY_PER_USE;
        const aiCoachPenalty = aiCoachUses * AI_COACH_PENALTY_PER_USE;
        const finalScore = Math.max(0, result.overall_score - hintPenalty - aiCoachPenalty);

        // Persist score + penalty breakdown to DB session
        await updateDbSession({
          points_earned: finalScore,
          total_hints_used: hintsUsedCount,
          hint_penalty: hintPenalty,
          ai_pair_programmer_used: aiCoachUses > 0,
          ai_coach_uses: aiCoachUses,
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
      aiCoachUses,
      recordCodeRun,
      markExecutionComplete,
      updateDbSession,
    ],
  );

  // AI Hints / Coaching — now accepts user_question and returns the hint text
  const handleHintRequest = useCallback(
    async (level: number, question: string): Promise<string> => {
      if (!problem) return "";
      try {
        await recordHintRequest(level);
        const response = await fetch("/api/hints/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(typeof window !== 'undefined' && localStorage.getItem('aura_gemini_key')
              ? { 'x-gemini-key': localStorage.getItem('aura_gemini_key')! }
              : {}),
          },
          body: JSON.stringify({
            user_question: question,
            current_code: code,
            hint_number: hintsUsedCount,
            challenge_title: problem.title,
            challenge_description: problem.description,
            requirements:
              (problem as any).requirements ||
              problem.test_cases.map((tc) => tc.description).filter(Boolean),
            // legacy fields kept for DB logging
            problem_id: problem.id,
            session_id: sessionId,
            user_id: userId,
          }),
        });

        if (!response.ok) throw new Error("Hint generation failed");
        const data = await response.json();
        if (data.limit_reached && !data.hint) return "";
        const hint = data.hint ?? "";
        if (hint) {
          setHints((prev) => [...prev, hint]);
          const newHintCount = hintsUsedCount + 1;
          setHintsUsedCount(newHintCount);
          await updateDbSession({ total_hints_used: newHintCount });
        }
        return hint;
      } catch (err) {
        console.error("[sandbox] Hint error:", err);
        return "";
      }
      return "";
    },
    [
      code,
      problem,
      sessionId,
      userId,
      hints.length,
      hintsUsedCount,
      recordHintRequest,
      updateDbSession,
    ],
  );

  // ── Team handoff detection (must be above early returns) ──
  const teamCount = isTeamMode ? (teamMembers?.length ?? 1) : 1;
  const totalTimeSecs = (problem?.time_limit_minutes ?? 45) * 60;
  const perMemberSecs = isTeamMode ? Math.floor(totalTimeSecs / teamCount) : totalTimeSecs;

  useEffect(() => {
    if (!isTeamMode || !problem) return;
    if (memberTurnSeconds >= perMemberSecs && currentMemberIdx < teamCount - 1) {
      setShowHandoff(true);
    }
  }, [memberTurnSeconds, perMemberSecs, isTeamMode, problem, currentMemberIdx, teamCount]);

  const handleNextTurn = useCallback(() => {
    setCurrentMemberIdx((i) => i + 1);
    setMemberTurnSeconds(0);
    setShowHandoff(false);
  }, []);

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

  // totalTimeSecs computed above (before early returns) — alias for clarity below
  const timeLimitSecs = totalTimeSecs;

  const remaining = Math.max(
    0,
    isTeamMode ? perMemberSecs - memberTurnSeconds : timeLimitSecs - elapsedSeconds
  );
  const remainingMins = Math.floor(remaining / 60);
  const remainingSecs = remaining % 60;
  const timerPct = Math.min(
    100,
    isTeamMode
      ? (memberTurnSeconds / perMemberSecs) * 100
      : (elapsedSeconds / timeLimitSecs) * 100
  );
  const timerColor =
    remaining > 600
      ? "text-emerald-400"
      : remaining > 180
        ? "text-amber-400"
        : "text-red-400";
  const timerBarColor =
    remaining > 600
      ? "bg-emerald-500"
      : remaining > 180
        ? "bg-amber-500"
        : "bg-red-500";

  const userAvatar =
    typeof window !== "undefined"
      ? (localStorage.getItem("aura_avatar") ?? "🧑‍💻")
      : "🧑‍💻";

  const hasGeminiKey = typeof window !== "undefined" && !!localStorage.getItem("aura_gemini_key");

  return (
    <div className="relative flex h-full w-full flex-col bg-slate-950">
      {/* ── Team handoff overlay ── */}
      {showHandoff && isTeamMode && teamMembers && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 rounded-3xl border border-violet-500/30 bg-[#0d1117] px-12 py-10 shadow-2xl shadow-violet-900/40 text-center max-w-sm w-full mx-4">
            <div className="text-5xl">⌨️</div>
            <div>
              <p className="text-sm uppercase tracking-widest text-slate-500 mb-1">Time&apos;s up!</p>
              <h2 className="text-2xl font-extrabold text-white">
                {teamMembers[currentMemberIdx]}&apos;s turn is over
              </h2>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/10 px-5 py-3">
              <span className="text-2xl">👋</span>
              <div className="text-left">
                <p className="text-xs text-slate-400">Next up</p>
                <p className="font-bold text-violet-300 text-lg">{teamMembers[currentMemberIdx + 1]}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">Pass the keyboard, then continue.</p>
            <button
              onClick={handleNextTurn}
              className="w-full rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 transition active:scale-[0.98]"
            >
              ✅ {teamMembers[currentMemberIdx + 1]} is ready — Start turn
            </button>
          </div>
        </div>
      )}
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-slate-700/50 bg-[#0d1117] px-4 py-2 gap-4">
        {/* Left: brand + problem title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white shadow shadow-violet-500/30">
            ⚛
          </div>
          <span className="text-sm font-semibold text-white hidden md:block">
            AuraCode
          </span>
          <span className="text-slate-600 hidden md:block">/</span>
          <span className="text-sm text-slate-400 truncate max-w-50">{problem.title}</span>
          {/* Team mode: current member badge */}
          {isTeamMode && teamMembers && (
            <span className="hidden md:flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-300">
              👤 {teamMembers[currentMemberIdx]}
              <span className="text-slate-500">({currentMemberIdx + 1}/{teamMembers.length})</span>
            </span>
          )}
        </div>

        {/* Center: timer */}
        <div className="flex items-center gap-2 shrink-0">
          <Timer className={`h-3.5 w-3.5 ${timerColor}`} />
          <span
            className={`text-sm font-mono font-bold tabular-nums ${timerColor}`}
          >
            {String(remainingMins).padStart(2, "0")}:
            {String(remainingSecs).padStart(2, "0")}
          </span>
          {/* Progress bar */}
          <div className="hidden md:block w-20 h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${timerBarColor}`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
        </div>

        {/* Right: actions + user */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Evaluation score badge */}
          {evaluationResult && (
            <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-violet-700/40 bg-violet-900/20 px-3 py-1.5">
              <Trophy className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-bold text-violet-300">
                {evaluationResult.overall_score}/100
              </span>
            </div>
          )}

          {/* Save status */}
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
              <span className="hidden sm:inline">Save</span>
            </button>
          ) : null}

          <button
            onClick={() => {
              if (aiCoachUses < AI_COACH_MAX_USES) setShowPairProgrammer(true);
            }}
            disabled={aiCoachUses >= AI_COACH_MAX_USES}
            title={
              aiCoachUses >= AI_COACH_MAX_USES
                ? `AI Coach limit reached (${AI_COACH_MAX_USES}/${AI_COACH_MAX_USES} — ${aiCoachUses * AI_COACH_PENALTY_PER_USE} pts deducted)`
                : aiCoachUses > 0
                ? `AI Coach: ${aiCoachUses}/${AI_COACH_MAX_USES} uses — -${AI_COACH_PENALTY_PER_USE} pts per open`
                : `Open AI Coach (-${AI_COACH_PENALTY_PER_USE} pts per open, max ${AI_COACH_MAX_USES}×)`
            }
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
              aiCoachUses >= AI_COACH_MAX_USES
                ? "border-red-700/50 bg-red-900/20 text-red-400"
                : aiCoachUses > 0
                ? "border-amber-700/50 bg-amber-900/20 text-amber-400 hover:bg-amber-900/30"
                : "border-emerald-700/40 bg-emerald-900/20 text-emerald-300 hover:bg-emerald-900/40"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {aiCoachUses >= AI_COACH_MAX_USES
                ? `AI Coach (${aiCoachUses}/${AI_COACH_MAX_USES} ⛔)`
                : aiCoachUses > 0
                ? `AI Coach (${aiCoachUses}/${AI_COACH_MAX_USES})`
                : "AI Coach"}
            </span>
          </button>

          {/* User chip */}
          {userName && (
            <div className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/8 px-2 py-1.5">
              <span className="text-sm">{userAvatar}</span>
              <span className="text-xs font-medium text-slate-300 hidden md:block">
                {userName}
              </span>
            </div>
          )}

          {/* Gemini key settings button */}
          <button
            onClick={() => {
              setKeyInputValue(typeof window !== 'undefined' ? localStorage.getItem('aura_gemini_key') ?? '' : '');
              setShowKeySettings((v) => !v);
            }}
            title={hasGeminiKey ? "Gemini API Key set (click to update)" : "Set your Gemini API Key to reduce rate limits"}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs transition ${
              hasGeminiKey
                ? "border-emerald-700/40 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40"
                : "border-white/8 bg-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/8"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a4 4 0 11-8 0 4 4 0 018 0zM3.293 17.707A8 8 0 0119 12H5a8 8 0 01-1.707 5.707z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Gemini Key settings dropdown */}
      {showKeySettings && (
        <div className="relative z-40 border-b border-slate-700/50 bg-[#0d1117] px-4 py-3 flex items-center gap-3">
          <svg className="h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a4 4 0 11-8 0 4 4 0 018 0zM3.293 17.707A8 8 0 0119 12H5a8 8 0 01-1.707 5.707z" />
          </svg>
          <input
            type="password"
            placeholder="Paste your Gemini API key (AIza…) — reduces rate limits"
            value={keyInputValue}
            onChange={(e) => setKeyInputValue(e.target.value)}
            autoFocus
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white placeholder-slate-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
          <button
            onClick={() => {
              const k = keyInputValue.trim();
              if (k) localStorage.setItem("aura_gemini_key", k);
              else localStorage.removeItem("aura_gemini_key");
              setShowKeySettings(false);
            }}
            className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition"
          >
            Save
          </button>
          <button
            onClick={() => setShowKeySettings(false)}
            className="shrink-0 text-slate-600 hover:text-slate-400 transition text-xs"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main layout */}
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 overflow-hidden"
      >
        {/* Challenge brief */}
        <ResizablePanel
          defaultSize={22}
          minSize={14}
          maxSize={40}
          className="overflow-hidden bg-slate-950"
        >
          <ProblemPanel problem={problem} hints={hints} />
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="w-1.5 bg-slate-800 hover:bg-violet-600/50 transition-colors"
        />

        {/* Editor + preview */}
        <ResizablePanel
          defaultSize={78}
          minSize={40}
          className="overflow-hidden bg-slate-950"
        >
          <CodeEditor
            defaultValue={initialEditorCode}
            resetKey={problem?.id || "demo"}
            onChange={handleCodeChange}
            language={problem.language as ProgrammingLanguage}
            onEvaluate={handleEvaluate}
            onHintRequest={handleHintRequest}
            hintsUsedCount={hintsUsedCount}
            isEvaluating={isEvaluating}
            sessionId={sessionId}
            userId={userId}
            problem={problem}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* AI Evaluation panel (modal) */}
      {evaluationResult && (
        <AIEvaluationPanel
          result={evaluationResult}
          onClose={() => setEvaluationResult(null)}
        />
      )}

      {/* Pair programmer modal */}
      {showPairProgrammer && aiCoachUses < AI_COACH_MAX_USES && (
        <PairProgrammer
          userCode={code}
          problemTitle={problem.title}
          problemDescription={problem.description}
          language={problem.language}
          requirements={
            (problem as any).requirements ||
            problem.test_cases.map((tc) => tc.description).filter(Boolean)
          }
          coachUsesCount={aiCoachUses}
          coachUsesMax={AI_COACH_MAX_USES}
          onFirstUse={handleAICoachOpen}
          onClose={() => setShowPairProgrammer(false)}
        />
      )}
    </div>
  );
}
