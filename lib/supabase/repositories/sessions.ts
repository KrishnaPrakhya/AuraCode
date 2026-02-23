import { getSupabaseClient } from '../client';
import type { Session, SessionStatus } from '@/lib/types/database';
import type { Database } from '../database.types';

type SessionRow = Database['public']['Tables']['sessions']['Row'];

/**
 * Session Repository
 * Handles all session-related database operations
 */

export const sessionRepository = {
  /**
   * Create a new coding session
   */
  async create(
    problemId: string,
    userId: string,
    status: SessionStatus = 'in_progress'
  ): Promise<Session> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('sessions')
      .insert({
        problem_id: problemId,
        user_id: userId,
        status,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return mapRowToSession(data);
  },

  /**
   * Get session by ID
   */
  async getById(sessionId: string): Promise<Session | null> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('sessions')
      .select()
      .eq('id', sessionId)
      .single();

    if (error && error.code === 'PGRST116') return null; // Not found
    if (error) throw error;
    return mapRowToSession(data);
  },

  /**
   * Get all sessions for a user
   */
  async getByUserId(userId: string): Promise<Session[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('sessions')
      .select()
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data.map(mapRowToSession);
  },

  /**
   * Get sessions for a specific problem
   */
  async getByProblemId(problemId: string): Promise<Session[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('sessions')
      .select()
      .eq('problem_id', problemId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data.map(mapRowToSession);
  },

  /**
   * Update session status and metrics
   */
  async update(
    sessionId: string,
    updates: Partial<{
      status: SessionStatus;
      points_earned: number;
      hint_penalty: number;
      total_hints_used: number;
      ai_pair_programmer_used: boolean;
      submitted_at: string;
      ended_at: string;
    }>
  ): Promise<Session> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return mapRowToSession(data);
  },

  /**
   * Get active sessions (in_progress)
   */
  async getActive(): Promise<Session[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('sessions')
      .select()
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data.map(mapRowToSession);
  },

  /**
   * Get current session for a user on a problem
   */
  async getCurrentSession(
    userId: string,
    problemId: string
  ): Promise<Session | null> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('sessions')
      .select()
      .eq('user_id', userId)
      .eq('problem_id', problemId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return mapRowToSession(data);
  },
};

/**
 * Map database row to Session type
 */
function mapRowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    problem_id: row.problem_id,
    user_id: row.user_id,
    status: row.status as SessionStatus,
    started_at: row.started_at,
    submitted_at: row.submitted_at,
    ended_at: row.ended_at,
    points_earned: row.points_earned,
    hint_penalty: row.hint_penalty,
    total_hints_used: row.total_hints_used,
    ai_pair_programmer_used: row.ai_pair_programmer_used,
  };
}
