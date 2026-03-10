import test from 'node:test';
import assert from 'node:assert/strict';

const {
  ADMIN_AUTH_TOKEN_COOKIE_NAME,
  extractAdminAccessToken,
  getValidatedAdminUserWithClient,
} = await import(new URL('./admin-auth-core.ts', import.meta.url).href);

type AdminSupabaseLike = {
  auth: {
    getUser(token: string): Promise<{
      data: { user: { id: string; email?: string | null } | null };
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
};

type ValidatedAdminProfile = {
  id: string;
  role: 'associate' | 'store_manager' | 'regional_manager' | 'admin' | 'super_admin';
  status: string | null;
  store_id: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

function createRequest(init?: { authorization?: string; cookie?: string }) {
  return new Request('https://example.com/admin', {
    headers: {
      ...(init?.authorization ? { authorization: init.authorization } : {}),
      ...(init?.cookie ? { cookie: init.cookie } : {}),
    },
  });
}

function createSupabaseMock(options: {
  userId?: string | null;
  userError?: unknown;
  profile?: Partial<ValidatedAdminProfile> | null;
  profileError?: unknown;
}): AdminSupabaseLike {
  return {
    auth: {
      async getUser() {
        return {
          data: {
            user: options.userId
              ? { id: options.userId, email: 'admin@example.com' }
              : null,
          },
          error: options.userError ?? null,
        };
      },
    },
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async single() {
                  return {
                    data: options.profile
                      ? {
                          id: options.userId ?? 'user-1',
                          role: 'admin',
                          status: 'active',
                          store_id: null,
                          first_name: 'Admin',
                          last_name: 'User',
                          display_name: 'Admin User',
                          email: 'admin@example.com',
                          avatar_url: null,
                          ...options.profile,
                        }
                      : null,
                    error: options.profileError ?? null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

test('extractAdminAccessToken prefers Authorization bearer tokens', () => {
  const request = createRequest({
    authorization: 'Bearer bearer-token',
    cookie: `${ADMIN_AUTH_TOKEN_COOKIE_NAME}=cookie-token`,
  });

  assert.equal(extractAdminAccessToken(request), 'bearer-token');
});

test('extractAdminAccessToken falls back to the admin auth cookie', () => {
  const request = createRequest({
    cookie: `${ADMIN_AUTH_TOKEN_COOKIE_NAME}=cookie-token`,
  });

  assert.equal(extractAdminAccessToken(request), 'cookie-token');
});

test('request with no Authorization header or cookie is unauthorized', async () => {
  const request = createRequest();
  const supabase = createSupabaseMock({
    userId: 'admin-1',
    profile: { role: 'admin', status: 'active' },
  });

  const result = await getValidatedAdminUserWithClient(request, supabase);
  assert.equal(result, null);
});

test('request with an invalid or expired token is unauthorized', async () => {
  const request = createRequest({
    authorization: 'Bearer invalid-token',
  });
  const supabase = createSupabaseMock({
    userId: null,
    userError: new Error('Invalid token'),
    profile: null,
  });

  const result = await getValidatedAdminUserWithClient(request, supabase);
  assert.equal(result, null);
});

test('request with a valid token but a non-admin role is unauthorized', async () => {
  const request = createRequest({
    authorization: 'Bearer valid-non-admin-token',
  });
  const supabase = createSupabaseMock({
    userId: 'associate-1',
    profile: { role: 'associate', status: 'active' },
  });

  const result = await getValidatedAdminUserWithClient(request, supabase);
  assert.equal(result, null);
});

test('request with a valid token and an active admin role is authorized', async () => {
  const request = createRequest({
    authorization: 'Bearer valid-admin-token',
  });
  const supabase = createSupabaseMock({
    userId: 'admin-1',
    profile: { role: 'admin', status: 'active' },
  });

  const result = await getValidatedAdminUserWithClient(request, supabase);

  assert.ok(result);
  assert.equal(result.user.id, 'admin-1');
  assert.equal(result.profile.role, 'admin');
});
