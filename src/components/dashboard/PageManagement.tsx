'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText,
  Search,
  MoreHorizontal,
  Upload,
  Download,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  ExternalLink,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Globe,
  Lock,
  File,
  Image,
  FileVideo,
  FileAudio,
  Folder
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SimpleSelect } from '@/components/ui/simple-select';

interface Document {
  id: number;
  title: string;
  type: 'webpage' | 'pdf' | 'docx' | 'txt' | 'image' | 'video' | 'audio';
  url?: string;
  file_path?: string;
  status: 'indexed' | 'processing' | 'failed' | 'pending';
  size: number;
  word_count?: number;
  indexed_at: string;
  updated_at: string;
  source: 'manual' | 'sitemap' | 'crawl' | 'api';
  agent_ids: number[];
  tags: string[];
  is_public: boolean;
}

interface DocumentCardProps {
  document: Document;
  onEdit: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onView: (doc: Document) => void;
  onReindex: (doc: Document) => void;
  onTogglePublic: (doc: Document) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onEdit,
  onDelete,
  onView,
  onReindex,
  onTogglePublic
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const getTypeIcon = () => {
    switch (document.type) {
      case 'webpage':
        return <Globe className="h-5 w-5" />;
      case 'pdf':
        return <FileText className="h-5 w-5" />;
      case 'docx':
        return <File className="h-5 w-5" />;
      case 'image':
        return <Image className="h-5 w-5" />;
      case 'video':
        return <FileVideo className="h-5 w-5" />;
      case 'audio':
        return <FileAudio className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getStatusConfig = () => {
    switch (document.status) {
      case 'indexed':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'processing':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Loader };
      case 'failed':
        return { color: 'bg-red-100 text-red-800', icon: XCircle };
      case 'pending':
        return { color: 'bg-secondary text-secondary-foreground', icon: Clock };
      default:
        return { color: 'bg-secondary text-secondary-foreground', icon: Clock };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            {getTypeIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">{document.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                statusConfig.color
              )}>
                <StatusIcon className="h-3 w-3" />
                {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
              </span>
              {document.is_public ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  <Globe className="h-3 w-3" />
                  Public
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                  <Lock className="h-3 w-3" />
                  Private
                </span>
              )}
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {document.type.toUpperCase()}
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
                    onClick={() => { onView(document); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <Eye className="h-4 w-4" />
                    View Content
                  </button>
                  <button
                    onClick={() => { onEdit(document); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => { onReindex(document); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reindex
                  </button>
                  <button
                    onClick={() => { onTogglePublic(document); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    {document.is_public ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                    {document.is_public ? 'Make Private' : 'Make Public'}
                  </button>
                  {document.url && (
                    <button
                      onClick={() => { window.open(document.url, '_blank'); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Original
                    </button>
                  )}
                  <hr className="my-1" />
                  <button
                    onClick={() => { onDelete(document); setShowMenu(false); }}
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

      {/* Document Info */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Size</span>
          <span className="font-medium text-foreground">{formatSize(document.size)}</span>
        </div>
        {document.word_count && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Words</span>
            <span className="font-medium text-foreground">{document.word_count.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Source</span>
          <span className="font-medium text-foreground capitalize">{document.source}</span>
        </div>
      </div>

      {/* Tags */}
      {document.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {document.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">
              {tag}
            </span>
          ))}
          {document.tags.length > 3 && (
            <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">
              +{document.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          Indexed {document.indexed_at}
        </div>
        <div className="text-xs text-muted-foreground">
          {document.agent_ids.length} agent{document.agent_ids.length !== 1 ? 's' : ''}
        </div>
      </div>
      </Card>
    </motion.div>
  );
};

export const PageManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'indexed' | 'processing' | 'failed' | 'pending'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'webpage' | 'pdf' | 'docx' | 'txt' | 'image'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'updated' | 'size' | 'status'>('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);

  // Mock data - in real app, this would come from API endpoints:
  const [documents] = useState<Document[]>([
    {
      id: 1,
      title: 'Getting Started Guide',
      type: 'webpage',
      url: 'https://example.com/getting-started',
      status: 'indexed',
      size: 15420,
      word_count: 2340,
      indexed_at: '2 hours ago',
      updated_at: '2024-01-15',
      source: 'manual',
      agent_ids: [1, 2],
      tags: ['guide', 'onboarding', 'basics'],
      is_public: true,
    },
    {
      id: 2,
      title: 'Product Documentation.pdf',
      type: 'pdf',
      file_path: '/uploads/product-docs.pdf',
      status: 'processing',
      size: 2547890,
      word_count: 12450,
      indexed_at: '1 day ago',
      updated_at: '2024-01-14',
      source: 'manual',
      agent_ids: [1],
      tags: ['documentation', 'product', 'technical'],
      is_public: false,
    },
    {
      id: 3,
      title: 'FAQ Page',
      type: 'webpage',
      url: 'https://example.com/faq',
      status: 'indexed',
      size: 8920,
      word_count: 1890,
      indexed_at: '3 hours ago',
      updated_at: '2024-01-15',
      source: 'sitemap',
      agent_ids: [1, 2, 3],
      tags: ['faq', 'support', 'common'],
      is_public: true,
    },
    {
      id: 4,
      title: 'User Manual Draft',
      type: 'docx',
      file_path: '/uploads/user-manual.docx',
      status: 'failed',
      size: 156780,
      word_count: 5670,
      indexed_at: '1 week ago',
      updated_at: '2024-01-08',
      source: 'manual',
      agent_ids: [2],
      tags: ['manual', 'draft', 'users'],
      is_public: false,
    },
  ]);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleUpload = () => {
    // Upload documents implementation
  };

  const handleBulkImport = () => {
    // Bulk import implementation
  };

  const handleEditDocument = (doc: Document) => {
    // Edit document implementation
  };

  const handleDeleteDocument = (doc: Document) => {
    // Delete document implementation
  };

  const handleViewDocument = (doc: Document) => {
    // View document implementation
  };

  const handleReindexDocument = (doc: Document) => {
    // Reindex document implementation
  };

  const handleTogglePublic = (doc: Document) => {
    // Toggle document public status
  };

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const stats = {
    total: documents.length,
    indexed: documents.filter(d => d.status === 'indexed').length,
    processing: documents.filter(d => d.status === 'processing').length,
    failed: documents.filter(d => d.status === 'failed').length,
    totalSize: documents.reduce((sum, d) => sum + d.size, 0),
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pages & Documents</h1>
          <p className="text-muted-foreground mt-1">Manage your knowledge base content</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleBulkImport}>
            <Download className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={handleUpload}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.indexed}</p>
              <p className="text-sm text-muted-foreground">Indexed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.processing}</p>
              <p className="text-sm text-muted-foreground">Processing</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.failed}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Folder className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatSize(stats.totalSize)}</p>
              <p className="text-sm text-muted-foreground">Total Size</p>
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
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-80"
            />
          </div>

          {/* Status Filter */}
          <SimpleSelect
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as any)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'indexed', label: 'Indexed' },
              { value: 'processing', label: 'Processing' },
              { value: 'failed', label: 'Failed' },
              { value: 'pending', label: 'Pending' }
            ]}
            placeholder="Filter by status"
          />

          {/* Type Filter */}
          <SimpleSelect
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as any)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'webpage', label: 'Web Pages' },
              { value: 'pdf', label: 'PDF' },
              { value: 'docx', label: 'Word Documents' },
              { value: 'txt', label: 'Text Files' },
              { value: 'image', label: 'Images' }
            ]}
            placeholder="Filter by type"
          />

          {/* Sort */}
          <SimpleSelect
            value={sortBy}
            onValueChange={(value) => setSortBy(value as any)}
            options={[
              { value: 'updated', label: 'Last Updated' },
              { value: 'title', label: 'Title' },
              { value: 'size', label: 'Size' },
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

      {/* Documents Grid/List */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Upload your first document to get started'
            }
          </p>
          {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
            <Button onClick={handleUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
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
            {filteredDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onEdit={handleEditDocument}
                onDelete={handleDeleteDocument}
                onView={handleViewDocument}
                onReindex={handleReindexDocument}
                onTogglePublic={handleTogglePublic}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};