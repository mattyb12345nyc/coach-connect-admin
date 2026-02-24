'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Clock,
  Globe,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Eye,
  MousePointer,
  Activity,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SimpleSelect } from '@/components/ui/simple-select';
import { useAgentStore } from '@/store';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
    percentage: number;
  };
  icon: React.ComponentType<any>;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal';
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color = 'blue',
  loading = false
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    teal: 'bg-teal-50 text-teal-600 border-teal-200',
  };

  const getTrendIcon = () => {
    if (!change) return null;
    switch (change.trend) {
      case 'up':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'down':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          {loading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
          ) : (
            <p className="text-3xl font-bold text-foreground mb-2">{value}</p>
          )}
          {change && !loading && (
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className={cn(
                'text-sm font-medium',
                change.trend === 'up' && 'text-green-600',
                change.trend === 'down' && 'text-red-600',
                change.trend === 'neutral' && 'text-muted-foreground'
              )}>
                {change.value}
              </span>
            </div>
          )}
        </div>
        <div className={cn(
          'w-12 h-12 rounded-lg border flex items-center justify-center',
          colorClasses[color]
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  );
};

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  actions?: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, children, loading, actions }) => (
  <div className="bg-card rounded-lg border border-border p-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {actions}
    </div>
    {loading ? (
      <div className="h-64 bg-gray-200 rounded animate-pulse" />
    ) : (
      children
    )}
  </div>
);

interface TopQuery {
  query: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'neutral';
}

interface ConversationMetric {
  date: string;
  total_conversations: number;
  unique_users: number;
  avg_session_duration: number;
  bounce_rate: number;
}

interface TrafficSource {
  source: string;
  visitors: number;
  percentage: number;
  change: number;
}

export const AnalyticsDashboard: React.FC = () => {
  const { agents, fetchAgents } = useAgentStore();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedAgent, setSelectedAgent] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Mock data - in real app, this would come from API endpoints:
  const metrics = [
    {
      title: 'Total Conversations',
      value: '12,463',
      change: { value: '+15.2%', trend: 'up' as const, percentage: 15.2 },
      icon: MessageSquare,
      color: 'blue' as const,
    },
    {
      title: 'Unique Visitors',
      value: '8,291',
      change: { value: '+8.7%', trend: 'up' as const, percentage: 8.7 },
      icon: Users,
      color: 'green' as const,
    },
    {
      title: 'Avg Response Time',
      value: '1.2s',
      change: { value: '-12.3%', trend: 'up' as const, percentage: -12.3 },
      icon: Clock,
      color: 'purple' as const,
    },
    {
      title: 'Resolution Rate',
      value: '94.5%',
      change: { value: '+2.1%', trend: 'up' as const, percentage: 2.1 },
      icon: Target,
      color: 'teal' as const,
    },
    {
      title: 'Countries Served',
      value: '47',
      change: { value: '+3 new', trend: 'up' as const, percentage: 6.8 },
      icon: Globe,
      color: 'orange' as const,
    },
    {
      title: 'Avg Session Duration',
      value: '5m 23s',
      change: { value: '+18.2%', trend: 'up' as const, percentage: 18.2 },
      icon: Activity,
      color: 'red' as const,
    },
  ];

  const topQueries: TopQuery[] = [
    { query: 'What are your business hours?', count: 1247, percentage: 12.8, trend: 'up' },
    { query: 'How do I reset my password?', count: 983, percentage: 10.1, trend: 'neutral' },
    { query: 'What is your return policy?', count: 756, percentage: 7.8, trend: 'up' },
    { query: 'How can I contact support?', count: 642, percentage: 6.6, trend: 'down' },
    { query: 'Where is my order?', count: 589, percentage: 6.1, trend: 'up' },
  ];

  const trafficSources: TrafficSource[] = [
    { source: 'Direct', visitors: 4235, percentage: 45.2, change: 12.3 },
    { source: 'Organic Search', visitors: 2847, percentage: 30.4, change: 8.7 },
    { source: 'Social Media', visitors: 1156, percentage: 12.3, change: -5.2 },
    { source: 'Referral', visitors: 743, percentage: 7.9, change: 15.6 },
    { source: 'Email', visitors: 392, percentage: 4.2, change: 3.1 },
  ];

  const handleRefresh = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const handleExport = () => {
    // Export functionality to be implemented
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor your agent performance and user engagement</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <SimpleSelect
            value={dateRange}
            onValueChange={(value) => setDateRange(value as any)}
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: '1y', label: 'Last year' }
            ]}
            placeholder="Select date range"
          />

          {/* Agent Filter */}
          <SimpleSelect
            value={selectedAgent.toString()}
            onValueChange={(value) => setSelectedAgent(value === 'all' ? 'all' : Number(value))}
            options={[
              { value: 'all', label: 'All Agents' },
              ...agents.map((agent) => ({
                value: agent.id.toString(),
                label: agent.project_name
              }))
            ]}
            placeholder="Select agent"
          />

          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>

          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} loading={loading} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversation Trends */}
        <ChartCard 
          title="Conversation Trends"
          loading={loading}
          actions={
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          }
        >
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-border rounded-lg">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-muted-foreground">Conversation trends chart would render here</p>
              <p className="text-sm text-gray-400">Integration with charting library needed</p>
            </div>
          </div>
        </ChartCard>

        {/* Response Time Analysis */}
        <ChartCard 
          title="Response Time Analysis"
          loading={loading}
          actions={
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          }
        >
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-border rounded-lg">
            <div className="text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-muted-foreground">Response time chart would render here</p>
              <p className="text-sm text-gray-400">Shows average, median, and p95 response times</p>
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Queries */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Top Queries</h3>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          
          <div className="space-y-4">
            {topQueries.map((query, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-accent rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {query.query}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{query.count} times</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-muted-foreground">{query.percentage}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {query.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                  {query.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                  {query.trend === 'neutral' && <Minus className="h-4 w-4 text-gray-400" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Traffic Sources</h3>
            <Button variant="outline" size="sm">
              <Globe className="h-4 w-4 mr-2" />
              Geographic
            </Button>
          </div>
          
          <div className="space-y-4">
            {trafficSources.map((source, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{source.source}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{source.visitors.toLocaleString()}</span>
                    <span className={cn(
                      'text-xs font-medium',
                      source.change > 0 ? 'text-green-600' : source.change < 0 ? 'text-red-600' : 'text-muted-foreground'
                    )}>
                      {source.change > 0 ? '+' : ''}{source.change}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Engagement Metrics */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">User Engagement</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
            <h4 className="font-semibold text-foreground">Messages per Session</h4>
            <p className="text-2xl font-bold text-blue-600 mt-1">4.7</p>
            <p className="text-sm text-muted-foreground">+12% from last month</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <h4 className="font-semibold text-foreground">Return Users</h4>
            <p className="text-2xl font-bold text-green-600 mt-1">68%</p>
            <p className="text-sm text-muted-foreground">+5% from last month</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
            <h4 className="font-semibold text-foreground">User Satisfaction</h4>
            <p className="text-2xl font-bold text-purple-600 mt-1">4.6/5</p>
            <p className="text-sm text-muted-foreground">+0.2 from last month</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-orange-100 rounded-full flex items-center justify-center">
              <MousePointer className="h-8 w-8 text-orange-600" />
            </div>
            <h4 className="font-semibold text-foreground">Click-through Rate</h4>
            <p className="text-2xl font-bold text-orange-600 mt-1">23.4%</p>
            <p className="text-sm text-muted-foreground">+3% from last month</p>
          </div>
        </div>
      </div>
    </div>
  );
};