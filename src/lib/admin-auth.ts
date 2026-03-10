import { getAdminClient } from '@/lib/supabase';
import {
  type AdminAuthResult,
  type AdminRole,
  type AdminSupabaseLike,
  type RequestLike,
  type ValidatedAdminUser,
  getValidatedAdminUserWithClient,
} from '@/lib/admin-auth-core';

export * from '@/lib/admin-auth-core';

const ROLE_LEVEL: Record<AdminRole, number> = {
  associate: 0,
  store_manager: 1,
  regional_manager: 2,
  admin: 3,
  super_admin: 4,
};

export async function getValidatedAdminUser(
  request: RequestLike,
  supabase?: AdminSupabaseLike
): Promise<ValidatedAdminUser | null> {
  return getValidatedAdminUserWithClient(
    request,
    supabase ?? (getAdminClient() as unknown as AdminSupabaseLike)
  );
}

export async function getAdminRole(
  request: RequestLike,
  supabase?: AdminSupabaseLike
): Promise<AdminAuthResult | null> {
  const validated = await getValidatedAdminUser(request, supabase);
  if (!validated) return null;

  return {
    role: validated.profile.role,
    storeId: validated.profile.store_id,
    userId: validated.profile.id,
  };
}

export function hasMinRole(userRole: AdminRole, minRole: AdminRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole];
}
