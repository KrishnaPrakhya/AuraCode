import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Shape returned by this endpoint and used by admin UI components.
 */
export interface ParticipantRecord {
  session_id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  problem_id: string | null;
  problem_title: string | null;
  problem_difficulty: number | null;
  problem_team_mode: boolean;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  points_earned: number;
  total_hints_used: number;
  hint_penalty: number;
  ai_evaluate_used: boolean;
  elapsed_minutes: number;
  team_members: string[] | null;
}

/**
 * Admin API: Get All Participants
 * Uses service-role key (bypasses RLS) - NO joins, just sessions table.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch all sessions - no foreign key join needed
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .order('started_at', { ascending: false });

    if (sessionsError) {
      console.error('[api/admin/participants GET]', sessionsError);
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json([]);
    }

    // Collect unique user IDs and problem IDs
    const userIds = [...new Set(sessions.map(s => s.user_id).filter(Boolean))] as string[];
    const problemIds = [...new Set(sessions.map(s => s.problem_id).filter(Boolean))] as string[];

    // Fetch users and problems separately to avoid FK issues
    const [usersResult, problemsResult] = await Promise.all([
      userIds.length > 0
        ? supabase.from('users').select('id, username, email, display_name').in('id', userIds)
        : Promise.resolve({ data: [], error: null }),
      problemIds.length > 0
        ? supabase.from('problems').select('id, title, difficulty, team_mode').in('id', problemIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Build lookup maps
    const userMap = new Map((usersResult.data ?? []).map(u => [u.id, u]));
    const problemMap = new Map((problemsResult.data ?? []).map(p => [p.id, p]));

    // Assemble participant records
    const participants: ParticipantRecord[] = sessions.map(s => {
      const user = s.user_id ? userMap.get(s.user_id) : null;
      const problem = s.problem_id ? problemMap.get(s.problem_id) : null;

      const startedAt = s.started_at ? new Date(s.started_at).getTime() : null;
      const endedAt = s.submitted_at
        ? new Date(s.submitted_at).getTime()
        : Date.now();
      const elapsedMinutes = startedAt
        ? Math.round((endedAt - startedAt) / 60000)
        : 0;

      return {
        session_id: s.id,
        user_id: s.user_id ?? null,
        user_name: user?.display_name ?? user?.username ?? null,
        user_email: user?.email ?? null,
        problem_id: s.problem_id ?? null,
        problem_title: problem?.title ?? null,
        problem_difficulty: problem?.difficulty ?? null,
        problem_team_mode: (problem as any)?.team_mode ?? false,
        status: s.status ?? 'in_progress',
        started_at: s.started_at ?? null,
        submitted_at: s.submitted_at ?? null,
        points_earned: s.points_earned ?? 0,
        total_hints_used: s.total_hints_used ?? 0,
        hint_penalty: s.hint_penalty ?? 0,
        ai_evaluate_used: s.ai_pair_programmer_used ?? false,
        elapsed_minutes: elapsedMinutes,
        team_members: Array.isArray(s.team_members) ? s.team_members : null,
      };
    });

    return NextResponse.json(participants);
  } catch (err) {
    console.error('[api/admin/participants GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
