'use client';

import Link from 'next/link';
import { Clock, History, Mail, Users } from 'lucide-react';
import { RoleGate } from '@/components/admin/RoleGate';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { InvitationList } from '@/components/admin/invitations/InvitationList';
import { useInvitations } from '@/hooks/admin/useInvitations';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function InvitationsPage() {
  const hook = useInvitations();

  return (
    <RoleGate minRole="manager">
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2.5">
                <History className="h-6 w-6 text-coach-mahogany" />
                <h1 className="text-2xl font-bold tracking-tight text-coach-black">Legacy Invitations</h1>
              </div>
              <p className="text-sm text-gray-500">
                Review old invite records, copy legacy links, and revoke pending invites when necessary.
              </p>
            </div>

            <Button asChild className="bg-coach-gold text-white hover:bg-coach-gold/90">
              <Link href="/admin/users">
                <Users className="mr-1.5 h-4 w-4" />
                Go To Users
              </Link>
            </Button>
          </div>

          <Card className="mb-6 border-amber-200 bg-amber-50/70 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Legacy Flow</p>
                <h2 className="mt-1 text-lg font-semibold text-coach-black">New invites now live on the Users page</h2>
                <p className="mt-2 text-sm text-gray-600">
                  The old invitation creation flow has been retired. Use{' '}
                  <Link href="/admin/users" className="font-medium text-coach-mahogany underline underline-offset-4">
                    /admin/users
                  </Link>{' '}
                  to create users or send new branded invite emails. This page remains available for revoke-only handling of older pending records.
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white/80 px-4 py-3 text-sm text-amber-800">
                Pending legacy records can still be revoked from the list below.
              </div>
            </div>
          </Card>

          <div className="mb-6 grid grid-cols-3 gap-4">
            <Card className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-coach-gold/10">
                <Mail className="h-5 w-5 text-coach-gold" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-coach-black">{hook.stats.total}</p>
                <p className="text-xs text-gray-500">Total Invitations</p>
              </div>
            </Card>

            <Card className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-coach-black">{hook.stats.pending}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </Card>

            <Card className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <History className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-coach-black">{hook.stats.accepted}</p>
                <p className="text-xs text-gray-500">Accepted</p>
              </div>
            </Card>
          </div>

          <Card className="mb-4 p-3">
            <div className="flex w-fit overflow-hidden rounded-lg border border-gray-200">
              {(['all', 'pending', 'accepted', 'expired', 'revoked'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => hook.setActiveTab(tab)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-colors',
                    hook.activeTab === tab
                      ? 'bg-coach-gold text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
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
            onCopyLink={hook.copyInviteLink}
            onRevokeClick={hook.setRevokeConfirm}
          />
        </div>
      </div>

      {hook.revokeConfirm ? (
        <ConfirmDialog
          isOpen={true}
          title="Revoke Invitation"
          description={`Are you sure you want to revoke this invite for ${hook.revokeConfirm.email}? They will no longer be able to use this link.`}
          confirmLabel="Revoke"
          onConfirm={() => hook.handleRevokeInvite(hook.revokeConfirm!.id)}
          onCancel={() => hook.setRevokeConfirm(null)}
          loading={hook.deletingId === hook.revokeConfirm.id}
        />
      ) : null}
    </RoleGate>
  );
}
