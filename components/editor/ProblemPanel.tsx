"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Problem } from "@/lib/types/database";
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Timer,
  Star,
  Layout,
} from "lucide-react";

interface ChallengePanelProps {
  problem: Problem;
  hints: string[];
}

const DIFFICULTY_CONFIG: Record<
  number,
  { label: string; color: string; bg: string }
> = {
  1: {
    label: "Starter",
    color: "text-green-400",
    bg: "bg-green-900/20 border-green-700/40",
  },
  2: {
    label: "Easy",
    color: "text-blue-400",
    bg: "bg-blue-900/20 border-blue-700/40",
  },
  3: {
    label: "Medium",
    color: "text-amber-400",
    bg: "bg-amber-900/20 border-amber-700/40",
  },
  4: {
    label: "Hard",
    color: "text-orange-400",
    bg: "bg-orange-900/20 border-orange-700/40",
  },
  5: {
    label: "Expert",
    color: "text-red-400",
    bg: "bg-red-900/20 border-red-700/40",
  },
};

/**
 * React Challenge Brief Panel
 * Shows challenge description, requirements checklist, starter code, and coaching hints
 */
export function ProblemPanel({ problem, hints }: ChallengePanelProps) {
  const [activeTab, setActiveTab] = useState<
    "brief" | "requirements" | "starter"
  >("brief");
  const [expandedHint, setExpandedHint] = useState<number | null>(null);

  // Extract requirements from problem.requirements or test_cases descriptions
  const requirements: string[] = (() => {
    const r = (problem as any).requirements;
    if (Array.isArray(r) && r.length > 0) return r;
    if (problem.test_cases?.length > 0) {
      return problem.test_cases
        .map((tc) => tc.description)
        .filter(Boolean) as string[];
    }
    return [];
  })();

  const difficulty =
    DIFFICULTY_CONFIG[problem.difficulty] || DIFFICULTY_CONFIG[3];

  const tabs = [
    { id: "brief", label: "Brief" },
    { id: "requirements", label: `Requirements (${requirements.length})` },
    { id: "starter", label: "Starter" },
  ] as const;

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      {/* Challenge header */}
      <div className="border-b border-slate-700 bg-slate-900 px-4 py-4">
        <div className="mb-1 flex items-start gap-2">
          <Layout className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
          <h1 className="text-lg font-bold leading-tight text-white">
            {problem.title}
          </h1>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${difficulty.bg} ${difficulty.color}`}
          >
            {difficulty.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Timer className="h-3.5 w-3.5" />
            {problem.time_limit_minutes} min
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
            <Star className="h-3.5 w-3.5 fill-current" />
            {problem.points_available} pts
          </span>
          <span className="rounded bg-violet-900/30 border border-violet-700/40 px-2 py-0.5 text-xs text-violet-300">
            React / {problem.language === "typescript" ? "TSX" : "JSX"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700 bg-slate-900/50 flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 border-b-2 px-2 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-violet-500 text-violet-400"
                : "border-transparent text-slate-400 hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === "brief" && (
          <>
            <div className="prose-sm prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className="space-y-3 text-sm text-slate-300"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                components={{
                  code: ({ children }: any) => (
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs font-mono text-violet-300">
                      {children}
                    </code>
                  ),
                  pre: ({ children }: any) => (
                    <pre className="overflow-x-auto rounded-lg bg-slate-900 border border-slate-700 p-3 text-xs">
                      {children}
                    </pre>
                  ),
                  h1: ({ children }: any) => (
                    <h1 className="text-base font-bold text-white mt-4 mb-2">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }: any) => (
                    <h2 className="text-sm font-bold text-slate-200 mt-3 mb-2 border-b border-slate-700/60 pb-1">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }: any) => (
                    <h3 className="text-xs font-semibold text-slate-300 mt-2 mb-1">
                      {children}
                    </h3>
                  ),
                  p: ({ children }: any) => (
                    <p className="text-sm text-slate-300 leading-relaxed mb-2">
                      {children}
                    </p>
                  ),
                  ul: ({ children }: any) => (
                    <ul className="list-disc list-inside space-y-1 text-slate-300 mb-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }: any) => (
                    <ol className="list-decimal list-inside space-y-1 text-slate-300 mb-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }: any) => (
                    <li className="text-sm text-slate-300">{children}</li>
                  ),
                  strong: ({ children }: any) => (
                    <strong className="text-white font-semibold">
                      {children}
                    </strong>
                  ),
                  em: ({ children }: any) => (
                    <em className="text-slate-300 italic">{children}</em>
                  ),
                  table: ({ children }: any) => (
                    <div className="overflow-x-auto my-2">
                      <table className="w-full text-xs border-collapse rounded-lg overflow-hidden">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }: any) => (
                    <thead className="bg-slate-800 text-slate-200">{children}</thead>
                  ),
                  tbody: ({ children }: any) => (
                    <tbody className="divide-y divide-slate-700/60">{children}</tbody>
                  ),
                  tr: ({ children }: any) => (
                    <tr className="even:bg-slate-800/30">{children}</tr>
                  ),
                  th: ({ children }: any) => (
                    <th className="px-3 py-1.5 text-left font-semibold text-slate-200">{children}</th>
                  ),
                  td: ({ children }: any) => (
                    <td className="px-3 py-1.5 text-slate-300">{children}</td>
                  ),
                  blockquote: ({ children }: any) => (
                    <blockquote className="border-l-2 border-violet-500 pl-3 my-2 text-slate-400 italic">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="border-slate-700 my-3" />,
                }}
              >
                {problem.markdown_content || problem.description}
              </ReactMarkdown>
            </div>

            {/* Coaching hints */}
            {hints.length > 0 && (
              <div className="mt-4 border-t border-slate-700 pt-4">
                <div className="mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-amber-300">
                    React Coaching Hints
                  </h3>
                </div>
                <div className="space-y-2">
                  {hints.map((hint, idx) => (
                    <div
                      key={idx}
                      className="overflow-hidden rounded-lg border border-amber-700/30 bg-amber-900/10"
                    >
                      <button
                        onClick={() =>
                          setExpandedHint(expandedHint === idx ? null : idx)
                        }
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-amber-900/20 transition"
                      >
                        <span className="text-xs font-medium text-amber-300">
                          Hint #{idx + 1}
                        </span>
                        {expandedHint === idx ? (
                          <ChevronUp className="h-3.5 w-3.5 text-amber-400" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-amber-400" />
                        )}
                      </button>
                      {expandedHint === idx && (
                        <div className="border-t border-amber-700/30 px-3 py-2">
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {hint}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "requirements" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 mb-4">
              Your submission will be evaluated against these requirements. Aim
              to satisfy all of them.
            </p>
            {requirements.length === 0 ? (
              <p className="text-xs italic text-slate-500">
                No specific requirements listed -- see the brief for guidance.
              </p>
            ) : (
              requirements.map((req, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-2.5"
                >
                  <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <span className="text-sm text-slate-300">{req}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "starter" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Copy this starter code into the editor to get started quickly.
            </p>
            {problem.starter_code ? (
              <pre className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900 p-4 text-xs">
                <code className="text-slate-300 font-mono leading-relaxed">
                  {problem.starter_code}
                </code>
              </pre>
            ) : (
              <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
                <p className="text-xs italic text-slate-500">
                  No starter code provided -- start from scratch!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
