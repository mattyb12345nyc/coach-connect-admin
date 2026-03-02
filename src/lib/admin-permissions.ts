import { type NextRequest } from 'next/server';
import { getAdminRole } from '@/lib/admin-auth';

export type ScopeType = 'global' | 'store';

export interface RequestAdminContext {
  role: 'associate' | 'manager' | 'admin';
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
  targetStoreId: string | null
): { allowed: boolean; reason?: string } {
  if (context.role === 'admin') return { allowed: true };

  if (context.role === 'manager') {
    if (scopeType !== 'store') {
      return { allowed: false, reason: 'Managers can only manage store-scoped posts' };
    }
    if (!context.storeId || !targetStoreId || context.storeId !== targetStoreId) {
      return { allowed: false, reason: 'Managers can only manage posts for their own store' };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'Insufficient role permissions' };
}
