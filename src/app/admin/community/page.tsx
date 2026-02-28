'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Users,
  Flag,
  Pin,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  MessageCircle,
  Heart,
  Bookmark,
  AlertTriangle,
  Lightbulb,
  Award,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CommunityPost {
  id: string;
  author_name: string;
  author_avatar: string | null;
  author_role: string;
  author_store: string;
  content: string;
  post_type: 'insight' | 'success' | 'question';
  is_pinned: boolean;
  is_flagged: boolean;
  status: 'active' | 'hidden' | 'removed';
  likes_count: number;
  comments_count: number;
  saves_count: number;
  created_at: string;
}

type PostTypeFilter = 'all' | 'insight' | 'success' | 'question';
type StatusFilter = 'all' | 'active' | 'hidden' | 'removed';

const POST_TYPE_TABS: { value: PostTypeFilter; label: string; icon: typeof Lightbulb }[] = [
  { value: 'all', label: 'All', icon: Users },
  { value: 'insight', label: 'Insights', icon: Lightbulb },
  { value: 'success', label: 'Wins', icon: Award },
  { value: 'question', label: 'Q&A', icon: HelpCircle },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'removed', label: 'Removed' },
];

const POST_TYPE_CONFIG: Record<CommunityPost['post_type'], { label: string; icon: typeof Lightbulb; bg: string; text: string }> = {
  insight: { label: 'Insight', icon: Lightbulb, bg: 'bg-amber-50', text: 'text-amber-700' },
  success: { label: 'Win', icon: Award, bg: 'bg-emerald-50', text: 'text-emerald-700' },
  question: { label: 'Q&A', icon: HelpCircle, bg: 'bg-blue-50', text: 'text-blue-700' },
};

const STATUS_CONFIG: Record<CommunityPost['status'], { label: string; bg: string; text: string; dot: string }> = {
  active: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  hidden: { label: 'Hidden', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  removed: { label: 'Removed', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<PostTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [updatingPosts, setUpdatingPosts] = useState<Set<string>>(new Set());

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (flaggedOnly) params.set('flagged', 'true');

      const qs = params.toString();
      const res = await fetch(`/api/admin/community${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data);
    } catch {
      toast.error('Failed to load community posts');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, flaggedOnly]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const updatePost = async (id: string, updates: Partial<CommunityPost>) => {
    setUpdatingPosts(prev => new Set(prev).add(id));
    try {
      const res = await fetch('/api/admin/community', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setPosts(prev => prev.map(p => (p.id === id ? updated : p)));
      toast.success('Post updated');
    } catch {
      toast.error('Failed to update post');
    } finally {
      setUpdatingPosts(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const removePost = async (id: string) => {
    setUpdatingPosts(prev => new Set(prev).add(id));
    try {
      const res = await fetch('/api/admin/community', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Delete failed');
      setPosts(prev => prev.filter(p => p.id !== id));
      toast.success('Post removed');
    } catch {
      toast.error('Failed to remove post');
    } finally {
      setUpdatingPosts(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedPosts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stats = {
    total: posts.length,
    active: posts.filter(p => p.status === 'active').length,
    flagged: posts.filter(p => p.is_flagged).length,
  };

  return (
    <PageLayout showNavbar={false} showMobileNavigation={false}>
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-coach-black tracking-tight">Community</h1>
            <p className="mt-1 text-sm text-gray-500">Moderate posts and manage community content</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-coach-gold/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-coach-gold" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-coach-black">{stats.total}</p>
                <p className="text-xs text-gray-500">Total Posts</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Eye className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-coach-black">{stats.active}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-coach-black">{stats.flagged}</p>
                <p className="text-xs text-gray-500">Flagged</p>
              </div>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="p-3 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* Type Tabs */}
              <div className="flex rounded-lg bg-gray-100 p-0.5">
                {POST_TYPE_TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setTypeFilter(tab.value)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                        typeFilter === tab.value
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

              <div className="h-6 w-px bg-gray-200" />

              {/* Flagged Toggle */}
              <button
                onClick={() => setFlaggedOnly(!flaggedOnly)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                  flaggedOnly
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                )}
              >
                <Flag className="h-3.5 w-3.5" />
                Flagged
              </button>

              {/* Status Dropdown */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="ml-auto rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {/* Post List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-coach-gold" />
            </div>
          ) : posts.length === 0 ? (
            <Card className="py-16 flex flex-col items-center justify-center text-center">
              <Users className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No posts found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {posts.map(post => {
                const typeConfig = POST_TYPE_CONFIG[post.post_type];
                const statusConfig = STATUS_CONFIG[post.status];
                const TypeIcon = typeConfig.icon;
                const isExpanded = expandedPosts.has(post.id);
                const isUpdating = updatingPosts.has(post.id);
                const shouldTruncate = post.content.length > 200;

                return (
                  <Card
                    key={post.id}
                    className={cn(
                      'p-5 transition-all',
                      post.is_pinned && 'ring-1 ring-coach-gold/40 bg-coach-gold/[0.02]',
                      post.is_flagged && 'ring-1 ring-red-200 bg-red-50/30',
                      isUpdating && 'opacity-60 pointer-events-none'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="h-9 w-9 rounded-full bg-coach-mahogany/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-coach-mahogany">
                          {post.author_name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Author + Meta Row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-coach-black">
                            {post.author_name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {post.author_role} · {post.author_store}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatRelativeTime(post.created_at)}
                          </span>

                          {/* Badges */}
                          <div className="flex items-center gap-1.5 ml-auto">
                            {post.is_pinned && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-coach-gold/10 text-coach-gold">
                                <Pin className="h-3 w-3" />
                                Pinned
                              </span>
                            )}
                            <span className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium', typeConfig.bg, typeConfig.text)}>
                              <TypeIcon className="h-3 w-3" />
                              {typeConfig.label}
                            </span>
                            <span className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium', statusConfig.bg, statusConfig.text)}>
                              <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dot)} />
                              {statusConfig.label}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="mt-2">
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {shouldTruncate && !isExpanded
                              ? post.content.slice(0, 200) + '...'
                              : post.content}
                          </p>
                          {shouldTruncate && (
                            <button
                              onClick={() => toggleExpanded(post.id)}
                              className="text-xs font-medium text-coach-gold hover:text-coach-mahogany mt-1 transition-colors"
                            >
                              {isExpanded ? 'Show less' : 'Read more'}
                            </button>
                          )}
                        </div>

                        {/* Engagement + Actions Row */}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Heart className="h-3.5 w-3.5" />
                              {post.likes_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3.5 w-3.5" />
                              {post.comments_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <Bookmark className="h-3.5 w-3.5" />
                              {post.saves_count}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => updatePost(post.id, { is_pinned: !post.is_pinned })}
                              title={post.is_pinned ? 'Unpin' : 'Pin'}
                              className={cn(post.is_pinned && 'text-coach-gold')}
                            >
                              <Pin className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() =>
                                updatePost(post.id, {
                                  status: post.status === 'hidden' ? 'active' : 'hidden',
                                })
                              }
                              title={post.status === 'hidden' ? 'Show' : 'Hide'}
                            >
                              {post.status === 'hidden' ? (
                                <Eye className="h-3.5 w-3.5" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => updatePost(post.id, { is_flagged: !post.is_flagged })}
                              title={post.is_flagged ? 'Unflag' : 'Flag'}
                              className={cn(post.is_flagged && 'text-red-500')}
                            >
                              <Flag className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removePost(post.id)}
                              title="Remove"
                              className="hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
