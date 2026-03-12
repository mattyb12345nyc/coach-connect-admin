import { randomBytes } from 'node:crypto';

const VALID_ADMIN_USER_ROLES = new Set([
  'associate',
  'store_manager',
  'regional_manager',
  'admin',
]);

const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export type AdminUserRole = 'associate' | 'store_manager' | 'regional_manager' | 'admin';

export type CreateAdminUserInput = {
  email: string;
  full_name: string;
  role?: string | null;
  store_id?: string | null;
  send_email: boolean;
  temp_password?: string | null;
};

export type CreateAdminUserResult = {
  success: true;
  user_id: string;
  email: string;
  temp_password: string | null;
};

export type InviteEmailPayload = {
  email: string;
  fullName: string;
  actionLink: string;
};

type CreateUserResponse = {
  data: {
    user: {
      id: string;
      email?: string | null;
    } | null;
  };
  error: unknown;
};

type GenerateLinkResponse = {
  data: {
    properties?: {
      action_link?: string | null;
    } | null;
  } | null;
  error: unknown;
};

type UpsertResponse = {
  error: unknown;
};

export type AdminSupabaseClientLike = {
  auth: {
    admin: {
      createUser(input: {
        email: string;
        password: string;
        email_confirm: boolean;
        user_metadata: {
          full_name: string;
          role: AdminUserRole;
        };
      }): Promise<CreateUserResponse>;
      generateLink(input: {
        type: 'recovery';
        email: string;
      }): Promise<GenerateLinkResponse>;
    };
  };
  from(table: 'profiles'): {
    upsert(payload: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      role: AdminUserRole;
      store_id: string | null;
      status: 'active';
    }): Promise<UpsertResponse>;
  };
};

export type CreateAdminUserDependencies = {
  supabaseAdmin: AdminSupabaseClientLike;
  sendInviteEmail: (payload: InviteEmailPayload) => Promise<void>;
  generatePassword?: () => string;
};

export class AdminUserProvisioningError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AdminUserProvisioningError';
    this.statusCode = statusCode;
  }
}

export function generateTemporaryPassword(length = 12): string {
  let password = '';

  while (password.length < length) {
    const bytes = randomBytes(length);
    for (const byte of bytes) {
      password += TEMP_PASSWORD_ALPHABET[byte % TEMP_PASSWORD_ALPHABET.length];
      if (password.length === length) {
        return password;
      }
    }
  }

  return password;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === 'object' && error !== null) {
    const maybeMessage = Reflect.get(error, 'message');
    if (typeof maybeMessage === 'string' && maybeMessage) return maybeMessage;
  }

  return 'Unknown error';
}

function normalizeRole(role: string | null | undefined): AdminUserRole {
  if (!role) return 'associate';
  if (VALID_ADMIN_USER_ROLES.has(role)) return role as AdminUserRole;

  throw new AdminUserProvisioningError('Role must be one of associate, store_manager, regional_manager, or admin');
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    throw new AdminUserProvisioningError('Email is required');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AdminUserProvisioningError('Please enter a valid email address');
  }

  return normalized;
}

function normalizeFullName(fullName: string): string {
  const normalized = fullName.trim();
  if (!normalized) {
    throw new AdminUserProvisioningError('Full name is required');
  }

  return normalized;
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const segments = fullName.split(/\s+/).filter(Boolean);
  if (segments.length === 0) {
    return { firstName: '', lastName: '' };
  }

  return {
    firstName: segments[0],
    lastName: segments.slice(1).join(' '),
  };
}

function normalizeStoreId(role: AdminUserRole, storeId: string | null | undefined): string | null {
  const normalizedStoreId = storeId?.trim() || null;
  if ((role === 'associate' || role === 'store_manager') && !normalizedStoreId) {
    throw new AdminUserProvisioningError('Store is required for associate and store manager users');
  }

  if (role === 'admin' || role === 'regional_manager') {
    return null;
  }

  return normalizedStoreId;
}

function normalizeTempPassword(tempPassword: string | null | undefined, generatePassword: () => string): string {
  const normalized = tempPassword?.trim();
  return normalized || generatePassword();
}

function normalizeCreateUserError(error: unknown): AdminUserProvisioningError {
  const message = getErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('already') && normalizedMessage.includes('email')) {
    return new AdminUserProvisioningError('A user with this email already exists', 409);
  }

  if (normalizedMessage.includes('invalid') && normalizedMessage.includes('email')) {
    return new AdminUserProvisioningError('Please enter a valid email address');
  }

  return new AdminUserProvisioningError(message, 500);
}

export async function createAdminUser(
  input: CreateAdminUserInput,
  dependencies: CreateAdminUserDependencies
): Promise<CreateAdminUserResult> {
  const role = normalizeRole(input.role);
  const email = normalizeEmail(input.email);
  const fullName = normalizeFullName(input.full_name);
  const { firstName, lastName } = splitFullName(fullName);
  const storeId = normalizeStoreId(role, input.store_id);
  const tempPassword = normalizeTempPassword(
    input.temp_password,
    dependencies.generatePassword ?? generateTemporaryPassword
  );

  const {
    data: createUserData,
    error: createUserError,
  } = await dependencies.supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
    },
  });

  if (createUserError || !createUserData.user?.id) {
    throw normalizeCreateUserError(createUserError);
  }

  const userId = createUserData.user.id;
  const { error: upsertError } = await dependencies.supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      store_id: storeId,
      status: 'active',
    });

  if (upsertError) {
    throw new AdminUserProvisioningError(getErrorMessage(upsertError), 500);
  }

  if (input.send_email) {
    const { data: linkData, error: linkError } = await dependencies.supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (linkError) {
      throw new AdminUserProvisioningError(getErrorMessage(linkError), 500);
    }

    const actionLink = linkData?.properties?.action_link?.trim();
    if (!actionLink) {
      throw new AdminUserProvisioningError('Could not generate a password reset link', 500);
    }

    await dependencies.sendInviteEmail({
      email,
      fullName,
      actionLink,
    });
  }

  return {
    success: true,
    user_id: userId,
    email,
    temp_password: input.send_email ? null : tempPassword,
  };
}
