'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type StoreOption = {
  id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
};

type AddUserResponse = {
  success: true;
  user_id: string;
  email: string;
  temp_password: string | null;
};

type AddUserModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: StoreOption[];
  onCreated: (result: AddUserResponse) => void;
};

const ROLE_OPTIONS = [
  { value: 'associate', label: 'Associate' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'regional_manager', label: 'Regional Manager' },
  { value: 'admin', label: 'Admin' },
] as const;

function generateClientPassword(length = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);

  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < length; index += 1) {
      bytes[index] = Math.floor(Math.random() * alphabet.length);
    }
  }

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export function AddUserModal({
  open,
  onOpenChange,
  stores,
  onCreated,
}: AddUserModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('associate');
  const [storeId, setStoreId] = useState('');
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const requiresStore = role === 'associate' || role === 'store_manager';

  const submitLabel = useMemo(
    () => (sendInviteEmail ? 'Create & Send Invite' : 'Create User'),
    [sendInviteEmail]
  );

  useEffect(() => {
    if (!open) return;

    setEmail('');
    setFullName('');
    setRole('associate');
    setStoreId('');
    setSendInviteEmail(true);
    setTemporaryPassword(generateClientPassword());
    setIsSubmitting(false);
    setShowEmailPreview(false);
  }, [open]);

  useEffect(() => {
    if (!sendInviteEmail && !temporaryPassword) {
      setTemporaryPassword(generateClientPassword());
    }
  }, [sendInviteEmail, temporaryPassword]);

  const handleRefreshPassword = () => {
    setTemporaryPassword(generateClientPassword());
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return;
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (requiresStore && !storeId) {
      toast.error('Store is required for associate and store manager users');
      return;
    }

    if (!sendInviteEmail && !temporaryPassword.trim()) {
      toast.error('Temporary Password is required when invite email is turned off');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          full_name: fullName,
          role,
          store_id: requiresStore ? storeId : null,
          send_email: sendInviteEmail,
          temp_password: sendInviteEmail ? undefined : temporaryPassword,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as AddUserResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      if (sendInviteEmail) {
        toast.success(`Invite sent to ${data.email}`);
      } else {
        toast.success(`Credentials generated for ${data.email}`);
      }

      onCreated(data);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            Create a user instantly or send a branded invite email with a secure password setup link.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="add-user-email" weight="semibold" required>Email</Label>
              <Input
                id="add-user-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-user-full-name" weight="semibold" required>Full Name</Label>
              <Input
                id="add-user-full-name"
                type="text"
                placeholder="Jordan Smith"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="add-user-role" weight="semibold">Role</Label>
              <select
                id="add-user-role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-user-store" weight="semibold">
                Store
              </Label>
              <select
                id="add-user-store"
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">No store assigned</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.store_number} - {store.store_name} ({store.city}, {store.state})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                {requiresStore
                  ? 'Store is required for associate and store manager users.'
                  : 'Admins and regional managers can be created without a store assignment.'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="send-invite-email" weight="semibold">Send invite email</Label>
                <p className="text-sm text-gray-500">
                  Keep this on to email a secure password reset link. Turn it off to share credentials manually.
                </p>
              </div>
              <Switch
                id="send-invite-email"
                checked={sendInviteEmail}
                onCheckedChange={setSendInviteEmail}
              />
            </div>

            {sendInviteEmail && (
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmailPreview(!showEmailPreview)}
                >
                  {showEmailPreview ? <X className="h-3.5 w-3.5 mr-1.5" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
                  {showEmailPreview ? 'Hide Preview' : 'Preview Email'}
                </Button>
              </div>
            )}

            {sendInviteEmail && showEmailPreview && (
              <div className="mt-3 rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Email Preview
                </div>
                <div
                  className="pointer-events-none"
                  dangerouslySetInnerHTML={{
                    __html: `
                      <div style="background:#1C1917;padding:32px 16px;font-family:Georgia,serif;text-align:center;">
                        <img src="https://cdn.mcauto-images-production.sendgrid.net/d157e984273caff5/3acafde1-d902-4fab-9ed1-4e8afcbe35fd/225x225.png"
                             width="60" style="margin-bottom:16px;" />
                        <h1 style="color:#C9A227;font-size:22px;margin-bottom:6px;">Coach Pulse</h1>
                        <p style="color:#F5F0EB;font-size:14px;margin-bottom:24px;">
                          Hi ${fullName.trim() || 'there'},<br/>You've been invited to join the Coach Pulse platform.
                        </p>
                        <span style="display:inline-block;background:#C9A227;color:#1C1917;padding:12px 32px;
                                     font-size:12px;font-weight:700;text-decoration:none;letter-spacing:1px;
                                     text-transform:uppercase;">
                          Set Your Password
                        </span>
                        <p style="color:#8B7355;font-size:11px;margin-top:24px;">
                          This link expires in 24 hours.
                        </p>
                      </div>
                    `,
                  }}
                />
              </div>
            )}

            {!sendInviteEmail && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="temporary-password" weight="semibold" required>
                  Temporary Password
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="temporary-password"
                    type="text"
                    value={temporaryPassword}
                    onChange={(event) => setTemporaryPassword(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRefreshPassword}
                    aria-label="Generate a new temporary password"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-coach-gold hover:bg-coach-gold/90 text-white" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
