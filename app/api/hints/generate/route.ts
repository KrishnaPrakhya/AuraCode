import { NextRequest, NextResponse } from 'next/server';
import type { HintRequest, HintResponse } from '@/lib/types/database';
import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * Hint Generation Endpoint
 * Sends code evaluation request to LangGraph AI Mentor Agent backend
 */
export async function POST(request: NextRequest) {
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
