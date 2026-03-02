'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail, Plus, Copy, Trash2, Loader2, Check, Clock, UserPlus, Shield, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/components/admin/RoleGate';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface StoreOption {
  id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
  region?: string | null;
}

interface Invitation {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  store_id: string | null;
  region: string | null;
  invited_by: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  stores: {
    store_number: string;
    store_name: string;
    city: string;
    state: string;
  } | null;
}

type TabFilter = 'all' | 'pending' | 'accepted' | 'expired' | 'revoked';

const ROLE_OPTIONS = [
  { value: 'associate', label: 'Associate' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'regional_manager', label: 'Regional Manager' },
  { value: 'admin', label: 'Admin' },
];
const MAIN_APP_URL = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://futureproof.work/coach-connect/register';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function InvitationsPage() {
  const { user, role, storeId, isAdmin } = useAdminAuth();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [inviteRole, setInviteRole] = useState('associate');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');

  const [successResult, setSuccessResult] = useState<{
    invite_url: string;
    email_sent: boolean;
  } | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/invitations');
      if (!res.ok) throw new Error('Failed to fetch invitations');
      const data = await res.json();
      setInvitations(data);
    } catch {
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stores?status=OPEN');
      if (!res.ok) throw new Error('Failed to fetch stores');
      const data = await res.json();
      setStores(data);
    } catch {
      toast.error('Failed to load stores');
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
    fetchStores();
  }, [fetchInvitations, fetchStores]);

  useEffect(() => {
    if (!isAdmin && storeId) {
      setSelectedStoreId(storeId);
    }
  }, [isAdmin, storeId]);

  useEffect(() => {
    if (inviteRole === 'admin') {
      setSelectedStoreId('');
      setSelectedRegion('');
      return;
    }
    if (inviteRole === 'regional_manager') {
      setSelectedStoreId('');
      return;
    }
    setSelectedRegion('');
  }, [inviteRole]);

  const stats = useMemo(() => ({
    total: invitations.length,
    pending: invitations.filter(i => i.status === 'pending').length,
    accepted: invitations.filter(i => i.status === 'accepted').length,
  }), [invitations]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return invitations;
    return invitations.filter(i => i.status === activeTab);
  }, [invitations, activeTab]);

  const regionOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const s of stores) {
      if (s.region) unique.add(s.region);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [stores]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiresStore = inviteRole === 'associate' || inviteRole === 'store_manager';
    const requiresRegion = inviteRole === 'regional_manager';
    if (!email) {
      toast.error('Please fill in email');
      return;
    }
    if (requiresStore && !selectedStoreId) {
      toast.error('Please select a store');
      return;
    }
    if (requiresRegion && !selectedRegion) {
      toast.error('Please select a region');
      return;
    }

    setSending(true);
    setSuccessResult(null);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          role: inviteRole,
          store_id: requiresStore ? selectedStoreId : undefined,
          region: requiresRegion ? selectedRegion : undefined,
          invited_by: user?.id ?? user?.email ?? 'admin',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as Record<string, string>).error ?? 'Failed to send invitation');
      }
      const data = await res.json();
      setSuccessResult({
        invite_url: data.invite_url,
        email_sent: data.email_sent,
      });
      setEmail('');
      setFirstName('');
      setLastName('');
      setSelectedStoreId('');
      setSelectedRegion('');
      fetchInvitations();
      toast.success('Invitation sent');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete invitation');
      setInvitations(prev => prev.filter(i => i.id !== id));
      toast.success('Invitation deleted');
    } catch {
      toast.error('Failed to delete invitation');
    } finally {
      setDeletingId(null);
    }
  };

  const copyInviteLink = async (invitation: Invitation) => {
    const url = `${MAIN_APP_URL}?token=${invitation.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(invitation.id);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'expired', label: 'Expired' },
    { key: 'revoked', label: 'Revoked' },
  ];

  return (
    <RoleGate minRole="manager">
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-2.5 mb-1">
              <Mail className="h-6 w-6 text-coach-mahogany" />
              <h1 className="text-2xl font-bold text-coach-black tracking-tight">Invitations</h1>
            </div>
            <p className="text-sm text-gray-500">Invite team members to Coach Connect</p>
          </div>

          <Card className="p-6 mb-6">
            <form onSubmit={handleSend}>
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-coach-gold" />
                <h2 className="text-base font-semibold text-coach-black">Send Invitation</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label size="xs" weight="semibold">Email *</Label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label size="xs" weight="semibold">First Name</Label>
                  <Input
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label size="xs" weight="semibold">Last Name</Label>
                  <Input
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label size="xs" weight="semibold">Role</Label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
                  >
                    {ROLE_OPTIONS.filter(r => isAdmin || r.value === 'associate').map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inviteRole === 'regional_manager' && (
                  <div className="space-y-1.5">
                    <Label size="xs" weight="semibold">Region *</Label>
                    <select
                      value={selectedRegion}
                      onChange={e => setSelectedRegion(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
                    >
                      <option value="">Select a region</option>
                      {regionOptions.map(region => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(inviteRole === 'associate' || inviteRole === 'store_manager') && (
                  <div className="space-y-1.5">
                    <Label size="xs" weight="semibold">Store *</Label>
                    <select
                      value={selectedStoreId}
                      onChange={e => setSelectedStoreId(e.target.value)}
                      disabled={!isAdmin && !!storeId}
                      className={cn(
                        'w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold',
                        !isAdmin && storeId && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <option value="">Select an open store</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.store_number} — {s.store_name} ({s.city}, {s.state})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={sending}
                  className="bg-coach-gold hover:bg-coach-gold/90 text-white"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Send Invitation
                </Button>
              </div>
            </form>

            {successResult && (
              <div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-emerald-800">
                        Invitation created{successResult.email_sent ? ' and email sent' : ''}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <code className="text-xs bg-white/80 border border-emerald-200 rounded px-2 py-1 text-emerald-700 truncate block max-w-md">
                          {successResult.invite_url}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await navigator.clipboard.writeText(successResult.invite_url);
                            toast.success('Link copied');
                          }}
                          className="flex-shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copy
                        </Button>
                      </div>
                      {!successResult.email_sent && (
                        <p className="text-xs text-amber-700 mt-1.5">
                          Email delivery is not configured — share the link manually.
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSuccessResult(null)}
                    className="text-emerald-400 hover:text-emerald-600 transition-colors flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-coach-gold/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-coach-gold" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-coach-black">{stats.total}</p>
                <p className="text-xs text-gray-500">Total Invitations</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-coach-black">{stats.pending}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-coach-black">{stats.accepted}</p>
                <p className="text-xs text-gray-500">Accepted</p>
              </div>
            </Card>
          </div>

          <Card className="p-3 mb-4">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-colors',
                    activeTab === tab.key
                      ? 'bg-coach-gold text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-coach-gold" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="py-16 flex flex-col items-center justify-center text-center">
              <Mail className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No invitations found</p>
              <p className="text-xs text-gray-400 mt-1">
                {activeTab !== 'all' ? 'Try a different filter' : 'Send your first invitation above'}
              </p>
            </Card>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">
                Showing {filtered.length} invitation{filtered.length !== 1 && 's'}
              </p>
              <div className="space-y-2">
                {filtered.map(invitation => (
                  <Card key={invitation.id} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <p className="text-sm font-semibold text-coach-black truncate">
                            {invitation.first_name || invitation.last_name
                              ? `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim()
                              : invitation.email}
                          </p>
                          {(invitation.first_name || invitation.last_name) && (
                            <span className="text-xs text-gray-400 truncate">{invitation.email}</span>
                          )}
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                            invitation.role === 'admin' || invitation.role === 'regional_manager'
                              ? 'bg-purple-50 text-purple-700'
                              : invitation.role === 'store_manager'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                          )}>
                            {(invitation.role === 'store_manager' || invitation.role === 'admin' || invitation.role === 'regional_manager') && (
                              <Shield className="h-3 w-3" />
                            )}
                            {invitation.role.replace('_', ' ')}
                          </span>
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            invitation.status === 'pending' && 'bg-amber-50 text-amber-700',
                            invitation.status === 'accepted' && 'bg-emerald-50 text-emerald-700',
                            (invitation.status === 'expired' || invitation.status === 'revoked') && 'bg-gray-100 text-gray-500'
                          )}>
                            {invitation.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          {invitation.stores && (
                            <span>
                              {invitation.stores.store_number} — {invitation.stores.store_name}
                            </span>
                          )}
                          {!invitation.stores && invitation.region && (
                            <span>Region: {invitation.region}</span>
                          )}
                          <span>Sent {formatDate(invitation.created_at)}</span>
                          {invitation.status === 'pending' && (
                            <span>Expires {formatDate(invitation.expires_at)}</span>
                          )}
                          {invitation.status === 'accepted' && invitation.accepted_at && (
                            <span>Accepted {formatDate(invitation.accepted_at)}</span>
                          )}
                        </div>
                      </div>

                      {invitation.status === 'pending' && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyInviteLink(invitation)}
                          >
                            {copiedId === invitation.id ? (
                              <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 mr-1" />
                            )}
                            {copiedId === invitation.id ? 'Copied' : 'Copy Link'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteInvite(invitation.id)}
                            disabled={deletingId === invitation.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                          >
                            {deletingId === invitation.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                            )}
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </RoleGate>
  );
}
