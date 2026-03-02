'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/components/admin/RoleGate';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

type CultureType = 'trend' | 'styling' | 'news';
type FilterTab = 'all' | CultureType;

interface CultureItem {
  id: string;
  type: CultureType;
  category: string;
  title: string;
  description: string;
  image_url: string;
  engagement_text: string;
  is_published: boolean;
  published_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  scope_type?: 'global' | 'store';
  store_id?: string | null;
}

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
}

interface StoreSummary {
  id: string;
  store_number: string;
  store_name: string;
  region: string;
}

type CultureFormData = Omit<CultureItem, 'id' | 'published_at' | 'created_at' | 'updated_at'> & {
  id?: string;
};

const EMPTY_FORM: CultureFormData = {
  type: 'trend',
  category: '',
  title: '',
  description: '',
  image_url: '',
  engagement_text: '',
  is_published: false,
  sort_order: 0,
};

const FILTER_TABS: { value: FilterTab; label: string; icon: typeof TrendingUp }[] = [
  { value: 'all', label: 'All', icon: Sparkles },
  { value: 'trend', label: 'Trends', icon: TrendingUp },
  { value: 'styling', label: 'Styling Tips', icon: Palette },
  { value: 'news', label: 'News', icon: Newspaper },
];

const TYPE_CONFIG: Record<CultureType, { label: string; bg: string; text: string; border: string }> = {
  trend: { label: 'Trend', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  styling: { label: 'Styling', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  news: { label: 'News', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

const TYPE_SELECT_OPTIONS: { value: CultureType; label: string }[] = [
  { value: 'trend', label: 'Trend' },
  { value: 'styling', label: 'Styling Tip' },
  { value: 'news', label: 'News' },
];

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

function CultureForm({
  data,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  data: CultureFormData;
  onChange: (d: CultureFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
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
          <Input
            value={data.category}
            onChange={(e) => onChange({ ...data, category: e.target.value })}
            placeholder="e.g. Street Style, Runway"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            placeholder="Content title"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Image URL</Label>
          <Input
            value={data.image_url}
            onChange={(e) => onChange({ ...data, image_url: e.target.value })}
            placeholder="https://..."
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
          <Input
            value={data.engagement_text}
            onChange={(e) => onChange({ ...data, engagement_text: e.target.value })}
            placeholder="e.g. 2.4K views"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Sort Order</Label>
          <Input
            type="number"
            value={data.sort_order}
            onChange={(e) => onChange({ ...data, sort_order: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Label>Published</Label>
          <PublishToggle published={data.is_published} onChange={(v) => onChange({ ...data, is_published: v })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          {data.id ? 'Update' : 'Create'}
        </Button>
      </div>
    </Card>
  );
}

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

  return (
    <Card className="overflow-hidden group transition-all hover:shadow-md">
      <div
        className="relative h-44 bg-gray-100 flex items-center justify-center"
        style={
          item.image_url
            ? { backgroundImage: `url(${item.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
        }
      >
        {!item.image_url && (
          <Image className="h-10 w-10 text-gray-300" />
        )}
        {item.image_url && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        )}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', typeConfig.bg, typeConfig.text)}>
            {typeConfig.label}
          </span>
          {item.category && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/90 text-gray-700">
              {item.category}
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <span
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
              item.is_published
                ? 'bg-emerald-500/90 text-white'
                : 'bg-gray-700/80 text-gray-200'
            )}
          >
            {item.is_published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {item.is_published ? 'Live' : 'Draft'}
          </span>
        </div>
        {item.image_url && item.title && (
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2 drop-shadow-sm">
              {item.title}
            </h3>
          </div>
        )}
      </div>

      <div className="p-4">
        {!item.image_url && (
          <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 mb-1">
            {item.title}
          </h3>
        )}
        {item.description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
            {item.description}
          </p>
        )}
        {item.engagement_text && (
          <p className="text-xs font-medium text-coach-mahogany mb-3">
            {item.engagement_text}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {toggling ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              <PublishToggle published={item.is_published} onChange={onTogglePublish} />
            )}
            <span className="text-xs text-gray-400">
              {item.is_published ? 'Published' : 'Draft'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={onEdit} title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onDelete} disabled={deleting} title="Delete" className="hover:text-red-600">
              {deleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

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
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [editingForm, setEditingForm] = useState<CultureFormData | null>(null);
  const [trendTopic, setTrendTopic] = useState('luxury handbag styling');
  const [trendCustomQuery, setTrendCustomQuery] = useState('');
  const [trendAudience, setTrendAudience] = useState('sales associates');
  const [trendSeason, setTrendSeason] = useState('current season');
  const [trendRegion, setTrendRegion] = useState('US');
  const [trendType, setTrendType] = useState<CultureType>('trend');
  const [trendScope, setTrendScope] = useState<'global' | 'region' | 'store'>('global');
  const [trendStoreId, setTrendStoreId] = useState<string>('');
  const [trendRegionTarget, setTrendRegionTarget] = useState<string>('');
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [imageCount, setImageCount] = useState(1);
  const [realWorldAccuracy, setRealWorldAccuracy] = useState(false);
  const [upscale4k, setUpscale4k] = useState(false);

  const adminHeaders = useMemo<Record<string, string>>(
    () => (user?.email ? { 'x-admin-email': user.email } : ({} as Record<string, string>)),
    [user?.email]
  );

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/culture', { headers: adminHeaders });
      if (!res.ok) throw new Error('Failed to fetch culture items');
      const data = await res.json();
      setItems(data);
    } catch {
      toast.error('Failed to load culture feed');
    } finally {
      setLoading(false);
    }
  }, [adminHeaders]);

  const fetchCandidates = useCallback(async () => {
    try {
      setLoadingCandidates(true);
      const res = await fetch('/api/admin/culture/trends/candidates?status=generated', {
        headers: adminHeaders,
      });
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
      const data = await res.json();
      setStores(data ?? []);
    } catch {
      // best-effort, non-blocking
    }
  }, [adminHeaders]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const filteredItems = activeTab === 'all' ? items : items.filter((i) => i.type === activeTab);

  const stats = {
    total: items.length,
    published: items.filter((i) => i.is_published).length,
    drafts: items.filter((i) => !i.is_published).length,
  };

  const handleSave = async () => {
    if (!editingForm) return;
    const isEdit = !!editingForm.id;

    try {
      setSaving(true);
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit
        ? { id: editingForm.id, type: editingForm.type, category: editingForm.category, title: editingForm.title, description: editingForm.description, image_url: editingForm.image_url, engagement_text: editingForm.engagement_text, is_published: editingForm.is_published, sort_order: editingForm.sort_order }
        : { type: editingForm.type, category: editingForm.category, title: editingForm.title, description: editingForm.description, image_url: editingForm.image_url, engagement_text: editingForm.engagement_text, is_published: editingForm.is_published, sort_order: editingForm.sort_order };

      const res = await fetch('/api/admin/culture', {
        method,
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }
      toast.success(isEdit ? 'Item updated' : 'Item created');
      setEditingForm(null);
      await fetchItems();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      const res = await fetch('/api/admin/culture', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Item deleted');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast.error('Failed to delete item');
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublish = async (item: CultureItem) => {
    try {
      setTogglingId(item.id);
      const res = await fetch('/api/admin/culture', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ id: item.id, is_published: !item.is_published }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch {
      toast.error('Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const openAddForm = () => {
    setEditingForm({ ...EMPTY_FORM });
  };

  const openEditForm = (item: CultureItem) => {
    setEditingForm({
      id: item.id,
      type: item.type,
      category: item.category,
      title: item.title,
      description: item.description,
      image_url: item.image_url,
      engagement_text: item.engagement_text,
      is_published: item.is_published,
      sort_order: item.sort_order,
    });
  };

  const handleGenerateTrends = async () => {
    try {
      setGenerating(true);
      const effectiveScope = role === 'manager' ? 'store' : trendScope;
      const effectiveStoreId =
        role === 'manager' ? storeId : effectiveScope === 'store' ? trendStoreId || null : null;
      const effectiveRegion =
        role === 'manager' ? null : effectiveScope === 'region' ? trendRegionTarget || null : null;

      if (effectiveScope === 'store' && !effectiveStoreId) {
        toast.error('Select a store for store-targeted trends');
        setGenerating(false);
        return;
      }
      if (effectiveScope === 'region' && !effectiveRegion) {
        toast.error('Select a region for region-targeted trends');
        setGenerating(false);
        return;
      }

      const res = await fetch('/api/admin/culture/trends/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({
          scopeType: effectiveScope,
          storeId: effectiveStoreId,
          storeRegion: effectiveRegion,
          selections: {
            topic: trendTopic,
            customQuery: trendCustomQuery,
            audience: trendAudience,
            season: trendSeason,
            region: trendRegion,
            type: trendType,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Trend generation failed');
      }
      const payload = await res.json().catch(() => ({}));
      const createdCandidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
      if (createdCandidates.length > 0) {
        setCandidates(createdCandidates);
      }
      toast.success(
        createdCandidates.length > 0
          ? `Generated ${createdCandidates.length} trend candidates`
          : 'Trend request completed, refreshing candidate list'
      );
      setSelectedCandidateIds([]);
      await fetchCandidates();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Trend generation failed';
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveCandidate = async (candidateId: string) => {
    try {
      setProcessingCandidateId(candidateId);
      const res = await fetch('/api/admin/culture/trends/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ candidateId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Approval failed');
      }
      toast.success('Candidate approved and published');
      await Promise.all([fetchCandidates(), fetchItems()]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Approval failed';
      toast.error(message);
    } finally {
      setProcessingCandidateId(null);
    }
  };

  const handleRejectCandidate = async (candidateId: string) => {
    try {
      setProcessingCandidateId(candidateId);
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
      await fetchCandidates();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reject failed';
      toast.error(message);
    } finally {
      setProcessingCandidateId(null);
    }
  };

  const toggleCandidateSelection = (candidateId: string, checked: boolean) => {
    setSelectedCandidateIds((prev) =>
      checked ? Array.from(new Set([...prev, candidateId])) : prev.filter((id) => id !== candidateId)
    );
  };

  const handleGenerateImagesForSelected = async () => {
    if (!selectedCandidateIds.length) {
      toast.error('Select at least one trend to generate images');
      return;
    }

    try {
      setGeneratingImages(true);
      const res = await fetch('/api/admin/culture/trends/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({
          candidateIds: selectedCandidateIds,
          numberOfImages: imageCount,
          realWorldAccuracy,
          enableSearchGrounding: realWorldAccuracy,
          upscale4k,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'Image generation failed');
      }
      const updatedCandidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
      if (updatedCandidates.length > 0) {
        setCandidates((prev) =>
          prev.map((candidate) => updatedCandidates.find((updated: TrendCandidate) => updated.id === candidate.id) || candidate)
        );
      }
      const generatedCount = Number(payload?.generatedCount || 0);
      const failedCount = Number(payload?.failedCount || 0);
      const totalImagesGenerated = Number(payload?.totalImagesGenerated || generatedCount);
      toast.success(
        failedCount > 0
          ? `Generated ${totalImagesGenerated} image(s) across ${generatedCount} trend(s), ${failedCount} failed`
          : `Generated ${totalImagesGenerated} image(s)`
      );
      await fetchCandidates();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Image generation failed';
      toast.error(message);
    } finally {
      setGeneratingImages(false);
    }
  };

  return (
    <RoleGate minRole="manager" readOnlyFor={['manager']}>
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Culture Feed</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage trends, styling tips, and news for the Culture tab
              </p>
            </div>
            <Button onClick={openAddForm} disabled={!!editingForm}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Item
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-coach-gold/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-coach-gold" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Total Items</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Eye className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{stats.published}</p>
                <p className="text-xs text-gray-500">Published</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <EyeOff className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{stats.drafts}</p>
                <p className="text-xs text-gray-500">Drafts</p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Trend Engine Wizard</h2>
                <p className="text-sm text-gray-500">Answer a few questions, then we fetch 7 trends for review.</p>
              </div>

              <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={cn(
                      'h-8 w-8 rounded-full text-xs font-semibold flex items-center justify-center border',
                      wizardStep === step
                        ? 'bg-coach-gold text-white border-coach-gold'
                        : wizardStep > step
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white text-gray-400 border-gray-200'
                    )}
                  >
                    {step}
                  </div>
                ))}
              </div>

              {wizardStep === 1 && (
                <div className="space-y-3">
                  <Label>What trend area should we research?</Label>
                  <Input value={trendTopic} onChange={(e) => setTrendTopic(e.target.value)} placeholder="e.g. luxury handbag styling" />
                  <Label>Optional custom Perplexity query</Label>
                  <Input
                    value={trendCustomQuery}
                    onChange={(e) => setTrendCustomQuery(e.target.value)}
                    placeholder="e.g. 2026 Coach accessories social trends in US retail"
                  />
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-3">
                  <Label>Who is this content for?</Label>
                  <Input value={trendAudience} onChange={(e) => setTrendAudience(e.target.value)} placeholder="Audience" />
                  <Label>Season</Label>
                  <Input value={trendSeason} onChange={(e) => setTrendSeason(e.target.value)} placeholder="Season" />
                  <Label>Region</Label>
                  <Input value={trendRegion} onChange={(e) => setTrendRegion(e.target.value)} placeholder="Region" />
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-3">
                  <Label>Content Type</Label>
                  <select
                    value={trendType}
                    onChange={(e) => setTrendType(e.target.value as CultureType)}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    {TYPE_SELECT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  {role === 'admin' ? (
                    <>
                      <Label>Scope</Label>
                      <select
                        value={trendScope}
                        onChange={(e) => setTrendScope(e.target.value as 'global' | 'region' | 'store')}
                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="global">All Stores</option>
                        <option value="region">Region</option>
                        <option value="store">Store</option>
                      </select>
                      {trendScope === 'region' && (
                        <select
                          value={trendRegionTarget}
                          onChange={(e) => setTrendRegionTarget(e.target.value)}
                          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Select region</option>
                          {Array.from(new Set(stores.map((s) => s.region).filter(Boolean)))
                            .sort()
                            .map((region) => (
                              <option key={region} value={region}>
                                {region}
                              </option>
                            ))}
                        </select>
                      )}
                      {trendScope === 'store' && (
                        <select
                          value={trendStoreId}
                          onChange={(e) => setTrendStoreId(e.target.value)}
                          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Select store</option>
                          {stores.map((store) => (
                            <option key={store.id} value={store.id}>
                              {store.store_number} - {store.store_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-500">Manager scope is restricted to your store.</p>
                  )}

                  <Button onClick={handleGenerateTrends} disabled={generating || !trendTopic.trim()} className="w-full">
                    {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                    Find 7 Trends
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                <Button variant="ghost" size="sm" disabled={wizardStep === 1} onClick={() => setWizardStep((s) => Math.max(1, s - 1))}>
                  Back
                </Button>
                <Button size="sm" disabled={wizardStep === 3} onClick={() => setWizardStep((s) => Math.min(3, s + 1))}>
                  Next
                </Button>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Trend Review</h2>
                <Button
                  size="sm"
                  onClick={handleGenerateImagesForSelected}
                  disabled={generatingImages || selectedCandidateIds.length === 0}
                >
                  {generatingImages ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Image className="w-4 h-4 mr-1" />}
                  Generate Images ({selectedCandidateIds.length})
                </Button>
              </div>
              <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                <select
                  value={imageCount}
                  onChange={(e) => setImageCount(Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value={1}>1 image per trend</option>
                  <option value={2}>2 images per trend</option>
                  <option value={3}>3 images per trend</option>
                  <option value={4}>4 images per trend</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={realWorldAccuracy}
                    onChange={(e) => setRealWorldAccuracy(e.target.checked)}
                  />
                  Real-world accuracy (grounded)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={upscale4k}
                    onChange={(e) => setUpscale4k(e.target.checked)}
                  />
                  4K upscale-ready
                </label>
              </div>

              {loadingCandidates ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading candidates...
                </div>
              ) : candidates.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">No pending candidates yet. Complete the wizard and click “Find 7 Trends”.</p>
                  <p className="text-xs text-amber-700">
                    If trends are not appearing, verify migration `005_culture_trend_engine.sql` is applied and API keys are configured in Netlify.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[560px] overflow-auto pr-1">
                  {candidates.map((candidate) => (
                    <Card key={candidate.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedCandidateIds.includes(candidate.id)}
                            onChange={(e) => toggleCandidateSelection(candidate.id, e.target.checked)}
                            aria-label={`Select candidate ${candidate.title}`}
                          />
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                            {candidate.scope_type === 'global'
                              ? 'All Stores'
                              : candidate.scope_type === 'region'
                              ? `Region: ${candidate.store_region || 'Unknown'}`
                              : 'Store'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(candidate.created_at).toLocaleString()}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{candidate.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{candidate.description}</p>
                      {candidate.image_url && (
                        <div
                          className="h-32 rounded bg-gray-100 bg-cover bg-center mb-3"
                          style={{ backgroundImage: `url(${candidate.image_url})` }}
                        />
                      )}
                      {!candidate.image_url && (
                        <p className="text-xs text-amber-700 mb-3">Select this trend and generate image before approving.</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveCandidate(candidate.id)}
                          disabled={processingCandidateId === candidate.id || !candidate.image_url}
                        >
                          {processingCandidateId === candidate.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRejectCandidate(candidate.id)}
                          disabled={processingCandidateId === candidate.id}
                        >
                          Reject
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="p-3 mb-6">
            <div className="flex rounded-lg bg-gray-100 p-0.5">
              {FILTER_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                      activeTab === tab.value
                        ? 'bg-white text-coach-mahogany shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </Card>

          {editingForm && !editingForm.id && (
            <div className="mb-6">
              <CultureForm
                data={editingForm}
                onChange={setEditingForm}
                onSave={handleSave}
                onCancel={() => setEditingForm(null)}
                saving={saving}
              />
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-coach-gold" />
                <p className="text-sm text-gray-500">Loading culture feed...</p>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="py-16 flex flex-col items-center justify-center text-center">
              <Sparkles className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No items found</p>
              <p className="text-xs text-gray-400 mt-1">
                {activeTab === 'all' ? 'Add your first culture feed item' : 'No items match this filter'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) =>
                editingForm?.id === item.id ? (
                  <div key={item.id} className="sm:col-span-2 lg:col-span-3">
                    <CultureForm
                      data={editingForm}
                      onChange={setEditingForm}
                      onSave={handleSave}
                      onCancel={() => setEditingForm(null)}
                      saving={saving}
                    />
                  </div>
                ) : (
                  <ContentCard
                    key={item.id}
                    item={item}
                    onEdit={() => openEditForm(item)}
                    onDelete={() => handleDelete(item.id)}
                    onTogglePublish={() => handleTogglePublish(item)}
                    deleting={deletingId === item.id}
                    toggling={togglingId === item.id}
                  />
                )
              )}
            </div>
          )}
        </div>
    </div>
    </RoleGate>
  );
}
