'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Users,
  Plus,
  Trash2,
  Save,
  Loader2,
  Pencil,
  X,
  Search,
  Store,
  Award,
  Flame,
  Trophy,
  Mail,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AppUser {
  id: string;
  email: string;
  name: string;
  title: string;
  store: string;
  store_number: string;
  city: string;
  avatar_url: string | null;
  score: number;
  rank: string;
  streak: number;
  sessions_count: number;
  role: 'associate' | 'manager' | 'admin';
  is_active: boolean;
  member_since: string;
}

type UserRole = '' | 'associate' | 'manager' | 'admin';

const ROLE_CONFIG: Record<AppUser['role'], { label: string; bg: string; text: string }> = {
  associate: { label: 'Associate', bg: 'bg-gray-100', text: 'text-gray-700' },
  manager: { label: 'Manager', bg: 'bg-blue-50', text: 'text-blue-700' },
  admin: { label: 'Admin', bg: 'bg-purple-50', text: 'text-purple-700' },
};

const EMPTY_USER: Omit<AppUser, 'id' | 'score' | 'rank' | 'streak' | 'sessions_count' | 'member_since'> = {
  email: '',
  name: '',
  title: 'Sales Associate',
  store: '',
  store_number: '',
  city: '',
  avatar_url: null,
  role: 'associate',
  is_active: true,
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole>('');
  const [storeFilter, setStoreFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AppUser>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_USER);
  const [saving, setSaving] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter) params.set('role', roleFilter);
      if (storeFilter) params.set('store', storeFilter);
      if (search) params.set('search', search);

      const qs = params.toString();
      const res = await fetch(`/api/admin/app-users${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, storeFilter, search]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchUsers, search]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.is_active).length,
    admins: users.filter(u => u.role === 'admin').length,
  }), [users]);

  const startEditing = (user: AppUser) => {
    setEditingId(user.id);
    setEditForm({ ...user });
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editForm.name?.trim() || !editForm.email?.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(editingId);
    try {
      const res = await fetch('/api/admin/app-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...editForm }),
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

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving('new');
    try {
      const res = await fetch('/api/admin/app-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as Record<string, string>).error ?? 'Create failed');
      }
      toast.success('User created');
      setIsAdding(false);
      setAddForm(EMPTY_USER);
      await fetchUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(id);
    try {
      const res = await fetch('/api/admin/app-users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Delete failed');
      setUsers(prev => prev.filter(u => u.id !== id));
      if (editingId === id) cancelEditing();
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setSaving(null);
    }
  };

  const handleToggleActive = async (user: AppUser) => {
    setTogglingId(user.id);
    try {
      const res = await fetch('/api/admin/app-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, is_active: !user.is_active }),
      });
      if (!res.ok) throw new Error('Toggle failed');
      const updated = await res.json();
      setUsers(prev => prev.map(u => (u.id === user.id ? updated : u)));
      toast.success(user.is_active ? 'User deactivated' : 'User activated');
    } catch {
      toast.error('Failed to update user status');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-coach-black tracking-tight">Users</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage user profiles, roles, and store assignments
              </p>
            </div>
            <Button
              onClick={() => {
                setIsAdding(true);
                setAddForm(EMPTY_USER);
                cancelEditing();
              }}
              disabled={isAdding}
              className="bg-coach-gold hover:bg-coach-gold/90 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add User
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
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
                <User className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-coach-black">{stats.active}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-coach-black">{stats.admins}</p>
                <p className="text-xs text-gray-500">Admins</p>
              </div>
            </Card>
          </div>

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
                onChange={e => setRoleFilter(e.target.value as UserRole)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
              >
                <option value="">All Roles</option>
                <option value="associate">Associate</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Filter by store..."
                  value={storeFilter}
                  onChange={e => setStoreFilter(e.target.value)}
                  className="pl-9 w-44"
                />
              </div>
            </div>
          </Card>

          {/* Add User Form */}
          {isAdding && (
            <Card className="mb-6 border-coach-gold/40 bg-coach-gold/[0.02]">
              <div className="p-5 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-coach-black">New User</h3>
                  <button
                    onClick={() => { setIsAdding(false); setAddForm(EMPTY_USER); }}
                    className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label weight="semibold" required>Name</Label>
                  <Input
                    value={addForm.name}
                    onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label weight="semibold" required>Email</Label>
                  <Input
                    type="email"
                    value={addForm.email}
                    onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jane@coach.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label weight="semibold">Title</Label>
                  <Input
                    value={addForm.title}
                    onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label weight="semibold">Store</Label>
                  <Input
                    value={addForm.store}
                    onChange={e => setAddForm(f => ({ ...f, store: e.target.value }))}
                    placeholder="Fifth Avenue"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label weight="semibold">Store Number</Label>
                  <Input
                    value={addForm.store_number}
                    onChange={e => setAddForm(f => ({ ...f, store_number: e.target.value }))}
                    placeholder="001"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label weight="semibold">City</Label>
                  <Input
                    value={addForm.city}
                    onChange={e => setAddForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="New York"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label weight="semibold">Role</Label>
                  <select
                    value={addForm.role}
                    onChange={e => setAddForm(f => ({ ...f, role: e.target.value as AppUser['role'] }))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
                  >
                    <option value="associate">Associate</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="px-5 pb-5 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={saving === 'new'}
                  className="bg-coach-gold hover:bg-coach-gold/90 text-white"
                >
                  {saving === 'new' ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-1.5" />
                  )}
                  Create User
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setIsAdding(false); setAddForm(EMPTY_USER); }}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          )}

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
                const roleConfig = ROLE_CONFIG[user.role];
                const isEditing = editingId === user.id;
                const isToggling = togglingId === user.id;

                return (
                  <Card
                    key={user.id}
                    className={cn(
                      'transition-all',
                      isEditing && 'ring-1 ring-coach-gold/40 bg-coach-gold/[0.02]',
                      !user.is_active && !isEditing && 'opacity-60'
                    )}
                  >
                    {/* Display Row */}
                    <div className="p-4 flex items-center gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-coach-mahogany/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-coach-mahogany">
                              {getInitials(user.name)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-x-6 gap-y-1 items-center">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-coach-black truncate">
                              {user.name}
                            </span>
                            <span className={cn(
                              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
                              roleConfig.bg,
                              roleConfig.text
                            )}>
                              <Shield className="h-3 w-3" />
                              {roleConfig.label}
                            </span>
                            {!user.is_active && (
                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-400 flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              {user.email}
                            </span>
                            <span className="text-xs text-gray-400">
                              {user.title}
                            </span>
                          </div>
                          {(user.store || user.city) && (
                            <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Store className="h-3 w-3 flex-shrink-0" />
                              {[user.store, user.store_number && `#${user.store_number}`, user.city].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>

                        {/* Score Badges */}
                        <div className="flex items-center gap-3">
                          {user.score > 0 && (
                            <span className="flex items-center gap-1 text-xs text-amber-600" title="Score">
                              <Trophy className="h-3.5 w-3.5" />
                              {user.score}
                            </span>
                          )}
                          {user.rank && (
                            <span className="flex items-center gap-1 text-xs text-coach-gold" title="Rank">
                              <Award className="h-3.5 w-3.5" />
                              {user.rank}
                            </span>
                          )}
                          {user.streak > 0 && (
                            <span className="flex items-center gap-1 text-xs text-orange-500" title="Streak">
                              <Flame className="h-3.5 w-3.5" />
                              {user.streak}d
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={isToggling}
                            className={cn(
                              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                              user.is_active ? 'bg-coach-gold' : 'bg-gray-300'
                            )}
                            title={user.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {isToggling ? (
                              <Loader2 className="h-3 w-3 animate-spin text-white mx-auto" />
                            ) : (
                              <span
                                className={cn(
                                  'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                                  user.is_active ? 'translate-x-4' : 'translate-x-1'
                                )}
                              />
                            )}
                          </button>
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
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(user.id)}
                            disabled={saving === user.id}
                            title="Delete"
                            className="hover:text-red-600"
                          >
                            {saving === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive/70" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Edit Panel */}
                    {isEditing && (
                      <div className="border-t border-coach-gold/20 bg-coach-gold/[0.01] p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label weight="semibold" required>Name</Label>
                            <Input
                              value={editForm.name ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label weight="semibold" required>Email</Label>
                            <Input
                              type="email"
                              value={editForm.email ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label weight="semibold">Title</Label>
                            <Input
                              value={editForm.title ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label weight="semibold">Store</Label>
                            <Input
                              value={editForm.store ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, store: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label weight="semibold">Store Number</Label>
                            <Input
                              value={editForm.store_number ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, store_number: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label weight="semibold">City</Label>
                            <Input
                              value={editForm.city ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label weight="semibold">Role</Label>
                            <select
                              value={editForm.role ?? 'associate'}
                              onChange={e => setEditForm(f => ({ ...f, role: e.target.value as AppUser['role'] }))}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
                            >
                              <option value="associate">Associate</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <Label weight="semibold">Avatar URL</Label>
                            <Input
                              value={editForm.avatar_url ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, avatar_url: e.target.value || null }))}
                              placeholder="https://..."
                            />
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
                          {user.member_since && (
                            <span className="ml-auto text-xs text-gray-400">
                              Member since {formatDate(user.member_since)}
                            </span>
                          )}
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
  );
}
