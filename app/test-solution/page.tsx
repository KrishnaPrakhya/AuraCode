"use client";

import { useState, useMemo } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

interface City {
  id: string;
  name: string;
  population: number;
  urgency: 1 | 2 | 3 | 4 | 5;
}

interface Allocation {
  food: number;
  water: number;
}

const CITIES: City[] = [
  { id: "A", name: "Aravali", population: 12000, urgency: 5 },
  { id: "B", name: "Bengpur", population: 8500,  urgency: 3 },
  { id: "C", name: "Chandok", population: 5200,  urgency: 4 },
  { id: "D", name: "Dhanera", population: 20000, urgency: 2 },
  { id: "E", name: "Eluru",   population: 3000,  urgency: 5 },
  { id: "F", name: "Finpur",  population: 9800,  urgency: 1 },
];

const TOTAL_FOOD  = 500;
const TOTAL_WATER = 400;
const TOTAL_URGENCY = CITIES.reduce((s, c) => s + c.urgency, 0); // 20

const urgencyLabel: Record<number, string> = {
  5: "Critical",
  4: "High",
  3: "Moderate",
  2: "Low",
  1: "Minimal",
};

const urgencyStyle: Record<number, string> = {
  5: "bg-red-500/20 text-red-300 border border-red-500/40",
  4: "bg-orange-500/20 text-orange-300 border border-orange-500/40",
  3: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
  2: "bg-blue-500/20 text-blue-300 border border-blue-500/40",
  1: "bg-slate-600/30 text-slate-400 border border-slate-500/40",
};

// ─── Greedy Allocator ────────────────────────────────────────────────────────
// Urgency-weighted split:
//   each city's share = (its urgency / total urgency) × total resources
// Sort DESC so high-urgency cities get the rounded-up share first.

function greedyAllocate(): Record<string, Allocation> {
  const sorted = [...CITIES].sort((a, b) => b.urgency - a.urgency);
  let foodLeft  = TOTAL_FOOD;
  let waterLeft = TOTAL_WATER;

  const result: Record<string, Allocation> = Object.fromEntries(
    CITIES.map((c) => [c.id, { food: 0, water: 0 }])
  );

  sorted.forEach((city, i) => {
    const isLast = i === sorted.length - 1;
    // Last city gets the remainder to avoid rounding loss
    const food  = isLast ? foodLeft  : Math.round((city.urgency / TOTAL_URGENCY) * TOTAL_FOOD);
    const water = isLast ? waterLeft : Math.round((city.urgency / TOTAL_URGENCY) * TOTAL_WATER);
    const fGive = Math.min(food,  foodLeft);
    const wGive = Math.min(water, waterLeft);
    result[city.id] = { food: fGive, water: wGive };
    foodLeft  -= fGive;
    waterLeft -= wGive;
  });

  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TestSolutionPage() {
  const [allocations, setAllocations] = useState<Record<string, Allocation>>(
    Object.fromEntries(CITIES.map((c) => [c.id, { food: 0, water: 0 }]))
  );

  const [showFormula, setShowFormula] = useState(false);

  const update = (id: string, type: "food" | "water", val: number) => {
    setAllocations((prev) => ({
      ...prev,
      [id]: { ...prev[id], [type]: Math.max(0, val) },
    }));
  };

  const handleAutoAllocate = () => setAllocations(greedyAllocate());
  const handleReset = () =>
    setAllocations(
      Object.fromEntries(CITIES.map((c) => [c.id, { food: 0, water: 0 }]))
    );

  // ── Scores — simple loops, no complex math ──
  const { totalFood, totalWater, coverageScore, urgencyScore, cityStats } =
    useMemo(() => {
      let totalFood    = 0;
      let totalWater   = 0;
      let coveredCount = 0;
      let urgencySum   = 0;

      const cityStats = CITIES.map((city) => {
        const alloc = allocations[city.id];
        totalFood  += alloc.food;
        totalWater += alloc.water;
        const covered = alloc.food > 0 || alloc.water > 0;
        if (covered) { coveredCount++; urgencySum += city.urgency; }
        return { ...city, alloc, covered };
      });

      // Coverage Score: % of cities that received any resources
      const coverageScore = Math.round((coveredCount / CITIES.length) * 100);
      // Urgency Score: urgency points of covered cities / total urgency × 100
      const urgencyScore  = Math.round((urgencySum / TOTAL_URGENCY) * 100);

      return { totalFood, totalWater, coverageScore, urgencyScore, cityStats };
    }, [allocations]);

  const overFood  = totalFood  > TOTAL_FOOD;
  const overWater = totalWater > TOTAL_WATER;

  const foodPct  = Math.min((totalFood  / TOTAL_FOOD)  * 100, 100);
  const waterPct = Math.min((totalWater / TOTAL_WATER) * 100, 100);

  const overallScore = Math.round((coverageScore + urgencyScore) / 2);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Top banner ── */}
      <div className="bg-linear-to-r from-red-900/60 to-orange-900/40 border-b border-red-700/30 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <h1 className="text-base font-bold text-white">
              Reference Solution — Disaster Relief Allocator
            </h1>
            <p className="text-xs text-red-300/70">
              Admin test view · Compare participant output against this
            </p>
          </div>
        </div>
        <a
          href="/admin"
          className="text-xs text-slate-400 hover:text-white transition border border-slate-700 rounded-lg px-3 py-1.5"
        >
          ← Back to Admin
        </a>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Score cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-emerald-700/40 bg-linear-to-br from-emerald-900/30 to-emerald-800/10 p-5 text-center">
            <p className="text-xs text-emerald-400/70 font-medium uppercase tracking-widest mb-1">Coverage Score</p>
            <p className={`text-5xl font-black ${coverageScore >= 80 ? "text-emerald-300" : coverageScore >= 50 ? "text-amber-300" : "text-red-400"}`}>
              {coverageScore}%
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {cityStats.filter((c) => c.covered).length} / {CITIES.length} cities receiving aid
            </p>
          </div>

          <div className="rounded-2xl border border-violet-700/40 bg-linear-to-br from-violet-900/30 to-violet-800/10 p-5 text-center">
            <p className="text-xs text-violet-400/70 font-medium uppercase tracking-widest mb-1">Urgency Score</p>
            <p className={`text-5xl font-black ${urgencyScore >= 80 ? "text-violet-300" : urgencyScore >= 50 ? "text-amber-300" : "text-red-400"}`}>
              {urgencyScore}%
            </p>
            <p className="text-[11px] text-slate-500 mt-1">High-urgency cities prioritised</p>
          </div>

          <div className="rounded-2xl border border-blue-700/40 bg-linear-to-br from-blue-900/30 to-blue-800/10 p-5 text-center">
            <p className="text-xs text-blue-400/70 font-medium uppercase tracking-widest mb-1">Overall Score</p>
            <p className={`text-5xl font-black ${overallScore >= 80 ? "text-blue-300" : overallScore >= 50 ? "text-amber-300" : "text-red-400"}`}>
              {overallScore}%
            </p>
            <p className="text-[11px] text-slate-500 mt-1">(Coverage + Urgency) ÷ 2</p>
          </div>
        </div>

        {/* ── Resource tracker ── */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">📦 Resource Usage</h2>

          {/* Food */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-slate-300">🍞 Food</span>
              <span className={`font-mono font-semibold ${overFood ? "text-red-400" : "text-slate-300"}`}>
                {totalFood} / {TOTAL_FOOD} units{overFood && "  ⚠️ Over limit!"}
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${overFood ? "bg-red-500" : foodPct > 85 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${foodPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-slate-300">💧 Water</span>
              <span className={`font-mono font-semibold ${overWater ? "text-red-400" : "text-slate-300"}`}>
                {totalWater} / {TOTAL_WATER} units{overWater && "  ⚠️ Over limit!"}
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${overWater ? "bg-red-500" : waterPct > 85 ? "bg-amber-500" : "bg-blue-500"}`}
                style={{ width: `${waterPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* City cards */}
        <div>
          <h2 className="text-sm font-semibold text-slate-200 mb-3">🏙️ City Allocations</h2>
          <div className="space-y-2">
            {cityStats.map((city) => (
              <div
                key={city.id}
                className={`rounded-xl border p-4 flex flex-wrap items-center gap-4 transition-all ${
                  city.covered ? "border-slate-600/60 bg-slate-900/60" : "border-slate-700/30 bg-slate-900/30 opacity-60"
                }`}
              >
                <div className="flex-1 min-w-40">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-white">{city.name}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${urgencyStyle[city.urgency]}`}>
                      U{city.urgency} · {urgencyLabel[city.urgency]}
                    </span>
                    {!city.covered && <span className="text-[11px] text-slate-500 italic">no resources sent</span>}
                  </div>
                  <p className="text-xs text-slate-500">Population: {city.population.toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">🍞 Food</label>
                  <input
                    type="number" min={0}
                    value={allocations[city.id].food}
                    onChange={(e) => update(city.id, "food", Number(e.target.value))}
                    className="w-20 rounded-lg bg-slate-800 border border-slate-600 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500 text-center"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">💧 Water</label>
                  <input
                    type="number" min={0}
                    value={allocations[city.id].water}
                    onChange={(e) => update(city.id, "water", Number(e.target.value))}
                    className="w-20 rounded-lg bg-slate-800 border border-slate-600 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500 text-center"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex gap-3">
          <button
            onClick={handleAutoAllocate}
            className="flex-1 bg-linear-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-red-900/30"
          >
            ⚡ Auto Allocate (Greedy — urgency-weighted)
          </button>
          <button
            onClick={handleReset}
            className="px-6 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition"
          >
            🔄 Reset
          </button>
        </div>

        {/* ── Scoring formula reference ── */}
        <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800/40 transition"
            onClick={() => setShowFormula((v) => !v)}
          >
            <span>📐 Scoring Formula Reference</span>
            <span className="text-slate-500 text-xs">{showFormula ? "▲ hide" : "▼ show"}</span>
          </button>
          {showFormula && (
            <div className="border-t border-slate-700/40 px-5 py-4 space-y-4">
              <p className="text-sm font-medium text-slate-200">What participants must implement:</p>
              <div className="space-y-3">
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-4">
                  <p className="text-xs text-slate-500 mb-1">1. Coverage Score</p>
                  <p className="text-sm font-mono text-emerald-300">
                    coverageScore = (cities with food &gt; 0 OR water &gt; 0) / 6 × 100
                  </p>
                  <p className="text-xs text-slate-500 mt-1">How many cities got at least something?</p>
                </div>
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-4">
                  <p className="text-xs text-slate-500 mb-1">2. Urgency Score</p>
                  <p className="text-sm font-mono text-violet-300">
                    urgencyScore = sum of urgency of covered cities / 20 × 100
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Total urgency = 5+3+4+2+5+1 = <strong className="text-slate-300">20</strong>. Did the critical cities (U5) get served?
                  </p>
                </div>
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-4">
                  <p className="text-xs text-slate-500 mb-1">3. Greedy Allocation (Auto Allocate button)</p>
                  <p className="text-sm font-mono text-amber-300">
                    cityShare = (city.urgency / 20) × totalResources
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Sort by urgency DESC → give each city a proportional share → stop if resources run out
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Grading guide */}
        <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">🏆 Grading Benchmarks</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              { range: "90–100%", label: "Excellent",  color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-700/30" },
              { range: "70–89%",  label: "Good",       color: "text-blue-400",    bg: "bg-blue-900/20 border-blue-700/30" },
              { range: "50–69%",  label: "Partial",    color: "text-amber-400",   bg: "bg-amber-900/20 border-amber-700/30" },
              { range: "0–49%",   label: "Needs Work", color: "text-red-400",     bg: "bg-red-900/20 border-red-700/30" },
            ].map((b) => (
              <div key={b.range} className={`rounded-lg border p-3 ${b.bg} text-center`}>
                <p className={`font-bold text-base ${b.color}`}>{b.label}</p>
                <p className="text-slate-500 mt-0.5">{b.range}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
