'use client';

import { useState } from 'react';
import { Loader2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type UserActionsMenuProps<TUser> = {
  user: {
    id: string;
    email: string | null;
    display_name: string;
    status: string;
  };
  onUserUpdated: (updatedUser: TUser) => void;
};

export function UserActionsMenu<TUser>({
  user,
  onUserUpdated,
}: UserActionsMenuProps<TUser>) {
  const [action, setAction] = useState<'reset' | 'deactivate' | 'reactivate' | null>(null);

  const isBusy = action !== null;

  const handleResetPassword = async () => {
    setAction('reset');

    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; email?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset email');
      }

      toast.success(`Password reset email sent to ${data.email || user.email || 'the user'}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send password reset email');
    } finally {
      setAction(null);
    }
  };

  const handleStatusChange = async (nextStatus: 'active' | 'suspended') => {
    setAction(nextStatus === 'active' ? 'reactivate' : 'deactivate');

    try {
      const response = await fetch('/api/admin/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          status: nextStatus,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as TUser & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user status');
      }

      onUserUpdated(data);
      toast.success(nextStatus === 'active' ? 'User reactivated' : 'User deactivated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user status');
    } finally {
      setAction(null);
    }
  };

  const handleDeactivate = async () => {
    const confirmed = window.confirm(`Deactivate ${user.display_name || user.email || 'this user'}?`);
    if (!confirmed) return;
    await handleStatusChange('suspended');
  };

  const handleReactivate = async () => {
    await handleStatusChange('active');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Open actions for ${user.display_name || user.email || 'user'}`}
          disabled={isBusy}
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem disabled={isBusy || !user.email} onClick={handleResetPassword}>
          Reset Password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.status === 'active' ? (
          <DropdownMenuItem disabled={isBusy} onClick={handleDeactivate}>
            Deactivate
          </DropdownMenuItem>
        ) : null}
        {user.status === 'suspended' || user.status === 'deactivated' ? (
          <DropdownMenuItem disabled={isBusy} onClick={handleReactivate}>
            Reactivate
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
