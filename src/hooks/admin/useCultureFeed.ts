import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase';
import type { CultureType, CultureItem, TrendCandidate, StoreSummary, CultureFormData, FilterTab, FeedStatusFilter, ImageStatus } from '@/lib/admin/culture-types';
import { isScheduled } from '@/lib/admin/culture-types';

export function useCultureFeed({ role, storeId }: { role: string; storeId: string | null }) {
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
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'unpublish' | 'rejectFeed' | 'rejectCandidate' | 'bulkReject';
    id?: string;
    item?: CultureItem;
    ids?: string[];
    title?: string;
  } | null>(null);
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

  return {
    // Feed data
    items, filteredItems, stats, loading,
    activeTab, setActiveTab,
    feedStatusFilter, setFeedStatusFilter,
    fetchItems,

    // Pending review
    pendingReviewItems, reviewingFeedItemId,
    pendingReviewErrors,
    handleApprovePendingFeedItem, handleRejectPendingFeedItem,
    fetchPendingReviewItems,

    // Form
    editingForm, setEditingForm,
    saving, handleSave,
    adminHeaders,

    // Mutations
    deletingId, togglingId,
    handleDelete, handleTogglePublish,

    // Confirm dialog
    confirmAction, setConfirmAction,

    // Wizard / candidates
    candidates, loadingCandidates,
    generating, processingCandidateId,
    bulkRejecting,
    selectedCandidateIds,
    imageCount, setImageCount,
    realWorldAccuracy, setRealWorldAccuracy,
    upscale4k, setUpscale4k,
    generatingImages,
    wizardOpen, setWizardOpen,
    wizardInitialPhase, setWizardInitialPhase,
    stores,

    // Wizard handlers
    handleGenerateTrends,
    handleApproveCandidate,
    handleRejectCandidate,
    handleBulkReject,
    toggleCandidateSelection,
    handleUpdateCandidate,
    handleGenerateImagesForSelected,
  };
}
