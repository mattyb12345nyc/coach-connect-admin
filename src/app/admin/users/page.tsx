'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Award,
  Ban,
  CheckCircle,
  Clock,
  FlaskConical,
  Loader2,
  Mail,
  Search,
  Store,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { RoleGate } from '@/components/admin/RoleGate';
import { AddUserModal } from '@/components/admin/users/AddUserModal';
import { CredentialsModal } from '@/components/admin/users/CredentialsModal';
import { UserActionsMenu } from '@/components/admin/users/UserActionsMenu';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ProfileUser {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  status: string;
  store_id: string | null;
  practice_sessions: number;
  average_score: number | null;
  created_at: string;
  is_approved?: boolean | null;
  stores: {
    id: string;
    store_number: string;
    store_name: string;
    city: string;
    state: string;
    region: string | null;
  } | null;
}

type StatusFilter = 'all' | 'pending' | 'active' | 'suspended' | 'deactivated';
type RoleFilter = 'all' | 'associate' | 'store_manager' | 'regional_manager' | 'admin' | 'super_admin';

type StoreOption = {
  id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
};

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  associate: { label: 'Associate', bg: 'bg-gray-100', text: 'text-gray-700' },
  store_manager: { label: 'Store Manager', bg: 'bg-blue-50', text: 'text-blue-700' },
  regional_manager: { label: 'Regional Manager', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  admin: { label: 'Admin', bg: 'bg-purple-50', text: 'text-purple-700' },
  super_admin: { label: 'Super Admin', bg: 'bg-rose-50', text: 'text-rose-700' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  active: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle },
  suspended: { label: 'Suspended', bg: 'bg-red-50', text: 'text-red-700', icon: Ban },
  deactivated: { label: 'Deactivated', bg: 'bg-gray-100', text: 'text-gray-500', icon: Ban },
};

const ROLE_OPTIONS = [
  { value: 'associate', label: 'Associate' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'regional_manager', label: 'Regional Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

function getInitials(firstName: string, lastName: string, displayName: string): string {
  const combined = ((firstName?.[0] || '') + (lastName?.[0] || '')).trim();
  if (combined) return combined.toUpperCase();

  return displayName
    .split(' ')
    .map((segment) => segment[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';

  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStoreLabel(store: ProfileUser['stores']): string {
  if (!store) return 'No store assigned';

  return `${store.store_number} - ${store.store_name} (${store.city}, ${store.state})`;
}

export default function UsersPage() {
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [storesList, setStoresList] = useState<StoreOption[]>([]);
  const [realAvgScore, setRealAvgScore] = useState<number | null | 'loading'>('loading');
  const [removingTestAccounts, setRemovingTestAccounts] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [manualCredentials, setManualCredentials] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/stores?status=OPEN')
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setStoresList(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setRealAvgScore(data?.avgScore ?? null))
      .catch(() => setRealAvgScore(null));
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (search) params.set('search', search);

      const queryString = params.toString();
      const response = await fetch(`/api/admin/profiles${queryString ? `?${queryString}` : ''}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = (await response.json()) as ProfileUser[];
      setUsers(data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(fetchUsers, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [fetchUsers, search]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.status === 'active').length,
      pending: users.filter((user) => user.status === 'pending').length,
      suspended: users.filter((user) => user.status === 'suspended').length,
    }),
    [users]
  );

  const testAccountCount = useMemo(
    () => users.filter((user) => user.email?.toLowerCase().includes('mattyb123')).length,
    [users]
  );

  const handleRemoveTestAccounts = async () => {
    const confirmed = window.confirm(
      `Permanently delete all ${testAccountCount} test account(s) with "mattyb123" in the email? This cannot be undone.`
    );
    if (!confirmed) return;

    setRemovingTestAccounts(true);

    try {
      const response = await fetch('/api/admin/profiles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteTestAccounts: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove test accounts');
      }

      const result = (await response.json()) as { deleted: number };
      toast.success(`Removed ${result.deleted} test account(s)`);
      await fetchUsers();
    } catch {
      toast.error('Failed to remove test accounts');
    } finally {
      setRemovingTestAccounts(false);
    }
  };

  const handleCreatedUser = async (result: {
    email: string;
    temp_password: string | null;
  }) => {
    await fetchUsers();

    if (result.temp_password) {
      setManualCredentials({
        email: result.email,
        password: result.temp_password,
      });
    }
  };

  const handleUserUpdated = (updatedUser: ProfileUser) => {
    setUsers((previousUsers) =>
      previousUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    );
  };

  const statusTabs: Array<{ key: StatusFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: `Pending (${stats.pending})` },
    { key: 'active', label: `Active (${stats.active})` },
    { key: 'suspended', label: `Suspended (${stats.suspended})` },
    { key: 'deactivated', label: 'Deactivated' },
  ];

  return (
    <RoleGate minRole="manager">
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-coach-black">Users</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create users, send secure invite emails, and manage Coach Pulse access from one place.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {testAccountCount > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveTestAccounts}
                  disabled={removingTestAccounts}
                  className="text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  {removingTestAccounts ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-1.5 h-4 w-4" />}
                  Remove Test Accounts ({testAccountCount})
                </Button>
              ) : null}

              <Button
                size="sm"
                onClick={() => setAddUserModalOpen(true)}
                className="bg-coach-gold text-white hover:bg-coach-gold/90"
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                Add User
              </Button>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-coach-gold/10">
                  <Users className="h-5 w-5 text-coach-gold" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-coach-black">{stats.total}</p>
                  <p className="text-xs text-gray-500">Total Users</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-coach-black">{stats.active}</p>
                  <p className="text-xs text-gray-500">Active</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-coach-black">{stats.pending}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                  <Trophy className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  {realAvgScore === 'loading' ? (
                    <Loader2 className="my-1 h-5 w-5 animate-spin text-gray-400" />
                  ) : realAvgScore === null ? (
                    <p className="text-sm font-medium text-gray-400">No scores yet</p>
                  ) : (
                    <p className="text-2xl font-semibold text-coach-black">{realAvgScore}%</p>
                  )}
                  <p className="text-xs text-gray-500">Avg Practice Score</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="mb-4 p-3">
            <div className="flex w-fit rounded-lg border border-gray-200 overflow-hidden">
              {statusTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-colors',
                    statusFilter === tab.key
                      ? 'bg-coach-gold text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="mb-6 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                className="h-11 rounded-lg border border-input bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Roles</option>
                {ROLE_OPTIONS.map((roleOption) => (
                  <option key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <Card className="overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-coach-gold" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">No users found</p>
                <p className="mt-1 text-xs text-gray-400">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Store</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3">Performance</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {users.map((user) => {
                      const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.associate;
                      const statusConfig = STATUS_CONFIG[user.status] || STATUS_CONFIG.pending;
                      const StatusIcon = statusConfig.icon;
                      const isTestAccount = user.email?.toLowerCase().includes('mattyb123');

                      return (
                        <tr key={user.id} className="align-top">
                          <td className="px-4 py-4">
                            <div className="flex items-start gap-3">
                              {user.avatar_url ? (
                                <Image
                                  src={user.avatar_url}
                                  alt={user.display_name}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coach-mahogany/10">
                                  <span className="text-sm font-semibold text-coach-mahogany">
                                    {getInitials(user.first_name, user.last_name, user.display_name)}
                                  </span>
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-coach-black">
                                    {user.display_name || user.email || 'Unnamed user'}
                                  </p>
                                  {isTestAccount ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                                      <FlaskConical className="h-3 w-3" />
                                      Test
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{user.email || 'No email available'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', roleConfig.bg, roleConfig.text)}>
                              {roleConfig.label}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-start gap-2 text-sm text-gray-600">
                              <Store className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                              <span>{getStoreLabel(user.stores)}</span>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', statusConfig.bg, statusConfig.text)}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {statusConfig.label}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-sm text-gray-600">
                            {formatDate(user.created_at)}
                          </td>

                          <td className="px-4 py-4">
                            <div className="space-y-1 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                <span>{user.average_score != null ? `${user.average_score}% avg score` : 'No score yet'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Award className="h-3.5 w-3.5 text-coach-gold" />
                                <span>{user.practice_sessions} practice sessions</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end">
                              <UserActionsMenu<ProfileUser>
                                user={user}
                                onUserUpdated={handleUserUpdated}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <AddUserModal
        open={addUserModalOpen}
        onOpenChange={setAddUserModalOpen}
        stores={storesList}
        onCreated={handleCreatedUser}
      />

      <CredentialsModal
        open={!!manualCredentials}
        onOpenChange={(open) => {
          if (!open) {
            setManualCredentials(null);
          }
        }}
        email={manualCredentials?.email || ''}
        password={manualCredentials?.password || ''}
      />
    </RoleGate>
  );
}
