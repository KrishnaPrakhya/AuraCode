"use client";

import {
  CheckCircle,
  XCircle,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

export interface CategoryScoreData {
  category: string;
  score: number;
  max_score: number;
  feedback: string;
  suggestions: string[];
}

export interface EvaluationResult {
  overall_score: number;
  categories: CategoryScoreData[];
  summary: string;
  strengths: string[];
  improvements: string[];
  requirements_met: string[];
  requirements_unmet: string[];
  is_complete: boolean;
}

interface AIEvaluationPanelProps {
  result: EvaluationResult;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Component Architecture": "🏗️",
  "React Patterns & Hooks": "⚛️",
  "Code Quality": "✨",
  "Functionality & Requirements": "✅",
  "UI & Accessibility": "♿",
};

function scoreColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return "text-emerald-400";
  if (pct >= 60) return "text-blue-400";
  if (pct >= 40) return "text-amber-400";
  return "text-red-400";
}

function scoreBarColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-blue-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function overallGrade(score: number): {
  grade: string;
  color: string;
  label: string;
} {
  if (score >= 90)
    return { grade: "A+", color: "text-emerald-400", label: "Exceptional" };
  if (score >= 80)
    return { grade: "A", color: "text-emerald-400", label: "Excellent" };
  if (score >= 70) return { grade: "B", color: "text-blue-400", label: "Good" };
  if (score >= 60)
    return { grade: "C", color: "text-amber-400", label: "Satisfactory" };
  if (score >= 50)
    return { grade: "D", color: "text-orange-400", label: "Needs Work" };
  return { grade: "F", color: "text-red-400", label: "Incomplete" };
}

export function AIEvaluationPanel({ result, onClose }: AIEvaluationPanelProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const { grade, color, label } = overallGrade(result.overall_score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-white">
                AI Evaluation Results
              </h2>
              <p className="text-xs text-slate-400">
                Gemini 2.0 Flash Assessment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Score Hero */}
          <div className="flex items-center gap-6 border-b border-slate-700/50 bg-slate-800/30 px-6 py-5">
            <div className="flex flex-col items-center justify-center">
              <span className={`text-6xl font-black tracking-tight ${color}`}>
                {grade}
              </span>
              <span className="mt-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {label}
              </span>
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">
                  {result.overall_score}
                  <span className="text-base text-slate-400">/100</span>
                </span>
                <span
                  className={`text-sm font-semibold ${result.is_complete ? "text-emerald-400" : "text-amber-400"}`}
                >
                  {result.is_complete
                    ? "✓ Challenge Complete"
                    : "⚠ Needs More Work"}
                </span>
              </div>
              {/* Overall progress bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${scoreBarColor(result.overall_score, 100)}`}
                  style={{ width: `${result.overall_score}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                {result.summary}
              </p>
            </div>
          </div>

          <div className="space-y-0 px-6 py-4">
            {/* Category Breakdown */}
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
              Score Breakdown
            </h3>
            <div className="mb-5 space-y-2">
              {result.categories.map((cat) => (
                <div
                  key={cat.category}
                  className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/40"
                >
                  <button
                    onClick={() =>
                      setExpandedCategory(
                        expandedCategory === cat.category ? null : cat.category,
                      )
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-700/30 transition"
                  >
                    <span className="text-lg">
                      {CATEGORY_ICONS[cat.category] || "📊"}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-slate-200">
                      {cat.category}
                    </span>
                    <div className="mr-3 flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${scoreBarColor(cat.score, cat.max_score)}`}
                          style={{
                            width: `${(cat.score / cat.max_score) * 100}%`,
                          }}
                        />
                      </div>
                      <span
                        className={`min-w-[44px] text-right text-sm font-bold ${scoreColor(cat.score, cat.max_score)}`}
                      >
                        {cat.score}/{cat.max_score}
                      </span>
                    </div>
                    {expandedCategory === cat.category ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  {expandedCategory === cat.category && (
                    <div className="border-t border-slate-700/50 px-4 pb-4 pt-3 space-y-3">
                      <p className="text-sm text-slate-300">{cat.feedback}</p>
                      {cat.suggestions.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Suggestions
                          </p>
                          <ul className="space-y-1">
                            {cat.suggestions.map((s, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-xs text-slate-400"
                              >
                                <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Requirements */}
            {(result.requirements_met.length > 0 ||
              result.requirements_unmet.length > 0) && (
              <div className="mb-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Requirements
                </h3>
                <div className="space-y-1.5">
                  {result.requirements_met.map((r, i) => (
                    <div
                      key={`met-${i}`}
                      className="flex items-start gap-2 rounded-lg bg-emerald-900/20 px-3 py-2"
                    >
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="text-sm text-emerald-300">{r}</span>
                    </div>
                  ))}
                  {result.requirements_unmet.map((r, i) => (
                    <div
                      key={`unmet-${i}`}
                      className="flex items-start gap-2 rounded-lg bg-red-900/20 px-3 py-2"
                    >
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <span className="text-sm text-red-300">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-2 gap-4">
              {result.strengths.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
                    Strengths
                  </h3>
                  <ul className="space-y-1.5">
                    {result.strengths.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-slate-300"
                      >
                        <span className="mt-0.5 text-emerald-400">✓</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.improvements.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-400">
                    To Improve
                  </h3>
                  <ul className="space-y-1.5">
                    {result.improvements.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-slate-300"
                      >
                        <span className="mt-0.5 text-amber-400">→</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-700 py-2.5 text-sm font-semibold text-white hover:bg-slate-600 transition"
          >
            Close & Continue Building
          </button>
        </div>
      </div>
    </div>
  );
}
