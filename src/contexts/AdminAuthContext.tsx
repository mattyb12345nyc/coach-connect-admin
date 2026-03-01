'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';

export type AdminRole = 'associate' | 'manager' | 'admin';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  store_id: string | null;
  store: string | null;
  store_number: string | null;
}

interface AdminAuthState {
  user: AdminUser | null;
  role: AdminRole;
  storeId: string | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
}

const AdminAuthContext = createContext<AdminAuthState>({
  user: null,
  role: 'admin',
  storeId: null,
  loading: true,
  isAdmin: true,
  isManager: false,
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    role: 'admin',
    storeId: null,
    loading: true,
    isAdmin: true,
    isManager: false,
  });

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.email) {
          // No auth session -- default to admin in development
          setState({
            user: null,
            role: 'admin',
            storeId: null,
            loading: false,
            isAdmin: true,
            isManager: false,
          });
          return;
        }

        const { data: appUser } = await supabase
          .from('app_users')
          .select('id, email, name, role, store_id, store, store_number')
          .eq('email', session.user.email)
          .single();

        if (appUser) {
          const role = appUser.role as AdminRole;
          setState({
            user: appUser as AdminUser,
            role,
            storeId: appUser.store_id,
            loading: false,
            isAdmin: role === 'admin',
            isManager: role === 'manager',
          });
        } else {
          // User exists in Supabase auth but not in app_users -- default to admin
          setState({
            user: null,
            role: 'admin',
            storeId: null,
            loading: false,
            isAdmin: true,
            isManager: false,
          });
        }
      } catch {
        // Supabase not configured or tables don't exist -- default to admin
        setState({
          user: null,
          role: 'admin',
          storeId: null,
          loading: false,
          isAdmin: true,
          isManager: false,
        });
      }
    }

    loadUser();
  }, []);

  return (
    <AdminAuthContext.Provider value={state}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
