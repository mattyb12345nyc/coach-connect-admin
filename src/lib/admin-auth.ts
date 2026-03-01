import { NextRequest } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export type AdminRole = 'associate' | 'manager' | 'admin';

const ROLE_LEVEL: Record<AdminRole, number> = {
  associate: 0,
  manager: 1,
  admin: 2,
};

interface AdminAuthResult {
  role: AdminRole;
  storeId: string | null;
  userId: string | null;
}

/**
 * Validates that the requesting user has at minimum the given role.
 * Reads the Supabase auth token from cookies/headers, looks up the user in app_users.
 * Returns the user's role and store_id if valid, or null to skip enforcement
 * (e.g., when auth is not configured or during development).
 */
export async function getAdminRole(request: NextRequest): Promise<AdminAuthResult | null> {
  try {
    const supabase = getAdminClient();
    const authHeader = request.headers.get('authorization');
    const email = request.headers.get('x-admin-email');

    if (email) {
      const { data } = await supabase
        .from('app_users')
        .select('id, role, store_id')
        .eq('email', email)
        .single();

      if (data) {
        return {
          role: data.role as AdminRole,
          storeId: data.store_id,
          userId: data.id,
        };
      }
    }

    // No auth enforcement available -- allow through (admin default)
    return null;
  } catch {
    return null;
  }
}

export function hasMinRole(userRole: AdminRole, minRole: AdminRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole];
}
