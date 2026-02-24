'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database,
  Plus,
  Search,
  MoreHorizontal,
  RefreshCw,
  Edit3,
  Trash2,
  Eye,
  Globe,
  FileText,
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  AlertTriangle,
  ArrowUpRight,
  Monitor,
  Server,
  HardDrive,
  Rss,
  Zap
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SimpleSelect } from '@/components/ui/simple-select';

interface DataSource {
  id: number;
  name: string;
  type: 'website' | 'sitemap' | 'document' | 'database' | 'api' | 'rss' | 'file_upload';
  url?: string;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  last_sync: string;
  created_at: string;
  documents_count: number;
  sync_frequency: 'manual' | 'daily' | 'weekly' | 'monthly';
  agent_ids: number[];
  config: {
    max_depth?: number;
    include_patterns?: string[];
    exclude_patterns?: string[];
    headers?: Record<string, string>;
    auth_type?: 'none' | 'basic' | 'bearer' | 'api_key';
  };
  metrics: {
    success_rate: number;
    avg_sync_time: string;
    total_pages: number;
    failed_pages: number;
  };
}

interface DataSourceCardProps {
  source: DataSource;
  onEdit: (source: DataSource) => void;
  onDelete: (source: DataSource) => void;
  onSync: (source: DataSource) => void;
  onView: (source: DataSource) => void;
  onToggleStatus: (source: DataSource) => void;
}

const DataSourceCard: React.FC<DataSourceCardProps> = ({
  source,
  onEdit,
  onDelete,
  onSync,
  onView,
  onToggleStatus
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const getTypeIcon = () => {
    switch (source.type) {
      case 'website':
        return <Globe className="h-5 w-5" />;
      case 'sitemap':
        return <Monitor className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
      case 'database':
        return <Database className="h-5 w-5" />;
      case 'api':
        return <Server className="h-5 w-5" />;
      case 'rss':
        return <Rss className="h-5 w-5" />;
      case 'file_upload':
        return <Upload className="h-5 w-5" />;
      default:
        return <Database className="h-5 w-5" />;
    }
  };

  const getStatusConfig = () => {
    switch (source.status) {
      case 'active':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'inactive':
        return { color: 'bg-secondary text-secondary-foreground', icon: XCircle };
      case 'error':
        return { color: 'bg-red-100 text-red-800', icon: AlertTriangle };
      case 'syncing':
        return { color: 'bg-blue-100 text-blue-800', icon: Loader };
      default:
        return { color: 'bg-secondary text-secondary-foreground', icon: XCircle };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const getTypeColor = () => {
    switch (source.type) {
      case 'website':
        return 'bg-blue-100 text-blue-600';
      case 'sitemap':
        return 'bg-purple-100 text-purple-600';
      case 'document':
        return 'bg-green-100 text-green-600';
      case 'database':
        return 'bg-orange-100 text-orange-600';
      case 'api':
        return 'bg-red-100 text-red-600';
      case 'rss':
        return 'bg-yellow-100 text-yellow-600';
      case 'file_upload':
        return 'bg-teal-100 text-teal-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="hover:shadow-md transition-shadow"
    >
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', getTypeColor())}>
            {getTypeIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">{source.name}</h3>
            {source.url && (
              <p className="text-sm text-muted-foreground truncate mt-1">{source.url}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                statusConfig.color
              )}>
                <StatusIcon className={cn('h-3 w-3', source.status === 'syncing' && 'animate-spin')} />
                {source.status.charAt(0).toUpperCase() + source.status.slice(1)}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                {source.type.replace('_', ' ').toUpperCase()}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {source.sync_frequency}
              </span>
            </div>
          </div>
        </div>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMenu(!showMenu)}
            className="h-8 w-8"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                className="absolute right-0 top-8 mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-50"
              >
                <div className="py-1">
                  <button
                    onClick={() => { onView(source); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                  <button
                    onClick={() => { onEdit(source); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit Source
                  </button>
                  <button
                    onClick={() => { onSync(source); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                    disabled={source.status === 'syncing'}
                  >
                    <RefreshCw className={cn('h-4 w-4', source.status === 'syncing' && 'animate-spin')} />
                    Sync Now
                  </button>
                  <button
                    onClick={() => { onToggleStatus(source); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    {source.status === 'active' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    {source.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  {source.url && (
                    <button
                      onClick={() => { window.open(source.url, '_blank'); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      Open Source
                    </button>
                  )}
                  <hr className="my-1" />
                  <button
                    onClick={() => { onDelete(source); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-lg font-semibold text-foreground">{source.documents_count}</div>
          <div className="text-xs text-muted-foreground">Documents</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-lg font-semibold text-foreground">{source.metrics.success_rate}%</div>
          <div className="text-xs text-muted-foreground">Success Rate</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Pages</span>
          <span className="text-sm font-medium text-foreground">{source.metrics.total_pages.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Failed Pages</span>
          <span className="text-sm font-medium text-foreground">{source.metrics.failed_pages}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Avg Sync Time</span>
          <span className="text-sm font-medium text-foreground">{source.metrics.avg_sync_time}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Last sync {source.last_sync}
        </div>
        <div className="text-xs text-muted-foreground">
          {source.agent_ids.length} agent{source.agent_ids.length !== 1 ? 's' : ''}
        </div>
      </div>
      </Card>
    </motion.div>
  );
};

export const DataSourceManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'error' | 'syncing'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'website' | 'sitemap' | 'document' | 'database' | 'api' | 'rss' | 'file_upload'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'documents' | 'status'>('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);

  const [dataSources] = useState<DataSource[]>([
    {
      id: 1,
      name: 'Company Website',
      type: 'website',
      url: 'https://example.com',
      status: 'active',
      last_sync: '2 hours ago',
      created_at: '2024-01-15',
      documents_count: 156,
      sync_frequency: 'daily',
      agent_ids: [1, 2],
      config: {
        max_depth: 3,
        include_patterns: ['*/blog/*', '*/docs/*'],
        exclude_patterns: ['*/admin/*'],
      },
      metrics: {
        success_rate: 94,
        avg_sync_time: '3m 42s',
        total_pages: 164,
        failed_pages: 8,
      }
    },
    {
      id: 2,
      name: 'Product Documentation',
      type: 'sitemap',
      url: 'https://docs.example.com/sitemap.xml',
      status: 'syncing',
      last_sync: '30 minutes ago',
      created_at: '2024-01-12',
      documents_count: 89,
      sync_frequency: 'weekly',
      agent_ids: [1],
      config: {
        include_patterns: ['*.html'],
      },
      metrics: {
        success_rate: 98,
        avg_sync_time: '1m 23s',
        total_pages: 91,
        failed_pages: 2,
      }
    },
    {
      id: 3,
      name: 'Customer Support Files',
      type: 'file_upload',
      status: 'active',
      last_sync: '1 day ago',
      created_at: '2024-01-10',
      documents_count: 234,
      sync_frequency: 'manual',
      agent_ids: [2, 3],
      config: {},
      metrics: {
        success_rate: 100,
        avg_sync_time: '45s',
        total_pages: 234,
        failed_pages: 0,
      }
    },
    {
      id: 4,
      name: 'Knowledge Base API',
      type: 'api',
      url: 'https://api.example.com/kb',
      status: 'error',
      last_sync: '3 days ago',
      created_at: '2024-01-08',
      documents_count: 67,
      sync_frequency: 'daily',
      agent_ids: [1],
      config: {
        auth_type: 'bearer',
        headers: { 'Authorization': 'Bearer ***' },
      },
      metrics: {
        success_rate: 76,
        avg_sync_time: '2m 15s',
        total_pages: 89,
        failed_pages: 22,
      }
    },
    {
      id: 5,
      name: 'Blog RSS Feed',
      type: 'rss',
      url: 'https://example.com/feed.xml',
      status: 'active',
      last_sync: '4 hours ago',
      created_at: '2024-01-05',
      documents_count: 45,
      sync_frequency: 'daily',
      agent_ids: [2],
      config: {},
      metrics: {
        success_rate: 92,
        avg_sync_time: '1m 8s',
        total_pages: 48,
        failed_pages: 3,
      }
    },
  ]);

  const filteredSources = dataSources.filter(source => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (source.url && source.url.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || source.status === statusFilter;
    const matchesType = typeFilter === 'all' || source.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreateSource = () => {
    // Create new data source
  };

  const handleEditSource = (source: DataSource) => {
    // Edit existing source
  };

  const handleDeleteSource = (source: DataSource) => {
    // Delete source implementation
  };

  const handleSyncSource = (source: DataSource) => {
    // Sync source implementation
  };

  const handleViewSource = (source: DataSource) => {
    // View source details
  };

  const handleToggleStatus = (source: DataSource) => {
    // Toggle source status
  };

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const handleBulkSync = () => {
    // Bulk sync functionality
  };

  const stats = {
    total: dataSources.length,
    active: dataSources.filter(s => s.status === 'active').length,
    syncing: dataSources.filter(s => s.status === 'syncing').length,
    errors: dataSources.filter(s => s.status === 'error').length,
    totalDocuments: dataSources.reduce((sum, s) => sum + s.documents_count, 0),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Sources</h1>
          <p className="text-muted-foreground mt-1">Manage your content sources and synchronization</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleBulkSync}>
            <Zap className="h-4 w-4 mr-2" />
            Sync All
          </Button>
          <Button onClick={handleCreateSource}>
            <Plus className="h-4 w-4 mr-2" />
            Add Source
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Sources</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Loader className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.syncing}</p>
              <p className="text-sm text-muted-foreground">Syncing</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.errors}</p>
              <p className="text-sm text-muted-foreground">Errors</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalDocuments.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Documents</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-80 bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Status Filter */}
          <SimpleSelect
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as any)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'error', label: 'Error' },
              { value: 'syncing', label: 'Syncing' }
            ]}
            placeholder="Filter by status"
          />

          {/* Type Filter */}
          <SimpleSelect
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as any)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'website', label: 'Website' },
              { value: 'sitemap', label: 'Sitemap' },
              { value: 'document', label: 'Document' },
              { value: 'database', label: 'Database' },
              { value: 'api', label: 'API' },
              { value: 'rss', label: 'RSS Feed' },
              { value: 'file_upload', label: 'File Upload' }
            ]}
            placeholder="Filter by type"
          />

          {/* Sort */}
          <SimpleSelect
            value={sortBy}
            onValueChange={(value) => setSortBy(value as any)}
            options={[
              { value: 'updated', label: 'Last Updated' },
              { value: 'name', label: 'Name' },
              { value: 'documents', label: 'Document Count' },
              { value: 'status', label: 'Status' }
            ]}
            placeholder="Sort by"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>
      </div>

      {/* Data Sources Grid/List */}
      {filteredSources.length === 0 ? (
        <div className="text-center py-12">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No data sources found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first data source to get started'
            }
          </p>
          {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
            <Button onClick={handleCreateSource}>
              <Plus className="h-4 w-4 mr-2" />
              Add Data Source
            </Button>
          )}
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        )}>
          <AnimatePresence>
            {filteredSources.map((source) => (
              <DataSourceCard
                key={source.id}
                source={source}
                onEdit={handleEditSource}
                onDelete={handleDeleteSource}
                onSync={handleSyncSource}
                onView={handleViewSource}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};