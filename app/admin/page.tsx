"use client";

import { useState, useEffect } from "react";
import { AdminDashboard } from "@/components/admin/Dashboard";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import { getSupabaseClient } from "@/lib/supabase/client";

import { Activity, Lock, Mail, Eye, EyeOff, FlaskConical } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const DEV_MOCK_USER: User = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "dev@auracode.local",
  role: "authenticated",
  aud: "authenticated",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: { name: "Dev Admin" },
  identities: [],
  factors: [],
};

/**
 * Admin Dashboard Page
 * Includes Supabase email/password login gate
 */
export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const { isConnected } = useWebSocket();

  // Check existing session on mount
  useEffect(() => {
    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (login / logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setLoginError(error.message);
      }
    } catch {
      setLoginError("An unexpected error occurred. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  };

  // Loading spinner
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
          </div>
          <p className="text-sm text-slate-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Login form
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="w-full max-w-md px-6">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30">
              <Activity className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                AuraCode Admin
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Sign in to access the command center
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-300"
                  htmlFor="email"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-300"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-10 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {loginError && (
                <p className="rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-2.5 text-sm text-red-400">
                  {loginError}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full rounded-lg bg-linear-to-r from-blue-500 to-cyan-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-600 hover:to-cyan-600 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loggingIn ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in…
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Dev bypass — only visible in non-production */}
            {process.env.NODE_ENV !== "production" && (
              <div className="mt-5 border-t border-slate-700/50 pt-5">
                <button
                  onClick={() => setUser(DEV_MOCK_USER)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-600/40 bg-amber-900/20 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-900/40"
                >
                  <FlaskConical className="h-4 w-4" />
                  Dev Bypass (skip login)
                </button>
                <p className="mt-2 text-center text-xs text-slate-500">
                  Only visible in development. Hidden in production.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Authenticated — show the dashboard
  return (
    <div className="h-screen bg-slate-950">
      <AdminDashboard
        wsConnected={isConnected}
        onSignOut={handleSignOut}
        user={user}
      />
    </div>
  );
}
