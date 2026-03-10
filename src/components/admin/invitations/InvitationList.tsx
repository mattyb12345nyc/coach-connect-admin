import { type Invitation, type TabFilter, formatDate } from '@/lib/admin/invitation-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Mail, Copy, Loader2, Check, Clock, Shield, X, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function InvitationList({
  invitations,
  loading,
  activeTab,
  copiedId,
  deletingId,
  resendingId,
  onCopyLink,
  onResend,
  onRevokeClick,
}: {
  invitations: Invitation[];
  loading: boolean;
  activeTab: TabFilter;
  copiedId: string | null;
  deletingId: string | null;
  resendingId: string | null;
  onCopyLink: (invitation: Invitation) => void;
  onResend: (id: string) => void;
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
      <Card className="py-16 flex flex-col items-center justify-center text-center">
        <Mail className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">No invitations found</p>
        <p className="text-xs text-gray-400 mt-1">{activeTab !== 'all' ? 'Try a different filter' : 'Send your first invitation above'}</p>
      </Card>
    );
  }

  return (
    <>
      <p className="text-xs text-gray-400 mb-3">Showing {invitations.length} invitation{invitations.length !== 1 && 's'}</p>
      <div className="space-y-2">
        {invitations.map(invitation => (
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
                    invitation.role === 'admin' || invitation.role === 'regional_manager' ? 'bg-purple-50 text-purple-700'
                      : invitation.role === 'store_manager' ? 'bg-blue-50 text-blue-700'
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
                  {invitation.stores && <span>{invitation.stores.store_number} — {invitation.stores.store_name}</span>}
                  {!invitation.stores && invitation.region && <span>Region: {invitation.region}</span>}
                  <span>Sent {formatDate(invitation.created_at)}</span>
                  {invitation.status === 'pending' && <span>Expires {formatDate(invitation.expires_at)}</span>}
                  {invitation.status === 'accepted' && invitation.accepted_at && <span>Accepted {formatDate(invitation.accepted_at)}</span>}
                </div>
              </div>

              {invitation.status === 'pending' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => onCopyLink(invitation)}>
                    {copiedId === invitation.id ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copiedId === invitation.id ? 'Copied' : 'Copy Link'}
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => onResend(invitation.id)}
                    disabled={resendingId === invitation.id}
                  >
                    {resendingId === invitation.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                    Resend
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => onRevokeClick(invitation)}
                    disabled={deletingId === invitation.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                  >
                    {deletingId === invitation.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <X className="w-3.5 h-3.5 mr-1" />}
                    Revoke
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
