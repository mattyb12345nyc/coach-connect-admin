import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _browser: SupabaseClient | null = null;

const DEBUG_ENDPOINT = 'http://127.0.0.1:7295/ingest/3e5570fc-55d0-4ade-9ec2-6ff03f92ba55';
const DEBUG_SESSION_ID = '425f35';

function debugLog(hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId: 'pre-fix',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function getSupabaseUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serverUrl = process.env.SUPABASE_URL;
  debugLog('H1', 'src/lib/supabase.ts:getSupabaseUrl', 'Resolving Supabase URL env vars', {
    hasNextPublicUrl: Boolean(publicUrl),
    hasServerUrl: Boolean(serverUrl),
  });

  const url = publicUrl || serverUrl;
  if (!url) {
    debugLog('H1', 'src/lib/supabase.ts:getSupabaseUrl', 'Supabase URL missing; throwing', {});
    throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL must be set');
  }

  debugLog('H3', 'src/lib/supabase.ts:getSupabaseUrl', 'Supabase URL resolved', {
    urlHost: (() => {
      try {
        return new URL(url).host;
      } catch {
        return 'invalid-url';
      }
    })(),
  });
  return url;
}

export function getSupabase() {
  if (_browser) return _browser;

  const url = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
  }

  _browser = createClient(url, anonKey);
  return _browser;
}

export function getAdminClient() {
  debugLog('H2', 'src/lib/supabase.ts:getAdminClient', 'Creating admin client', {
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  });

  const url = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    debugLog('H2', 'src/lib/supabase.ts:getAdminClient', 'Service role key missing; throwing', {});
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: async (input, init) => {
        // #region agent log
        const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        debugLog('H4', 'src/lib/supabase.ts:getAdminClient:global.fetch', 'Supabase request start', {
          requestPath: (() => {
            try {
              return new URL(requestUrl).pathname;
            } catch {
              return 'invalid-url';
            }
          })(),
          method: init?.method || 'GET',
        });
        // #endregion

        try {
          const response = await fetch(input, init);
          // #region agent log
          debugLog('H4', 'src/lib/supabase.ts:getAdminClient:global.fetch', 'Supabase request complete', {
            status: response.status,
            ok: response.ok,
          });
          // #endregion
          return response;
        } catch (error) {
          // #region agent log
          debugLog('H4', 'src/lib/supabase.ts:getAdminClient:global.fetch', 'Supabase request threw', {
            errorMessage: error instanceof Error ? error.message : 'unknown-error',
          });
          // #endregion
          throw error;
        }
      },
    },
  });
  debugLog('H3', 'src/lib/supabase.ts:getAdminClient', 'Admin client created', {
    urlHost: (() => {
      try {
        return new URL(url).host;
      } catch {
        return 'invalid-url';
      }
    })(),
  });
  return client;
}
