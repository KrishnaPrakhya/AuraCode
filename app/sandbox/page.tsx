"use client";

import { useState, useEffect } from "react";
import { Sandbox } from "@/components/editor/Sandbox";
import { v4 as uuidv4 } from "uuid";

const AVATARS = ["🧑‍💻", "👩‍💻", "🦊", "🐼", "🚀", "⚡", "🎯", "🔥"];

const SKILL_LEVELS = [
  {
    id: "beginner",
    label: "Beginner",
    desc: "Learning the ropes",
    color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    desc: "Comfortable with React",
    color: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  },
  {
    id: "advanced",
    label: "Advanced",
    desc: "Hooks & patterns daily",
    color: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  },
  {
    id: "expert",
    label: "Expert",
    desc: "Ship production React",
    color: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  },
];

/**
 * Sandbox Page
 * Persists userId in localStorage so the same participant is tracked across refreshes.
 * Shows a polished multi-step join screen on first visit.
 */
export default function SandboxPage() {
  const [identity, setIdentity] = useState<{
    userId: string;
    sessionId: string;
    name: string;
  } | null>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [nameInput, setNameInput] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [skillLevel, setSkillLevel] = useState("intermediate");
  const [mounted, setMounted] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedId = localStorage.getItem("aura_user_id");
    const storedName = localStorage.getItem("aura_user_name");
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
    // Random default avatar
    setSelectedAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  }, []);

  const handleJoin = () => {
    setJoining(true);
    const name =
      nameInput.trim() || `Coder ${Math.floor(Math.random() * 9000) + 1000}`;
    const userId = localStorage.getItem("aura_user_id") || uuidv4();
    let sessionId = localStorage.getItem("aura_session_id");
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem("aura_session_id", sessionId);
    }
    localStorage.setItem("aura_user_id", userId);
    localStorage.setItem("aura_user_name", name);
    localStorage.setItem("aura_skill_level", skillLevel);
    localStorage.setItem("aura_avatar", selectedAvatar);
    setTimeout(() => {
      setIdentity({ userId, sessionId, name });
    }, 600);
  };

  if (!mounted) return null;

  if (!identity) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#030712]">
        {/* Background orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 h-125 w-125 rounded-full bg-violet-600/12 blur-[100px]" />
          <div className="absolute bottom-0 right-0 h-100 w-100 rounded-full bg-indigo-500/10 blur-[80px]" />
        </div>

        {/* Back link */}
        <a
          href="/"
          className="absolute left-6 top-6 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to home
        </a>

        <div className="relative w-full max-w-md px-4">
          {/* Card */}
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/4 shadow-2xl shadow-black/60 backdrop-blur-xl">
            {/* Top gradient bar */}
            <div className="h-1 w-full bg-linear-to-r from-violet-500 via-indigo-500 to-cyan-500" />

            <div className="p-8">
              {/* Logo */}
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30 text-lg">
                  ⚛
                </div>
                <div>
                  <div className="font-bold text-white">AuraCode</div>
                  <div className="text-xs text-slate-500">
                    AI Coding Competition
                  </div>
                </div>
              </div>

              {/* Step indicator */}
              <div className="mb-6 flex items-center gap-2">
                <div
                  className={`h-1.5 flex-1 rounded-full transition-all ${step >= 1 ? "bg-violet-500" : "bg-white/10"}`}
                />
                <div
                  className={`h-1.5 flex-1 rounded-full transition-all ${step >= 2 ? "bg-violet-500" : "bg-white/10"}`}
                />
              </div>

              {step === 1 && (
                <div className="animate-fade-in-up">
                  <h1 className="mb-1 text-2xl font-extrabold text-white">
                    Who are you?
                  </h1>
                  <p className="mb-6 text-sm text-slate-400">
                    Pick an avatar and enter your name. No signup required.
                  </p>

                  {/* Avatar grid */}
                  <div className="mb-5">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Choose your avatar
                    </label>
                    <div className="grid grid-cols-8 gap-2">
                      {AVATARS.map((av) => (
                        <button
                          key={av}
                          onClick={() => setSelectedAvatar(av)}
                          className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition hover:scale-110 ${
                            selectedAvatar === av
                              ? "ring-2 ring-violet-500 bg-violet-500/20 scale-110"
                              : "bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name input */}
                  <div className="mb-6">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Your display name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alex, Priya, Sam…"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && setStep(2)}
                      autoFocus
                      maxLength={32}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]"
                  >
                    Next →
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="animate-fade-in-up">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 text-2xl">
                      {selectedAvatar}
                    </div>
                    <div>
                      <div className="font-bold text-white">
                        {nameInput.trim() || "Anonymous"}
                      </div>
                      <button
                        onClick={() => setStep(1)}
                        className="text-xs text-violet-400 hover:text-violet-300"
                      >
                        Change →
                      </button>
                    </div>
                  </div>

                  <h2 className="mb-1 text-2xl font-extrabold text-white">
                    What&apos;s your level?
                  </h2>
                  <p className="mb-5 text-sm text-slate-400">
                    Helps us tailor hints and feedback for you.
                  </p>

                  <div className="mb-6 grid grid-cols-2 gap-3">
                    {SKILL_LEVELS.map(({ id, label, desc, color }) => (
                      <button
                        key={id}
                        onClick={() => setSkillLevel(id)}
                        className={`rounded-xl border p-4 text-left transition hover:scale-[1.02] active:scale-[0.98] ${
                          skillLevel === id
                            ? color + " ring-1 ring-current"
                            : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/8"
                        }`}
                      >
                        <div className="font-bold text-sm">{label}</div>
                        <div className="text-xs opacity-70 mt-0.5">{desc}</div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {joining ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Entering Arena…
                      </>
                    ) : (
                      <>⚡ Enter the Arena</>
                    )}
                  </button>

                  {/* Quick stats */}
                  <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                    {[
                      { val: "~45", label: "min challenge" },
                      { val: "5", label: "AI categories" },
                      { val: "∞", label: "attempts" },
                    ].map(({ val, label }) => (
                      <div
                        key={label}
                        className="rounded-lg border border-white/6 bg-white/2 py-2.5"
                      >
                        <div className="text-base font-bold text-white">
                          {val}
                        </div>
                        <div className="text-xs text-slate-500">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
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
