"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SessionPlayback } from "@/components/playback/SessionPlayback";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SessionData {
  id: string;
  userId: string;
  problemId: string;
  problemTitle: string;
  language: string;
  startedAt: string;
  completedAt: string | null;
  finalScore: number;
  events: any[];
}

export default function PlaybackPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/playback/sessions/${sessionId}`);
        if (!response.ok) throw new Error("Failed to fetch session");
        const data = await response.json();
        setSessionData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-400">Loading session...</p>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 bg-red-950/20 border-red-800">
          <p className="text-red-200">Error: {error || "Session not found"}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            {sessionData.problemTitle}
          </h1>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{sessionData.language}</Badge>
            <span className="text-slate-400">
              Score: {sessionData.finalScore}
            </span>
            <span className="text-slate-400">
              {new Date(sessionData.startedAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Playback Component */}
        <SessionPlayback
          sessionId={sessionId}
          userId={sessionData.userId}
          events={sessionData.events}
          language={sessionData.language}
        />
      </div>
    </div>
  );
}
