'use client';

import { Sparkles, Plus, Eye, EyeOff, CalendarClock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/components/admin/RoleGate';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useCultureFeed } from '@/hooks/admin/useCultureFeed';
import { FILTER_TABS, FEED_STATUS_FILTERS, EMPTY_FORM } from '@/lib/admin/culture-types';
import type { FeedStatusFilter } from '@/lib/admin/culture-types';

import { CultureForm } from '@/components/admin/culture/CultureForm';
import { ContentCard } from '@/components/admin/culture/ContentCard';
import { TrendWizardModal } from '@/components/admin/culture/TrendWizardModal';
import { PendingReviewBanner } from '@/components/admin/culture/PendingReviewBanner';
import { FeedPendingReviewSection } from '@/components/admin/culture/FeedPendingReviewSection';

export default function CultureFeedPage() {
  const { role, storeId } = useAdminAuth();
  const hook = useCultureFeed({ role, storeId });

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
              <Button variant="outline" onClick={() => hook.setEditingForm({ ...EMPTY_FORM })} disabled={!!hook.editingForm}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Item
              </Button>
              <Button onClick={() => { hook.setWizardInitialPhase('wizard'); hook.setWizardOpen(true); }} className="bg-coach-gold hover:bg-coach-gold/90 text-white">
                <Sparkles className="w-4 h-4 mr-1.5" /> Create Trends
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-coach-gold/10 flex items-center justify-center"><Sparkles className="h-5 w-5 text-coach-gold" /></div>
              <div><p className="text-2xl font-semibold text-gray-900">{hook.stats.total}</p><p className="text-xs text-gray-500">Total Items</p></div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center"><Eye className="h-5 w-5 text-emerald-600" /></div>
              <div><p className="text-2xl font-semibold text-gray-900">{hook.stats.published}</p><p className="text-xs text-gray-500">Live</p></div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center"><CalendarClock className="h-5 w-5 text-violet-600" /></div>
              <div><p className="text-2xl font-semibold text-gray-900">{hook.stats.scheduled}</p><p className="text-xs text-gray-500">Scheduled</p></div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center"><EyeOff className="h-5 w-5 text-gray-500" /></div>
              <div><p className="text-2xl font-semibold text-gray-900">{hook.stats.drafts}</p><p className="text-xs text-gray-500">Drafts</p></div>
            </Card>
          </div>

          <FeedPendingReviewSection
            items={hook.pendingReviewItems}
            processingId={hook.reviewingFeedItemId}
            errors={hook.pendingReviewErrors}
            onApprove={hook.handleApprovePendingFeedItem}
            onReject={async (item) => { hook.setConfirmAction({ type: 'rejectFeed', item, title: item.title }); }}
          />

          <PendingReviewBanner count={hook.candidates.length} onClick={() => { hook.setWizardInitialPhase('review'); hook.setWizardOpen(true); }} />

          {/* Filter tabs */}
          <Card className="p-3 mb-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex rounded-lg bg-gray-100 p-0.5">
                {FILTER_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button key={tab.value} onClick={() => hook.setActiveTab(tab.value)} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all', hook.activeTab === tab.value ? 'bg-white text-coach-mahogany shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {tab.value === 'scheduled' && hook.stats.scheduled > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700">{hook.stats.scheduled}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-500 whitespace-nowrap">Status</Label>
                <select value={hook.feedStatusFilter} onChange={(e) => hook.setFeedStatusFilter(e.target.value as FeedStatusFilter)} className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold">
                  {FEED_STATUS_FILTERS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                </select>
              </div>
            </div>
          </Card>

          {/* Add form */}
          {hook.editingForm && !hook.editingForm.id && (
            <div className="mb-6">
              <CultureForm data={hook.editingForm} onChange={hook.setEditingForm} onSave={hook.handleSave} onCancel={() => hook.setEditingForm(null)} saving={hook.saving} adminHeaders={hook.adminHeaders} />
            </div>
          )}

          {/* Content grid */}
          {hook.loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-coach-gold" />
                <p className="text-sm text-gray-500">Loading pulse feed...</p>
              </div>
            </div>
          ) : hook.filteredItems.length === 0 ? (
            <Card className="py-16 flex flex-col items-center justify-center text-center">
              <Sparkles className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No items found</p>
              <p className="text-xs text-gray-400 mt-1">{hook.activeTab === 'all' ? 'Add your first pulse feed item' : 'No items match this filter'}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hook.filteredItems.map((item) =>
                hook.editingForm?.id === item.id ? (
                  <div key={item.id} className="sm:col-span-2 lg:col-span-3">
                    <CultureForm data={hook.editingForm} onChange={hook.setEditingForm} onSave={hook.handleSave} onCancel={() => hook.setEditingForm(null)} saving={hook.saving} adminHeaders={hook.adminHeaders} />
                  </div>
                ) : (
                  <ContentCard key={item.id} item={item} onEdit={() => hook.setEditingForm({ id: item.id, type: item.type, category: item.category, title: item.title, description: item.description, image_url: item.image_url, engagement_text: item.engagement_text, is_published: item.is_published, publish_date: item.publish_date ?? null, sort_order: item.sort_order })} onDelete={() => hook.setConfirmAction({ type: 'delete', id: item.id, title: item.title })} onTogglePublish={() => item.is_published ? hook.setConfirmAction({ type: 'unpublish', item, title: item.title }) : hook.handleTogglePublish(item)} deleting={hook.deletingId === item.id} toggling={hook.togglingId === item.id} />
                )
              )}
            </div>
          )}
        </div>

        <TrendWizardModal
          open={hook.wizardOpen}
          onClose={() => hook.setWizardOpen(false)}
          initialPhase={hook.wizardInitialPhase}
          role={role}
          storeId={storeId}
          stores={hook.stores}
          candidates={hook.candidates}
          loadingCandidates={hook.loadingCandidates}
          selectedCandidateIds={hook.selectedCandidateIds}
          onToggleCandidateSelection={hook.toggleCandidateSelection}
          onGenerate={hook.handleGenerateTrends}
          generating={hook.generating}
          onApprove={hook.handleApproveCandidate}
          onReject={(id) => hook.setConfirmAction({ type: 'rejectCandidate', id })}
          onBulkReject={(ids) => hook.setConfirmAction({ type: 'bulkReject', ids })}
          onUpdateCandidate={hook.handleUpdateCandidate}
          processingCandidateId={hook.processingCandidateId}
          bulkRejecting={hook.bulkRejecting}
          onGenerateImages={hook.handleGenerateImagesForSelected}
          generatingImages={hook.generatingImages}
          imageCount={hook.imageCount}
          onImageCountChange={hook.setImageCount}
          realWorldAccuracy={hook.realWorldAccuracy}
          onRealWorldAccuracyChange={hook.setRealWorldAccuracy}
          upscale4k={hook.upscale4k}
          onUpscale4kChange={hook.setUpscale4k}
        />

        <ConfirmDialog
          isOpen={!!hook.confirmAction}
          title={
            hook.confirmAction?.type === 'delete' ? 'Delete this card?'
            : hook.confirmAction?.type === 'unpublish' ? 'Unpublish this card?'
            : hook.confirmAction?.type === 'rejectFeed' ? 'Reject this pulse card?'
            : hook.confirmAction?.type === 'rejectCandidate' ? 'Reject this candidate?'
            : hook.confirmAction?.type === 'bulkReject' ? `Delete ${hook.confirmAction?.ids?.length ?? 0} candidate(s)?`
            : 'Confirm'
          }
          description={
            hook.confirmAction?.type === 'delete' ? `"${hook.confirmAction.title}" will be permanently removed.`
            : hook.confirmAction?.type === 'unpublish' ? `"${hook.confirmAction.title}" will be hidden from associates until republished.`
            : hook.confirmAction?.type === 'rejectFeed' ? `"${hook.confirmAction.title}" will be rejected and will not appear in the feed.`
            : hook.confirmAction?.type === 'rejectCandidate' ? 'This candidate will be rejected and removed from the review queue.'
            : hook.confirmAction?.type === 'bulkReject' ? `${hook.confirmAction.ids?.length ?? 0} selected candidate(s) will be rejected and removed.`
            : ''
          }
          confirmLabel={
            hook.confirmAction?.type === 'delete' ? 'Delete'
            : hook.confirmAction?.type === 'unpublish' ? 'Unpublish'
            : hook.confirmAction?.type === 'bulkReject' ? 'Delete All'
            : 'Reject'
          }
          onConfirm={() => {
            if (!hook.confirmAction) return;
            switch (hook.confirmAction.type) {
              case 'delete': hook.handleDelete(hook.confirmAction.id!); break;
              case 'unpublish': hook.handleTogglePublish(hook.confirmAction.item!); break;
              case 'rejectFeed': hook.handleRejectPendingFeedItem(hook.confirmAction.item!); break;
              case 'rejectCandidate': hook.handleRejectCandidate(hook.confirmAction.id!); break;
              case 'bulkReject': hook.handleBulkReject(hook.confirmAction.ids!); break;
            }
            hook.setConfirmAction(null);
          }}
          onCancel={() => hook.setConfirmAction(null)}
        />
      </div>
    </RoleGate>
  );
}
