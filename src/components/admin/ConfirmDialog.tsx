'use client';

import { AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  isDangerous = true,
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
            isDangerous ? 'bg-red-50' : 'bg-amber-50'
          )}>
            <AlertCircle className={cn('h-5 w-5', isDangerous ? 'text-red-600' : 'text-amber-600')} />
          </div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">{description}</p>
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              isDangerous
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-coach-gold hover:bg-coach-gold/90 text-white'
            )}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
