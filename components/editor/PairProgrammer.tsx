"use client";

import { usePairProgrammer } from "@/lib/hooks/usePairProgrammer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Zap, X } from "lucide-react";
import { useState } from "react";

interface PairProgrammerProps {
  userCode: string;
  problemTitle: string;
  problemDescription: string;
  language: string;
  onClose: () => void;
}

export function PairProgrammer({
  userCode,
  problemTitle,
  problemDescription,
  language,
  onClose,
}: PairProgrammerProps) {
  const {
    isActive,
    streamingText,
    suggestion,
    timeRemaining,
    isLoading,
    error,
    startSession,
    cancelSession,
  } = usePairProgrammer();

  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = async () => {
    setHasStarted(true);
    await startSession(userCode, problemDescription, language);
  };

  const timePercentage = (timeRemaining / 30) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-slate-900 border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-b border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                React AI Pair Programmer
              </h2>
              <p className="text-sm text-slate-400">
                Get real-time React guidance — 30 sec session
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {/* Status Indicator */}
          {hasStarted && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">
                  Session Time
                </span>
                <Badge
                  variant={timeRemaining > 10 ? "secondary" : "destructive"}
                >
                  {timeRemaining}s remaining
                </Badge>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    timeRemaining > 10
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${timePercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-950/30 border border-red-800 rounded-lg p-3 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Streaming Content */}
          {isLoading || hasStarted ? (
            <div className="bg-slate-800 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
              {streamingText || suggestion ? (
                <div className="space-y-3">
                  {streamingText && !suggestion && (
                    <div className="text-slate-300 whitespace-pre-wrap text-sm animate-pulse">
                      {streamingText}
                    </div>
                  )}

                  {suggestion && (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold text-emerald-400 mb-1">
                          Suggestion
                        </h3>
                        <p className="text-slate-200 text-sm">
                          {suggestion.suggestion}
                        </p>
                      </div>

                      {suggestion.explanation && (
                        <div>
                          <h3 className="text-sm font-semibold text-teal-400 mb-1">
                            Explanation
                          </h3>
                          <p className="text-slate-300 text-sm">
                            {suggestion.explanation}
                          </p>
                        </div>
                      )}

                      {suggestion.code_snippet && (
                        <div>
                          <h3 className="text-sm font-semibold text-blue-400 mb-1">
                            Code Example
                          </h3>
                          <pre className="bg-slate-950 rounded p-3 text-xs overflow-x-auto">
                            <code className="text-slate-300 font-mono">
                              {suggestion.code_snippet}
                            </code>
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-sm italic">
                  Initializing pair programming session...
                </p>
              )}
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg p-4 text-slate-400 text-sm">
              <p className="mb-2 font-medium text-slate-300">
                Challenge: {problemTitle}
              </p>
              <p className="text-xs text-slate-500">
                Your React AI partner will analyze your component and suggest
                the next most impactful React step — hooks, patterns, component
                structure.
              </p>
              {!userCode && (
                <p className="mt-2 text-xs text-amber-400">
                  ⚠ Write some code first before starting a session.
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {!hasStarted ? (
              <>
                <Button
                  onClick={handleStart}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!userCode}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Start Session
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="destructive"
                  onClick={cancelSession}
                  disabled={!isActive && timeRemaining === 0}
                  className="flex-1"
                >
                  End Session
                </Button>
              </>
            )}
          </div>

          {/* Info Footer */}
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
            <p>
              Session lasts 30 seconds. Gemini 2.0 Flash will suggest your next
              React step.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
