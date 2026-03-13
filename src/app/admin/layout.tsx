'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Mic,
  Users,
  Sparkles,
  User,
  Menu,
  X,
  ChevronLeft,
  Store,
  Shield,
  Loader2,
  History,
  Settings,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { config } from '@/lib/config';
import { AdminAuthProvider, useAdminAuth, type AdminRole } from '@/contexts/AdminAuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  minRole: 'store_manager' | 'admin';
  children?: NavItem[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'App Content',
    items: [
      { id: 'today', label: 'Today Dashboard', icon: LayoutDashboard, href: '/admin/today', minRole: 'store_manager' },
      {
        id: 'chat-group', label: 'Coach Chat', icon: MessageSquare, href: '/admin/chat', minRole: 'admin',
        children: [
          { id: 'chat-history', label: 'History & Analytics', icon: History, href: '/admin/chat-history', minRole: 'store_manager' },
        ],
      },
      { id: 'practice', label: 'Practice Floor', icon: Mic, href: '/admin/practice', minRole: 'store_manager' },
      { id: 'community', label: 'Community', icon: Users, href: '/admin/community', minRole: 'store_manager' },
      { id: 'culture', label: 'Pulse Feed', icon: Sparkles, href: '/admin/culture', minRole: 'store_manager' },
      { id: 'users', label: 'Users', icon: User, href: '/admin/users', minRole: 'store_manager' },
      { id: 'stores', label: 'Stores', icon: Store, href: '/admin/stores', minRole: 'store_manager' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'profile', label: 'Profile', icon: UserCircle, href: '/admin/profile', minRole: 'store_manager' },
      { id: 'settings', label: 'Settings', icon: Settings, href: '/admin/settings', minRole: 'store_manager' },
    ],
  },
];

const ROLE_LEVEL: Record<AdminRole, number> = {
  associate: 0,
  store_manager: 1,
  regional_manager: 2,
  admin: 3,
  super_admin: 4,
};

const ROLE_BADGE: Record<AdminRole, { label: string; className: string }> = {
  associate: { label: 'Associate', className: 'bg-gray-100 text-gray-600' },
  store_manager: { label: 'Store Manager', className: 'bg-blue-100 text-blue-700' },
  regional_manager: { label: 'Regional Manager', className: 'bg-indigo-100 text-indigo-700' },
  admin: { label: 'Admin', className: 'bg-purple-100 text-purple-700' },
  super_admin: { label: 'Super Admin', className: 'bg-amber-100 text-amber-700' },
};

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { user, role, loading, signOut } = useAdminAuth();

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    const expanded = new Set<string>();
    for (const section of navSections) {
      for (const item of section.items) {
        if (item.children) {
          const isChildActive = item.children.some(c => pathname === c.href);
          const isParentActive = pathname === item.href;
          if (isChildActive || isParentActive) {
            expanded.add(item.id);
          }
        }
      }
    }
    setExpandedGroups(expanded);
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filterItems = (items: NavItem[]): NavItem[] =>
    items
      .filter(item => ROLE_LEVEL[role] >= ROLE_LEVEL[item.minRole])
      .map(item => ({
        ...item,
        children: item.children ? filterItems(item.children) : undefined,
      }));

  const badge = ROLE_BADGE[role];

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coach-gold" />
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coach-gold" />
      </div>
    );
  }

  if (ROLE_LEVEL[role] < ROLE_LEVEL['store_manager']) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h1>
        <p className="text-gray-500 max-w-md mb-6">
          The admin dashboard is only available to store managers and administrators.
          You are signed in as <strong>{user.email}</strong> with the <strong>{role.replace('_', ' ')}</strong> role.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Sign Out
          </button>
          <a
            href={config.consumerAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-coach-gold text-white hover:bg-coach-gold/90 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to App
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center h-14 px-4 gap-3">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Coach Pulse" className="w-7 h-7 rounded-lg" />
            <span className="text-base font-semibold text-gray-900 hidden sm:block">
              Coach Pulse
            </span>
          </Link>

          <span className="text-gray-300 hidden sm:block">|</span>
          <span className="text-sm font-medium text-gray-500 hidden sm:block">Admin</span>

          <div className="ml-auto flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-gray-600">{user.display_name}</span>
                <span className={cn('text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full', badge.className)}>
                  {badge.label}
                </span>
              </div>
            )}
            <a
              href={config.consumerAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to App</span>
            </a>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={cn(
            'fixed lg:sticky top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-60 bg-white border-r border-gray-200 flex flex-col transition-transform lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
            {navSections.map((section) => {
              const sectionItems = filterItems(section.items);
              if (sectionItems.length === 0) return null;
              return (
                <div key={section.label}>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {section.label}
                  </p>
                  <div className="space-y-0.5">
                    {sectionItems.map((item) => {
                      if (item.children && item.children.length > 0) {
                        const isExpanded = expandedGroups.has(item.id);
                        const parentActive = pathname === item.href;
                        const childActive = item.children.some(c => pathname === c.href);
                        const groupActive = parentActive || childActive;
                        return (
                          <div key={item.id}>
                            <div className="flex items-center">
                              <Link
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                  'flex-1 flex items-center gap-3 px-3 py-2 rounded-l-lg text-sm font-medium transition-colors',
                                  parentActive
                                    ? 'bg-amber-50 text-amber-800 border border-r-0 border-amber-200'
                                    : groupActive
                                      ? 'text-amber-700 bg-amber-50/50'
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                )}
                              >
                                <item.icon className={cn('w-4.5 h-4.5', groupActive ? 'text-amber-600' : 'text-gray-400')} />
                                {item.label}
                              </Link>
                              <button
                                onClick={() => toggleGroup(item.id)}
                                className={cn(
                                  'px-2 py-2 rounded-r-lg transition-colors',
                                  parentActive
                                    ? 'bg-amber-50 border border-l-0 border-amber-200'
                                    : groupActive
                                      ? 'bg-amber-50/50'
                                      : 'hover:bg-gray-50'
                                )}
                              >
                                <ChevronLeft className={cn(
                                  'w-3.5 h-3.5 transition-transform',
                                  isExpanded ? '-rotate-90' : 'rotate-180',
                                  groupActive ? 'text-amber-600' : 'text-gray-400'
                                )} />
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-2">
                                {item.children.map((child) => {
                                  const childIsActive = pathname === child.href;
                                  return (
                                    <Link
                                      key={child.id}
                                      href={child.href}
                                      onClick={() => setSidebarOpen(false)}
                                      className={cn(
                                        'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                                        childIsActive
                                          ? 'bg-amber-50 text-amber-800 font-medium border border-amber-200'
                                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                      )}
                                    >
                                      <child.icon className={cn('w-3.5 h-3.5', childIsActive ? 'text-amber-600' : 'text-gray-400')} />
                                      {child.label}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                            active
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          <item.icon className={cn('w-4.5 h-4.5', active ? 'text-amber-600' : 'text-gray-400')} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {user && (
            <div className="p-3 border-t border-gray-100">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-gray-900 truncate">{user.display_name}</p>
                <p className="text-xs text-gray-500 truncate">{user.store_name || user.email}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className={cn('text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full', badge.className)}>
                    {badge.label}
                  </span>
                  <button
                    onClick={signOut}
                    className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminAuthProvider>
  );
}
