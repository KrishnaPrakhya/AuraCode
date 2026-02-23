"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Activity,
  Lightbulb,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { ParticipantRecord } from "@/app/api/admin/participants/route";

interface AnalyticsPanelProps {
  problems?: any[]; // kept for back-compat
}

/**
 * Analytics Panel Component
 * Aggregated real statistics from participant sessions.
 */
export function AnalyticsPanel(_props: AnalyticsPanelProps) {
  const [records, setRecords] = useState<ParticipantRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/participants");
        if (res.ok) setRecords(await res.json());
      } catch {
        /* noop */
      }
    };
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  // --- aggregated stats ---
  const totalSessions = records.length;
  const avgScore = totalSessions
    ? Math.round(
        records.reduce((s, r) => s + (r.points_earned ?? 0), 0) / totalSessions,
      )
    : 0;
  const totalHints = records.reduce((s, r) => s + (r.total_hints_used ?? 0), 0);
  const aiEvalCount = records.filter((r) => r.ai_evaluate_used).length;
  const submittedCount = records.filter(
    (r) => r.status === "submitted" || r.status === "completed",
  ).length;
  const submitRate = totalSessions
    ? Math.round((submittedCount / totalSessions) * 100)
    : 0;

  // bar chart — one bar per participant, sorted by score desc
  const chartData = [...records]
    .sort((a, b) => b.points_earned - a.points_earned)
    .slice(0, 10)
    .map((r) => ({
      name: r.user_name?.split(" ")[0] ?? "Unknown",
      score: r.points_earned,
      hints: r.total_hints_used,
    }));

  // leaderboard — top 5
  const leaderboard = [...records]
    .sort((a, b) => b.points_earned - a.points_earned)
    .slice(0, 5);

  return (
    <div className="flex h-full flex-col overflow-auto p-6 space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {
            icon: Activity,
            label: "Sessions",
            value: totalSessions,
            color: "blue",
          },
          {
            icon: TrendingUp,
            label: "Submit Rate",
            value: `${submitRate}%`,
            color: "emerald",
          },
          {
            icon: Trophy,
            label: "Avg Score",
            value: avgScore,
            color: "violet",
          },
          {
            icon: Lightbulb,
            label: "Total Hints",
            value: totalHints,
            color: "amber",
          },
          {
            icon: Sparkles,
            label: "AI Evals",
            value: aiEvalCount,
            color: "pink",
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className={`rounded-xl border border-${color}-500/30 bg-gradient-to-br from-${color}-900/30 to-${color}-800/20 backdrop-blur p-4 shadow`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 text-${color}-400`} />
              <p className={`text-xs text-${color}-300 font-medium`}>{label}</p>
            </div>
            <p className={`text-2xl font-bold text-${color}-400`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Score chart */}
      <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">
          Score Distribution (top 10)
        </h3>
        {chartData.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">
            No data yet — scores appear after participants evaluate their code
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={chartData}
              margin={{ top: 0, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                style={{ fontSize: "11px" }}
              />
              <YAxis
                stroke="#94a3b8"
                style={{ fontSize: "11px" }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "10px",
                }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Bar
                dataKey="score"
                fill="#8b5cf6"
                name="Score"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="hints"
                fill="#f59e0b"
                name="Hints"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Leaderboard */}
      <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          Leaderboard
        </h3>
        {leaderboard.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            No scores yet
          </p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((r, i) => {
              const medalColors = [
                "from-amber-500 to-yellow-400",
                "from-slate-400 to-slate-300",
                "from-orange-600 to-amber-500",
              ];
              const barW = r.points_earned;
              return (
                <div key={r.session_id} className="flex items-center gap-3">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${medalColors[i] ?? "from-slate-700 to-slate-600"}`}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-[100px] text-sm font-medium text-slate-200 truncate">
                    {r.user_name}
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-slate-700/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all"
                      style={{ width: `${barW}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-violet-300 w-8 text-right">
                    {r.points_earned}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
