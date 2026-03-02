import { type NextRequest } from 'next/server';
import { getAdminRole, type AdminRole } from '@/lib/admin-auth';

export type ScopeType = 'global' | 'region' | 'store';

export interface RequestAdminContext {
  role: AdminRole;
  storeId: string | null;
  userId: string | null;
}

export async function getRequestAdminContext(request: NextRequest): Promise<RequestAdminContext> {
  const resolved = await getAdminRole(request);
  if (!resolved) {
    return { role: 'admin', storeId: null, userId: null };
  }
  return resolved;
}

export function canManageScope(
  context: RequestAdminContext,
  scopeType: ScopeType,
  targetStoreId: string | null,
  targetRegion?: string | null
): { allowed: boolean; reason?: string } {
  if (context.role === 'admin' || context.role === 'super_admin') return { allowed: true };

  if (context.role === 'store_manager') {
    if (scopeType !== 'store') {
      return { allowed: false, reason: 'Managers can only manage store-scoped posts' };
    }
    if (!context.storeId || !targetStoreId || context.storeId !== targetStoreId) {
      return { allowed: false, reason: 'Managers can only manage posts for their own store' };
    }
    if (targetRegion) {
      return { allowed: false, reason: 'Managers cannot target regions' };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'Insufficient role permissions' };
}
