import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Supabase Client Singleton
 * Initialize once and reuse across the application
 */

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseClient = createClient<Database>(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return supabaseClient;
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const client = getSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  return user;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const client = getSupabaseClient();
  return await client.auth.signOut();
}
