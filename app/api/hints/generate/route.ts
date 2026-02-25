import { NextRequest, NextResponse } from 'next/server';
import { callGemini, checkCooldown } from '@/lib/gemini-client';

// Minimum gap between hint requests per session (4 s) to prevent burst spam
const HINT_COOLDOWN_MS = 4_000;

/**
 * Targeted Hint Generation — powered by Gemini directly.
 *
 * Expected body:
 *   user_question   - what the student is specifically stuck on (required)
 *   current_code    - their current editor code
 *   challenge_title - name of the challenge
 *   challenge_description
 *   requirements    - string[]
 *   hint_number     - how many hints already used (0-indexed) → adjusts strictness
 *   session_id / user_id / problem_id — for DB logging (best-effort)
 */
export async function POST(request: NextRequest) {
  try {
    const userApiKey = request.headers.get('x-gemini-key') ?? undefined;
    const body = await request.json();
    const {
      user_question,
      current_code = '',
      challenge_title = 'React Challenge',
      challenge_description = '',
      requirements = [],
      hint_number = 0,
    } = body;

    if (!user_question?.trim()) {
      return NextResponse.json({ error: 'user_question is required' }, { status: 400 });
    }

    // Per-session rate guard — silently slow-path if same session is spamming
    const sessionKey = `hints:${body.session_id ?? 'anon'}`;
    if (!checkCooldown(sessionKey, HINT_COOLDOWN_MS)) {
      return NextResponse.json(
        { error: 'Too many hint requests — please wait a moment', retry_after_ms: HINT_COOLDOWN_MS },
        { status: 429 }
      );
    }

    const MAX_HINTS = 10;
    if (hint_number >= MAX_HINTS) {
      return NextResponse.json(
        { error: 'Hint limit reached (10/10)', hint: null, limit_reached: true },
        { status: 200 }
      );
    }

    // Strictness increases as hints are used (earlier hints = gentler nudge)
    const strictnessNote =
      hint_number < 3
        ? 'Be very gentle — only a nudge, no code examples yet.'
        : hint_number < 6
        ? 'Give directional guidance. A tiny code snippet (2-3 lines max) is okay if essential.'
        : 'Give a focused pointer with a small code snippet only if the student is significantly stuck.';

    const reqList = requirements.length
      ? requirements.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')
      : '(no requirements listed)';

    const codeSnippet = current_code.trim()
      ? `\`\`\`tsx\n${current_code.slice(0, 1200)}\n\`\`\``
      : '(no code written yet)';

    const prompt = `You are a strict React mentor in a timed hackathon. Your job is to give small, targeted hints — NOT solutions.

RULES (follow exactly):
- Answer ONLY what the student asked. Nothing more.
- Keep the response to 2–3 sentences maximum.
- NEVER show a complete working solution.
- NEVER reveal the full implementation logic.
- Use React/TypeScript terminology correctly.
- ${strictnessNote}

Challenge: ${challenge_title}
Description: ${challenge_description}

Requirements:
${reqList}

Student's current code:
${codeSnippet}

Student's specific question / what they're stuck on:
"${user_question}"

Reply with ONLY the concise hint (2-3 sentences). No preamble, no "Great question!", no summary at the end.`;

    let hint: string;
    try {
      // maxRetries=0 → fail fast straight to keyword fallback instead of waiting 7 s
      // allow a couple of retries even for hints; the upstream `callGemini`
      // helper already implements exponential backoff so this will usually
      // hide transient rate-limit spikes from Google's side.
      hint = await callGemini(prompt, 350, 0.4, true, userApiKey, 2);
    } catch(error:any) {
      // Gemini unavailable — targeted fallback based on question keywords
      // Log full error object so we can inspect status, headers, etc.
      console.warn('[hints] gemini call failed', error);
      const q = user_question.toLowerCase();
      if (q.includes('state') || q.includes('usestate'))
        hint = `Use \`useState\` to declare reactive data — each changing value needs its own state variable. Call the setter function to update it and trigger a re-render.`;
      else if (q.includes('filter') || q.includes('list'))
        hint = `Use \`Array.filter()\` on your state array and store the result in a variable (or use \`useMemo\`). Render the filtered array with \`.map()\`.`;
      else if (q.includes('effect') || q.includes('useeffect'))
        hint = `\`useEffect\` runs after every render by default. Pass a dependency array \`[]\` to run only once, or include specific values to re-run when they change.`;
      else
        hint = `Break the problem down: first get the UI rendering, then add state, then wire up the event handlers one at a time.`;
    }

    return NextResponse.json({
      hint,
      hint_number: hint_number + 1,
      hints_remaining: MAX_HINTS - hint_number - 1,
      limit_reached: hint_number + 1 >= MAX_HINTS,
    });
  } catch (error) {
    console.error('[hints] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
