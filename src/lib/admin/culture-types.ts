import { Sparkles, TrendingUp, Palette, Newspaper, CalendarClock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ─── Types ───

export type CultureType = 'trend' | 'styling' | 'news';
export type FilterTab = 'all' | CultureType | 'scheduled';
export type FeedStatus = 'pending_review' | 'active' | 'rejected' | null;
export type FeedStatusFilter = 'all' | 'active' | 'pending_review' | 'rejected' | 'legacy';

export interface CultureItem {
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

export type ImageStatus = 'none' | 'pending' | 'processing' | 'completed' | 'failed';

export interface TrendCandidate {
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

export interface StoreSummary {
  id: string;
  store_number: string;
  store_name: string;
  region: string;
}

export type CultureFormData = Omit<CultureItem, 'id' | 'status' | 'submitted_by' | 'submitted_by_name' | 'submitted_at' | 'published_at' | 'created_at' | 'updated_at'> & {
  id?: string;
};

// ─── Constants ───

export const EMPTY_FORM: CultureFormData = {
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

export const FILTER_TABS: { value: FilterTab; label: string; icon: LucideIcon }[] = [
  { value: 'all', label: 'All', icon: Sparkles },
  { value: 'trend', label: 'Trends', icon: TrendingUp },
  { value: 'styling', label: 'Styling Tips', icon: Palette },
  { value: 'news', label: 'News', icon: Newspaper },
  { value: 'scheduled', label: 'Scheduled', icon: CalendarClock },
];

export const FEED_STATUS_FILTERS: { value: FeedStatusFilter; label: string }[] = [
  { value: 'all', label: 'Published (Active + Legacy)' },
  { value: 'active', label: 'Active' },
  { value: 'legacy', label: 'Legacy (No Status)' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'rejected', label: 'Rejected' },
];

export const TYPE_CONFIG: Record<CultureType, { label: string; bg: string; text: string; border: string; description: string; icon: LucideIcon }> = {
  trend: { label: 'Trend', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', description: 'What is hot in fashion and culture', icon: TrendingUp },
  styling: { label: 'Styling Tip', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', description: 'How to wear and style Coach', icon: Palette },
  news: { label: 'News', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', description: 'Brand updates and announcements', icon: Newspaper },
};

export const TYPE_SELECT_OPTIONS: { value: CultureType; label: string }[] = [
  { value: 'trend', label: 'Trend' },
  { value: 'styling', label: 'Styling Tip' },
  { value: 'news', label: 'News' },
];

export const TOPIC_SUGGESTIONS = [
  'Handbag Styling',
  'Runway Trends',
  'Street Style',
  'Seasonal Looks',
  'Accessories',
  'Footwear',
  'Celebrity Style',
  'Color Trends',
];

export const SEASON_OPTIONS = [
  { value: 'current season', label: 'Current Season' },
  { value: 'spring/summer', label: 'Spring / Summer' },
  { value: 'fall/winter', label: 'Fall / Winter' },
  { value: 'resort', label: 'Resort' },
  { value: 'pre-fall', label: 'Pre-Fall' },
];

export const MARKET_OPTIONS = [
  { value: 'US', label: 'US' },
  { value: 'Global', label: 'Global' },
];

// ─── Utility Functions ───

export function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isScheduled(item: CultureItem): boolean {
  return !!item.publish_date && new Date(item.publish_date) > new Date();
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getFeedStatusLabel(status: FeedStatus): string {
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

export function getFeedStatusClasses(status: FeedStatus): string {
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

export function buildCandidateImageSrc(candidateId: string): string {
  return `/api/admin/culture/trends/images/file/${candidateId}?entity=candidate`;
}

export function buildFeedImageSrc(feedItemId: string): string {
  return `/api/admin/culture/trends/images/file/${feedItemId}?entity=feed`;
}
