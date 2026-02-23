import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Server-side Supabase admin client using the service role key.
 * Bypasses Row Level Security — use ONLY in server-side API routes, never in client code.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey || serviceKey === 'your-service-role-key-here') {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured.\n' +
        'Get it from: https://supabase.com/dashboard/project/vqzyylofglteicuntfir/settings/api\n' +
        'Then add it to .env.local as SUPABASE_SERVICE_ROLE_KEY=<your key>'
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
