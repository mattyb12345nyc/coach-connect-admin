'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, TrendingUp, TrendingDown, Minus,
  AlertTriangle, BarChart2, Clock, Star, Hash,
  Loader2, RefreshCw, MessageCircle, Calendar,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/components/admin/RoleGate';

interface PeakHour { hour: number; count: number }
interface TopQuestion { query: string; count: number }
interface TopTopic { label: string; count: number; keywords: string[] }
interface RecentConversation {
  id: number;
  session_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  message_count: number | null;
}

interface Analytics {
  thisWeek: number;
  lastWeek: number;
  trend: number;
  failureRate: number;
  avgLength: number;
  peakHours: PeakHour[];
  topQuestions: TopQuestion[];
  topTopics: TopTopic[];
  totalConversations: number;
  totalMessages: number;
  recentConversations: RecentConversation[];
}

function formatHour(h: number): string {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function TrendBadge({ trend }: { trend: number }) {
  if (trend > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
      <TrendingUp className="w-3 h-3" />+{trend}%
    </span>
  );
  if (trend < 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-full">
      <TrendingDown className="w-3 h-3" />{trend}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
      <Minus className="w-3 h-3" />0%
    </span>
  );
}

function StatCard({
  title, value, sub, icon: Icon, iconBg, accent, badge,
}: {
  title: string;
  value: string | number;
  sub?: React.ReactNode;
  icon: React.ElementType;
  iconBg: string;
  accent?: string;
  badge?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', iconBg)}>
          <Icon className={cn('w-5 h-5', accent)} />
        </div>
        {badge}
      </div>
      <p className={cn('text-3xl font-bold mt-3', accent ?? 'text-gray-900')}>{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{title}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </Card>
  );
}

const TOPIC_COLORS = [
  'bg-coach-gold/20 text-amber-800 border-amber-200',
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-indigo-50 text-indigo-700 border-indigo-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-teal-50 text-teal-700 border-teal-200',
];

export default function ChatAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/chat-analytics');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? `Failed (${res.status})`);
      }
      setAnalytics(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const maxHourCount = analytics
    ? Math.max(...analytics.peakHours.map(h => h.count), 1)
    : 1;

  return (
    <RoleGate minRole="store_manager">
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-coach-gold/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-coach-gold" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Coach Chat Analytics</h1>
                <p className="text-sm text-gray-500">
                  Data sourced from CustomGPT.ai analytics
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalytics}
              disabled={loading}
            >
              <RefreshCw className={cn('w-4 h-4 mr-1.5', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-coach-gold" />
              <p className="text-sm text-gray-500">Analysing conversations…</p>
            </div>
          )}

          {error && !loading && (
            <Card className="p-8 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <p className="font-medium text-gray-800 mb-1">Could not load analytics</p>
              <p className="text-sm text-gray-500 mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchAnalytics}>Retry</Button>
            </Card>
          )}

          {!loading && !error && analytics && (
            <div className="space-y-6">

              {/* ── Row 1: Top-line stats ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Conversations This Week"
                  value={analytics.thisWeek}
                  sub={`${analytics.lastWeek} last week`}
                  icon={MessageCircle}
                  iconBg="bg-coach-gold/15"
                  accent="text-coach-gold"
                  badge={<TrendBadge trend={analytics.trend} />}
                />
                <StatCard
                  title="Failure Rate"
                  value={`${analytics.failureRate}%`}
                  sub="No-answer responses"
                  icon={AlertTriangle}
                  iconBg={analytics.failureRate > 20 ? 'bg-rose-50' : 'bg-emerald-50'}
                  accent={analytics.failureRate > 20 ? 'text-rose-500' : 'text-emerald-600'}
                />
                <StatCard
                  title="Avg Conversation Length"
                  value={analytics.avgLength > 0 ? `${analytics.avgLength} msg` : '—'}
                  sub="Messages per session"
                  icon={BarChart2}
                  iconBg="bg-blue-50"
                  accent="text-blue-600"
                />
                <StatCard
                  title="Total Conversations"
                  value={analytics.totalConversations}
                  sub={`${analytics.totalMessages} messages analysed`}
                  icon={Hash}
                  iconBg="bg-purple-50"
                  accent="text-purple-600"
                />
              </div>

              {/* ── Row 2: Peak Hours Chart + Topic Clusters ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Peak Usage Hours */}
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-coach-gold" />
                    <h2 className="text-sm font-semibold text-gray-800">Peak Usage Times</h2>
                    <span className="text-xs text-gray-400 ml-auto">Hour of day</span>
                  </div>
                  {maxHourCount <= 1 ? (
                    <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                      Not enough data yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart
                        data={analytics.peakHours}
                        margin={{ top: 4, right: 0, left: -24, bottom: 0 }}
                        barCategoryGap="15%"
                      >
                        <XAxis
                          dataKey="hour"
                          tickFormatter={formatHour}
                          tick={{ fontSize: 9, fill: '#9ca3af' }}
                          tickLine={false}
                          axisLine={false}
                          interval={2}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fill: '#9ca3af' }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          formatter={(v: number) => [v, 'messages']}
                          labelFormatter={(h: number) => `${formatHour(h)} – ${formatHour((h + 1) % 24)}`}
                          contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
                        />
                        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                          {analytics.peakHours.map((entry) => (
                            <Cell
                              key={entry.hour}
                              fill={entry.count === maxHourCount ? '#C5A028' : '#e5d7a3'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                {/* Topic Clusters */}
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-4 h-4 text-coach-gold" />
                    <h2 className="text-sm font-semibold text-gray-800">Question Topic Clusters</h2>
                  </div>
                  {analytics.topTopics.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                      Not enough data yet
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {analytics.topTopics.map((t, i) => {
                        const pct = Math.round((t.count / analytics.totalMessages) * 100);
                        return (
                          <div key={t.label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                                TOPIC_COLORS[i % TOPIC_COLORS.length]
                              )}>
                                {t.label}
                              </span>
                              <span className="text-xs text-gray-400">{t.count} q · {pct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-coach-gold/60 transition-all"
                                style={{ width: `${Math.min(100, pct * 3)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>

              {/* ── Row 3: Top 5 Questions ── */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-coach-gold" />
                  <h2 className="text-sm font-semibold text-gray-800">Top 5 Most Asked Questions</h2>
                  <span className="text-xs text-gray-400 ml-auto">verbatim</span>
                </div>
                {analytics.topQuestions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Not enough data yet</p>
                ) : (
                  <ol className="space-y-2.5">
                    {analytics.topQuestions.map((q, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-coach-gold/15 text-coach-gold text-xs font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-snug">{q.query}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            asked {q.count} time{q.count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>

              {/* ── Recent Conversations List ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-700">Recent Conversations</h2>
                  <span className="text-xs text-gray-400">({analytics.recentConversations.length})</span>
                </div>

                {analytics.recentConversations.length === 0 ? (
                  <Card className="py-12 text-center text-sm text-gray-400">
                    No conversations yet
                  </Card>
                ) : (
                  <Card className="divide-y divide-gray-100 overflow-hidden">
                    {analytics.recentConversations.map(conv => (
                      <div
                        key={conv.id}
                        className="flex items-center gap-4 px-5 py-3.5"
                      >
                        <div className="w-8 h-8 rounded-full bg-coach-gold/10 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-3.5 h-3.5 text-coach-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {conv.name || `Conversation #${conv.id}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(conv.created_at)}
                            {conv.message_count != null && (
                              <> · {conv.message_count} message{conv.message_count !== 1 ? 's' : ''}</>
                            )}
                          </p>
                        </div>
                        <span className="text-xs text-gray-300 flex-shrink-0">via CustomGPT</span>
                      </div>
                    ))}
                  </Card>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </RoleGate>
  );
}
