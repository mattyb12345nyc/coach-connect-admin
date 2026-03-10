import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  Invitation,
  StoreOption,
  TabFilter,
  buildInviteUrl,
} from '@/lib/admin/invitation-types';

export function useInvitations() {
  const { user, role, storeId, isAdmin } = useAdminAuth();
  const searchParams = useSearchParams();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<Invitation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [inviteRole, setInviteRole] = useState('associate');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');

  const [successResult, setSuccessResult] = useState<{ invite_url: string; email_sent: boolean } | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);

  // ─── Data fetching ───

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/invitations');
      if (!res.ok) throw new Error('Failed to fetch invitations');
      setInvitations(await res.json());
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
      setStores(await res.json());
    } catch {
      toast.error('Failed to load stores');
    }
  }, []);

  // ─── Effects ───

  useEffect(() => { fetchInvitations(); fetchStores(); }, [fetchInvitations, fetchStores]);

  useEffect(() => {
    const prefillStoreId = searchParams.get('prefill_store_id');
    if (prefillStoreId) setSelectedStoreId(prefillStoreId);
  }, [searchParams]);

  useEffect(() => {
    if (!isAdmin && storeId) setSelectedStoreId(storeId);
  }, [isAdmin, storeId]);

  useEffect(() => {
    if (inviteRole === 'admin') { setSelectedStoreId(''); setSelectedRegion(''); return; }
    if (inviteRole === 'regional_manager') { setSelectedStoreId(''); return; }
    setSelectedRegion('');
  }, [inviteRole]);

  // ─── Memos ───

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
    for (const s of stores) if (s.region) unique.add(s.region);
    return Array.from(unique).sort();
  }, [stores]);

  // ─── Handlers ───

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiresStore = inviteRole === 'associate' || inviteRole === 'store_manager';
    const requiresRegion = inviteRole === 'regional_manager';
    if (!email) { toast.error('Please fill in email'); return; }
    if (requiresStore && !selectedStoreId) { toast.error('Please select a store'); return; }
    if (requiresRegion && !selectedRegion) { toast.error('Please select a region'); return; }

    setSending(true);
    setSuccessResult(null);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, first_name: firstName || undefined, last_name: lastName || undefined,
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
      setSuccessResult({ invite_url: data.invite_url, email_sent: data.email_sent });
      setEmail(''); setFirstName(''); setLastName(''); setSelectedStoreId(''); setSelectedRegion('');
      fetchInvitations();
      toast.success('Invitation sent');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? 'Failed to revoke invitation');
      }
      setInvitations(prev => prev.map(invitation => (
        invitation.id === id
          ? { ...invitation, status: 'revoked' as const }
          : invitation
      )));
      toast.success('Invitation revoked');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke invitation');
    } finally {
      setDeletingId(null);
      setRevokeConfirm(null);
    }
  };

  const handleResendInvite = async (id: string) => {
    setResendingId(id);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? 'Failed to resend invitation');
      }
      fetchInvitations();
      toast.success(data.email_sent ? 'Invitation resent' : 'New link generated (email delivery unavailable)');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const copyInviteLink = async (invitation: Invitation) => {
    const url = buildInviteUrl(invitation.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(invitation.id);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // ─── Computed ───

  const previewStore = stores.find(s => s.id === selectedStoreId);
  const previewStoreName = previewStore
    ? `${previewStore.store_name} (${previewStore.city}, ${previewStore.state})`
    : selectedRegion ? `Region: ${selectedRegion}` : '';

  return {
    // Auth
    user, role, storeId, isAdmin,
    // Data
    invitations: filtered, stores, loading, stats, regionOptions,
    // Form state
    email, setEmail, firstName, setFirstName, lastName, setLastName,
    inviteRole, setInviteRole, selectedStoreId, setSelectedStoreId,
    selectedRegion, setSelectedRegion,
    // Actions
    sending, handleSend,
    deletingId, handleRevokeInvite,
    resendingId, handleResendInvite,
    copiedId, copyInviteLink,
    // Modals
    revokeConfirm, setRevokeConfirm,
    bulkModalOpen, setBulkModalOpen,
    emailPreviewOpen, setEmailPreviewOpen,
    successResult, setSuccessResult,
    // Tabs
    activeTab, setActiveTab,
    // Preview
    previewStoreName,
    // Refetch
    fetchInvitations,
  };
}
