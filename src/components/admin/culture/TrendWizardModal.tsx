'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Trash2,
  Save,
  Loader2,
  Pencil,
  X,
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
  Image,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  CultureType,
  TrendCandidate,
  StoreSummary,
  TYPE_CONFIG,
  TOPIC_SUGGESTIONS,
  SEASON_OPTIONS,
  MARKET_OPTIONS,
  buildCandidateImageSrc,
} from '@/lib/admin/culture-types';

// ─── Wizard Sub-Components (private helpers) ───

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

export function TrendWizardModal({
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
