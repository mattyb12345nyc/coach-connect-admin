'use client';

import React from 'react';
import { useAdminAuth, type AdminRole } from '@/contexts/AdminAuthContext';
import { ShieldAlert, Loader2, Eye } from 'lucide-react';

type MinRole = 'associate' | 'store_manager' | 'manager' | 'regional_manager' | 'admin' | 'super_admin';

interface RoleGateProps {
  minRole: MinRole;
  readOnlyFor?: AdminRole[];
  children: React.ReactNode | ((props: { readOnly: boolean; storeId: string | null }) => React.ReactNode);
}

const ROLE_LEVEL: Record<string, number> = {
  associate: 0,
  store_manager: 1,
  manager: 1, // backwards compat alias
  regional_manager: 2,
  admin: 3,
  super_admin: 4,
};

export function RoleGate({ minRole, readOnlyFor = [], children }: RoleGateProps) {
  const { role, storeId, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-coach-gold" />
      </div>
    );
  }

  if ((ROLE_LEVEL[role] ?? 0) < (ROLE_LEVEL[minRole] ?? 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-500 max-w-md">
          This section requires higher privileges. Contact your administrator if you need access.
        </p>
      </div>
    );
  }

  const readOnly = readOnlyFor.includes(role);

  if (typeof children === 'function') {
    return <>{children({ readOnly, storeId })}</>;
  }

  return (
    <>
      {readOnly && (
        <div className="mx-4 mt-4 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span>You have view-only access to this section.</span>
        </div>
      )}
      {children}
    </>
  );
}
