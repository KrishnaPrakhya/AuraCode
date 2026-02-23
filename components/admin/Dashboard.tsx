"use client";

import { useState, useEffect } from "react";
import { ProblemEditor } from "./ProblemEditor";
import { ParticipantMonitor } from "./ParticipantMonitor";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Activity, LogOut, User } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface AdminDashboardProps {
  wsConnected: boolean;
  onSignOut?: () => void;
  user?: SupabaseUser | null;
}

/**
 * Admin Dashboard Component
 * Command center for managing problems and monitoring participants
 */
export function AdminDashboard({
  wsConnected,
  onSignOut,
  user,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("problems");
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [problems, setProblems] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Load problems via admin API (bypasses RLS)
        try {
          const res = await fetch("/api/admin/problems");
          const probs = res.ok ? await res.json() : [];
          setProblems(probs);
          console.log("[v0] Loaded problems:", probs.length);
        } catch (error) {
          console.warn("[v0] Error loading problems:", error);
          setProblems([]);
        }

        // Load active participants via admin API (bypasses RLS)
        try {
          const pRes = await fetch("/api/admin/participants");
          const parts = pRes.ok ? await pRes.json() : [];
          setParticipants(parts);
          console.log("[v0] Loaded participants:", parts.length);
        } catch (error) {
          console.warn("[v0] Error loading participants:", error);
          setParticipants([]);
        }
      } catch (error) {
        console.error("[v0] Error loading admin data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Refresh every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Admin Command Center
              </h1>
              <p className="text-sm text-slate-400">
                Manage problems and monitor live sessions
              </p>
            </div>
          </div>

          {/* Right side: connection status + user info + sign out */}
          <div className="flex items-center gap-3">
            {/* Connection Status — Supabase Realtime is always active */}
            <div className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2 backdrop-blur">
              <div className="relative">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-sm font-medium text-emerald-400">
                Realtime Ready
              </span>
            </div>

            {/* User badge */}
            {user && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 backdrop-blur">
                <User className="h-4 w-4 text-slate-400" />
                <span className="max-w-[160px] truncate text-xs text-slate-300">
                  {user.email}
                </span>
              </div>
            )}

            {/* Sign out */}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm text-slate-400 backdrop-blur transition hover:border-red-700/50 hover:bg-red-900/20 hover:text-red-400"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-xs font-medium">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur px-6 py-3">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-400" />
            <span className="text-slate-400">Problems:</span>
            <span className="font-semibold text-blue-400">
              {problems.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Participants:</span>
            <span className="font-semibold text-emerald-400">
              {participants.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-slate-400">Status:</span>
            <span className="font-semibold text-amber-400">
              {loading ? "Loading..." : "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-3 border-b border-slate-700/50 bg-slate-900/30 backdrop-blur px-6">
          <TabsTrigger
            value="problems"
            className="text-sm font-medium data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
          >
            📝 Problems
          </TabsTrigger>
          <TabsTrigger
            value="participants"
            className="text-sm font-medium data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500"
          >
            👥 Participants
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="text-sm font-medium data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400 data-[state=active]:border-b-2 data-[state=active]:border-purple-500"
          >
            📊 Analytics
          </TabsTrigger>
        </TabsList>

        {/* Content Panels */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="problems" className="h-full m-0">
            <ProblemEditor
              selectedProblem={selectedProblem}
              onSelectProblem={setSelectedProblem}
              wsConnected={wsConnected}
              problems={problems}
              onProblemsChange={setProblems}
            />
          </TabsContent>

          <TabsContent value="participants" className="h-full m-0">
            <ParticipantMonitor participants={participants} />
          </TabsContent>

          <TabsContent value="analytics" className="h-full m-0">
            <AnalyticsPanel problems={problems} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
