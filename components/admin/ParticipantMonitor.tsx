"use client";

import { useEffect, useState } from "react";
import {
  Users,
  TrendingUp,
  Clock,
  Lightbulb,
  Zap,
  RefreshCw,
  CircleDot,
  Trophy,
} from "lucide-react";
import type { ParticipantRecord } from "@/app/api/admin/participants/route";

// kept for back-compat; we fetch internally
interface ParticipantMonitorProps {
  participants?: any[];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  in_progress: {
    label: "Coding",
    color: "text-emerald-400",
    dot: "bg-emerald-400 animate-pulse",
  },
  submitted: {
    label: "Submitted",
    color: "text-blue-400",
    dot: "bg-blue-400",
  },
  completed: {
    label: "Done",
    color: "text-violet-400",
    dot: "bg-violet-400",
  },
  abandoned: {
    label: "Left",
    color: "text-slate-500",
    dot: "bg-slate-500",
  },
};

const DIFF_COLORS = [
  "",
  "bg-emerald-500",
  "bg-blue-500",
  "bg-amber-500",
  "bg-orange-500",
  "bg-red-500",
];

/**
 * Participant Monitor Component
 * Real-time view of participant progress, hints, AI evaluations, and scores.
 */
export function ParticipantMonitor(_props: ParticipantMonitorProps) {
  const [records, setRecords] = useState<ParticipantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchParticipants = async () => {
    try {
      const res = await fetch("/api/admin/participants");
      if (res.ok) {
        const data: ParticipantRecord[] = await res.json();
        setRecords(data);
        setLastUpdated(new Date());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
    const interval = setInterval(fetchParticipants, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = records.filter((r) => r.status === "in_progress").length;
  const teamCount = records.filter((r) => r.problem_team_mode && r.team_members?.length).length;
  const avgScore = records.length
    ? Math.round(
        records.reduce((s, r) => s + (r.points_earned ?? 0), 0) /
          records.length,
      )
    : 0;
  const totalHints = records.reduce((s, r) => s + (r.total_hints_used ?? 0), 0);

  return (
    <div className="flex h-full flex-col overflow-auto p-6 space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3">
        <div className="rounded-xl border border-emerald-500/30 bg-linear-to-br from-emerald-900/30 to-emerald-800/20 backdrop-blur p-4 shadow">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-emerald-400" />
            <p className="text-xs text-emerald-300 font-medium">Total</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {records.length}
          </p>
        </div>

        <div className="rounded-xl border border-blue-500/30 bg-linear-to-br from-blue-900/30 to-blue-800/20 backdrop-blur p-4 shadow">
          <div className="flex items-center gap-2 mb-1">
            <CircleDot className="h-4 w-4 text-blue-400" />
            <p className="text-xs text-blue-300 font-medium">Active</p>
          </div>
          <p className="text-2xl font-bold text-blue-400">{activeCount}</p>
        </div>

        {teamCount > 0 && (
          <div className="rounded-xl border border-violet-500/30 bg-linear-to-br from-violet-900/30 to-violet-800/20 backdrop-blur p-4 shadow">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-violet-400" />
              <p className="text-xs text-violet-300 font-medium">Teams</p>
            </div>
            <p className="text-2xl font-bold text-violet-400">{teamCount}</p>
          </div>
        )}

        <div className="rounded-xl border border-violet-500/30 bg-linear-to-br from-violet-900/30 to-violet-800/20 backdrop-blur p-4 shadow">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-violet-400" />
            <p className="text-xs text-violet-300 font-medium">Avg Score</p>
          </div>
          <p className="text-2xl font-bold text-violet-400">{avgScore}</p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-linear-to-br from-amber-900/30 to-amber-800/20 backdrop-blur p-4 shadow">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-amber-300 font-medium">Hints Used</p>
          </div>
          <p className="text-2xl font-bold text-amber-400">{totalHints}</p>
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">
          Participant Activity
        </h3>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchParticipants}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table / Empty state */}
      {records.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-slate-700/40 bg-slate-900/50 py-16">
          <Users className="h-10 w-10 text-slate-600" />
          <p className="text-sm text-slate-400">No participants yet</p>
          <p className="text-xs text-slate-600">
            Participants appear here once they open /sandbox
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Group team-mode sessions separately from solo sessions */}
          {(() => {
            const teamRecords = records.filter((r) => r.problem_team_mode && r.team_members?.length);
            const soloRecords = records.filter((r) => !r.problem_team_mode || !r.team_members?.length);

            return (
              <>
                {/* ── Team sessions ── */}
                {teamRecords.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-violet-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                        Team Sessions ({teamRecords.length})
                      </span>
                    </div>
                    <div className="overflow-auto rounded-xl border border-violet-700/30 bg-violet-900/10">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-violet-700/30 text-xs text-slate-400">
                            <th className="px-4 py-3 text-left font-medium">Team</th>
                            <th className="px-4 py-3 text-left font-medium">Challenge</th>
                            <th className="px-4 py-3 text-center font-medium">
                              <span className="flex items-center justify-center gap-1">
                                <Lightbulb className="h-3 w-3 text-amber-400" />Hints
                              </span>
                            </th>
                            <th className="px-4 py-3 text-center font-medium">
                              <span className="flex items-center justify-center gap-1">
                                <Zap className="h-3 w-3 text-violet-400" />AI Coach
                              </span>
                            </th>
                            <th className="px-4 py-3 text-center font-medium">Score</th>
                            <th className="px-4 py-3 text-center font-medium">
                              <span className="flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3" />Time
                              </span>
                            </th>
                            <th className="px-4 py-3 text-center font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamRecords.map((r) => {
                            const st = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.in_progress;
                            const scoreColor =
                              r.points_earned >= 80 ? "text-emerald-400"
                              : r.points_earned >= 50 ? "text-amber-400"
                              : r.points_earned > 0 ? "text-orange-400"
                              : "text-slate-500";
                            const members = r.team_members ?? [];
                            return (
                              <tr
                                key={r.session_id}
                                className="border-b border-violet-700/20 hover:bg-violet-900/20 transition"
                              >
                                {/* Team members */}
                                <td className="px-4 py-3">
                                  <div className="flex items-start gap-2">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-600 to-indigo-600 text-xs font-bold text-white mt-0.5">
                                      {members.length}
                                    </div>
                                    <div>
                                      <div className="flex flex-wrap gap-1">
                                        {members.map((m, i) => (
                                          <span
                                            key={i}
                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                              i === 0
                                                ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/30"
                                                : "bg-white/5 text-slate-300"
                                            }`}
                                          >
                                            {i === 0 && <span className="text-[9px] text-violet-400">1st</span>}
                                            {m}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                {/* Challenge */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full shrink-0 ${DIFF_COLORS[r.problem_difficulty ?? 0] || "bg-slate-500"}`} />
                                    <span className="text-slate-300 truncate max-w-35">{r.problem_title}</span>
                                  </div>
                                </td>
                                {/* Hints */}
                                <td className="px-4 py-3 text-center">
                                  {r.total_hints_used > 0 ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-300">
                                      <Lightbulb className="h-3 w-3" />{r.total_hints_used}
                                    </span>
                                  ) : <span className="text-slate-600 text-xs">—</span>}
                                </td>
                                {/* AI Coach */}
                                <td className="px-4 py-3 text-center">
                                  {r.ai_evaluate_used ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-900/30 px-2 py-0.5 text-xs font-medium text-violet-300">
                                      <Zap className="h-3 w-3" />used
                                    </span>
                                  ) : <span className="text-slate-600 text-xs">—</span>}
                                </td>
                                {/* Score */}
                                <td className="px-4 py-3 text-center">
                                  <span className={`font-bold text-base ${scoreColor}`}>
                                    {r.points_earned > 0 ? r.points_earned : "—"}
                                  </span>
                                  {r.hint_penalty > 0 && <span className="ml-1 text-xs text-red-400">-{r.hint_penalty}</span>}
                                  {r.ai_evaluate_used && <span className="ml-1 text-[10px] text-violet-400">AI-20</span>}
                                </td>
                                {/* Time */}
                                <td className="px-4 py-3 text-center text-slate-400 text-xs">
                                  {r.elapsed_minutes < 60 ? `${r.elapsed_minutes}m` : `${Math.floor(r.elapsed_minutes / 60)}h ${r.elapsed_minutes % 60}m`}
                                </td>
                                {/* Status */}
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${st.color}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                                    {st.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Solo sessions ── */}
                {soloRecords.length > 0 && (
                  <div>
                    {teamRecords.length > 0 && (
                      <div className="mb-2 flex items-center gap-2">
                        <CircleDot className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Solo Sessions ({soloRecords.length})
                        </span>
                      </div>
                    )}
                    <div className="overflow-auto rounded-xl border border-slate-700/40 bg-slate-900/50">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700/50 text-xs text-slate-400">
                            <th className="px-4 py-3 text-left font-medium">Participant</th>
                            <th className="px-4 py-3 text-left font-medium">Challenge</th>
                            <th className="px-4 py-3 text-center font-medium">
                              <span className="flex items-center justify-center gap-1">
                                <Lightbulb className="h-3 w-3 text-amber-400" />Hints
                              </span>
                            </th>
                            <th className="px-4 py-3 text-center font-medium">
                              <span className="flex items-center justify-center gap-1">
                                <Zap className="h-3 w-3 text-violet-400" />AI Coach
                              </span>
                            </th>
                            <th className="px-4 py-3 text-center font-medium">Score</th>
                            <th className="px-4 py-3 text-center font-medium">
                              <span className="flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3" />Time
                              </span>
                            </th>
                            <th className="px-4 py-3 text-center font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {soloRecords.map((r) => {
                            const st = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.in_progress;
                            const scoreColor =
                              r.points_earned >= 80 ? "text-emerald-400"
                              : r.points_earned >= 50 ? "text-amber-400"
                              : r.points_earned > 0 ? "text-orange-400"
                              : "text-slate-500";
                            return (
                              <tr key={r.session_id} className="border-b border-slate-700/30 hover:bg-slate-800/40 transition">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-violet-600 to-blue-600 text-xs font-bold text-white shrink-0">
                                      {r.user_name?.[0]?.toUpperCase() ?? "?"}
                                    </div>
                                    <div>
                                      <p className="font-medium text-slate-200 leading-tight">{r.user_name}</p>
                                      <p className="text-xs text-slate-500 truncate max-w-30">{r.user_email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full shrink-0 ${DIFF_COLORS[r.problem_difficulty ?? 0] || "bg-slate-500"}`} />
                                    <span className="text-slate-300 truncate max-w-35">{r.problem_title}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {r.total_hints_used > 0 ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-300">
                                      <Lightbulb className="h-3 w-3" />{r.total_hints_used}
                                    </span>
                                  ) : <span className="text-slate-600 text-xs">—</span>}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {r.ai_evaluate_used ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-900/30 px-2 py-0.5 text-xs font-medium text-violet-300">
                                      <Zap className="h-3 w-3" />used
                                    </span>
                                  ) : <span className="text-slate-600 text-xs">—</span>}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`font-bold text-base ${scoreColor}`}>
                                    {r.points_earned > 0 ? r.points_earned : "—"}
                                  </span>
                                  {r.hint_penalty > 0 && <span className="ml-1 text-xs text-red-400">-{r.hint_penalty}</span>}
                                  {r.ai_evaluate_used && <span className="ml-1 text-[10px] text-violet-400" title="AI Coach used: -20 pts applied">AI-20</span>}
                                </td>
                                <td className="px-4 py-3 text-center text-slate-400 text-xs">
                                  {r.elapsed_minutes < 60 ? `${r.elapsed_minutes}m` : `${Math.floor(r.elapsed_minutes / 60)}h ${r.elapsed_minutes % 60}m`}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${st.color}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                                    {st.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
