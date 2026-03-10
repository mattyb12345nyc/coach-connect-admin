'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageSquareText,
  Search,
  Sparkles,
  Store,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/loading';
import {
  normalizeHighlights,
  normalizeScoreBreakdown,
  normalizeTranscript,
  type PracticeSessionRecord,
} from '@/lib/admin-practice';
import { cn } from '@/lib/utils';

interface StoreOption {
  id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
}

interface AssociateSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  store_id: string | null;
  name: string;
}

interface SessionStoreSummary {
  id: string;
  store_name: string | null;
  store_number: string | null;
  city: string | null;
  state: string | null;
}

interface PracticeSessionListItem extends PracticeSessionRecord {
  associate: AssociateSummary | null;
  store: SessionStoreSummary | null;
}

interface PracticeStatsResponse {
  total_sessions: number;
  completed_sessions: number;
  average_score: number | null;
  sessions_by_difficulty: Array<{ difficulty: string; count: number }>;
  sessions_by_persona: Array<{ persona: string; count: number }>;
  top_performers: Array<{
    user_id: string;
    name: string;
    avatar_url: string | null;
    average_score: number;
    sessions_count: number;
    store_id: string | null;
    store_name: string | null;
    store_number: string | null;
  }>;
  sessions_this_week: number;
  top_performing_store: {
    store_id: string | null;
    store_name: string | null;
    store_number: string | null;
    average_score: number;
    sessions_count: number;
  } | null;
}

interface PracticeSessionsResponse {
  sessions: PracticeSessionListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type SessionStatusDisplay = 'completed' | 'scoring_error' | 'pending';

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'All Difficulties' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'scored', label: 'Completed' },
  { value: 'scoring_failed', label: 'Scoring Error' },
  { value: 'pending_rescore', label: 'Pending' },
];

function formatDuration(value: number | null): string {
  if (!value || value < 0) return '—';
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatRelativeDate(value: string): string {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return value;
  }
}

function formatAbsoluteDate(value: string): string {
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function getScoreClasses(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-rose-600';
}

function getStatusDisplay(scoringStatus: string | null): SessionStatusDisplay {
  switch (scoringStatus) {
    case 'scored':
      return 'completed';
    case 'scoring_failed':
      return 'scoring_error';
    default:
      return 'pending';
  }
}

function getStatusLabel(status: SessionStatusDisplay): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'scoring_error':
      return 'Scoring Error';
    default:
      return 'Pending';
  }
}

function getStatusClasses(status: SessionStatusDisplay): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700';
    case 'scoring_error':
      return 'bg-rose-50 text-rose-700';
    default:
      return 'bg-amber-50 text-amber-700';
  }
}

function toDateRangeValue(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function buildDateFrom(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function buildDateTo(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

function StatCard({
  label,
  value,
  sublabel,
  loading,
}: {
  label: string;
  value: string;
  sublabel?: string;
  loading: boolean;
}) {
  return (
    <Card className="p-4">
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-4 w-24" />
          {sublabel ? <Skeleton className="h-3 w-20" /> : null}
        </div>
      ) : (
        <>
          <p className="text-2xl font-semibold text-coach-black">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{label}</p>
          {sublabel ? <p className="text-[11px] text-gray-400 mt-1">{sublabel}</p> : null}
        </>
      )}
    </Card>
  );
}

function SessionDetailDrawer({
  session,
  onClose,
}: {
  session: PracticeSessionListItem | null;
  onClose: () => void;
}) {
  if (!session) return null;

  const scoreBreakdown = normalizeScoreBreakdown(session.scores);
  const highlights = normalizeHighlights(session.highlights);
  const transcript = normalizeTranscript(session.transcript);
  const status = getStatusDisplay(session.scoring_status);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-coach-black truncate">
                {session.associate?.name ?? 'Unknown Associate'}
              </h2>
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', getStatusClasses(status))}>
                {getStatusLabel(status)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {session.store?.store_name
                ? `${session.store.store_number ?? '—'} — ${session.store.store_name}`
                : 'No store assigned'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 ml-2"
            aria-label="Close session details"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3">
              <p className={cn('text-xl font-semibold', getScoreClasses(session.overall_score))}>
                {session.overall_score !== null ? `${session.overall_score}%` : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Overall Score</p>
            </Card>
            <Card className="p-3">
              <p className="text-xl font-semibold text-coach-black">
                {session.persona || '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Persona</p>
            </Card>
            <Card className="p-3">
              <p className="text-xl font-semibold text-coach-black capitalize">
                {session.difficulty || '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Difficulty</p>
            </Card>
            <Card className="p-3">
              <p className="text-xl font-semibold text-coach-black">
                {formatDuration(session.duration_seconds)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Duration</p>
            </Card>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Session Details
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium text-gray-700">Date:</span> {formatAbsoluteDate(session.created_at)}</p>
              <p><span className="font-medium text-gray-700">Associate:</span> {session.associate?.name ?? 'Unknown Associate'}</p>
              <p><span className="font-medium text-gray-700">Store:</span> {session.store?.store_name ? `${session.store.store_number ?? '—'} — ${session.store.store_name}` : 'No store assigned'}</p>
            </div>
          </section>

          {scoreBreakdown.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Score Breakdown
              </h3>
              <div className="space-y-2">
                {scoreBreakdown.map((entry) => (
                  <div key={entry.key} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <span className="text-sm text-gray-700">{entry.key}</span>
                    <span className={cn('text-sm font-semibold', getScoreClasses(entry.score))}>
                      {entry.score}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {highlights.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Highlights
              </h3>
              <ul className="space-y-2">
                {highlights.map((highlight, index) => (
                  <li key={`${highlight.text}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-coach-gold mt-0.5 flex-shrink-0" />
                      <div>
                        {highlight.type ? (
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                            {highlight.type}
                          </p>
                        ) : null}
                        <p className="text-sm text-gray-700">{highlight.text}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {session.summary && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Summary
              </h3>
              <Card className="p-4">
                <p className="text-sm leading-relaxed text-gray-700">{session.summary}</p>
              </Card>
            </section>
          )}

          {transcript.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Transcript
              </h3>
              <div className="space-y-3">
                {transcript.map((entry, index) => {
                  const isAssociate = entry.speaker.toLowerCase().includes('associate');
                  const isCustomer = entry.speaker.toLowerCase().includes('customer');

                  return (
                    <div
                      key={`${entry.speaker}-${index}`}
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-3 shadow-sm',
                        isAssociate
                          ? 'ml-auto bg-coach-gold text-white'
                          : isCustomer
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-50 text-blue-900'
                      )}
                    >
                      <p className={cn(
                        'text-[11px] font-semibold uppercase tracking-wider mb-1',
                        isAssociate ? 'text-white/80' : 'text-gray-500'
                      )}>
                        {entry.speaker}
                      </p>
                      <p className="text-sm leading-relaxed">{entry.text}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {session.scoring_error && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-rose-700 uppercase tracking-wider">
                Scoring Error
              </h3>
              <Card className="p-4 border-rose-200 bg-rose-50">
                <p className="text-sm text-rose-700">{session.scoring_error}</p>
              </Card>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

export function PracticeSessionsPanel() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [stats, setStats] = useState<PracticeStatsResponse | null>(null);
  const [sessionsResponse, setSessionsResponse] = useState<PracticeSessionsResponse | null>(null);
  const [selectedSession, setSelectedSession] = useState<PracticeSessionListItem | null>(null);

  const [storesLoading, setStoresLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [statsError, setStatsError] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [storeId, setStoreId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [scoringStatus, setScoringStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [storeId, difficulty, scoringStatus, dateFrom, dateTo]);

  const fetchStores = useCallback(async () => {
    try {
      setStoresLoading(true);
      const res = await fetch('/api/admin/stores?status=OPEN');
      if (!res.ok) throw new Error('Failed to load stores');
      setStores(await res.json());
    } catch {
      setStores([]);
    } finally {
      setStoresLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      const params = new URLSearchParams();
      if (storeId) params.set('storeId', storeId);
      const res = await fetch(`/api/admin/practice-stats${params.toString() ? `?${params.toString()}` : ''}`);
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to load practice stats');
      }
      setStats(await res.json());
    } catch (error) {
      setStats(null);
      setStatsError(error instanceof Error ? error.message : 'Failed to load practice stats');
    } finally {
      setStatsLoading(false);
    }
  }, [storeId]);

  const fetchSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      setSessionsError(null);
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });

      if (search) params.set('search', search);
      if (storeId) params.set('storeId', storeId);
      if (difficulty) params.set('difficulty', difficulty);
      if (scoringStatus) params.set('scoring_status', scoringStatus);

      const dateFromIso = buildDateFrom(dateFrom);
      const dateToIso = buildDateTo(dateTo);
      if (dateFromIso) params.set('dateFrom', dateFromIso);
      if (dateToIso) params.set('dateTo', dateToIso);

      const res = await fetch(`/api/admin/practice-sessions?${params.toString()}`);
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to load practice sessions');
      }

      setSessionsResponse(await res.json());
    } catch (error) {
      setSessionsResponse(null);
      setSessionsError(error instanceof Error ? error.message : 'Failed to load practice sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, [dateFrom, dateTo, difficulty, page, scoringStatus, search, storeId]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const sessions = sessionsResponse?.sessions ?? [];
  const pagination = sessionsResponse?.pagination ?? {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  };

  const topStoreLabel = useMemo(() => {
    if (!stats?.top_performing_store) return 'No store data yet';
    const { store_number, store_name, average_score } = stats.top_performing_store;
    const primaryLabel = store_name
      ? `${store_number ?? '—'} — ${store_name}`
      : 'Unknown Store';
    return `${primaryLabel} · ${average_score}%`;
  }, [stats?.top_performing_store]);

  return (
    <>
      <section className="mb-8 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-coach-mahogany">Practice Sessions</h2>
          <p className="text-sm text-gray-500 mt-1">
            Review associate roleplay sessions, scoring, transcripts, and coaching highlights.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Sessions"
            value={stats?.total_sessions != null ? String(stats.total_sessions) : '—'}
            loading={statsLoading}
          />
          <StatCard
            label="Average Score"
            value={stats?.average_score != null ? `${stats.average_score}%` : '—'}
            loading={statsLoading}
          />
          <StatCard
            label="Sessions This Week"
            value={stats?.sessions_this_week != null ? String(stats.sessions_this_week) : '—'}
            loading={statsLoading}
          />
          <StatCard
            label="Top Performing Store"
            value={stats?.top_performing_store?.store_name ?? '—'}
            sublabel={stats?.top_performing_store ? topStoreLabel : undefined}
            loading={statsLoading}
          />
        </div>

        {statsError ? (
          <Card className="p-4 border-amber-200 bg-amber-50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Could not load practice stats</p>
                <p className="text-sm text-amber-700 mt-1">{statsError}</p>
              </div>
            </div>
          </Card>
        ) : null}

        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="xl:col-span-2">
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Search Associate</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by associate name..."
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Store</Label>
              <select
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
                disabled={storesLoading}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
              >
                <option value="">All Stores</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.store_number} — {store.store_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Difficulty</Label>
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
              >
                {DIFFICULTY_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Scoring Status</Label>
              <select
                value={scoringStatus}
                onChange={(event) => setScoringStatus(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Date From</Label>
              <Input
                type="date"
                value={toDateRangeValue(dateFrom)}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Date To</Label>
              <Input
                type="date"
                value={toDateRangeValue(dateTo)}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-semibold text-coach-black">Session History</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {pagination.total} session{pagination.total === 1 ? '' : 's'} found
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSessions} disabled={sessionsLoading}>
              Refresh
            </Button>
          </div>

          {sessionsError ? (
            <div className="p-6">
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-rose-800">Could not load practice sessions</p>
                    <p className="text-sm text-rose-700 mt-1">{sessionsError}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : sessionsLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="grid grid-cols-7 gap-3">
                  {Array.from({ length: 7 }).map((__, cellIndex) => (
                    <Skeleton key={cellIndex} className="h-10 w-full" />
                  ))}
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <MessageSquareText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No practice sessions found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or date range.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3">Associate</th>
                      <th className="px-4 py-3">Store</th>
                      <th className="px-4 py-3">Persona</th>
                      <th className="px-4 py-3">Difficulty</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {sessions.map((session) => {
                      const status = getStatusDisplay(session.scoring_status);

                      return (
                        <tr
                          key={session.id}
                          onClick={() => setSelectedSession(session)}
                          className="cursor-pointer hover:bg-coach-gold/[0.03] transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {session.associate?.avatar_url ? (
                                <img
                                  src={session.associate.avatar_url}
                                  alt={session.associate.name}
                                  className="h-9 w-9 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-coach-gold/10 flex items-center justify-center">
                                  <User className="h-4 w-4 text-coach-gold" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {session.associate?.name ?? 'Unknown Associate'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {session.store?.store_name
                              ? `${session.store.store_number ?? '—'} — ${session.store.store_name}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{session.persona || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 capitalize">{session.difficulty || '—'}</td>
                          <td className={cn('px-4 py-3 text-sm font-semibold', getScoreClasses(session.overall_score))}>
                            {session.overall_score !== null ? `${session.overall_score}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatDuration(session.duration_seconds)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatRelativeDate(session.created_at)}</td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', getStatusClasses(status))}>
                              {getStatusLabel(status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={pagination.page <= 1 || sessionsLoading}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={pagination.page >= pagination.totalPages || sessionsLoading}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </section>

      <SessionDetailDrawer session={selectedSession} onClose={() => setSelectedSession(null)} />
    </>
  );
}
