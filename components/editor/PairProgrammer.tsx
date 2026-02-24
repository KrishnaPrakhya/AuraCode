"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Zap,
  ScanSearch,
  ListChecks,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

interface ScanResult {
  met: string[];
  missing: string[];
  bugs: string[];
  next_priority: string;
}

interface PlanStep {
  id: number;
  text: string;
  done: boolean;
  tip: string;
}

interface PairProgrammerProps {
  userCode: string;
  problemTitle: string;
  problemDescription: string;
  language: string;
  requirements?: string[];
  onClose: () => void;
  /** Called once on first AI Coach usage — used to flag + deduct marks */
  onFirstUse?: () => void;
}

type Mode = "scan" | "plan";

const MODES: { id: Mode; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: "scan",
    label: "Scan",
    icon: <ScanSearch className="h-4 w-4" />,
    desc: "X-Ray your code vs requirements",
  },
  {
    id: "plan",
    label: "Plan",
    icon: <ListChecks className="h-4 w-4" />,
    desc: "Step-by-step implementation plan",
  },
];

async function callCoach(body: object): Promise<any> {
  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Coach API ${res.status}`);
  return res.json();
}

export function PairProgrammer({
  userCode,
  problemTitle,
  problemDescription,
  language,
  requirements = [],
  onClose,
  onFirstUse,
}: PairProgrammerProps) {
  const [mode, setMode] = useState<Mode>("scan");
  const firstUseFired = useRef(false);

  // — Scan state —
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanRan = useRef(false);

  // — Plan state —
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const planRan = useRef(false);

  const basePayload = {
    code: userCode,
    problem_title: problemTitle,
    problem_description: problemDescription,
    requirements,
  };

  const runScan = useCallback(async () => {
    // Fire onFirstUse exactly once — tracks usage + triggers mark deduction
    if (!firstUseFired.current) {
      firstUseFired.current = true;
      onFirstUse?.();
    }
    setScanLoading(true);
    setScanError(null);
    setScanResult(null);
    try {
      const data = await callCoach({ ...basePayload, mode: "scan" });
      setScanResult({
        met: data.met ?? [],
        missing: data.missing ?? [],
        bugs: data.bugs ?? [],
        next_priority: data.next_priority ?? "",
      });
    } catch {
      setScanError("Couldn't reach AI. Check your connection and try again.");
    } finally {
      setScanLoading(false);
    }
  }, [userCode, problemTitle, problemDescription, requirements]);

  const runPlan = useCallback(async () => {
    setPlanLoading(true);
    setPlanSteps([]);
    try {
      const data = await callCoach({ ...basePayload, mode: "plan" });
      setPlanSteps(data.steps ?? []);
    } catch {
      setPlanSteps([]);
    } finally {
      setPlanLoading(false);
    }
  }, [userCode, problemTitle, problemDescription, requirements]);

  // Run scan automatically on mount
  useEffect(() => {
    if (!scanRan.current) {
      scanRan.current = true;
      runScan();
    }
  }, []);

  // Run plan when plan tab first opened
  useEffect(() => {
    if (mode === "plan" && !planRan.current && planSteps.length === 0 && !planLoading) {
      planRan.current = true;
      runPlan();
    }
  }, [mode]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-105 flex-col border-l border-slate-700 bg-[#0a0e1a] shadow-2xl shadow-black/60">

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-700/60 bg-linear-to-r from-violet-900/30 via-indigo-900/20 to-transparent px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 shadow shadow-violet-500/30">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white">AuraCoach</h2>
            <p className="truncate text-[11px] text-slate-400">{problemTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white/8 hover:text-slate-300 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex shrink-0 border-b border-slate-700/60 bg-slate-900/50">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 border-b-2 px-2 py-2.5 text-xs font-medium transition ${
                mode === m.id
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>

        {/* ── SCAN ─────────────────────────────────────────────────────── */}
        {mode === "scan" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-700/40 px-4 py-2">
              <span className="text-[11px] text-slate-500">Live analysis vs your requirements</span>
              <button
                onClick={runScan}
                disabled={scanLoading}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 disabled:opacity-40 transition"
              >
                <RefreshCw className={`h-3 w-3 ${scanLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {scanLoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full border-2 border-violet-500/20" />
                    <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-2 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent" />
                    <ScanSearch className="absolute inset-0 m-auto h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300">Scanning your code…</p>
                    <p className="text-xs text-slate-500">Checking requirements, patterns & bugs</p>
                  </div>
                </div>
              )}

              {scanError && !scanLoading && (
                <div className="rounded-lg border border-red-800/40 bg-red-900/10 p-4 text-sm text-red-400">{scanError}</div>
              )}

              {scanResult && !scanLoading && (
                <>
                  {scanResult.next_priority && (
                    <div className="rounded-xl border border-violet-700/40 bg-violet-900/15 p-4">
                      <div className="mb-1.5 flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-violet-400" />
                        <span className="text-xs font-semibold text-violet-300 uppercase tracking-wide">Next Priority</span>
                      </div>
                      <p className="text-sm leading-relaxed text-violet-100">{scanResult.next_priority}</p>
                    </div>
                  )}

                  {scanResult.met.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Done ({scanResult.met.length})
                      </h4>
                      <ul className="space-y-1.5">
                        {scanResult.met.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 rounded-lg bg-emerald-900/10 border border-emerald-800/30 px-3 py-2">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            <span className="text-xs text-emerald-200/80">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {scanResult.missing.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-400">
                        <XCircle className="h-3.5 w-3.5" /> Missing ({scanResult.missing.length})
                      </h4>
                      <ul className="space-y-1.5">
                        {scanResult.missing.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 rounded-lg bg-red-900/10 border border-red-800/30 px-3 py-2">
                            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                            <span className="text-xs text-red-200/80">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {scanResult.bugs.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" /> Issues ({scanResult.bugs.length})
                      </h4>
                      <ul className="space-y-1.5">
                        {scanResult.bugs.map((b, i) => (
                          <li key={i} className="flex items-start gap-2 rounded-lg bg-amber-900/10 border border-amber-800/30 px-3 py-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                            <span className="text-xs text-amber-200/80">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!scanResult.next_priority && scanResult.met.length === 0 && scanResult.missing.length === 0 && (
                    <div className="py-8 text-center text-sm text-slate-500">Write some code first, then Refresh.</div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── PLAN ─────────────────────────────────────────────────────── */}
        {mode === "plan" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-700/40 px-4 py-2">
              <span className="text-[11px] text-slate-500">AI-generated plan for this challenge</span>
              <button
                onClick={() => { planRan.current = true; runPlan(); }}
                disabled={planLoading}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 disabled:opacity-40 transition"
              >
                <RefreshCw className={`h-3 w-3 ${planLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {planLoading && (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                  <p className="text-sm text-slate-400">Building your plan…</p>
                </div>
              )}

              {!planLoading && planSteps.length > 0 && (
                <ol className="relative space-y-0 before:absolute before:left-4 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-slate-700/60">
                  {planSteps.map((step, idx) => (
                    <li key={step.id} className="relative flex gap-4 pb-5 last:pb-0">
                      <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                        step.done
                          ? "border-emerald-500 bg-emerald-900/30 text-emerald-400"
                          : "border-slate-600 bg-slate-900 text-slate-400"
                      }`}>
                        {step.done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={`text-sm font-medium leading-snug ${step.done ? "text-emerald-300 line-through decoration-emerald-600/50" : "text-slate-200"}`}>
                          {step.text}
                        </p>
                        {!step.done && step.tip && (
                          <p className="mt-1 flex items-start gap-1 text-[11px] text-slate-500">
                            <ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />
                            {step.tip}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {!planLoading && planSteps.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-500">Hit Refresh to generate your plan.</div>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
}

