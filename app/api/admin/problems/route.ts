import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';

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
