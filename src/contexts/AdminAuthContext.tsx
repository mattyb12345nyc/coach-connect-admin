'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';

export type AdminRole = 'associate' | 'store_manager' | 'regional_manager' | 'admin' | 'super_admin';

interface AdminUser {
  id: string;
  email: string;
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

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminAuthData>({
    user: null,
    role: 'admin',
    storeId: null,
    loading: true,
    isAdmin: true,
    isManager: false,
  });

  useEffect(() => {
    const supabase = getSupabase();

    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          setState(prev => ({ ...prev, loading: false }));
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          let storeName: string | null = null;
          let storeNumber: string | null = null;
          if (profile.store_id) {
            const { data: store } = await supabase
              .from('stores')
              .select('store_name, store_number')
              .eq('id', profile.store_id)
              .single();
            storeName = store?.store_name ?? null;
            storeNumber = store?.store_number ?? null;
          }

          const role = profile.role as AdminRole;
          const roleLevel = ROLE_LEVEL[role] ?? 0;
          setState({
            user: {
              id: profile.id,
              email: profile.email,
              first_name: profile.first_name,
              last_name: profile.last_name,
              display_name: profile.display_name,
              role,
              status: profile.status,
              store_id: profile.store_id,
              store_name: storeName,
              store_number: storeNumber,
              avatar_url: profile.avatar_url,
            },
            role,
            storeId: profile.store_id,
            loading: false,
            isAdmin: roleLevel >= ROLE_LEVEL.admin,
            isManager: roleLevel >= ROLE_LEVEL.store_manager,
          });
        } else {
          // Fallback: no profile yet — check old app_users table for backwards compat
          const { data: appUser } = await supabase
            .from('app_users')
            .select('id, email, name, role, store_id, store, store_number')
            .eq('email', session.user.email)
            .single();

          if (appUser) {
            const legacyRole = appUser.role as string;
            const mappedRole: AdminRole = legacyRole === 'admin' ? 'admin' : legacyRole === 'manager' ? 'store_manager' : 'associate';
            const mappedLevel = ROLE_LEVEL[mappedRole] ?? 0;
            setState({
              user: {
                id: appUser.id,
                email: appUser.email,
                first_name: appUser.name?.split(' ')[0] ?? '',
                last_name: appUser.name?.split(' ').slice(1).join(' ') ?? '',
                display_name: appUser.name ?? appUser.email,
                role: mappedRole,
                status: 'active',
                store_id: appUser.store_id,
                store_name: appUser.store,
                store_number: appUser.store_number,
                avatar_url: null,
              },
              role: mappedRole,
              storeId: appUser.store_id,
              loading: false,
              isAdmin: mappedLevel >= ROLE_LEVEL.admin,
              isManager: mappedLevel >= ROLE_LEVEL.store_manager,
            });
          } else {
            setState(prev => ({ ...prev, loading: false }));
          }
        }
      } catch {
        setState(prev => ({ ...prev, loading: false }));
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
    setState(prev => ({
      ...prev,
      user: null,
      role: 'associate' as AdminRole,
      storeId: null,
      isAdmin: false,
      isManager: false,
    }));
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
