import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  type Invitation,
  type TabFilter,
  buildInviteUrl,
} from '@/lib/admin/invitation-types';

export function useInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<Invitation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/invitations');
      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }

      const data = (await response.json()) as Invitation[];
      setInvitations(data);
    } catch {
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const stats = useMemo(
    () => ({
      total: invitations.length,
      pending: invitations.filter((invitation) => invitation.status === 'pending').length,
      accepted: invitations.filter((invitation) => invitation.status === 'accepted').length,
    }),
    [invitations]
  );

  const filteredInvitations = useMemo(() => {
    if (activeTab === 'all') return invitations;
    return invitations.filter((invitation) => invitation.status === activeTab);
  }, [activeTab, invitations]);

  const handleRevokeInvite = async (id: string) => {
    setDeletingId(id);

    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke invitation');
      }

      setInvitations((previousInvitations) =>
        previousInvitations.map((invitation) =>
          invitation.id === id
            ? { ...invitation, status: 'revoked' as const }
            : invitation
        )
      );
      toast.success('Invitation revoked');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke invitation');
    } finally {
      setDeletingId(null);
      setRevokeConfirm(null);
    }
  };

  const copyInviteLink = async (invitation: Invitation) => {
    const inviteUrl = buildInviteUrl(invitation.token);

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedId(invitation.id);
      toast.success('Link copied to clipboard');
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return {
    invitations: filteredInvitations,
    loading,
    stats,
    deletingId,
    revokeConfirm,
    copiedId,
    activeTab,
    setActiveTab,
    fetchInvitations,
    setRevokeConfirm,
    handleRevokeInvite,
    copyInviteLink,
  };
}
