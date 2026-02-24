import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* Ambient background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-175 w-175 rounded-full bg-violet-600/10 blur-[120px] animate-orb-slow" />
        <div className="absolute top-1/2 -right-60 h-150 w-150 rounded-full bg-indigo-500/8 blur-[100px] animate-orb-slower" />
        <div className="absolute bottom-0 left-1/3 h-125 w-125 rounded-full bg-cyan-500/6 blur-[100px] animate-orb-medium" />
      </div>

      {/* ─── Navigation ─────────────────────────────────────────────────────── */}
      <header className="relative z-10 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
              <span className="text-base font-bold">⚛</span>
              <div className="absolute inset-0 rounded-xl bg-linear-to-br from-violet-400/20 to-transparent" />
            </div>
            <span className="text-lg font-bold tracking-tight">AuraCode</span>
          </div>

          <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#leaderboard" className="hover:text-white transition-colors">Leaderboard</a>
          </div>

          <Link
            href="/sandbox"
            className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/30 transition hover:bg-violet-500 active:scale-95"
          >
            Start Coding →
          </Link>
        </nav>
      </header>

      {/* ─── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex min-h-[92vh] flex-col items-center justify-center px-6 py-24 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex animate-fade-in items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300 shadow-sm shadow-violet-500/10">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-400" />
          </span>
          Live AI-Powered Coding Competitions
        </div>

        {/* Headline */}
        <h1 className="animate-fade-in-up mb-6 max-w-4xl text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
          Where Developers
          <br />
          <span className="bg-linear-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Prove Their Skills
          </span>
        </h1>

        <p className="animate-fade-in-up animation-delay-100 mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl">
          Compete in live React challenges, get your code scored by Gemini AI across
          5 categories, pair-program with an AI coach, and climb the global leaderboard
          — all in your browser.
        </p>

        {/* CTAs */}
        <div className="animate-fade-in-up animation-delay-200 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/sandbox"
            className="group relative overflow-hidden rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-violet-500/30 transition hover:shadow-violet-500/50 active:scale-95"
          >
            <span className="relative z-10 flex items-center gap-2">
              ⚡ Enter the Arena
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </span>
            <div className="absolute inset-0 bg-linear-to-r from-violet-500 to-indigo-500 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-slate-300 backdrop-blur transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
          >
            See How It Works
          </a>
        </div>

        {/* Trust strip */}
        <div className="animate-fade-in-up animation-delay-300 mt-14 flex flex-wrap items-center justify-center gap-8 text-slate-500 text-sm">
          {["No setup required", "Free to compete", "AI-graded instantly", "100% browser-based"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-violet-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              {t}
            </span>
          ))}
        </div>

        {/* Floating code card */}
        <div className="animate-float mt-16 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/8 bg-[#0d1117] shadow-2xl shadow-black/60">
          <div className="flex items-center gap-2 border-b border-white/6 bg-[#161b22] px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-500/70" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <div className="h-3 w-3 rounded-full bg-green-500/70" />
            <span className="ml-2 text-xs text-slate-500 font-mono">App.tsx — AuraCode Challenge</span>
          </div>
          <pre className="overflow-x-auto p-5 text-left text-xs leading-relaxed font-mono text-slate-300">
            <code>{`export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');

  const addTask = () => {
    if (!input.trim()) return;
    setTasks(prev => [
      ...prev, { id: Date.now(), text: input, done: false }
    ]);
    setInput('');
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">✅ My Tasks</h1>
      {/* ← AI is watching your progress in real-time */}
    </div>
  );
}`}</code>
          </pre>
          <div className="border-t border-white/6 bg-[#161b22]/80 px-4 py-2.5 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"/><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"/></span>
              AI Evaluating…
            </div>
            <div className="flex gap-1 ml-auto">
              {[82, 90, 75, 88, 79].map((v, i) => (
                <div key={i} className="h-1 rounded-full bg-violet-500/60" style={{ width: `${v * 0.3}px` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-y border-white/5 bg-white/2 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: "5", label: "AI Scoring Categories", suffix: "" },
              { value: "30", label: "Second AI Coaching Sessions", suffix: "s" },
              { value: "100", label: "Points Per Challenge", suffix: "+" },
              { value: "∞", label: "Skill Levels Welcome", suffix: "" },
            ].map(({ value, label, suffix }) => (
              <div key={label} className="text-center">
                <div className="mb-1 text-4xl font-extrabold tracking-tight text-white">
                  {value}<span className="text-violet-400">{suffix}</span>
                </div>
                <div className="text-sm text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-violet-400">Platform Features</p>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
              Everything a developer needs
            </h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">Built for serious developers who want to compete, learn, and grow — all powered by cutting-edge AI.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "⚛",
                color: "from-violet-500/20 to-violet-500/5",
                border: "border-violet-500/20",
                title: "Live React Preview",
                desc: "Components render in a sandboxed iframe as you type. Zero build step. Real-time feedback that makes you feel like a wizard.",
              },
              {
                icon: "🤖",
                color: "from-indigo-500/20 to-indigo-500/5",
                border: "border-indigo-500/20",
                title: "Gemini AI Judge",
                desc: "Instant rubric scoring across Architecture, Hooks Usage, Code Quality, Functionality, and Accessibility — with written feedback.",
              },
              {
                icon: "🧑‍💻",
                color: "from-cyan-500/20 to-cyan-500/5",
                border: "border-cyan-500/20",
                title: "AI Pair Programmer",
                desc: "Your personal 30-second coach. Analyzes your current code and tells you exactly what to do next — without giving away the answer.",
              },
              {
                icon: "🧠",
                color: "from-pink-500/20 to-pink-500/5",
                border: "border-pink-500/20",
                title: "Progressive Hints",
                desc: "Unlock hints one at a time. Each hint is contextual to your current code, nudging you forward without spoiling the challenge.",
              },
              {
                icon: "📡",
                color: "from-emerald-500/20 to-emerald-500/5",
                border: "border-emerald-500/20",
                title: "Real-time Sync",
                desc: "New challenges pushed live to all participants simultaneously via Supabase Realtime. No refresh needed.",
              },
              {
                icon: "🎬",
                color: "from-amber-500/20 to-amber-500/5",
                border: "border-amber-500/20",
                title: "Session Playback",
                desc: "Replay your entire coding journey frame by frame. Review every keystroke, every decision — like a highlight reel of your mind.",
              },
            ].map(({ icon, color, border, title, desc }) => (
              <div
                key={title}
                className={`group relative overflow-hidden rounded-2xl border ${border} bg-linear-to-br ${color} p-6 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30`}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/8 text-2xl transition group-hover:scale-110">
                  {icon}
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it Works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative z-10 py-24 px-6 bg-linear-to-b from-transparent via-violet-950/10 to-transparent">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-violet-400">Simple Process</p>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
              From zero to competing in 60 seconds
            </h2>
          </div>

          <div className="relative space-y-8">
            {/* Connector line */}
            <div className="absolute left-6 top-10 hidden h-[calc(100%-2.5rem)] w-px bg-linear-to-b from-violet-500/50 via-indigo-500/30 to-transparent md:block" />

            {[
              {
                step: "01",
                title: "Enter the Arena",
                desc: "Type your display name and join the live session. No account, no credit card, no setup. Just you and the challenge.",
                icon: "👤",
              },
              {
                step: "02",
                title: "Code the Challenge",
                desc: "A React challenge appears with full problem brief, starter code, and a live preview pane. Build your component — the AI watches.",
                icon: "⚛",
              },
              {
                step: "03",
                title: "Get AI-Scored Instantly",
                desc: "Hit Evaluate and receive a detailed breakdown across 5 rubric categories in seconds. Get hints or ask your AI Pair Programmer for guidance.",
                icon: "🤖",
              },
              {
                step: "04",
                title: "Review & Replay",
                desc: "Watch your entire session frame by frame. See exactly where your score improved and what patterns you should repeat next time.",
                icon: "🎬",
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="relative flex gap-6 md:items-start">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-violet-500/40 bg-violet-500/10 text-violet-300 text-lg font-bold shadow-lg shadow-violet-500/10 z-10">
                  {icon}
                </div>
                <div className="flex-1 pb-2">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-mono text-violet-500">{step}</span>
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI Scoring Breakdown ─────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-violet-400">Scoring Engine</p>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              5-dimensional AI rubric
            </h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">Every submission is judged across five weighted categories. No black box — you see exactly why you scored what you scored.</p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/3 p-8">
            <div className="space-y-5">
              {[
                { label: "Component Architecture", score: 88, color: "bg-violet-500", desc: "State design, component hierarchy, separation of concerns" },
                { label: "Hooks & State Usage", score: 92, color: "bg-indigo-500", desc: "Correct use of useState, useEffect, useCallback, custom hooks" },
                { label: "Code Quality", score: 79, color: "bg-cyan-500", desc: "Readability, naming, TypeScript types, no dead code" },
                { label: "Functionality", score: 95, color: "bg-emerald-500", desc: "Does the component actually work as specified?" },
                { label: "Accessibility", score: 71, color: "bg-amber-500", desc: "ARIA attributes, keyboard navigation, semantic HTML" },
              ].map(({ label, score, color, desc }) => (
                <div key={label}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white text-sm">{label}</span>
                      <span className="ml-2 text-xs text-slate-500">{desc}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{score}/100</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
                    <div
                      className={`h-full rounded-full ${color} transition-all`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-5">
              <span className="text-slate-400 text-sm">Overall Score</span>
              <span className="text-2xl font-extrabold text-white">85<span className="text-violet-400">/100</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Leaderboard Preview ────────────────────────────────────────────── */}
      <section id="leaderboard" className="relative z-10 py-24 px-6 bg-linear-to-b from-transparent via-indigo-950/10 to-transparent">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-violet-400">Hall of Fame</p>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Live Leaderboard
            </h2>
            <p className="mt-4 text-slate-400">Compete against others and watch your rank update in real-time.</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/3">
            <div className="border-b border-white/6 bg-white/2 px-6 py-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Rank & Participant</span>
              <span>Score</span>
            </div>
            {[
              { rank: 1, name: "Alex K.", score: 97, badge: "🥇", color: "text-amber-400" },
              { rank: 2, name: "Priya M.", score: 94, badge: "🥈", color: "text-slate-300" },
              { rank: 3, name: "Jordan S.", score: 91, badge: "🥉", color: "text-amber-600" },
              { rank: 4, name: "Sam T.", score: 87, badge: "4", color: "text-slate-500" },
              { rank: 5, name: "Casey R.", score: 82, badge: "5", color: "text-slate-500" },
            ].map(({ rank, name, score, badge, color }) => (
              <div key={rank} className="flex items-center gap-4 px-6 py-4 border-b border-white/4 last:border-0 hover:bg-white/2 transition group">
                <span className={`w-6 text-center font-bold ${color}`}>{badge}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-violet-500/30 to-indigo-500/30 text-sm font-bold text-violet-300">
                  {name.charAt(0)}
                </div>
                <span className="flex-1 font-medium text-white">{name}</span>
                <div className="flex items-center gap-3">
                  <div className="hidden md:block h-1.5 w-24 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-linear-to-r from-violet-500 to-indigo-500" style={{ width: `${score}%` }} />
                  </div>
                  <span className="font-bold text-white tabular-nums">{score}</span>
                </div>
              </div>
            ))}
            <div className="px-6 py-3 text-center text-xs text-slate-600">
              Live data from active sessions — join to appear here
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-linear-to-br from-violet-900/30 via-indigo-900/20 to-slate-900/30 p-12 backdrop-blur shadow-2xl shadow-violet-500/10">
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-linear-to-br from-violet-600/5 to-transparent" />
            <div className="mb-4 text-5xl">⚡</div>
            <h2 className="mb-4 text-3xl font-extrabold tracking-tight md:text-4xl">
              Ready to prove<br />
              <span className="bg-linear-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">what you&apos;re made of?</span>
            </h2>
            <p className="mx-auto mb-8 max-w-md text-slate-400">
              No setup. No signup. Just open the arena, type your name, and start building.
              Your AI judge is waiting.
            </p>
            <Link
              href="/sandbox"
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-10 py-4 text-base font-bold text-white shadow-xl shadow-violet-500/30 transition hover:shadow-violet-500/50 hover:from-violet-500 hover:to-indigo-500 active:scale-95"
            >
              Enter the Arena
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 py-10 px-6 text-center text-sm text-slate-600">
        <div className="mx-auto max-w-6xl flex flex-col items-center gap-3 md:flex-row md:justify-between">
          <div className="flex items-center gap-2 text-slate-500">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-linear-to-br from-violet-500 to-indigo-600 text-xs">⚛</div>
            <span className="font-semibold text-slate-400">AuraCode</span>
          </div>
          <p className="text-slate-600">AI-powered competitive coding — built for the next generation of developers.</p>
          <div className="flex gap-4 text-slate-600">
            <a href="#features" className="hover:text-slate-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-400 transition-colors">How it Works</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
