'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User, Users, Loader2, Pencil, X, Search, Store, Award, Flame, Trophy,
  Mail, Shield, Save, CheckCircle, XCircle, Clock, UserCheck, Ban, Trash2, FlaskConical,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/components/admin/RoleGate';

interface ProfileUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  status: string;
  store_id: string | null;
  job_title: string;
  phone: string | null;
  practice_sessions: number;
  average_score: number;
  day_streak: number;
  created_at: string;
  last_active_at: string | null;
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

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  associate: { label: 'Associate', bg: 'bg-gray-100', text: 'text-gray-700' },
  store_manager: { label: 'Store Manager', bg: 'bg-blue-50', text: 'text-blue-700' },
  regional_manager: { label: 'Regional Mgr', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  admin: { label: 'Admin', bg: 'bg-purple-50', text: 'text-purple-700' },
  super_admin: { label: 'Super Admin', bg: 'bg-rose-50', text: 'text-rose-700' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  active: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle },
  suspended: { label: 'Suspended', bg: 'bg-red-50', text: 'text-red-700', icon: Ban },
  deactivated: { label: 'Deactivated', bg: 'bg-gray-100', text: 'text-gray-500', icon: XCircle },
};

const ROLE_OPTIONS = [
  { value: 'associate', label: 'Associate' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'regional_manager', label: 'Regional Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

function getInitials(firstName: string, lastName: string): string {
  return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || '?';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function UsersPage() {
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProfileUser>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [storesList, setStoresList] = useState<{ id: string; store_number: string; store_name: string; city: string; state: string }[]>([]);
  const [realAvgScore, setRealAvgScore] = useState<number | null | 'loading'>('loading');
  const [removingTestAccounts, setRemovingTestAccounts] = useState(false);

  useEffect(() => {
    fetch('/api/admin/stores?status=OPEN')
      .then(r => r.ok ? r.json() : [])
      .then(data => setStoresList(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => setRealAvgScore(data?.avgScore ?? null))
      .catch(() => setRealAvgScore(null));
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (search) params.set('search', search);

      const qs = params.toString();
      const res = await fetch(`/api/admin/profiles${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, roleFilter, search]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchUsers, search]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    pending: users.filter(u => u.status === 'pending').length,
  }), [users]);

  const testAccountCount = useMemo(
    () => users.filter(u => u.email?.toLowerCase().includes('mattyb123')).length,
    [users]
  );

  const handleRemoveTestAccounts = async () => {
    if (!window.confirm(`Permanently delete all ${testAccountCount} test account(s) with "mattyb123" in the email? This cannot be undone.`)) return;
    setRemovingTestAccounts(true);
    try {
      const res = await fetch('/api/admin/profiles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteTestAccounts: true }),
      });
      if (!res.ok) throw new Error('Failed to remove test accounts');
      const result = await res.json();
      toast.success(`Removed ${result.deleted} test account(s)`);
      await fetchUsers();
    } catch {
      toast.error('Failed to remove test accounts');
    } finally {
      setRemovingTestAccounts(false);
    }
  };

  const startEditing = (user: ProfileUser) => {
    setEditingId(user.id);
    setEditForm({ ...user });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(editingId);
    try {
      const res = await fetch('/api/admin/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          role: editForm.role,
          status: editForm.status,
          store_id: editForm.store_id,
          job_title: editForm.job_title,
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone: editForm.phone,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as Record<string, string>).error ?? 'Update failed');
      }
      const updated = await res.json();
      setUsers(prev => prev.map(u => (u.id === editingId ? updated : u)));
      toast.success('User updated');
      cancelEditing();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update user');
    } finally {
      setSaving(null);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setSaving(userId);
    try {
      const res = await fetch('/api/admin/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status: newStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
      const updated = await res.json();
      setUsers(prev => prev.map(u => (u.id === userId ? updated : u)));
      toast.success(`User ${newStatus === 'active' ? 'approved' : newStatus}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSaving(null);
    }
  };

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: `Pending (${stats.pending})` },
    { key: 'active', label: 'Active' },
    { key: 'suspended', label: 'Suspended' },
    { key: 'deactivated', label: 'Deactivated' },
  ];

  return (
    <RoleGate minRole="manager">
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-coach-black tracking-tight">Users</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage user profiles, approve registrations, and assign roles
              </p>
            </div>
            {testAccountCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveTestAccounts}
                disabled={removingTestAccounts}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 self-start sm:self-auto"
              >
                {removingTestAccounts
                  ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  : <Trash2 className="w-4 h-4 mr-1.5" />}
                Remove Test Accounts ({testAccountCount})
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-coach-gold/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-coach-gold" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-coach-black">{stats.total}</p>
                <p className="text-xs text-gray-500">Total Users</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-coach-black">{stats.active}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-coach-black">{stats.pending}</p>
                <p className="text-xs text-gray-500">Pending Approval</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                {realAvgScore === 'loading' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400 my-1" />
                ) : realAvgScore === null ? (
                  <p className="text-sm font-medium text-gray-400">No scores yet</p>
                ) : (
                  <p className="text-2xl font-semibold text-coach-black">{realAvgScore}%</p>
                )}
                <p className="text-xs text-gray-500">Avg Practice Score</p>
              </div>
            </Card>
          </div>

          {/* Status Tabs */}
          <Card className="p-3 mb-4">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
              {statusTabs.map(tab => (
                <button
                  key={tab.key}
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

          {/* Search & Filters */}
          <Card className="p-3 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as RoleFilter)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
              >
                <option value="all">All Roles</option>
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </Card>

          {/* User List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-coach-gold" />
            </div>
          ) : users.length === 0 ? (
            <Card className="py-16 flex flex-col items-center justify-center text-center">
              <Users className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No users found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {users.map(user => {
                const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.associate;
                const statusConfig = STATUS_CONFIG[user.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                const isEditing = editingId === user.id;
                const isSaving = saving === user.id;
                const isTestAccount = user.email?.toLowerCase().includes('mattyb123');
                // Derive displayed role title from the role field; only show custom job_title
                // if it's been set to something other than the registration default
                const displayTitle = (user.job_title && user.job_title !== 'Sales Associate')
                  ? user.job_title
                  : roleConfig.label;

                return (
                  <Card
                    key={user.id}
                    className={cn(
                      'transition-all',
                      isEditing && 'ring-1 ring-coach-gold/40 bg-coach-gold/[0.02]',
                      user.status === 'deactivated' && !isEditing && 'opacity-60'
                    )}
                  >
                    <div className="p-4 flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.display_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-coach-mahogany/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-coach-mahogany">
                              {getInitials(user.first_name, user.last_name)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-x-6 gap-y-1 items-center">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-coach-black truncate">
                              {user.display_name}
                            </span>
                            <span className={cn(
                              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
                              roleConfig.bg, roleConfig.text
                            )}>
                              <Shield className="h-3 w-3" />
                              {roleConfig.label}
                            </span>
                            <span className={cn(
                              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
                              statusConfig.bg, statusConfig.text
                            )}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </span>
                            {isTestAccount && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">
                                <FlaskConical className="h-3 w-3" />
                                Test Account
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-400 flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              {user.email}
                            </span>
                            <span className="text-xs text-gray-400">{displayTitle}</span>
                          </div>
                          {user.stores && (
                            <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Store className="h-3 w-3 flex-shrink-0" />
                              {user.stores.store_number} — {user.stores.store_name} ({user.stores.city}, {user.stores.state})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {user.average_score > 0 && (
                            <span className="flex items-center gap-1 text-xs text-amber-600" title="Avg Score">
                              <Trophy className="h-3.5 w-3.5" />
                              {user.average_score}%
                            </span>
                          )}
                          {user.practice_sessions > 0 && (
                            <span className="flex items-center gap-1 text-xs text-coach-gold" title="Sessions">
                              <Award className="h-3.5 w-3.5" />
                              {user.practice_sessions}
                            </span>
                          )}
                          {user.day_streak > 0 && (
                            <span className="flex items-center gap-1 text-xs text-orange-500" title="Streak">
                              <Flame className="h-3.5 w-3.5" />
                              {user.day_streak}d
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {user.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(user.id, 'active')}
                              disabled={isSaving}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            >
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              )}
                              Approve
                            </Button>
                          )}
                          {user.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(user.id, 'suspended')}
                              disabled={isSaving}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 text-xs"
                            >
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                              ) : (
                                <Ban className="w-3.5 h-3.5 mr-1" />
                              )}
                              Suspend
                            </Button>
                          )}
                          {user.status === 'suspended' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(user.id, 'active')}
                              disabled={isSaving}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 text-xs"
                            >
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              )}
                              Reactivate
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => isEditing ? cancelEditing() : startEditing(user)}
                            title={isEditing ? 'Cancel edit' : 'Edit'}
                          >
                            {isEditing ? (
                              <X className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Pencil className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="border-t border-coach-gold/20 bg-coach-gold/[0.01] p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label weight="semibold">First Name</Label>
                            <Input
                              value={editForm.first_name ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label weight="semibold">Last Name</Label>
                            <Input
                              value={editForm.last_name ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label weight="semibold">Job Title</Label>
                            <Input
                              value={editForm.job_title ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, job_title: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label weight="semibold">Phone</Label>
                            <Input
                              value={editForm.phone ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                              placeholder="+1 (555) 000-0000"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label weight="semibold">Role</Label>
                            <select
                              value={editForm.role ?? 'associate'}
                              onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
                            >
                              {ROLE_OPTIONS.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <Label weight="semibold">Status</Label>
                            <select
                              value={editForm.status ?? 'pending'}
                              onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
                            >
                              <option value="pending">Pending</option>
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                              <option value="deactivated">Deactivated</option>
                            </select>
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label weight="semibold">Store</Label>
                            <select
                              value={editForm.store_id ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, store_id: e.target.value || null }))}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
                            >
                              <option value="">No store assigned</option>
                              {storesList.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.store_number} — {s.store_name} ({s.city}, {s.state})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-5">
                          <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={saving === editingId}
                            className="bg-coach-gold hover:bg-coach-gold/90 text-white"
                          >
                            {saving === editingId ? (
                              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-1.5" />
                            )}
                            Save Changes
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            Cancel
                          </Button>
                          <span className="ml-auto text-xs text-gray-400">
                            Joined {formatDate(user.created_at)}
                            {user.last_active_at && ` · Last active ${formatDate(user.last_active_at)}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </RoleGate>
  );
}
