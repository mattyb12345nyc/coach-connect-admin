'use client';

import { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
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

type CredentialsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  password: string;
};

export function CredentialsModal({
  open,
  onOpenChange,
  email,
  password,
}: CredentialsModalProps) {
  const [copied, setCopied] = useState(false);

  const credentialBlock = useMemo(
    () => `Email: ${email}\nTemporary Password: ${password}`,
    [email, password]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(credentialBlock);
      setCopied(true);
      toast.success('Credentials copied to clipboard');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Failed to copy credentials');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>User Created</DialogTitle>
          <DialogDescription>
            No invite email was sent. Share these credentials directly with the new user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Email</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Temporary Password</p>
            <p className="mt-1 break-all rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-sm text-gray-900">
              {password}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" className="bg-coach-gold hover:bg-coach-gold/90 text-white" onClick={handleCopy}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            Copy Credentials
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
