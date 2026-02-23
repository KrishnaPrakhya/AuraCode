import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * PATCH /api/sandbox/session/[id]
 * Update session metrics: score, hints used, evaluations count.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('sessions')
      .update({
        ...(body.points_earned !== undefined && { points_earned: body.points_earned }),
        ...(body.total_hints_used !== undefined && { total_hints_used: body.total_hints_used }),
        ...(body.hint_penalty !== undefined && { hint_penalty: body.hint_penalty }),
        ...(body.ai_pair_programmer_used !== undefined && { ai_pair_programmer_used: body.ai_pair_programmer_used }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.submitted_at !== undefined && { submitted_at: body.submitted_at }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('[api/sandbox/session PATCH]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
