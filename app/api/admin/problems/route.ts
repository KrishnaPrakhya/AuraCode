import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Admin API: Get All Problems
 * Returns all problems for admin dashboard
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Get all active problems
    const { data: problems, error } = await supabase
      .from('problems')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin API] Error loading problems:', error);

      // Detect network/timeout errors and give a helpful message
      const isNetworkError =
        error.message?.includes('fetch failed') ||
        error.message?.includes('ConnectTimeout') ||
        error.message?.includes('ECONNREFUSED');

      if (isNetworkError) {
        return NextResponse.json(
          {
            error:
              'Cannot reach the database. The Supabase project may be paused. ' +
              'Visit https://supabase.com/dashboard to restore it.',
          },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(problems || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Admin API] Unexpected error loading problems:', message);

    const isNetworkError =
      message.includes('fetch failed') ||
      message.includes('ConnectTimeout') ||
      message.includes('ECONNREFUSED');

    if (isNetworkError) {
      return NextResponse.json(
        {
          error:
            'Cannot reach the database. The Supabase project may be paused. ' +
            'Visit https://supabase.com/dashboard to restore it.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      teamMode,
      teamSize,
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
        team_mode: teamMode ?? false,
        team_size: teamSize ?? 2,
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
