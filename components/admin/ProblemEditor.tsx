"use client";

import { useState, useEffect } from "react";
import { Send, Plus, Save, Trash2, CheckSquare, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { problemRepository } from "@/lib/supabase/repositories/problems";
import { getCurrentUser, getSupabaseClient } from "@/lib/supabase/client";
import type { Problem, ProgrammingLanguage } from "@/lib/types/database";

interface ProblemEditorProps {
  selectedProblem: string | null;
  onSelectProblem: (id: string | null) => void;
  wsConnected: boolean;
  problems: Problem[];
  onProblemsChange: (problems: Problem[]) => void;
}

/**
 * React Challenge Creator
 * Create, edit, and broadcast React building challenges to participants
 */
export function ProblemEditor({
  selectedProblem,
  onSelectProblem,
  wsConnected,
  problems,
  onProblemsChange,
}: ProblemEditorProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [language, setLanguage] = useState<ProgrammingLanguage>("typescript");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3);
  // Requirements = acceptance criteria for the React challenge
  const [requirements, setRequirements] = useState<string[]>([
    "Component renders without errors",
  ]);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(45);
  const [pointsAvailable, setPointsAvailable] = useState(100);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  // Supabase Realtime broadcast (replaces broken WebSocket)
  const broadcastProblem = async (problem: Problem) => {
    return new Promise<void>((resolve) => {
      const supabase = getSupabaseClient();
      const channel = supabase.channel("problem-broadcast");
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel
            .send({
              type: "broadcast",
              event: "problem-push",
              payload: problem,
            })
            .then(() => {
              // small delay ensures delivery before unsubscribing
              setTimeout(() => {
                supabase.removeChannel(channel);
                resolve();
              }, 500);
            })
            .catch(() => {
              supabase.removeChannel(channel);
              resolve();
            });
        }
      });
    });
  };

  // Load selected challenge
  useEffect(() => {
    if (selectedProblem) {
      const problem = problems.find((p) => p.id === selectedProblem);
      if (problem) {
        setTitle(problem.title);
        setDescription(problem.description);
        setStarterCode(problem.starter_code || "");
        setLanguage(problem.language);
        setDifficulty(problem.difficulty);
        setTimeLimitMinutes(problem.time_limit_minutes);
        setPointsAvailable(problem.points_available);
        // Load requirements from test_cases.description fields
        const reqs = (problem.test_cases || [])
          .map((tc) => tc.description)
          .filter(Boolean) as string[];
        setRequirements(
          reqs.length > 0 ? reqs : ["Component renders without errors"],
        );
      }
    }
  }, [selectedProblem, problems]);

  const handleSave = async () => {
    if (!title || !description) {
      alert("Please fill in title and description");
      return;
    }

    try {
      setSaving(true);

      const user = await getCurrentUser();
      // Use system UUID as fallback (dev bypass)
      const createdBy = user?.id ?? "00000000-0000-0000-0000-000000000001";

      const testCasesFromReqs = requirements
        .filter((r) => r.trim())
        .map((req) => ({
          input: "",
          expected_output: "",
          description: req,
          is_hidden: false,
        }));

      const body = {
        title,
        description,
        markdownContent: description,
        difficulty,
        timeLimitMinutes,
        pointsAvailable,
        starterCode,
        language,
        testCases: testCasesFromReqs,
        requirements,
        createdBy,
      };

      if (selectedProblem) {
        const res = await fetch(`/api/admin/problems/${selectedProblem}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            markdown_content: description,
            difficulty,
            time_limit_minutes: timeLimitMinutes,
            points_available: pointsAvailable,
            starter_code: starterCode,
            language,
            test_cases: testCasesFromReqs,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Update failed");
        console.log("[v0] Challenge updated");
      } else {
        const res = await fetch("/api/admin/problems", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Create failed");
        console.log("[v0] Challenge created:", result.id);
        onSelectProblem(result.id);
      }

      // Refresh problems list
      const updatedProblems = await problemRepository.getActive();
      onProblemsChange(updatedProblems);

      alert("Challenge saved successfully!");
    } catch (error) {
      console.error("[v0] Error saving challenge:", error);
      alert(
        "Failed to save challenge: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePush = async () => {
    if (!selectedProblem) {
      alert("Please save the problem first");
      return;
    }

    try {
      setPushing(true);
      const problem = problems.find((p) => p.id === selectedProblem);

      if (problem) {
        await broadcastProblem(problem);
        console.log("[v0] Problem pushed to participants");
        alert("Problem broadcasted to all participants!");
      }
    } catch (error) {
      console.error("[v0] Error pushing problem:", error);
      alert("Failed to push problem");
    } finally {
      setPushing(false);
    }
  };

  const handleNew = () => {
    onSelectProblem(null);
    setTitle("");
    setDescription("");
    setStarterCode("");
    setLanguage("typescript");
    setDifficulty(3);
    setTimeLimitMinutes(45);
    setPointsAvailable(100);
    setRequirements(["Component renders without errors"]);
  };

  const handleDelete = async () => {
    if (!selectedProblem) return;
    if (!confirm("Are you sure you want to delete this challenge?")) return;
    try {
      const res = await fetch(`/api/admin/problems/${selectedProblem}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Delete failed");
      }
      const updatedProblems = await problemRepository.getActive();
      onProblemsChange(updatedProblems);
      handleNew();
      alert("Challenge deleted!");
    } catch (error) {
      console.error("[v0] Error deleting challenge:", error);
      alert("Failed to delete challenge");
    }
  };

  const addRequirement = () => setRequirements([...requirements, ""]);

  const updateRequirement = (index: number, value: string) => {
    const updated = [...requirements];
    updated[index] = value;
    setRequirements(updated);
  };

  const removeRequirement = (index: number) => {
    if (requirements.length > 1) {
      setRequirements(requirements.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="flex h-full gap-4 overflow-hidden p-6">
      {/* Problem List */}
      <div className="w-72 flex-shrink-0 overflow-y-auto rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur shadow-xl">
        <div className="sticky top-0 border-b border-slate-700/50 bg-slate-900/90 backdrop-blur p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200">Problems</h3>
            <Button
              onClick={handleNew}
              size="sm"
              className="h-8 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <Plus size={14} className="mr-1" />
              New
            </Button>
          </div>
        </div>

        <div className="p-3 space-y-2">
          {problems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-slate-400 mb-3">
                No problems created yet
              </p>
              <Button onClick={handleNew} size="sm" variant="outline">
                Create First Problem
              </Button>
            </div>
          ) : (
            problems.map((problem) => (
              <button
                key={problem.id}
                onClick={() => onSelectProblem(problem.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedProblem === problem.id
                    ? "bg-blue-500/20 border border-blue-500/50 shadow-lg"
                    : "bg-slate-800/50 border border-slate-700/30 hover:bg-slate-700/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {problem.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {problem.language}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(problem.difficulty)].map((_, i) => (
                      <div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-blue-400"
                      />
                    ))}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor Panel */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur shadow-xl">
        <div className="border-b border-slate-700/50 bg-slate-900/90 backdrop-blur px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              {selectedProblem ? "✏️ Edit Problem" : "➕ Create New Problem"}
            </h2>
            <div className="flex items-center gap-2">
              {selectedProblem && (
                <Button
                  onClick={handleDelete}
                  size="sm"
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Two Sum"
              className="w-full rounded-lg bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 border border-slate-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          {/* Language & Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Language
              </label>
              <select
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value as ProgrammingLanguage)
                }
                className="w-full rounded-lg bg-slate-800/80 px-4 py-2.5 text-sm text-white border border-slate-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="typescript">TypeScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Difficulty
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level as 1 | 2 | 3 | 4 | 5)}
                    className={`flex-1 h-10 rounded-lg font-semibold text-xs transition-all ${
                      difficulty === level
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg scale-105"
                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Problem description (supports Markdown)"
              rows={6}
              className="w-full rounded-lg bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-slate-500 border border-slate-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all font-mono"
            />
          </div>

          {/* Starter Code */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Starter Code
            </label>
            <textarea
              value={starterCode}
              onChange={(e) => setStarterCode(e.target.value)}
              placeholder="function solution() { ... }"
              rows={4}
              className="w-full rounded-lg bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-slate-500 border border-slate-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all font-mono"
            />
          </div>

          {/* Requirements / Acceptance Criteria */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  ✅ Requirements
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Acceptance criteria — AI will evaluate against these
                </p>
              </div>
              <Button onClick={addRequirement} size="sm" variant="outline">
                <Plus size={14} className="mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {requirements.map((req, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 shrink-0 text-slate-500" />
                  <input
                    type="text"
                    value={req}
                    onChange={(e) => updateRequirement(idx, e.target.value)}
                    placeholder={`Requirement ${idx + 1} (e.g., User can add tasks)`}
                    className="flex-1 rounded-lg bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 border border-slate-700/50 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                  />
                  {requirements.length > 1 && (
                    <button
                      onClick={() => removeRequirement(idx)}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Time & Points */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Time Limit (min)
              </label>
              <input
                type="number"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                min={5}
                max={180}
                className="w-full rounded-lg bg-slate-800/80 px-4 py-2.5 text-sm text-white border border-slate-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Points Available
              </label>
              <input
                type="number"
                value={pointsAvailable}
                onChange={(e) => setPointsAvailable(Number(e.target.value))}
                min={10}
                max={500}
                step={10}
                className="w-full rounded-lg bg-slate-800/80 px-4 py-2.5 text-sm text-white border border-slate-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-700/50 bg-slate-900/90 backdrop-blur px-6 py-4 flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || !title || !description}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Problem"}
          </Button>

          {selectedProblem && (
            <Button
              onClick={handlePush}
              disabled={pushing}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <Send size={16} />
              {pushing ? "Broadcasting..." : "Broadcast to Participants"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
