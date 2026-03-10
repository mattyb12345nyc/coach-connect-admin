'use client';

import { Eye, EyeOff, Clock, Image, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PublishToggle } from './PublishToggle';
import {
  CultureItem,
  TYPE_CONFIG,
  isScheduled,
  getFeedStatusLabel,
  getFeedStatusClasses,
  formatTimestamp,
  buildFeedImageSrc,
} from '@/lib/admin/culture-types';

export function ContentCard({
  item,
  onEdit,
  onDelete,
  onTogglePublish,
  deleting,
  toggling,
}: {
  item: CultureItem;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  deleting: boolean;
  toggling: boolean;
}) {
  const typeConfig = TYPE_CONFIG[item.type];
  const imageSrc = item.image_url ? buildFeedImageSrc(item.id) : null;
  return (
    <Card className="overflow-hidden group transition-all hover:shadow-md">
      <div
        className="relative h-44 bg-gray-100 flex items-center justify-center"
        style={imageSrc ? { backgroundImage: `url(${imageSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {!imageSrc && <Image className="h-10 w-10 text-gray-300" />}
        {imageSrc && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', typeConfig.bg, typeConfig.text)}>{typeConfig.label}</span>
          {item.category && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/90 text-gray-700">{item.category}</span>}
        </div>
        <div className="absolute top-3 right-3">
          {isScheduled(item) ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-600/90 text-white">
              <Clock className="h-3 w-3" />
              Scheduled
            </span>
          ) : item.is_published ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/90 text-white">
              <Eye className="h-3 w-3" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700/80 text-gray-200">
              <EyeOff className="h-3 w-3" />
              Draft
            </span>
          )}
        </div>
        {imageSrc && item.title && (
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2 drop-shadow-sm">{item.title}</h3>
          </div>
        )}
      </div>
      <div className="p-4">
        {!imageSrc && <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 mb-1">{item.title}</h3>}
        {item.description && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{item.description}</p>}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getFeedStatusClasses(item.status))}>
            {getFeedStatusLabel(item.status)}
          </span>
          {item.submitted_at && (
            <span className="text-xs text-gray-400">
              Submitted {formatTimestamp(item.submitted_at)}
            </span>
          )}
        </div>
        {item.engagement_text && <p className="text-xs font-medium text-coach-mahogany mb-3">{item.engagement_text}</p>}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {toggling ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : <PublishToggle published={item.is_published} onChange={onTogglePublish} />}
            <span className="text-xs text-gray-400">
              {isScheduled(item) ? (
                <span className="text-violet-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(item.publish_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              ) : item.is_published ? `Published ${item.published_at ? formatTimestamp(item.published_at) : ''}`.trim() : 'Draft'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={onEdit} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon-sm" onClick={onDelete} disabled={deleting} title="Delete" className="hover:text-red-600">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-red-500" />}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
