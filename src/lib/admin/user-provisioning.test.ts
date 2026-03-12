import assert from 'node:assert/strict';
import test from 'node:test';

const {
  createAdminUser,
  generateTemporaryPassword,
} = await import(new URL('./user-provisioning.ts', import.meta.url).href);

type FakeCreateUserInput = {
  email: string;
  password: string;
  email_confirm: boolean;
  user_metadata: {
    full_name: string;
    role: string;
  };
};

function createSupabaseAdminMock() {
  const calls = {
    createUser: [] as FakeCreateUserInput[],
    profileUpserts: [] as Array<Record<string, unknown>>,
    generateLink: [] as Array<{ type: string; email: string }>,
  };

  return {
    calls,
    client: {
      auth: {
        admin: {
          async createUser(input: FakeCreateUserInput) {
            calls.createUser.push(input);
            return {
              data: {
                user: {
                  id: 'user-123',
                  email: input.email,
                },
              },
              error: null,
            };
          },
          async generateLink(input: { type: string; email: string }) {
            calls.generateLink.push(input);
            return {
              data: {
                properties: {
                  action_link: 'https://example.com/reset-password',
                },
              },
              error: null,
            };
          },
        },
      },
      from(table: string) {
        assert.equal(table, 'profiles');
        return {
          async upsert(payload: Record<string, unknown>) {
            calls.profileUpserts.push(payload);
            return {
              data: payload,
              error: null,
            };
          },
        };
      },
    },
  };
}

test('generateTemporaryPassword creates a 12 character password', () => {
  const password = generateTemporaryPassword();

  assert.equal(password.length, 12);
  assert.match(password, /^[A-Za-z0-9]+$/);
});

test('createAdminUser returns a temp password when no invite email is sent', async () => {
  const supabaseAdmin = createSupabaseAdminMock();
  const sentEmails: Array<Record<string, unknown>> = [];

  const result = await createAdminUser(
    {
      email: 'new.user@example.com',
      full_name: 'New User',
      role: 'associate',
      store_id: 'store-1',
      send_email: false,
      temp_password: 'ManualPass12',
    },
    {
      supabaseAdmin: supabaseAdmin.client,
      sendInviteEmail: async (payload: Record<string, unknown>) => {
        sentEmails.push(payload);
      },
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.user_id, 'user-123');
  assert.equal(result.email, 'new.user@example.com');
  assert.equal(result.temp_password, 'ManualPass12');
  assert.equal(supabaseAdmin.calls.generateLink.length, 0);
  assert.equal(sentEmails.length, 0);
  assert.deepEqual(supabaseAdmin.calls.profileUpserts[0], {
    id: 'user-123',
    email: 'new.user@example.com',
    first_name: 'New',
    last_name: 'User',
    role: 'associate',
    store_id: 'store-1',
    status: 'active',
  });
});

test('createAdminUser sends a recovery link email and omits the temp password when send_email is true', async () => {
  const supabaseAdmin = createSupabaseAdminMock();
  const sentEmails: Array<Record<string, unknown>> = [];

  const result = await createAdminUser(
    {
      email: 'invited.user@example.com',
      full_name: 'Invited User',
      role: 'admin',
      store_id: null,
      send_email: true,
    },
    {
      supabaseAdmin: supabaseAdmin.client,
      sendInviteEmail: async (payload: Record<string, unknown>) => {
        sentEmails.push(payload);
      },
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.email, 'invited.user@example.com');
  assert.equal(result.temp_password, null);
  assert.equal(supabaseAdmin.calls.generateLink.length, 1);
  assert.deepEqual(supabaseAdmin.calls.generateLink[0], {
    type: 'recovery',
    email: 'invited.user@example.com',
  });
  assert.equal(sentEmails.length, 1);
  assert.deepEqual(sentEmails[0], {
    email: 'invited.user@example.com',
    fullName: 'Invited User',
    actionLink: 'https://example.com/reset-password',
  });
});

test('createAdminUser normalizes duplicate email errors into a clear message', async () => {
  const duplicateClient = {
    auth: {
      admin: {
        async createUser() {
          return {
            data: { user: null },
            error: { message: 'A user with this email address has already been registered' },
          };
        },
      },
    },
    from() {
      return {
        async upsert() {
          throw new Error('profiles upsert should not run when auth user creation fails');
        },
      };
    },
  };

  await assert.rejects(
    () =>
      createAdminUser(
        {
          email: 'existing@example.com',
          full_name: 'Existing User',
          role: 'associate',
          store_id: 'store-1',
          send_email: false,
        },
        {
          supabaseAdmin: duplicateClient,
          sendInviteEmail: async () => {},
        }
      ),
    /A user with this email already exists/i
  );
});
