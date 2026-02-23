import { getSupabaseClient } from '../client';
import type { Event, EventType, EventPayload } from '@/lib/types/database';
import type { Database } from '../database.types';

type EventRow = Database['public']['Tables']['events']['Row'];

/**
 * Events Repository
 * Handles all event recording for playback mode
 */

export const eventRepository = {
  /**
   * Record a new event
   */
  async record(
    sessionId: string,
    userId: string,
    eventType: EventType,
    timestampMs: number,
    payload: EventPayload
  ): Promise<Event> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('events')
      .insert({
        session_id: sessionId,
        user_id: userId,
        event_type: eventType,
        timestamp_ms: timestampMs,
        payload: payload as any,
      })
      .select()
      .single();

    if (error) throw error;
    return mapRowToEvent(data);
  },

  /**
   * Get all events for a session (for playback)
   */
  async getSessionEvents(sessionId: string): Promise<Event[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('events')
      .select()
      .eq('session_id', sessionId)
      .order('timestamp_ms', { ascending: true });

    if (error) throw error;
    return data.map(mapRowToEvent);
  },

  /**
   * Get events in a time range
   */
  async getEventsByTimeRange(
    sessionId: string,
    startMs: number,
    endMs: number
  ): Promise<Event[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('events')
      .select()
      .eq('session_id', sessionId)
      .gte('timestamp_ms', startMs)
      .lte('timestamp_ms', endMs)
      .order('timestamp_ms', { ascending: true });

    if (error) throw error;
    return data.map(mapRowToEvent);
  },

  /**
   * Get specific event type count
   */
  async getEventTypeCount(
    sessionId: string,
    eventType: EventType
  ): Promise<number> {
    const client = getSupabaseClient();
    const { count, error } = await client
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('event_type', eventType);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Get events by type
   */
  async getEventsByType(
    sessionId: string,
    eventType: EventType
  ): Promise<Event[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('events')
      .select()
      .eq('session_id', sessionId)
      .eq('event_type', eventType)
      .order('timestamp_ms', { ascending: true });

    if (error) throw error;
    return data.map(mapRowToEvent);
  },

  /**
   * Get code change events (for efficient playback)
   */
  async getCodeChangeEvents(sessionId: string): Promise<Event[]> {
    return this.getEventsByType(sessionId, 'code_change');
  },

  /**
   * Delete events for a session (for cleanup)
   */
  async deleteSessionEvents(sessionId: string): Promise<void> {
    const client = getSupabaseClient();
    const { error } = await client
      .from('events')
      .delete()
      .eq('session_id', sessionId);

    if (error) throw error;
  },
};

/**
 * Map database row to Event type
 */
function mapRowToEvent(row: EventRow): Event {
  return {
    id: row.id,
    session_id: row.session_id,
    user_id: row.user_id,
    event_type: row.event_type as EventType,
    timestamp_ms: row.timestamp_ms,
    payload: row.payload as EventPayload,
    created_at: row.created_at,
  };
}
