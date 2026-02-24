import { NextRequest, NextResponse } from 'next/server';

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=` +
  process.env.GEMINI_API_KEY;

async function callGemini(prompt: string, maxTokens = 120): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

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
      hint = await callGemini(prompt, 130);
    } catch {
      // Gemini unavailable — targeted fallback based on question keywords
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

  try {
    const body: HintRequest = await request.json();
    const {
      problem_id,
      user_id,
      session_id,
      current_code,
      hint_level,
      previous_attempts,
    } = body;

    if (!problem_id || !user_id || !session_id || hint_level === undefined) {
      return NextResponse.json(
        {
          error: 'Missing required fields: problem_id, user_id, session_id, hint_level',
        },
        { status: 400 }
      );
    }

    // Get problem details from Supabase (best-effort — demo/random IDs won't exist)
    const supabase = getSupabaseClient();
    const { data: dbProblem } = await supabase
      .from('problems')
      .select()
      .eq('id', problem_id)
      .maybeSingle();

    // Fall back to body fields if DB lookup fails (demo mode / RLS)
    const problem = dbProblem ?? {
      id: problem_id,
      title: body.challenge_title ?? 'React Challenge',
      description: body.challenge_description ?? '',
      test_cases: [],
      requirements: body.requirements ?? [],
    };

    // Call FastAPI LangGraph backend for hint generation
    const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8000';

    let hintResult: HintResponse;
    try {
      const response = await fetch(`${backendUrl}/api/mentor/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: {
            id: problem.id,
            title: problem.title,
            description: problem.description,
            requirements: Array.isArray((problem as any).requirements)
              ? (problem as any).requirements
              : ((problem as any).test_cases as any[] || []).map((tc: any) => tc.description || tc.input),
          },
          code: current_code,
          hint_level,
          previous_attempts,
        }),
      });

      if (!response.ok) throw new Error(`FastAPI ${response.status}`);
      hintResult = await response.json();
    } catch {
      // FastAPI unavailable — return a static coaching hint
      const staticHints = [
        `Break your solution into smaller functions. Start with the simplest piece and build up.`,
        `Think about what state you need. What data changes over time? Use \`useState\` for each piece.`,
        `Check your component renders correctly first, then add interactivity step by step.`,
        `Look at the requirements one by one. Which ones are already working? Focus on the next unmet one.`,
      ];
      hintResult = {
        hint: staticHints[Math.min(hint_level, staticHints.length - 1)],
        explanation: 'AI mentor is offline — here is a general coaching tip.',
        point_penalty: 0,
      };
    }

    // Calculate point penalty based on hint level
    const penaltyMap = { 0: 0, 1: 5, 2: 10, 3: 20 };
    const pointPenalty = penaltyMap[hint_level as keyof typeof penaltyMap] || 0;

    // Save hint to database
    const { error: insertError } = await supabase.from('hints').insert({
      session_id,
      problem_id,
      user_id,
      hint_level,
      content: hintResult.hint,
      code_snippet: hintResult.code_snippet,
      point_penalty: pointPenalty,
      is_ai_generated: true,
      model_name: 'langgraph-mentor',
    });

    if (insertError) {
      console.error('[v0] Error saving hint to database:', insertError);
    }

    // Update session hint penalty
    const { data: session } = await supabase
      .from('sessions')
      .select('hint_penalty, total_hints_used')
      .eq('id', session_id)
      .single();

    if (session) {
      await supabase
        .from('sessions')
        .update({
          hint_penalty: (session.hint_penalty || 0) + pointPenalty,
          total_hints_used: (session.total_hints_used || 0) + 1,
        })
        .eq('id', session_id);
    }

    return NextResponse.json({
      hint: hintResult.hint,
      code_snippet: hintResult.code_snippet,
      point_penalty: pointPenalty,
      explanation: hintResult.explanation,
    });
  } catch (error) {
    console.error('[v0] Hint generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
