import { NextRequest, NextResponse } from 'next/server';
import { callGemini, checkCooldown } from '@/lib/gemini-client';

// Cooldowns per mode per session — scan/plan are expensive; chat is cheap
const COOLDOWN_MS: Record<string, number> = {
  scan: 12_000,  // 12 s between scans (code analysis, 500 tokens)
  plan: 15_000,  // 15 s between plan refreshes
  chat:  4_000,  // 4 s between chat messages
};

/**
 * AI Coach Endpoint — three modes: scan | plan | chat
 *
 * Body:
 *   mode: "scan" | "plan" | "chat"
 *   code: current editor code
 *   problem_title, problem_description, requirements: string[]
 *   message: string   (only for chat mode)
 *   history: { role: "user"|"assistant", text: string }[]  (chat history)
 */
export async function POST(request: NextRequest) {
  try {
    const userApiKey = request.headers.get('x-gemini-key') ?? undefined;
    const body = await request.json();
    const {
      mode,
      code = '',
      problem_title = 'React Challenge',
      problem_description = '',
      requirements = [] as string[],
      message = '',
      history = [] as { role: string; text: string }[],
    } = body;

    if (!mode) return NextResponse.json({ error: 'mode is required' }, { status: 400 });

    // Per-session cooldown guard
    const sessionKey = `coach:${mode}:${body.session_id ?? 'anon'}`;
    const minGap = COOLDOWN_MS[mode] ?? 5_000;
    if (!checkCooldown(sessionKey, minGap)) {
      return NextResponse.json(
        { error: `Too many ${mode} requests — please wait`, retry_after_ms: minGap },
        { status: 429 }
      );
    }

    const reqList = requirements.length
      ? requirements.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')
      : '(none specified)';
    const codeBlock = code.trim()
      ? `\`\`\`tsx\n${code.slice(0, 2000)}\n\`\`\``
      : '(no code yet)';

    // ── SCAN MODE ─────────────────────────────────────────────────────────
    if (mode === 'scan') {
      const prompt = `You are an expert React code reviewer. Analyze the student's React code for this challenge.

Challenge: ${problem_title}
Description: ${problem_description}

Requirements:
${reqList}

Student's code:
${codeBlock}

Return ONLY valid JSON (no markdown, no explanation outside JSON) in this exact shape:
{
  "met": ["requirement text that is clearly implemented", ...],
  "missing": ["requirement text that is NOT implemented yet", ...],
  "bugs": ["brief description of a specific bug or issue", ...],
  "next_priority": "One clear sentence: the single most important thing to build or fix right now."
}

Be precise. Only list a requirement as met if you can see code implementing it. Keep bugs brief (one line each). next_priority must be actionable.`;

      let raw = await callGemini(prompt, 500, 0.5, true, userApiKey);
      // strip any markdown code fences Gemini might add
      raw = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      try {
        const result = JSON.parse(raw);
        return NextResponse.json({ mode: 'scan', ...result });
      } catch {
        return NextResponse.json({
          mode: 'scan',
          met: [],
          missing: requirements,
          bugs: [],
          next_priority: 'Start by implementing the core component structure and adding the required state variables.',
        });
      }
    }

    // ── PLAN MODE ─────────────────────────────────────────────────────────
    if (mode === 'plan') {
      const prompt = `You are a React mentor helping a student plan their implementation.

Challenge: ${problem_title}
Description: ${problem_description}

Requirements:
${reqList}

Student's current code:
${codeBlock}

Break the implementation into 5–7 concrete, ordered steps. For each step, determine if the student has already done it based on their code.

Return ONLY valid JSON (no markdown wrapper):
{
  "steps": [
    { "id": 1, "text": "concise action step", "done": true/false, "tip": "one-line implementation tip" },
    ...
  ]
}

Steps should be specific to THIS challenge, not generic. Mark done=true only if you can clearly see that step implemented in the code.`;

      let raw = await callGemini(prompt, 500, 0.5, true, userApiKey);
      raw = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      try {
        const result = JSON.parse(raw);
        return NextResponse.json({ mode: 'plan', ...result });
      } catch {
        return NextResponse.json({
          mode: 'plan',
          steps: requirements.map((r: string, i: number) => ({
            id: i + 1,
            text: r,
            done: false,
            tip: 'Follow the challenge description for implementation details.',
          })),
        });
      }
    }

    // ── HINT MODE ─────────────────────────────────────────────────────────
    // Returns a laser-focused hint for ONE specific missing requirement.
    // Never reveals the full solution — gives the concept + a small pattern.
    if (mode === 'hint') {
      const { requirement = '' } = body;
      if (!requirement) {
        return NextResponse.json({ error: 'requirement is required for hint mode' }, { status: 400 });
      }

      const prompt = `You are AuraCoach — a sharp React mentor in a live hackathon. A student is stuck on ONE specific requirement and needs a targeted hint.

Challenge: ${problem_title}
Requirement they need help with: "${requirement}"

Student's current code:
${codeBlock}

Give a tight, useful hint:
1. Explain the key concept or pattern needed in 1-2 clear sentences.
2. Provide a tiny (3-8 line) code snippet they can ADAPT — do NOT include the exact working solution for their problem, just show the pattern.

Return ONLY valid JSON (no markdown wrapper):
{
  "hint": "1-2 sentence explanation of what they need to do and why",
  "snippet": "small code pattern they can adapt, or empty string if not needed"
}

Keep it concise. The student should understand the concept, not copy-paste the answer.`;

      let raw = await callGemini(prompt, 300, 0.4, false, userApiKey);
      raw = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      try {
        const result = JSON.parse(raw);
        return NextResponse.json({ mode: 'hint', hint: result.hint ?? '', snippet: result.snippet ?? '' });
      } catch {
        return NextResponse.json({
          mode: 'hint',
          hint: `To implement "${requirement}", look at the challenge description for the specific formula or pattern. Break it into: what data you need, how to compute it, and where to display it.`,
          snippet: '',
        });
      }
    }

    // ── CHAT MODE ─────────────────────────────────────────────────────────
    if (mode === 'chat') {
      if (!message.trim()) {
        return NextResponse.json({ error: 'message is required for chat mode' }, { status: 400 });
      }

      const historyBlock = history
        .slice(-6) // keep last 6 turns for context window
        .map((h: { role: string; text: string }) => `${h.role === 'user' ? 'Student' : 'Coach'}: ${h.text}`)
        .join('\n');

      const prompt = `You are AuraCoach — a sharp, direct React pair programmer coaching a student in a live hackathon. They've paid 10 points to talk to you, so make every word count.

Rules:
- Answer in 3-5 sentences MAX unless a code snippet is truly necessary
- Never write their full solution — give the concept, pattern, or nudge
- Be specific to THEIR code and THEIR problem, not generic advice
- If they're confused about a concept, explain it with a tiny 3-6 line example
- Use exactly 0 filler phrases like "Great question!" or "Of course!"

Challenge: ${problem_title}
Requirements:
${reqList}

Student's current code:
${codeBlock}

${historyBlock ? `Recent conversation:\n${historyBlock}\n\n` : ''}Student: "${message}"

Reply as AuraCoach — direct, specific, max 5 sentences unless a code snippet is needed.`;

      const reply = await callGemini(prompt, 250, 0.5, false, userApiKey); // chat replies: don't cache (unique per context)
      return NextResponse.json({ mode: 'chat', reply });
    }

    return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
  } catch (error) {
    console.error('[coach] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
