'use client';

import { Suspense } from 'react';
import {
  Mail, Plus, Loader2, Check, Clock, UserPlus, Shield, X,
  Users, AlertCircle, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/components/admin/RoleGate';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useInvitations } from '@/hooks/admin/useInvitations';
import { ROLE_OPTIONS } from '@/lib/admin/invitation-types';

import { EmailPreviewModal } from '@/components/admin/invitations/EmailPreviewModal';
import { BulkInviteModal } from '@/components/admin/invitations/BulkInviteModal';
import { InvitationList } from '@/components/admin/invitations/InvitationList';

function InvitationsPageInner() {
  const hook = useInvitations();

  return (
    <RoleGate minRole="manager">
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          {/* Page header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Mail className="h-6 w-6 text-coach-mahogany" />
                <h1 className="text-2xl font-bold text-coach-black tracking-tight">Invitations</h1>
              </div>
              <p className="text-sm text-gray-500">Invite team members to Coach Pulse</p>
            </div>
            <Button onClick={() => hook.setBulkModalOpen(true)} variant="outline" className="flex-shrink-0">
              <Users className="w-4 h-4 mr-1.5" /> Bulk Invite
            </Button>
          </div>

          {/* Single invite form */}
          <Card className="p-6 mb-6">
            <form onSubmit={hook.handleSend}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-coach-gold" />
                  <h2 className="text-base font-semibold text-coach-black">Send Invitation</h2>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => hook.setEmailPreviewOpen(true)} className="text-gray-500 hover:text-gray-700 text-xs">
                  <Mail className="w-3.5 h-3.5 mr-1" /> Preview Email
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label size="xs" weight="semibold">Email *</Label>
                  <Input type="email" placeholder="user@example.com" value={hook.email} onChange={e => hook.setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label size="xs" weight="semibold">First Name</Label>
                  <Input type="text" placeholder="First name" value={hook.firstName} onChange={e => hook.setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label size="xs" weight="semibold">Last Name</Label>
                  <Input type="text" placeholder="Last name" value={hook.lastName} onChange={e => hook.setLastName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label size="xs" weight="semibold">Role</Label>
                  <select value={hook.inviteRole} onChange={e => hook.setInviteRole(e.target.value)} className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold">
                    {ROLE_OPTIONS.filter(r => hook.isAdmin || r.value === 'associate').map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {hook.inviteRole === 'regional_manager' && (
                  <div className="space-y-1.5">
                    <Label size="xs" weight="semibold">Region *</Label>
                    <select value={hook.selectedRegion} onChange={e => hook.setSelectedRegion(e.target.value)} className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold">
                      <option value="">Select a region</option>
                      {hook.regionOptions.map(region => (<option key={region} value={region}>{region}</option>))}
                    </select>
                  </div>
                )}
                {(hook.inviteRole === 'associate' || hook.inviteRole === 'store_manager') && (
                  <div className="space-y-1.5">
                    <Label size="xs" weight="semibold">Store *</Label>
                    <select value={hook.selectedStoreId} onChange={e => hook.setSelectedStoreId(e.target.value)} disabled={!hook.isAdmin && !!hook.storeId} className={cn('w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold', !hook.isAdmin && hook.storeId && 'opacity-60 cursor-not-allowed')}>
                      <option value="">Select an open store</option>
                      {hook.stores.map(s => (<option key={s.id} value={s.id}>{s.store_number} — {s.store_name} ({s.city}, {s.state})</option>))}
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button type="submit" disabled={hook.sending} className="bg-coach-gold hover:bg-coach-gold/90 text-white">
                  {hook.sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Send Invitation
                </Button>
              </div>
            </form>
            {hook.successResult && (
              <div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-emerald-800">Invitation created{hook.successResult.email_sent ? ' and email sent' : ''}</p>
                      <code className="text-xs bg-white/80 border border-emerald-200 rounded px-2 py-1 text-emerald-700 truncate block max-w-md mt-2">{hook.successResult.invite_url}</code>
                      {!hook.successResult.email_sent && (<p className="text-xs text-amber-700 mt-1.5">Email delivery is not configured — share the link manually.</p>)}
                    </div>
                  </div>
                  <button onClick={() => hook.setSuccessResult(null)} className="text-emerald-400 hover:text-emerald-600 flex-shrink-0"><X className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-coach-gold/10 flex items-center justify-center"><Mail className="h-5 w-5 text-coach-gold" /></div>
              <div><p className="text-2xl font-semibold text-coach-black">{hook.stats.total}</p><p className="text-xs text-gray-500">Total Invitations</p></div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center"><Clock className="h-5 w-5 text-amber-600" /></div>
              <div><p className="text-2xl font-semibold text-coach-black">{hook.stats.pending}</p><p className="text-xs text-gray-500">Pending</p></div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center"><Check className="h-5 w-5 text-emerald-600" /></div>
              <div><p className="text-2xl font-semibold text-coach-black">{hook.stats.accepted}</p><p className="text-xs text-gray-500">Accepted</p></div>
            </Card>
          </div>

          {/* Tabs */}
          <Card className="p-3 mb-4">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
              {(['all', 'pending', 'accepted', 'expired', 'revoked'] as const).map(tab => (
                <button key={tab} onClick={() => hook.setActiveTab(tab)} className={cn('px-4 py-2 text-sm font-medium transition-colors', hook.activeTab === tab ? 'bg-coach-gold text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </Card>

          <InvitationList
            invitations={hook.invitations}
            loading={hook.loading}
            activeTab={hook.activeTab}
            copiedId={hook.copiedId}
            deletingId={hook.deletingId}
            resendingId={hook.resendingId}
            onCopyLink={hook.copyInviteLink}
            onResend={hook.handleResendInvite}
            onRevokeClick={hook.setRevokeConfirm}
          />
        </div>
      </div>

      {hook.bulkModalOpen && (
        <BulkInviteModal
          stores={hook.stores}
          invitedBy={hook.user?.id ?? hook.user?.email ?? 'admin'}
          onClose={() => hook.setBulkModalOpen(false)}
          onComplete={hook.fetchInvitations}
        />
      )}

      {hook.emailPreviewOpen && (
        <EmailPreviewModal
          recipientEmail={hook.email}
          firstName={hook.firstName}
          storeName={hook.previewStoreName}
          role={hook.inviteRole}
          onClose={() => hook.setEmailPreviewOpen(false)}
        />
      )}

      {hook.revokeConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Revoke Invitation"
          description={`Are you sure you want to revoke this invite for ${hook.revokeConfirm.email}? They will no longer be able to use this link.`}
          confirmLabel="Revoke"
          onConfirm={() => hook.handleRevokeInvite(hook.revokeConfirm!.id)}
          onCancel={() => hook.setRevokeConfirm(null)}
          loading={hook.deletingId === hook.revokeConfirm.id}
        />
      )}
    </RoleGate>
  );
}

export default function InvitationsPage() {
  return (
    <Suspense fallback={null}>
      <InvitationsPageInner />
    </Suspense>
  );
}
