"use client";

import { useState, useEffect } from "react";
import { Sandbox } from "@/components/editor/Sandbox";
import { v4 as uuidv4 } from "uuid";

/**
 * Sandbox Page
 * Persists userId in localStorage so the same participant is tracked across refreshes.
 * Prompts for a display name on first visit.
 */
export default function SandboxPage() {
  const [identity, setIdentity] = useState<{
    userId: string;
    sessionId: string;
    name: string;
  } | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedId = localStorage.getItem("aura_user_id");
    const storedName = localStorage.getItem("aura_user_name");
    // Persist a stable sessionId per user so refreshes reuse the same DB row
    let storedSessionId = localStorage.getItem("aura_session_id");
    if (!storedSessionId) {
      storedSessionId = uuidv4();
      localStorage.setItem("aura_session_id", storedSessionId);
    }
    if (storedId && storedName) {
      setIdentity({
        userId: storedId,
        sessionId: storedSessionId,
        name: storedName,
      });
    }
  }, []);

  const handleJoin = () => {
    const name =
      nameInput.trim() ||
      `Participant ${Math.floor(Math.random() * 9000) + 1000}`;
    const userId = localStorage.getItem("aura_user_id") || uuidv4();
    // Generate a fresh sessionId on join (or reuse if same user)
    let sessionId = localStorage.getItem("aura_session_id");
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem("aura_session_id", sessionId);
    }
    localStorage.setItem("aura_user_id", userId);
    localStorage.setItem("aura_user_name", name);
    setIdentity({ userId, sessionId, name });
  };

  if (!mounted) return null;

  if (!identity) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <div className="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg text-2xl">
              ⚡
            </div>
            <h1 className="text-xl font-bold text-white">Join the Challenge</h1>
            <p className="mt-1 text-sm text-slate-400">
              Enter your name to get started
            </p>
          </div>
          <input
            type="text"
            placeholder="Your name (e.g. Alice)"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            autoFocus
            className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button
            onClick={handleJoin}
            className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-semibold text-white shadow hover:from-violet-700 hover:to-blue-700 transition"
          >
            Start Coding →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-950">
      <Sandbox
        sessionId={identity.sessionId}
        userId={identity.userId}
        userName={identity.name}
        problemId="latest"
      />
    </div>
  );
}
