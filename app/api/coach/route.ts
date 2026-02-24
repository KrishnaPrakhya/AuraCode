import { NextRequest, NextResponse } from 'next/server';

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=` +
  process.env.GEMINI_API_KEY;

async function callGemini(prompt: string, maxTokens = 400): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.5 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

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

      let raw = await callGemini(prompt, 500);
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

      let raw = await callGemini(prompt, 500);
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

    // ── CHAT MODE ─────────────────────────────────────────────────────────
    if (mode === 'chat') {
      if (!message.trim()) {
        return NextResponse.json({ error: 'message is required for chat mode' }, { status: 400 });
      }

      const historyBlock = history
        .slice(-6) // keep last 6 turns for context window
        .map((h: { role: string; text: string }) => `${h.role === 'user' ? 'Student' : 'Coach'}: ${h.text}`)
        .join('\n');

      const prompt = `You are AuraCoach — a sharp, friendly React pair programmer helping a student in a live hackathon.

Your personality:
- Encouraging but direct, no fluff
- Give short, specific answers (3–5 sentences max)  
- When showing code, keep snippets tiny and focused
- Never write the student's full solution for them
- Use emojis sparingly (max 1 per response) to keep energy up

Challenge: ${problem_title}
Requirements:
${reqList}

Student's current code:
${codeBlock}

${historyBlock ? `Recent conversation:\n${historyBlock}\n\n` : ''}Student just asked: "${message}"

Reply as AuraCoach — concise, helpful, never more than 4 sentences unless a code snippet is truly necessary.`;

      const reply = await callGemini(prompt, 250);
      return NextResponse.json({ mode: 'chat', reply });
    }

    return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
  } catch (error) {
    console.error('[coach] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
