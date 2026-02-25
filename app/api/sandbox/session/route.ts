import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/sandbox/session
 * Called when a participant opens the sandbox with a problem loaded.
 * Creates (or resurrects) a session + user record using the service role key.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId, problemId, userName, userEmail, teamMembers } = await request.json();

    if (!sessionId || !userId || !problemId) {
      return NextResponse.json({ error: 'sessionId, userId and problemId required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Build deterministic, unique-per-user values so concurrent users never conflict.
    // username and email are UNIQUE in the DB — suffix with userId slice to prevent collisions.
    const suffix = userId.replace(/-/g, '').slice(0, 8);
    const safeUsername = `${(userName || 'participant').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${suffix}`;
    const safeEmail = userEmail || `sandbox-${suffix}@aura.local`;

    // Upsert the anonymous user record — explicitly check error
    const { error: userError } = await admin.from('users').upsert(
      {
        id: userId,
        email: safeEmail,
        username: safeUsername,
        display_name: userName || `Participant ${suffix}`,
        role: 'participant',
      },
      { onConflict: 'id' }
    );

    if (userError) {
      // If user row already exists with a different conflict (email/username),
      // try just updating the display_name without touching unique fields.
      console.warn('[api/sandbox/session] user upsert conflict, patching display_name only:', userError.message);
      const { error: patchErr } = await admin
        .from('users')
        .update({ display_name: userName || `Participant ${suffix}` })
        .eq('id', userId);
      if (patchErr) {
        // Still proceed — maybe the user row already exists from auth, just move on
        console.warn('[api/sandbox/session] user patch also failed:', patchErr.message);
      }
    }

    // Upsert session — ignoreDuplicates so page refreshes don't reset score/hints
    const sessionPayload: Record<string, unknown> = {
      id: sessionId,
      problem_id: problemId,
      user_id: userId,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      points_earned: 0,
      hint_penalty: 0,
      total_hints_used: 0,
      ai_pair_programmer_used: false,
      ...(Array.isArray(teamMembers) && teamMembers.length > 1
        ? { team_members: teamMembers }
        : {}),
    };

    let { error: sessionError } = await admin.from('sessions').upsert(
      sessionPayload,
      { onConflict: 'id', ignoreDuplicates: true }
    );

    // If team_members column doesn't exist yet (migration not run), retry without it
    if (sessionError?.code === 'PGRST204' && 'team_members' in sessionPayload) {
      console.warn('[api/sandbox/session] team_members column missing — run scripts/09-team-session-members.sql. Retrying without it.');
      const { team_members: _dropped, ...payloadWithoutTeam } = sessionPayload as any;
      const { error: retryError } = await admin.from('sessions').upsert(
        payloadWithoutTeam,
        { onConflict: 'id', ignoreDuplicates: true }
      );
      sessionError = retryError ?? null;
    }

    if (sessionError) throw sessionError;

    return NextResponse.json({ sessionId, ok: true }, { status: 201 });
  } catch (err) {
    console.error('[api/sandbox/session POST]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
