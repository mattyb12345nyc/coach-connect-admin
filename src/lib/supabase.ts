import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _browser: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serverUrl = process.env.SUPABASE_URL;

  // Server routes should prefer server-only env vars to avoid client env typos
  // breaking admin APIs in production deployments.
  const url = typeof window === 'undefined' ? serverUrl || publicUrl : publicUrl || serverUrl;
  if (!url) throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL must be set');
  return url;
}

export function getSupabase() {
  if (_browser) return _browser;

  const url = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY must be set');
  }

  _browser = createClient(url, anonKey);
  return _browser;
}

export function getAdminClient() {
  const url = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
