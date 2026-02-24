import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Admin API: Get All Problems
 * Returns all problems for admin dashboard
 */
export async function GET() {
  try {
    const supabase = getSupabaseClient();

    // Get all active problems
    const { data: problems, error } = await supabase
      .from('problems')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin API] Error loading problems:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(problems || []);
  } catch (error) {
    console.error('[Admin API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Admin API: Create Problem
 * Inserts a new problem, bypassing RLS via service role
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      markdownContent,
      difficulty,
      timeLimitMinutes,
      pointsAvailable,
      starterCode,
      language,
      testCases,
      createdBy,
    } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'title and description are required' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('problems')
      .insert({
        title,
        description,
        markdown_content: markdownContent ?? description,
        difficulty: difficulty ?? 3,
        time_limit_minutes: timeLimitMinutes ?? 60,
        points_available: pointsAvailable ?? 100,
        starter_code: starterCode ?? '',
        language: language ?? 'typescript',
        test_cases: testCases ?? [],
        created_by: createdBy ?? '00000000-0000-0000-0000-000000000001',
        hint_strategy: 'progressive',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Admin API] Error creating problem:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[Admin API] Unexpected error creating problem:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
