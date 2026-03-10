export type AdminRole = 'associate' | 'store_manager' | 'regional_manager' | 'admin' | 'super_admin';
export const ADMIN_AUTH_TOKEN_COOKIE_NAME = 'coach_admin_access_token';

export interface RequestLike {
  headers: Headers;
}

export interface AdminAuthResult {
  role: AdminRole;
  storeId: string | null;
  userId: string | null;
}

export interface AuthenticatedUser {
  id: string;
  email?: string | null;
}

export interface ValidatedAdminProfile {
  id: string;
  role: AdminRole;
  status: string | null;
  store_id: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ValidatedAdminUser {
  user: AuthenticatedUser;
  profile: ValidatedAdminProfile;
}

export interface AdminSupabaseLike {
  auth: {
    getUser(token: string): Promise<{
      data: { user: AuthenticatedUser | null };
      error: unknown;
    }>;
  };
  from(table: 'profiles'): {
    select(columns: string): {
      eq(column: 'id', value: string): {
        single(): PromiseLike<{
          data: ValidatedAdminProfile | null;
          error: unknown;
        }>;
      };
    };
  };
}

function parseCookieValue(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...valueParts] = part.trim().split('=');
    if (rawName !== cookieName) continue;

    const rawValue = valueParts.join('=').trim();
    if (!rawValue) return null;

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

export function extractAdminAccessToken(request: RequestLike): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    return token || null;
  }

  return parseCookieValue(
    request.headers.get('cookie'),
    ADMIN_AUTH_TOKEN_COOKIE_NAME
  );
}

export function isPrivilegedAdminRole(role: string | null | undefined): role is 'admin' | 'super_admin' {
  return role === 'admin' || role === 'super_admin';
}

export async function getValidatedAdminUserWithClient(
  request: RequestLike,
  supabase: AdminSupabaseLike
): Promise<ValidatedAdminUser | null> {
  try {
    const token = extractAdminAccessToken(request);
    if (!token) return null;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user?.id) return null;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status, store_id, first_name, last_name, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) return null;
    if (!isPrivilegedAdminRole(profile.role)) return null;
    if (profile.status !== 'active') return null;

    return {
      user,
      profile,
    };
  } catch {
    return null;
  }
}
