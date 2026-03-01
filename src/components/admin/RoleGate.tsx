'use client';

import React from 'react';
import { useAdminAuth, type AdminRole } from '@/contexts/AdminAuthContext';
import { ShieldAlert, Loader2, Eye } from 'lucide-react';

interface RoleGateProps {
  minRole: 'manager' | 'admin';
  readOnlyFor?: AdminRole[];
  children: React.ReactNode | ((props: { readOnly: boolean; storeId: string | null }) => React.ReactNode);
}

const ROLE_LEVEL: Record<AdminRole, number> = {
  associate: 0,
  manager: 1,
  admin: 2,
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

  if (ROLE_LEVEL[role] < ROLE_LEVEL[minRole]) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-500 max-w-md">
          This section requires {minRole} privileges. Contact your administrator if you need access.
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
