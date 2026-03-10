'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { clearAdminAuthTokenCookie, setAdminAuthTokenCookie } from '@/lib/admin-auth-client';

export type AdminRole = 'associate' | 'store_manager' | 'regional_manager' | 'admin' | 'super_admin';

interface AdminUser {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  role: AdminRole;
  status: string;
  store_id: string | null;
  store_name: string | null;
  store_number: string | null;
  avatar_url: string | null;
}

interface AdminAuthData {
  user: AdminUser | null;
  role: AdminRole;
  storeId: string | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
}

interface AdminAuthState extends AdminAuthData {
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthState>({
  user: null,
  role: 'admin',
  storeId: null,
  loading: true,
  isAdmin: true,
  isManager: false,
  signOut: async () => {},
});

const ROLE_LEVEL: Record<AdminRole, number> = {
  associate: 0,
  store_manager: 1,
  regional_manager: 2,
  admin: 3,
  super_admin: 4,
};

const EMPTY_AUTH_STATE: AdminAuthData = {
  user: null,
  role: 'associate',
  storeId: null,
  loading: true,
  isAdmin: false,
  isManager: false,
};

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminAuthData>(EMPTY_AUTH_STATE);

  useEffect(() => {
    const supabase = getSupabase();

    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        if (!session?.user || !accessToken) {
          clearAdminAuthTokenCookie();
          setState({ ...EMPTY_AUTH_STATE, loading: false });
          return;
        }

        const response = await fetch('/api/admin/session', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          clearAdminAuthTokenCookie();
          await supabase.auth.signOut();
          setState({ ...EMPTY_AUTH_STATE, loading: false });
          return;
        }

        const data = await response.json();
        const role = data.role as AdminRole;
        const roleLevel = ROLE_LEVEL[role] ?? 0;

        setAdminAuthTokenCookie(accessToken);
        setState({
          user: data.user,
          role,
          storeId: data.storeId ?? null,
          loading: false,
          isAdmin: roleLevel >= ROLE_LEVEL.admin,
          isManager: roleLevel >= ROLE_LEVEL.store_manager,
        });
      } catch {
        clearAdminAuthTokenCookie();
        setState({ ...EMPTY_AUTH_STATE, loading: false });
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    clearAdminAuthTokenCookie();
    setState({ ...EMPTY_AUTH_STATE, loading: false });
  };

  const value = { ...state, signOut };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
