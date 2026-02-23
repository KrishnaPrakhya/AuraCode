import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500">
                <span className="text-lg font-bold text-white">⚛</span>
              </div>
              <h1 className="text-2xl font-bold text-white">AuraCode</h1>
            </div>
            <Link href="/admin">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:text-white"
              >
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex min-h-[calc(100vh-100px)] items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
            <span>⚛</span>
            <span>React Component Building Hackathon</span>
          </div>
          <h2 className="mb-4 text-5xl font-bold tracking-tight text-white">
            Build React Components.
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Get Evaluated by AI.
            </span>
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-300">
            Compete in real-time React building challenges. Write live
            components, see them render instantly, and receive AI-powered
            evaluation with detailed rubric scoring across 5 categories.
          </p>

          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-4">
              <Link href="/sandbox">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                >
                  ⚛ Start Building
                </Button>
              </Link>
              <Link href="/admin">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-slate-600 text-slate-300 hover:text-white"
                >
                  🛠 Admin Dashboard
                </Button>
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-20 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-violet-700/30 bg-violet-900/10 p-6 backdrop-blur">
              <div className="mb-3 text-3xl">⚛</div>
              <h3 className="mb-2 font-semibold text-white">
                Live React Preview
              </h3>
              <p className="text-sm text-slate-400">
                Your components render live in a sandboxed iframe as you type —
                no build step required
              </p>
            </div>
            <div className="rounded-xl border border-indigo-700/30 bg-indigo-900/10 p-6 backdrop-blur">
              <div className="mb-3 text-3xl">🤖</div>
              <h3 className="mb-2 font-semibold text-white">AI Evaluation</h3>
              <p className="text-sm text-slate-400">
                Gemini scores your submission across Architecture, Hooks, Code
                Quality, Functionality, and Accessibility
              </p>
            </div>
            <div className="rounded-xl border border-cyan-700/30 bg-cyan-900/10 p-6 backdrop-blur">
              <div className="mb-3 text-3xl">⚡</div>
              <h3 className="mb-2 font-semibold text-white">
                AI Pair Programmer
              </h3>
              <p className="text-sm text-slate-400">
                30-second React coaching sessions — get the next impactful step
                for your component instantly
              </p>
            </div>
          </div>

          {/* Secondary features */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
              <div className="mb-2 text-xl">🧠</div>
              <h3 className="mb-1 text-sm font-semibold text-white">
                Contextual Hints
              </h3>
              <p className="text-xs text-slate-400">
                Progressive React hints without spoiling the solution
              </p>
            </div>
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
              <div className="mb-2 text-xl">📡</div>
              <h3 className="mb-1 text-sm font-semibold text-white">
                Real-time Sync
              </h3>
              <p className="text-xs text-slate-400">
                Admin broadcasts new challenges live to all participants
              </p>
            </div>
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
              <div className="mb-2 text-xl">🎥</div>
              <h3 className="mb-1 text-sm font-semibold text-white">
                Session Playback
              </h3>
              <p className="text-xs text-slate-400">
                Replay your entire coding journey frame by frame
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
