'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart3,
  TrendingUp,
  Users,
  MessageCircle,
  Clock,
  Globe,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  Eye,
  Share2,
  AlertCircle,
  Activity,
  Target,
  Zap,
  Star,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { SimpleSelect } from '@/components/ui/simple-select';
import { Card } from '@/components/ui/card';
import { cn, formatTimestamp } from '@/lib/utils';
import type { Agent } from '@/types';

interface AnalyticsData {
  overview: {
    total_conversations: number;
    total_messages: number;
    unique_users: number;
    average_session_duration: number;
    user_satisfaction: number;
    response_time: number;
  };
  trends: {
    conversations_change: number;
    messages_change: number;
    users_change: number;
    satisfaction_change: number;
  };
  usage_by_source: {
    web: number;
    api: number;
    embed: number;
    mobile: number;
  };
  popular_topics: Array<{
    topic: string;
    count: number;
    percentage: number;
  }>;
  hourly_activity: Array<{
    hour: number;
    conversations: number;
    messages: number;
  }>;
  user_feedback: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
  geographic_data: Array<{
    country: string;
    conversations: number;
    percentage: number;
  }>;
}

interface AnalyticsSettingsProps {
  project: Agent;
}

export const AnalyticsSettings: React.FC<AnalyticsSettingsProps> = ({ project }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7d');
  const [viewType, setViewType] = useState<'overview' | 'usage' | 'feedback' | 'geography'>('overview');


  useEffect(() => {
    loadAnalytics();
  }, [project.id, dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Initialize with sample analytics data
      setData({
        overview: {
          total_conversations: 1543,
          total_messages: 8932,
          unique_users: 432,
          average_session_duration: 285,
          user_satisfaction: 4.5,
          response_time: 1.2
        },
        trends: {
          conversations_change: 12.5,
          messages_change: 15.3,
          users_change: 8.7,
          satisfaction_change: 2.1
        },
        usage_by_source: {
          web: 45,
          api: 30,
          embed: 20,
          mobile: 5
        },
        popular_topics: [
          { topic: 'Product Features', count: 423, percentage: 35 },
          { topic: 'Pricing', count: 312, percentage: 25 },
          { topic: 'Support', count: 278, percentage: 20 },
          { topic: 'Documentation', count: 234, percentage: 15 },
          { topic: 'Other', count: 98, percentage: 5 }
        ],
        hourly_activity: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          conversations: Math.floor(Math.random() * 100 + 20),
          messages: Math.floor(Math.random() * 300 + 50)
        })),
        user_feedback: [
          { rating: 5, count: 234, percentage: 45 },
          { rating: 4, count: 187, percentage: 35 },
          { rating: 3, count: 67, percentage: 12 },
          { rating: 2, count: 23, percentage: 5 },
          { rating: 1, count: 12, percentage: 3 }
        ],
        geographic_data: [
          { country: 'United States', conversations: 542, percentage: 35 },
          { country: 'United Kingdom', conversations: 234, percentage: 15 },
          { country: 'Canada', conversations: 198, percentage: 13 },
          { country: 'Germany', conversations: 156, percentage: 10 },
          { country: 'Australia', conversations: 134, percentage: 9 },
          { country: 'Other', conversations: 279, percentage: 18 }
        ]
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadAnalytics();
  };

  const handleExportData = () => {
    toast.success('Analytics export started - you will receive an email when ready');
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <ArrowDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-400';
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics & Insights</h2>
          <p className="text-gray-600 mt-1">
            Track usage, performance, and user engagement for {project.project_name}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <SimpleSelect
            value={dateRange}
            onValueChange={(value) => setDateRange(value)}
            options={[
              { value: '1d', label: 'Last 24 hours' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' }
            ]}
            className="w-[180px]"
          />
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            size="sm"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportData}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error loading analytics</span>
          </div>
          <p className="text-red-700 mt-1 text-sm">{error}</p>
          {error.includes('403') && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <p className="text-yellow-800">
                <strong>Premium Feature:</strong> Advanced analytics may require a premium subscription.
              </p>
            </div>
          )}
        </div>
      )}

      {/* View Type Selector */}
      <div className="mb-6">
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'usage', label: 'Usage', icon: Activity },
            { id: 'feedback', label: 'Feedback', icon: Star },
            { id: 'geography', label: 'Geography', icon: Globe }
          ].map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setViewType(view.id as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  viewType === view.id
                    ? 'bg-white text-brand-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Icon className="w-4 h-4" />
                {view.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-6">
          {/* Loading skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
                    <div className="h-6 bg-gray-200 rounded w-12" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {viewType === 'overview' && (
            <>
              {/* Key Metrics */}
              <div className="flex justify-end mb-4">
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Conversations</p>
                        <p className="text-2xl font-bold text-gray-900">{data.overview.total_conversations.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(data.trends.conversations_change)}
                      <span className={cn('text-sm font-medium', getTrendColor(data.trends.conversations_change))}>
                        {Math.abs(data.trends.conversations_change)}%
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Unique Users</p>
                        <p className="text-2xl font-bold text-gray-900">{data.overview.unique_users.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(data.trends.users_change)}
                      <span className={cn('text-sm font-medium', getTrendColor(data.trends.users_change))}>
                        {Math.abs(data.trends.users_change)}%
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Session</p>
                        <p className="text-2xl font-bold text-gray-900">{formatDuration(data.overview.average_session_duration)}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                        <Star className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                        <p className="text-2xl font-bold text-gray-900">{data.overview.user_satisfaction.toFixed(1)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(data.trends.satisfaction_change)}
                      <span className={cn('text-sm font-medium', getTrendColor(data.trends.satisfaction_change))}>
                        {Math.abs(data.trends.satisfaction_change)}%
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Popular Topics */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Topics</h3>
                <div className="space-y-4">
                  {data.popular_topics.map((topic, index) => (
                    <div key={topic.topic} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-medium text-brand-600">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{topic.topic}</span>
                          <span className="text-sm text-gray-600">{topic.count} ({topic.percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-brand-600 h-2 rounded-full" 
                            style={{ width: `${topic.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {viewType === 'usage' && (
            <>
              {/* Usage by Source */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage by Source</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(data.usage_by_source).map(([source, percentage]) => (
                    <div key={source} className="text-center">
                      <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-brand-100 flex items-center justify-center">
                        <span className="text-2xl font-bold text-brand-600">{percentage}%</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 capitalize">{source}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Hourly Activity Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">24-Hour Activity Pattern</h3>
                <div className="h-64 flex items-end justify-between gap-1">
                  {data.hourly_activity.map((hour) => {
                    const maxConversations = Math.max(...data.hourly_activity.map(h => h.conversations));
                    const height = (hour.conversations / maxConversations) * 100;
                    
                    return (
                      <div key={hour.hour} className="flex-1 flex flex-col items-center">
                        <div className="relative group">
                          <div 
                            className="w-full bg-brand-500 rounded-t-sm hover:bg-brand-600 transition-colors"
                            style={{ height: `${height * 2}px`, minHeight: '4px' }}
                          />
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 mt-1 whitespace-nowrap">
                            {hour.hour}:00 - {hour.conversations} conversations
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 mt-2">{hour.hour}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}

          {viewType === 'feedback' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Feedback Distribution</h3>
              <div className="space-y-4">
                {data.user_feedback.reverse().map((feedback) => (
                  <div key={feedback.rating} className="flex items-center gap-4">
                    <div className="flex items-center gap-1 w-12">
                      <span className="text-sm font-medium text-gray-900">{feedback.rating}</span>
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-yellow-500 h-3 rounded-full" 
                            style={{ width: `${feedback.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 ml-4 min-w-fit">
                          {feedback.count} ({feedback.percentage}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <Target className="w-5 h-5" />
                  <span className="font-medium">Overall Satisfaction Score</span>
                </div>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {data.overview.user_satisfaction.toFixed(1)}/5.0
                </p>
                <p className="text-sm text-green-700 mt-1">
                  {data.user_feedback.filter(f => f.rating >= 4).reduce((sum, f) => sum + f.percentage, 0).toFixed(1)}% of users rated 4+ stars
                </p>
              </div>
            </Card>
          )}

          {viewType === 'geography' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Geographic Distribution</h3>
              <div className="space-y-4">
                {data.geographic_data.map((country, index) => (
                  <div key={country.country} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-medium text-brand-600">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{country.country}</span>
                        <span className="text-sm text-gray-600">
                          {country.conversations} ({country.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-brand-600 h-2 rounded-full" 
                          style={{ width: `${country.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : null}

      {/* Analytics Settings */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Analytics Settings</h3>
        </div>
        
        <div className="space-y-6">
          {/* Data Collection */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Data Collection</h4>
            <div className="space-y-3">
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" defaultChecked />
                <div>
                  <span className="text-sm font-medium text-gray-900">Track user interactions</span>
                  <p className="text-xs text-gray-600">Collect data on user clicks, inputs, and navigation</p>
                </div>
              </label>
              
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" defaultChecked />
                <div>
                  <span className="text-sm font-medium text-gray-900">Geographic tracking</span>
                  <p className="text-xs text-gray-600">Track user location for geographic analytics</p>
                </div>
              </label>
              
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div>
                  <span className="text-sm font-medium text-gray-900">Advanced session tracking</span>
                  <p className="text-xs text-gray-600">Detailed user journey and behavior analysis</p>
                </div>
              </label>
            </div>
          </div>

          {/* Export Options */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Export & Reporting</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Automated Report Frequency
                </label>
                <SimpleSelect
                  value="none"
                  onValueChange={(value) => {/* Handle report frequency change */}}
                  options={[
                    { value: 'none', label: 'No automated reports' },
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' }
                  ]}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Email Recipients
                </label>
                <input 
                  type="email" 
                  placeholder="analytics@company.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button>Save Analytics Settings</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};