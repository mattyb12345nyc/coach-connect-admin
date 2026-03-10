'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Save,
  Loader2,
  Pencil,
  X,
  Eye,
  EyeOff,
  TrendingUp,
  Palette,
  Newspaper,
  Image,
  Globe,
  MapPin,
  Store as StoreIcon,
  ChevronRight,
  ChevronLeft,
  Check,
  ImagePlus,
  Ban,
  Search,
  ZoomIn,
  Clock,
  CalendarClock,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getSupabase } from '@/lib/supabase';
import { RoleGate } from '@/components/admin/RoleGate';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

// ─── Types ───

type CultureType = 'trend' | 'styling' | 'news';
type FilterTab = 'all' | CultureType | 'scheduled';
type FeedStatus = 'pending_review' | 'active' | 'rejected' | null;
type FeedStatusFilter = 'all' | 'active' | 'pending_review' | 'rejected' | 'legacy';

interface CultureItem {
  id: string;
  type: CultureType;
  category: string;
  title: string;
  description: string;
  image_url: string;
  engagement_text: string;
  is_published: boolean;
  status: FeedStatus;
  submitted_by?: string | null;
  submitted_by_name?: string | null;
  submitted_at: string | null;
  published_at: string | null;
  publish_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  scope_type?: 'global' | 'region' | 'store';
  store_id?: string | null;
  store_region?: string | null;
}

type ImageStatus = 'none' | 'pending' | 'processing' | 'completed' | 'failed';

interface TrendCandidate {
  id: string;
  type: CultureType;
  category: string;
  title: string;
  description: string;
  image_url: string | null;
  engagement_text: string | null;
  scope_type: 'global' | 'region' | 'store';
  store_id: string | null;
  store_region?: string | null;
  status: 'generated' | 'approved' | 'rejected';
  created_at: string;
  image_prompt?: string | null;
  image_status?: ImageStatus;
  image_error?: string | null;
}

interface StoreSummary {
  id: string;
  store_number: string;
  store_name: string;
  region: string;
}

type CultureFormData = Omit<CultureItem, 'id' | 'status' | 'submitted_by' | 'submitted_by_name' | 'submitted_at' | 'published_at' | 'created_at' | 'updated_at'> & {
  id?: string;
};

// ─── Constants ───

const EMPTY_FORM: CultureFormData = {
  type: 'trend',
  category: '',
  title: '',
  description: '',
  image_url: '',
  engagement_text: '',
  is_published: false,
  publish_date: null,
  sort_order: 0,
};

const FILTER_TABS: { value: FilterTab; label: string; icon: typeof TrendingUp }[] = [
  { value: 'all', label: 'All', icon: Sparkles },
  { value: 'trend', label: 'Trends', icon: TrendingUp },
  { value: 'styling', label: 'Styling Tips', icon: Palette },
  { value: 'news', label: 'News', icon: Newspaper },
  { value: 'scheduled', label: 'Scheduled', icon: CalendarClock },
];

const FEED_STATUS_FILTERS: { value: FeedStatusFilter; label: string }[] = [
  { value: 'all', label: 'Published (Active + Legacy)' },
  { value: 'active', label: 'Active' },
  { value: 'legacy', label: 'Legacy (No Status)' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'rejected', label: 'Rejected' },
];

// ─── Scheduling helpers ───

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isScheduled(item: CultureItem): boolean {
  return !!item.publish_date && new Date(item.publish_date) > new Date();
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getFeedStatusLabel(status: FeedStatus): string {
  switch (status) {
    case 'pending_review':
      return 'Pending Review';
    case 'active':
      return 'Active';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Legacy';
  }
}

function getFeedStatusClasses(status: FeedStatus): string {
  switch (status) {
    case 'pending_review':
      return 'bg-amber-50 text-amber-700';
    case 'active':
      return 'bg-emerald-50 text-emerald-700';
    case 'rejected':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

const TYPE_CONFIG: Record<CultureType, { label: string; bg: string; text: string; border: string; description: string; icon: typeof TrendingUp }> = {
  trend: { label: 'Trend', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', description: 'What is hot in fashion and culture', icon: TrendingUp },
  styling: { label: 'Styling Tip', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', description: 'How to wear and style Coach', icon: Palette },
  news: { label: 'News', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', description: 'Brand updates and announcements', icon: Newspaper },
};

const TYPE_SELECT_OPTIONS: { value: CultureType; label: string }[] = [
  { value: 'trend', label: 'Trend' },
  { value: 'styling', label: 'Styling Tip' },
  { value: 'news', label: 'News' },
];

const TOPIC_SUGGESTIONS = [
  'Handbag Styling',
  'Runway Trends',
  'Street Style',
  'Seasonal Looks',
  'Accessories',
  'Footwear',
  'Celebrity Style',
  'Color Trends',
];

const SEASON_OPTIONS = [
  { value: 'current season', label: 'Current Season' },
  { value: 'spring/summer', label: 'Spring / Summer' },
  { value: 'fall/winter', label: 'Fall / Winter' },
  { value: 'resort', label: 'Resort' },
  { value: 'pre-fall', label: 'Pre-Fall' },
];

const MARKET_OPTIONS = [
  { value: 'US', label: 'US' },
  { value: 'Global', label: 'Global' },
];

function buildCandidateImageSrc(candidateId: string): string {
  return `/api/admin/culture/trends/images/file/${candidateId}?entity=candidate`;
}

function buildFeedImageSrc(feedItemId: string): string {
  return `/api/admin/culture/trends/images/file/${feedItemId}?entity=feed`;
}

// ─── Shared Small Components ───

function PublishToggle({
  published,
  onChange,
  disabled,
}: {
  published: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={published}
      disabled={disabled}
      onClick={() => onChange(!published)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        published ? 'bg-coach-gold' : 'bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
          published ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

// ─── CultureForm (for manual add/edit) ───

function CultureForm({
  data,
  onChange,
  onSave,
  onCancel,
  saving,
  adminHeaders = {},
}: {
  data: CultureFormData;
  onChange: (d: CultureFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  adminHeaders?: Record<string, string>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a JPEG, PNG, or WebP image.');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/culture/upload-image', {
        method: 'POST',
        headers: adminHeaders,
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      onChange({ ...data, image_url: json.url });
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const imagePreviewSrc =
    data.image_url &&
    (data.image_url.startsWith('data:') || data.image_url.startsWith('http'))
      ? data.image_url
      : null;

  return (
    <Card className="p-5 border-coach-gold/30 bg-amber-50/30">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <select
            value={data.type}
            onChange={(e) => onChange({ ...data, type: e.target.value as CultureType })}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
          >
            {TYPE_SELECT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Input value={data.category} onChange={(e) => onChange({ ...data, category: e.target.value })} placeholder="e.g. Street Style, Runway" />
        </div>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={data.title} onChange={(e) => onChange({ ...data, title: e.target.value })} placeholder="Content title" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Image</Label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading || saving}
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <ImagePlus className="w-4 h-4 mr-1.5" />}
                {uploading ? 'Uploading…' : 'Upload image'}
              </Button>
              <span className="text-xs text-gray-500">JPEG, PNG or WebP, max 10MB</span>
            </div>
            {imagePreviewSrc && (
              <div className="h-20 w-28 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden shrink-0">
                <img src={imagePreviewSrc} alt="" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
          <Input
            value={data.image_url}
            onChange={(e) => onChange({ ...data, image_url: e.target.value })}
            placeholder="Or paste image URL"
            className="mt-1"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Description</Label>
          <textarea
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder="Content description"
            rows={3}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Engagement Text</Label>
          <Input value={data.engagement_text} onChange={(e) => onChange({ ...data, engagement_text: e.target.value })} placeholder="e.g. 2.4K views" />
        </div>
        <div className="space-y-1.5">
          <Label>Sort Order</Label>
          <Input type="number" value={data.sort_order} onChange={(e) => onChange({ ...data, sort_order: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5 text-violet-500" />
            Publish Date
            <span className="text-xs font-normal text-gray-400">(optional — leave blank to publish immediately)</span>
          </Label>
          <input
            type="datetime-local"
            value={toDatetimeLocal(data.publish_date)}
            onChange={(e) => {
              const val = e.target.value;
              onChange({ ...data, publish_date: val ? new Date(val).toISOString() : null });
            }}
            className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
          />
          {data.publish_date && new Date(data.publish_date) > new Date() && (
            <p className="text-xs text-violet-600 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              Will appear as <strong>Scheduled</strong> — hidden from associates until this date
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Label>Published</Label>
          <PublishToggle published={data.is_published} onChange={(v) => onChange({ ...data, is_published: v })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          {data.id ? 'Update' : 'Create'}
        </Button>
      </div>
    </Card>
  );
}

// ─── ContentCard (published items grid) ───

function ContentCard({
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

// ─── Wizard Sub-Components ───

function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-0 w-full max-w-md mx-auto">
      {labels.map((label, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isComplete = step < current;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                  isActive && 'bg-coach-gold text-white shadow-lg shadow-coach-gold/25 scale-110',
                  isComplete && 'bg-emerald-500 text-white',
                  !isActive && !isComplete && 'bg-gray-100 text-gray-400 border border-gray-200'
                )}
              >
                {isComplete ? <Check className="w-4 h-4" /> : step}
              </div>
              <span className={cn('text-[11px] font-medium whitespace-nowrap', isActive ? 'text-gray-900' : 'text-gray-400')}>
                {label}
              </span>
            </div>
            {step < total && (
              <div className={cn('h-0.5 flex-1 mx-3 rounded-full transition-colors duration-300 -mt-5', isComplete ? 'bg-emerald-500' : 'bg-gray-200')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TopicChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border',
        selected
          ? 'bg-coach-gold text-white border-coach-gold shadow-md shadow-coach-gold/20'
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      {label}
    </button>
  );
}

function ContentTypeCard({
  type,
  selected,
  onClick,
}: {
  type: CultureType;
  selected: boolean;
  onClick: () => void;
}) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all duration-200 text-center',
        selected
          ? 'border-coach-gold bg-amber-50/60 shadow-md shadow-coach-gold/10'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      )}
    >
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', selected ? 'bg-coach-gold/20' : 'bg-gray-100')}>
        <Icon className={cn('w-6 h-6', selected ? 'text-coach-gold' : 'text-gray-400')} />
      </div>
      <div>
        <p className={cn('text-sm font-semibold', selected ? 'text-gray-900' : 'text-gray-600')}>{config.label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{config.description}</p>
      </div>
    </button>
  );
}

function ScopeCard({
  scope,
  label,
  description,
  icon: Icon,
  selected,
  onClick,
}: {
  scope: string;
  label: string;
  description: string;
  icon: typeof Globe;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left w-full',
        selected
          ? 'border-coach-gold bg-amber-50/60 shadow-md shadow-coach-gold/10'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      )}
    >
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', selected ? 'bg-coach-gold/20' : 'bg-gray-100')}>
        <Icon className={cn('w-5 h-5', selected ? 'text-coach-gold' : 'text-gray-400')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', selected ? 'text-gray-900' : 'text-gray-600')}>{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      {selected && (
        <div className="w-6 h-6 rounded-full bg-coach-gold flex items-center justify-center flex-shrink-0">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      )}
    </button>
  );
}

function SelectDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold appearance-none cursor-pointer"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%239ca3af\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Trend Wizard Modal ───

function TrendWizardModal({
  open,
  onClose,
  initialPhase = 'wizard',
  role,
  storeId,
  stores,
  candidates,
  loadingCandidates,
  selectedCandidateIds,
  onToggleCandidateSelection,
  onGenerate,
  generating,
  onApprove,
  onReject,
  onBulkReject,
  onUpdateCandidate,
  processingCandidateId,
  bulkRejecting,
  onGenerateImages,
  generatingImages,
  imageCount,
  onImageCountChange,
  realWorldAccuracy,
  onRealWorldAccuracyChange,
  upscale4k,
  onUpscale4kChange,
}: {
  open: boolean;
  onClose: () => void;
  initialPhase?: 'wizard' | 'review';
  role: string;
  storeId: string | null;
  stores: StoreSummary[];
  candidates: TrendCandidate[];
  loadingCandidates: boolean;
  selectedCandidateIds: string[];
  onToggleCandidateSelection: (id: string, checked: boolean) => void;
  onGenerate: (params: {
    topic: string;
    customQuery: string;
    season: string;
    region: string;
    type: CultureType;
    scope: 'global' | 'region' | 'store';
    scopeStoreId: string;
    scopeRegion: string;
  }) => void;
  generating: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onBulkReject: (ids: string[]) => void;
  onUpdateCandidate: (id: string, updates: { title?: string; description?: string; engagement_text?: string | null }) => Promise<void>;
  processingCandidateId: string | null;
  bulkRejecting: boolean;
  onGenerateImages: () => void;
  generatingImages: boolean;
  imageCount: number;
  onImageCountChange: (n: number) => void;
  realWorldAccuracy: boolean;
  onRealWorldAccuracyChange: (v: boolean) => void;
  upscale4k: boolean;
  onUpscale4kChange: (v: boolean) => void;
}) {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [customQuery, setCustomQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [contentType, setContentType] = useState<CultureType>('trend');
  const [season, setSeason] = useState('current season');
  const [market, setMarket] = useState('US');
  const [scope, setScope] = useState<'global' | 'region' | 'store'>('global');
  const [scopeStoreId, setScopeStoreId] = useState('');
  const [scopeRegion, setScopeRegion] = useState('');
  const [phase, setPhase] = useState<'wizard' | 'review'>('wizard');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState<Set<string>>(new Set());
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEngagementText, setEditEngagementText] = useState('');
  const [savingCandidateId, setSavingCandidateId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setTopic('');
      setCustomQuery('');
      setShowAdvanced(false);
      setContentType('trend');
      setSeason('current season');
      setMarket('US');
      setScope('global');
      setScopeStoreId('');
      setScopeRegion('');
      setPhase(initialPhase);
      setEditingCandidateId(null);
      setExpandedDescriptionIds(new Set());
    }
  }, [open, initialPhase]);

  useEffect(() => {
    if (generating) setPhase('review');
  }, [generating]);

  if (!open) return null;

  const canProceedStep1 = topic.trim().length > 0;
  const canGenerate = (() => {
    if (role === 'store_manager') return true;
    if (scope === 'store' && !scopeStoreId) return false;
    if (scope === 'region' && !scopeRegion) return false;
    return true;
  })();

  const handleGenerate = () => {
    onGenerate({ topic, customQuery, season, region: market, type: contentType, scope, scopeStoreId, scopeRegion });
  };

  const regions = Array.from(new Set(stores.map((s) => s.region).filter(Boolean))).sort();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4 mt-[5vh] max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {phase === 'wizard' ? 'Create Trends' : 'Review Trends'}
            </h2>
            <p className="text-sm text-gray-400">
              {phase === 'wizard' ? 'AI-powered trend discovery for your team' : `${candidates.length} candidates ready for review`}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {phase === 'wizard' && (
            <>
              <div className="mb-8">
                <StepIndicator current={step} total={2} labels={['Topic & Type', 'Context & Generate']} />
              </div>

              {/* Step 1: Topic + Content Type */}
              {step === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">{"What's trending?"}</h3>
                    <p className="text-sm text-gray-400 mb-4">Pick a topic or type your own</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {TOPIC_SUGGESTIONS.map((t) => (
                        <TopicChip key={t} label={t} selected={topic === t.toLowerCase()} onClick={() => setTopic(t.toLowerCase())} />
                      ))}
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Or type a custom topic..."
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="mt-3 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showAdvanced ? 'Hide advanced options' : 'Advanced options'}
                    </button>
                    {showAdvanced && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={customQuery}
                          onChange={(e) => setCustomQuery(e.target.value)}
                          placeholder="Custom Perplexity query (optional)"
                          className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Content type</h3>
                    <p className="text-sm text-gray-400 mb-4">What kind of content should we create?</p>
                    <div className="grid grid-cols-3 gap-3">
                      {(['trend', 'styling', 'news'] as CultureType[]).map((t) => (
                        <ContentTypeCard key={t} type={t} selected={contentType === t} onClick={() => setContentType(t)} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Context + Scope + Generate */}
              {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Set the context</h3>
                    <p className="text-sm text-gray-400 mb-4">Season and market for trend research</p>
                    <div className="grid grid-cols-2 gap-4">
                      <SelectDropdown label="Season" value={season} options={SEASON_OPTIONS} onChange={setSeason} />
                      <SelectDropdown label="Market" value={market} options={MARKET_OPTIONS} onChange={setMarket} />
                    </div>
                  </div>

                  {role === 'admin' ? (
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Where should it appear?</h3>
                      <p className="text-sm text-gray-400 mb-4">Choose the audience scope</p>
                      <div className="space-y-2.5">
                        <ScopeCard scope="global" label="All Stores" description="Visible to every store" icon={Globe} selected={scope === 'global'} onClick={() => setScope('global')} />
                        <ScopeCard scope="region" label="Region" description="Target a specific region" icon={MapPin} selected={scope === 'region'} onClick={() => setScope('region')} />
                        <ScopeCard scope="store" label="Specific Store" description="Single store only" icon={StoreIcon} selected={scope === 'store'} onClick={() => setScope('store')} />
                      </div>
                      {scope === 'region' && (
                        <div className="mt-4 animate-in fade-in duration-200">
                          <SelectDropdown
                            label="Select Region"
                            value={scopeRegion}
                            options={[{ value: '', label: 'Choose a region...' }, ...regions.map((r) => ({ value: r, label: r }))]}
                            onChange={setScopeRegion}
                          />
                        </div>
                      )}
                      {scope === 'store' && (
                        <div className="mt-4 animate-in fade-in duration-200">
                          <SelectDropdown
                            label="Select Store"
                            value={scopeStoreId}
                            options={[{ value: '', label: 'Choose a store...' }, ...stores.map((s) => ({ value: s.id, label: `${s.store_number} - ${s.store_name}` }))]}
                            onChange={setScopeStoreId}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                          <StoreIcon className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Scoped to your store</p>
                          <p className="text-xs text-gray-400">Trends will be created for your assigned store</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/40 border border-amber-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/70 mb-2">Summary</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                      <div className="text-gray-500">Topic</div>
                      <div className="font-medium text-gray-900 truncate">{topic || '—'}</div>
                      <div className="text-gray-500">Type</div>
                      <div className="font-medium text-gray-900">{TYPE_CONFIG[contentType].label}</div>
                      <div className="text-gray-500">Season</div>
                      <div className="font-medium text-gray-900 capitalize">{season}</div>
                      <div className="text-gray-500">Market</div>
                      <div className="font-medium text-gray-900">{market}</div>
                      <div className="text-gray-500">Scope</div>
                      <div className="font-medium text-gray-900 capitalize">{scope === 'global' ? 'All Stores' : scope}</div>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={generating || !canGenerate}
                    className="w-full h-12 rounded-xl bg-coach-gold hover:bg-coach-gold/90 text-white text-base font-semibold shadow-lg shadow-coach-gold/20"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Researching trends...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate 7 Trends
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Review Phase */}
          {phase === 'review' && (
            <div className="animate-in fade-in duration-300">
              {generating ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-coach-gold/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-coach-gold" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-gray-900">Researching trends</p>
                    <p className="text-sm text-gray-400 mt-1">This usually takes 15-30 seconds...</p>
                  </div>
                </div>
              ) : loadingCandidates ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : candidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                    <Search className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">No candidates found</p>
                  <p className="text-xs text-gray-400 mt-1">Try adjusting your topic and generating again</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => { setPhase('wizard'); setStep(1); }}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back to Wizard
                  </Button>
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="mb-5 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const allSelected = selectedCandidateIds.length === candidates.length;
                            candidates.forEach((c) => onToggleCandidateSelection(c.id, !allSelected));
                          }}
                          className="text-xs font-medium text-coach-gold hover:underline"
                        >
                          {selectedCandidateIds.length === candidates.length ? 'Deselect all' : 'Select all'}
                        </button>
                        <span className="text-xs text-gray-400">
                          {selectedCandidateIds.length} of {candidates.length} selected
                        </span>
                        {candidates.some((c) => c.image_status === 'pending' || c.image_status === 'processing') && (
                          <span className="text-xs text-coach-gold flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Generating...
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onBulkReject(selectedCandidateIds)}
                          disabled={bulkRejecting || selectedCandidateIds.length === 0}
                          className="rounded-lg h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          {bulkRejecting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                          Delete Selected
                        </Button>
                        <Button
                          size="sm"
                          onClick={onGenerateImages}
                          disabled={generatingImages || selectedCandidateIds.length === 0}
                          className="bg-coach-gold hover:bg-coach-gold/90 text-white rounded-lg"
                        >
                          {generatingImages ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-1.5" />}
                          Generate Images
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <select
                        value={imageCount}
                        onChange={(e) => onImageCountChange(parseInt(e.target.value) || 1)}
                        className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm"
                      >
                        <option value={1}>1 image each</option>
                        <option value={2}>2 images each</option>
                        <option value={3}>3 images each</option>
                        <option value={4}>4 images each</option>
                      </select>
                    </div>
                  </div>

                  {/* Candidate cards */}
                  <div className="space-y-3">
                    {candidates.map((candidate) => {
                      const isSelected = selectedCandidateIds.includes(candidate.id);
                      const isProcessing = processingCandidateId === candidate.id;
                      const imgStatus = candidate.image_status || 'none';
                      const isImageBusy = imgStatus === 'pending' || imgStatus === 'processing';
                      const candidateImageSrc = candidate.image_url ? buildCandidateImageSrc(candidate.id) : null;
                      return (
                        <div
                          key={candidate.id}
                          className={cn(
                            'rounded-2xl border-2 overflow-hidden transition-all duration-200',
                            isSelected ? 'border-coach-gold/40 bg-amber-50/30' : 'border-gray-100 bg-white'
                          )}
                        >
                          <div className="flex gap-4 p-4">
                            <div className="pt-0.5">
                              <button
                                type="button"
                                onClick={() => onToggleCandidateSelection(candidate.id, !isSelected)}
                                className={cn(
                                  'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                                  isSelected ? 'bg-coach-gold border-coach-gold' : 'border-gray-300 hover:border-gray-400'
                                )}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                                  {candidate.scope_type === 'global' ? 'All Stores' : candidate.scope_type === 'region' ? `Region: ${candidate.store_region || '?'}` : 'Store'}
                                </span>
                                {editingCandidateId !== candidate.id && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-gray-500 hover:text-coach-gold ml-auto"
                                    onClick={() => {
                                      setEditingCandidateId(candidate.id);
                                      setEditTitle(candidate.title);
                                      setEditDescription(candidate.description ?? '');
                                      setEditEngagementText(candidate.engagement_text ?? '');
                                    }}
                                  >
                                    <Pencil className="w-3 h-3 mr-1" />
                                    Edit copy
                                  </Button>
                                )}
                              </div>
                              {editingCandidateId === candidate.id ? (
                                <div className="space-y-2">
                                  <Label className="text-xs text-gray-500">Title</Label>
                                  <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="text-sm h-8"
                                    placeholder="Title"
                                  />
                                  <Label className="text-xs text-gray-500">Description</Label>
                                  <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="w-full min-h-[100px] rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
                                    placeholder="Description"
                                    rows={4}
                                  />
                                  <Label className="text-xs text-gray-500">Engagement text (optional)</Label>
                                  <Input
                                    value={editEngagementText}
                                    onChange={(e) => setEditEngagementText(e.target.value)}
                                    className="text-sm h-8"
                                    placeholder="e.g. Trending now"
                                  />
                                  <div className="flex gap-2 pt-1">
                                    <Button
                                      size="sm"
                                      className="rounded-lg bg-coach-gold hover:bg-coach-mahogany text-white h-8 text-xs"
                                      disabled={savingCandidateId === candidate.id}
                                      onClick={async () => {
                                        setSavingCandidateId(candidate.id);
                                        try {
                                          await onUpdateCandidate(candidate.id, {
                                            title: editTitle,
                                            description: editDescription,
                                            engagement_text: editEngagementText || null,
                                          });
                                          setEditingCandidateId(null);
                                        } catch {
                                          toast.error('Failed to save');
                                        } finally {
                                          setSavingCandidateId(null);
                                        }
                                      }}
                                    >
                                      {savingCandidateId === candidate.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="rounded-lg h-8 text-xs"
                                      onClick={() => setEditingCandidateId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{candidate.title}</h4>
                                  <div className="text-xs text-gray-500 leading-relaxed">
                                    {(() => {
                                      const desc = candidate.description ?? '';
                                      const isLong = desc.length > 220;
                                      const expanded = expandedDescriptionIds.has(candidate.id);
                                      const show = isLong && !expanded ? desc.slice(0, 220) + '...' : desc;
                                      return (
                                        <>
                                          <p className="whitespace-pre-wrap">{show}</p>
                                          {isLong && (
                                            <button
                                              type="button"
                                              onClick={() => setExpandedDescriptionIds((prev) => {
                                                const next = new Set(prev);
                                                if (next.has(candidate.id)) next.delete(candidate.id);
                                                else next.add(candidate.id);
                                                return next;
                                              })}
                                              className="text-coach-gold hover:text-coach-mahogany font-medium mt-0.5"
                                            >
                                              {expanded ? 'Show less' : 'Read more'}
                                            </button>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden relative group/thumb">
                              {candidateImageSrc ? (
                                <>
                                  <img src={candidateImageSrc} alt={candidate.title} className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setPreviewImage({ url: candidateImageSrc, title: candidate.title }); }}
                                    className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all"
                                  >
                                    <ZoomIn className="w-5 h-5 text-white drop-shadow" />
                                  </button>
                                </>
                              ) : isImageBusy ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Loader2 className="w-5 h-5 animate-spin text-coach-gold" />
                                  <span className="text-[9px] text-gray-400">{imgStatus === 'processing' ? 'Creating...' : 'Queued'}</span>
                                </div>
                              ) : imgStatus === 'failed' ? (
                                <div className="flex flex-col items-center gap-1 px-1">
                                  <Ban className="w-4 h-4 text-red-400" />
                                  <span className="text-[9px] text-red-400 text-center leading-tight">Failed</span>
                                </div>
                              ) : (
                                <Image className="w-6 h-6 text-gray-300" />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 px-4 pb-3 pl-13">
                            <Button
                              size="sm"
                              onClick={() => onApprove(candidate.id)}
                              disabled={isProcessing || !candidate.image_url}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                            >
                              {isProcessing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onReject(candidate.id)}
                              disabled={isProcessing}
                              className="rounded-lg h-8 text-xs text-gray-500 hover:text-red-600"
                            >
                              <Ban className="w-3.5 h-3.5 mr-1" />
                              Reject
                            </Button>
                            {!candidate.image_url && !isImageBusy && imgStatus !== 'failed' && (
                              <span className="text-[11px] text-amber-600 ml-auto">Needs image first</span>
                            )}
                            {imgStatus === 'failed' && candidate.image_error && (
                              <span className="text-[11px] text-red-500 ml-auto truncate max-w-[200px]" title={candidate.image_error}>
                                {candidate.image_error}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Image Preview Lightbox */}
        {previewImage && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setPreviewImage(null)}>
            <div className="relative max-w-full max-h-full flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl object-contain"
              />
              <p className="text-sm text-white/80 font-medium text-center max-w-md truncate">{previewImage.title}</p>
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {phase === 'wizard' && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <Button
              variant="ghost"
              onClick={() => { if (step === 1) onClose(); else setStep(step - 1); }}
              className="rounded-xl"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            {step < 2 && (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceedStep1}
                className="rounded-xl bg-coach-gold hover:bg-coach-gold/90 text-white"
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}
        {phase === 'review' && !generating && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <Button variant="ghost" onClick={() => { setPhase('wizard'); setStep(1); }} className="rounded-xl">
              <ChevronLeft className="w-4 h-4 mr-1" /> New Search
            </Button>
            <Button variant="outline" onClick={onClose} className="rounded-xl">
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pending Review Section (main page) ───

function PendingReviewBanner({ count, onClick }: { count: number; onClick: () => void }) {
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

function FeedPendingReviewSection({
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

// ─── Main Page ───

export default function CultureFeedPage() {
  const { user, role, storeId } = useAdminAuth();
  const [items, setItems] = useState<CultureItem[]>([]);
  const [candidates, setCandidates] = useState<TrendCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [processingCandidateId, setProcessingCandidateId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [reviewingFeedItemId, setReviewingFeedItemId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [feedStatusFilter, setFeedStatusFilter] = useState<FeedStatusFilter>('all');
  const [editingForm, setEditingForm] = useState<CultureFormData | null>(null);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitialPhase, setWizardInitialPhase] = useState<'wizard' | 'review'>('wizard');
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [imageCount, setImageCount] = useState(1);
  const [realWorldAccuracy, setRealWorldAccuracy] = useState(false);
  const [upscale4k, setUpscale4k] = useState(false);
  const [pollingIds, setPollingIds] = useState<string[]>([]);
  const [pendingReviewErrors, setPendingReviewErrors] = useState<Record<string, string>>({});
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const adminHeaders = useMemo<Record<string, string>>(
    () => ({} as Record<string, string>),
    []
  );

  const [pendingReviewItems, setPendingReviewItems] = useState<CultureItem[]>([]);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const statusQuery = feedStatusFilter === 'all' ? 'published' : feedStatusFilter;
      const res = await fetch(`/api/admin/culture?status=${statusQuery}`, { headers: adminHeaders });
      if (!res.ok) throw new Error('Failed to fetch culture items');
      setItems(await res.json());
    } catch {
      toast.error('Failed to load pulse feed');
    } finally {
      setLoading(false);
    }
  }, [adminHeaders, feedStatusFilter]);

  const fetchPendingReviewItems = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/culture?status=pending_review', { headers: adminHeaders });
      if (!res.ok) throw new Error('Failed to fetch pending items');
      setPendingReviewItems(await res.json());
    } catch {
      toast.error('Failed to load pending review items');
    }
  }, [adminHeaders]);

  const fetchCandidates = useCallback(async () => {
    try {
      setLoadingCandidates(true);
      const res = await fetch('/api/admin/culture/trends/candidates?status=generated', { headers: adminHeaders });
      if (!res.ok) throw new Error('Failed to fetch candidates');
      const data = await res.json();
      setCandidates(data);
      setSelectedCandidateIds((prev) => prev.filter((id) => data.some((c: TrendCandidate) => c.id === id)));
    } catch {
      toast.error('Failed to load trend candidates');
    } finally {
      setLoadingCandidates(false);
    }
  }, [adminHeaders]);

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stores?status=OPEN', { headers: adminHeaders });
      if (!res.ok) return;
      setStores((await res.json()) ?? []);
    } catch { /* best-effort */ }
  }, [adminHeaders]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchPendingReviewItems(); }, [fetchPendingReviewItems]);
  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);
  useEffect(() => { fetchStores(); }, [fetchStores]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return items;
    if (activeTab === 'scheduled') return items.filter(isScheduled);
    return items.filter((i) => i.type === activeTab);
  }, [items, activeTab]);

  const stats = useMemo(() => ({
    total: items.length,
    published: items.filter((i) => i.is_published && !isScheduled(i)).length,
    drafts: items.filter((i) => !i.is_published).length,
    scheduled: items.filter(isScheduled).length,
  }), [items]);

  // ─── Handlers ───

  const handleSave = async () => {
    if (!editingForm) return;
    const isEdit = !!editingForm.id;
    try {
    setSaving(true);
    const method = isEdit ? 'PUT' : 'POST';
    const body = { ...(isEdit && { id: editingForm.id }), type: editingForm.type, category: editingForm.category, title: editingForm.title, description: editingForm.description, image_url: editingForm.image_url, engagement_text: editingForm.engagement_text, is_published: editingForm.is_published, publish_date: editingForm.publish_date ?? null, sort_order: editingForm.sort_order };
    const res = await fetch('/api/admin/culture', { method, headers: { 'Content-Type': 'application/json', ...adminHeaders }, body: JSON.stringify(body) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as any).error || 'Save failed'); }
      toast.success(isEdit ? 'Item updated' : 'Item created');
      setEditingForm(null);
      await fetchItems();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { setDeletingId(id); const res = await fetch('/api/admin/culture', { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...adminHeaders }, body: JSON.stringify({ id }) }); if (!res.ok) throw new Error('Delete failed'); toast.success('Item deleted'); setItems((prev) => prev.filter((i) => i.id !== id)); }
    catch { toast.error('Failed to delete item'); }
    finally { setDeletingId(null); }
  };

  const handleTogglePublish = async (item: CultureItem) => {
    try { setTogglingId(item.id); const res = await fetch('/api/admin/culture', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...adminHeaders }, body: JSON.stringify({ id: item.id, is_published: !item.is_published }) }); if (!res.ok) throw new Error('Update failed'); const updated = await res.json(); setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i))); }
    catch { toast.error('Failed to update status'); }
    finally { setTogglingId(null); }
  };

  const handleApprovePendingFeedItem = async (item: CultureItem) => {
    setReviewingFeedItemId(item.id);
    setPendingReviewErrors((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('Could not access the current admin session. Please sign in again.');
      }

      const res = await fetch('/api/admin/culture/publish-pulse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...adminHeaders,
        },
        body: JSON.stringify({ cardId: item.id }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'Approval failed');
      }

      toast.success('Pulse approved and published');
      await Promise.all([fetchItems(), fetchPendingReviewItems()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approval failed';
      setPendingReviewErrors((prev) => ({ ...prev, [item.id]: message }));
      toast.error(message);
    } finally {
      setReviewingFeedItemId(null);
    }
  };

  const handleRejectPendingFeedItem = async (item: CultureItem) => {
    setReviewingFeedItemId(item.id);
    setPendingReviewErrors((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });

    try {
      const res = await fetch('/api/admin/culture', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ id: item.id, status: 'rejected', is_published: false }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'Reject failed');
      }

      await Promise.all([fetchItems(), fetchPendingReviewItems()]);
      toast.success('Pulse rejected');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reject failed';
      setPendingReviewErrors((prev) => ({ ...prev, [item.id]: message }));
      toast.error(message);
    } finally {
      setReviewingFeedItemId(null);
    }
  };

  const handleGenerateTrends = async (params: { topic: string; customQuery: string; season: string; region: string; type: CultureType; scope: 'global' | 'region' | 'store'; scopeStoreId: string; scopeRegion: string }) => {
    try {
      setGenerating(true);
      const effectiveScope = role === 'store_manager' ? 'store' : params.scope;
      const effectiveStoreId = role === 'store_manager' ? storeId : effectiveScope === 'store' ? params.scopeStoreId || null : null;
      const effectiveRegion = role === 'store_manager' ? null : effectiveScope === 'region' ? params.scopeRegion || null : null;

      if (effectiveScope === 'store' && !effectiveStoreId) { toast.error('Select a store for store-targeted trends'); setGenerating(false); return; }
      if (effectiveScope === 'region' && !effectiveRegion) { toast.error('Select a region for region-targeted trends'); setGenerating(false); return; }

      const res = await fetch('/api/admin/culture/trends/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({
          scopeType: effectiveScope,
          storeId: effectiveStoreId,
          storeRegion: effectiveRegion,
          selections: { topic: params.topic, customQuery: params.customQuery, audience: 'sales associates', season: params.season, region: params.region, type: params.type },
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Trend generation failed'); }
      const payload = await res.json().catch(() => ({}));
      const created = Array.isArray(payload?.candidates) ? payload.candidates : [];
      if (created.length > 0) setCandidates(created);
      toast.success(created.length > 0 ? `Generated ${created.length} trend candidates` : 'Trend request completed');
      setSelectedCandidateIds([]);
      await fetchCandidates();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Trend generation failed'); }
    finally { setGenerating(false); }
  };

  const handleApproveCandidate = async (candidateId: string) => {
    const prev = candidates;
    setCandidates((c) => c.filter((x) => x.id !== candidateId));
    setSelectedCandidateIds((s) => s.filter((id) => id !== candidateId));
    setProcessingCandidateId(candidateId);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...adminHeaders,
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const res = await fetch('/api/admin/culture/trends/approve', {
        method: 'POST',
        headers,
        body: JSON.stringify({ candidateId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Approval failed');
      }
      toast.success('Candidate approved and published');
      await fetchItems();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Approval failed');
      setCandidates(prev);
    } finally {
      setProcessingCandidateId(null);
    }
  };

  const handleRejectCandidate = async (candidateId: string) => {
    const prev = candidates;
    setCandidates((c) => c.filter((x) => x.id !== candidateId));
    setSelectedCandidateIds((s) => s.filter((id) => id !== candidateId));
    setProcessingCandidateId(candidateId);
    try {
      const res = await fetch('/api/admin/culture/trends/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ candidateId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Reject failed');
      }
      toast.success('Candidate rejected');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Reject failed');
      setCandidates(prev);
    } finally {
      setProcessingCandidateId(null);
    }
  };

  const handleBulkReject = async (ids: string[]) => {
    if (!ids.length) return;
    const prev = candidates;
    const idSet = new Set(ids);
    setCandidates((c) => c.filter((x) => !idSet.has(x.id)));
    setSelectedCandidateIds([]);
    setBulkRejecting(true);
    try {
      await Promise.all(ids.map((id) =>
        fetch('/api/admin/culture/trends/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...adminHeaders },
          body: JSON.stringify({ candidateId: id }),
        })
      ));
      toast.success(`Rejected ${ids.length} trend${ids.length !== 1 ? 's' : ''}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Bulk reject failed');
      setCandidates(prev);
      await fetchCandidates();
    } finally {
      setBulkRejecting(false);
    }
  };

  const toggleCandidateSelection = (candidateId: string, checked: boolean) => {
    setSelectedCandidateIds((prev) => checked ? Array.from(new Set([...prev, candidateId])) : prev.filter((id) => id !== candidateId));
  };

  const handleUpdateCandidate = async (
    id: string,
    updates: { title?: string; description?: string; engagement_text?: string | null }
  ) => {
    const res = await fetch('/api/admin/culture/trends/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? 'Update failed');
    }
    const updated = await res.json();
    setCandidates((prev) => prev.map((c) => (c.id === id ? updated : c)));
    toast.success('Copy updated');
  };

  const handleGenerateImagesForSelected = async () => {
    if (!selectedCandidateIds.length) { toast.error('Select at least one trend to generate images'); return; }
    try {
      setGeneratingImages(true);
      setCandidates((prev) => prev.map((c) =>
        selectedCandidateIds.includes(c.id) && !c.image_url
          ? { ...c, image_status: 'pending' as ImageStatus }
          : c
      ));

      const res = await fetch('/api/admin/culture/trends/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ candidateIds: selectedCandidateIds, numberOfImages: imageCount, realWorldAccuracy, enableSearchGrounding: realWorldAccuracy, upscale4k }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Image generation failed');

      const queued = Number(payload?.queued || 0);
      const completed = Number(payload?.completed || 0);
      const idsToTrack = payload?.candidateIds || selectedCandidateIds;

      if (completed > 0) toast.info(`${completed} selected item(s) already had images`);
      if (queued > 0) toast.info(`${queued} image(s) generating in background...`);

      setPollingIds(idsToTrack);
      await fetchCandidates();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Image generation failed');
      setCandidates((prev) => prev.map((c) =>
        selectedCandidateIds.includes(c.id) && c.image_status === 'pending'
          ? { ...c, image_status: 'failed' as ImageStatus, image_error: 'Request failed' }
          : c
      ));
    } finally {
      setGeneratingImages(false);
    }
  };

  const triggerProcessing = useCallback(() => {
    fetch('/api/admin/culture/trends/images/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateIds: pollingIds,
        imageOptions: { numberOfImages: 1, enableSearchGrounding: realWorldAccuracy, realWorldAccuracy, upscale4k },
      }),
    }).catch(() => {});
  }, [pollingIds, realWorldAccuracy, upscale4k]);

  useEffect(() => {
    if (pollingIds.length === 0) return;

    let hasTriggeredProcess = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/culture/trends/images/status?ids=${pollingIds.join(',')}`);
        if (!res.ok) return;
        const { candidates: statusList } = await res.json();
        if (!Array.isArray(statusList)) return;

        setCandidates((prev) => prev.map((c) => {
          const update = statusList.find((s: { id: string }) => s.id === c.id);
          if (!update) return c;
          return { ...c, image_url: update.image_url ?? c.image_url, image_status: update.image_status, image_error: update.image_error };
        }));

        const stillPending = statusList.filter((s: { image_status: string }) => s.image_status === 'pending');
        const stillProcessing = statusList.filter((s: { image_status: string }) => s.image_status === 'processing');
        const stillBusy = [...stillPending, ...stillProcessing];

        if (stillPending.length > 0 && !hasTriggeredProcess) {
          hasTriggeredProcess = true;
          triggerProcessing();
        }

        if (stillBusy.length === 0) {
          setPollingIds([]);
          const completed = statusList.filter((s: { image_status: string }) => s.image_status === 'completed').length;
          const failed = statusList.filter((s: { image_status: string }) => s.image_status === 'failed').length;
          if (completed > 0 || failed > 0) {
            toast.success(`Images done: ${completed} completed${failed > 0 ? `, ${failed} failed` : ''}`);
          }
          await fetchCandidates();
          return;
        }

        if (stillPending.length > 0 && stillProcessing.length === 0) {
          hasTriggeredProcess = false;
          triggerProcessing();
        }

        pollTimerRef.current = setTimeout(poll, 4000);
      } catch {
        pollTimerRef.current = setTimeout(poll, 6000);
      }
    };

    pollTimerRef.current = setTimeout(poll, 2000);

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [pollingIds, triggerProcessing, fetchCandidates]);

  // ─── Render ───

  return (
    <RoleGate minRole="store_manager" readOnlyFor={['store_manager']}>
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pulse Feed</h1>
              <p className="mt-1 text-sm text-gray-500">Manage trends, styling tips, and news for the Pulse tab</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setEditingForm({ ...EMPTY_FORM })} disabled={!!editingForm}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Item
              </Button>
              <Button onClick={() => { setWizardInitialPhase('wizard'); setWizardOpen(true); }} className="bg-coach-gold hover:bg-coach-gold/90 text-white">
                <Sparkles className="w-4 h-4 mr-1.5" /> Create Trends
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-coach-gold/10 flex items-center justify-center"><Sparkles className="h-5 w-5 text-coach-gold" /></div>
              <div><p className="text-2xl font-semibold text-gray-900">{stats.total}</p><p className="text-xs text-gray-500">Total Items</p></div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center"><Eye className="h-5 w-5 text-emerald-600" /></div>
              <div><p className="text-2xl font-semibold text-gray-900">{stats.published}</p><p className="text-xs text-gray-500">Live</p></div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center"><CalendarClock className="h-5 w-5 text-violet-600" /></div>
              <div><p className="text-2xl font-semibold text-gray-900">{stats.scheduled}</p><p className="text-xs text-gray-500">Scheduled</p></div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center"><EyeOff className="h-5 w-5 text-gray-500" /></div>
              <div><p className="text-2xl font-semibold text-gray-900">{stats.drafts}</p><p className="text-xs text-gray-500">Drafts</p></div>
            </Card>
          </div>

          <FeedPendingReviewSection
            items={pendingReviewItems}
            processingId={reviewingFeedItemId}
            errors={pendingReviewErrors}
            onApprove={handleApprovePendingFeedItem}
            onReject={handleRejectPendingFeedItem}
          />

          {/* Pending review banner */}
          <PendingReviewBanner count={candidates.length} onClick={() => { setWizardInitialPhase('review'); setWizardOpen(true); }} />

          {/* Filter tabs */}
          <Card className="p-3 mb-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex rounded-lg bg-gray-100 p-0.5">
                {FILTER_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                        activeTab === tab.value ? 'bg-white text-coach-mahogany shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {tab.value === 'scheduled' && stats.scheduled > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700">
                          {stats.scheduled}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-500 whitespace-nowrap">Status</Label>
                <select
                  value={feedStatusFilter}
                  onChange={(e) => setFeedStatusFilter(e.target.value as FeedStatusFilter)}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
                >
                  {FEED_STATUS_FILTERS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Add form */}
          {editingForm && !editingForm.id && (
            <div className="mb-6">
              <CultureForm data={editingForm} onChange={setEditingForm} onSave={handleSave} onCancel={() => setEditingForm(null)} saving={saving} adminHeaders={adminHeaders} />
            </div>
          )}

          {/* Content grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-coach-gold" />
                <p className="text-sm text-gray-500">Loading pulse feed...</p>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="py-16 flex flex-col items-center justify-center text-center">
              <Sparkles className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No items found</p>
              <p className="text-xs text-gray-400 mt-1">{activeTab === 'all' ? 'Add your first pulse feed item' : 'No items match this filter'}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) =>
                editingForm?.id === item.id ? (
                  <div key={item.id} className="sm:col-span-2 lg:col-span-3">
                    <CultureForm data={editingForm} onChange={setEditingForm} onSave={handleSave} onCancel={() => setEditingForm(null)} saving={saving} adminHeaders={adminHeaders} />
                  </div>
                ) : (
                  <ContentCard key={item.id} item={item} onEdit={() => setEditingForm({ id: item.id, type: item.type, category: item.category, title: item.title, description: item.description, image_url: item.image_url, engagement_text: item.engagement_text, is_published: item.is_published, publish_date: item.publish_date ?? null, sort_order: item.sort_order })} onDelete={() => handleDelete(item.id)} onTogglePublish={() => handleTogglePublish(item)} deleting={deletingId === item.id} toggling={togglingId === item.id} />
                )
              )}
            </div>
          )}
        </div>

        {/* Wizard Modal */}
        <TrendWizardModal
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          initialPhase={wizardInitialPhase}
          role={role}
          storeId={storeId}
          stores={stores}
          candidates={candidates}
          loadingCandidates={loadingCandidates}
          selectedCandidateIds={selectedCandidateIds}
          onToggleCandidateSelection={toggleCandidateSelection}
          onGenerate={handleGenerateTrends}
          generating={generating}
          onApprove={handleApproveCandidate}
          onReject={handleRejectCandidate}
          onBulkReject={handleBulkReject}
          onUpdateCandidate={handleUpdateCandidate}
          processingCandidateId={processingCandidateId}
          bulkRejecting={bulkRejecting}
          onGenerateImages={handleGenerateImagesForSelected}
          generatingImages={generatingImages}
          imageCount={imageCount}
          onImageCountChange={setImageCount}
          realWorldAccuracy={realWorldAccuracy}
          onRealWorldAccuracyChange={setRealWorldAccuracy}
          upscale4k={upscale4k}
          onUpscale4kChange={setUpscale4k}
        />
      </div>
    </RoleGate>
  );
}
