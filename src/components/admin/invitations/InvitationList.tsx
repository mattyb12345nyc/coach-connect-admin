import { type Invitation, type TabFilter, formatDate } from '@/lib/admin/invitation-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Copy, Loader2, Mail, Shield, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function InvitationList({
  invitations,
  loading,
  activeTab,
  copiedId,
  deletingId,
  onCopyLink,
  onRevokeClick,
}: {
  invitations: Invitation[];
  loading: boolean;
  activeTab: TabFilter;
  copiedId: string | null;
  deletingId: string | null;
  onCopyLink: (invitation: Invitation) => void;
  onRevokeClick: (invitation: Invitation) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-coach-gold" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <Mail className="mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">No invitations found</p>
        <p className="mt-1 text-xs text-gray-400">
          {activeTab !== 'all' ? 'Try a different filter.' : 'New invites are now created from the Users page.'}
        </p>
      </Card>
    );
  }

  return (
    <>
      <p className="mb-3 text-xs text-gray-400">
        Showing {invitations.length} invitation{invitations.length !== 1 ? 's' : ''}
      </p>
      <div className="space-y-2">
        {invitations.map((invitation) => (
          <Card key={invitation.id} className="p-4">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="truncate text-sm font-semibold text-coach-black">
                    {invitation.first_name || invitation.last_name
                      ? `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim()
                      : invitation.email}
                  </p>
                  {(invitation.first_name || invitation.last_name) ? (
                    <span className="truncate text-xs text-gray-400">{invitation.email}</span>
                  ) : null}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium',
                      invitation.role === 'admin' || invitation.role === 'regional_manager'
                        ? 'bg-purple-50 text-purple-700'
                        : invitation.role === 'store_manager'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {invitation.role === 'store_manager' || invitation.role === 'admin' || invitation.role === 'regional_manager' ? (
                      <Shield className="h-3 w-3" />
                    ) : null}
                    {invitation.role.replace('_', ' ')}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                      invitation.status === 'pending' && 'bg-amber-50 text-amber-700',
                      invitation.status === 'accepted' && 'bg-emerald-50 text-emerald-700',
                      (invitation.status === 'expired' || invitation.status === 'revoked') && 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {invitation.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                  {invitation.stores ? (
                    <span>
                      {invitation.stores.store_number} - {invitation.stores.store_name}
                    </span>
                  ) : null}
                  {!invitation.stores && invitation.region ? <span>Region: {invitation.region}</span> : null}
                  <span>Sent {formatDate(invitation.created_at)}</span>
                  {invitation.status === 'pending' ? <span>Expires {formatDate(invitation.expires_at)}</span> : null}
                  {invitation.status === 'accepted' && invitation.accepted_at ? (
                    <span>Accepted {formatDate(invitation.accepted_at)}</span>
                  ) : null}
                </div>
              </div>

              {invitation.status === 'pending' ? (
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => onCopyLink(invitation)}>
                    {copiedId === invitation.id ? (
                      <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="mr-1 h-3.5 w-3.5" />
                    )}
                    {copiedId === invitation.id ? 'Copied' : 'Copy Link'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRevokeClick(invitation)}
                    disabled={deletingId === invitation.id}
                    className="text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    {deletingId === invitation.id ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="mr-1 h-3.5 w-3.5" />
                    )}
                    Revoke
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
