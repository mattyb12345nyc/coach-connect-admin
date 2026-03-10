'use client';

import { Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  CultureItem,
  TYPE_CONFIG,
  getFeedStatusLabel,
  getFeedStatusClasses,
  formatTimestamp,
} from '@/lib/admin/culture-types';

export function FeedPendingReviewSection({
  items,
  processingId,
  errors,
  onApprove,
  onReject,
}: {
  items: CultureItem[];
  processingId: string | null;
  errors: Record<string, string>;
  onApprove: (item: CultureItem) => Promise<void>;
  onReject: (item: CultureItem) => Promise<void>;
}) {
  if (items.length === 0) return null;

  return (
    <Card className="p-5 mb-6 border-amber-200/70 bg-amber-50/40">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Pending Review</h2>
          <p className="text-sm text-gray-500">
            {items.length} pulse {items.length === 1 ? 'card is' : 'cards are'} waiting for approval
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
          Oldest first
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const isProcessing = processingId === item.id;
          const submittedBy = item.submitted_by_name || 'Unknown submitter';

          return (
            <div key={item.id} className="rounded-xl border border-amber-200/70 bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TYPE_CONFIG[item.type].bg, TYPE_CONFIG[item.type].text)}>
                      {TYPE_CONFIG[item.type].label}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getFeedStatusClasses(item.status))}>
                      {getFeedStatusLabel(item.status)}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                  {item.description && (
                    <p className="mt-1 text-sm text-gray-600 leading-relaxed">{item.description}</p>
                  )}
                  <div className="mt-3 grid gap-1 text-xs text-gray-500 sm:grid-cols-2">
                    <span>Submitted by: {submittedBy}</span>
                    <span>Submitted at: {formatTimestamp(item.submitted_at)}</span>
                  </div>
                  {errors[item.id] && (
                    <div className="mt-3 inline-flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{errors[item.id]}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 lg:pl-4">
                  <Button
                    size="sm"
                    onClick={() => onApprove(item)}
                    disabled={isProcessing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isProcessing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReject(item)}
                    disabled={isProcessing}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
