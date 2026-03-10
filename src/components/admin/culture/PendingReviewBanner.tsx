'use client';

import { Sparkles, ChevronRight } from 'lucide-react';

export function PendingReviewBanner({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 flex items-center gap-4 hover:shadow-md transition-all group"
    >
      <div className="w-11 h-11 rounded-xl bg-coach-gold/20 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-5 h-5 text-coach-gold" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-gray-900">{count} generated trend{count !== 1 ? 's' : ''} ready to review</p>
        <p className="text-xs text-gray-500">Review AI-generated candidates separately from submitted pulse cards</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-coach-gold transition-colors" />
    </button>
  );
}
