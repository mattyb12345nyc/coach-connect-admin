import { NextRequest } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export type AdminRole = 'associate' | 'store_manager' | 'regional_manager' | 'admin' | 'super_admin';

const ROLE_LEVEL: Record<AdminRole, number> = {
  associate: 0,
  store_manager: 1,
  regional_manager: 2,
  admin: 3,
  super_admin: 4,
};

interface AdminAuthResult {
  role: AdminRole;
  storeId: string | null;
  userId: string | null;
}

export async function getAdminRole(request: NextRequest): Promise<AdminAuthResult | null> {
  try {
    const supabase = getAdminClient();
    const email = request.headers.get('x-admin-email');

    if (email) {
      // Try profiles table first
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, store_id')
        .eq('email', email)
        .single();

      if (profile) {
        return {
          role: profile.role as AdminRole,
          storeId: profile.store_id,
          userId: profile.id,
        };
      }

      // Fallback to app_users for backwards compatibility
      const { data: appUser } = await supabase
        .from('app_users')
        .select('id, role, store_id')
        .eq('email', email)
        .single();

      if (appUser) {
        const legacyRole = appUser.role as string;
        const mappedRole: AdminRole = legacyRole === 'admin' ? 'admin' : legacyRole === 'manager' ? 'store_manager' : 'associate';
        return {
          role: mappedRole,
          storeId: appUser.store_id,
          userId: appUser.id,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function hasMinRole(userRole: AdminRole, minRole: AdminRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole];
}
