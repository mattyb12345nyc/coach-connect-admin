'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Upload,
  Database,
  File,
  Settings,
  Trash2,
  RefreshCw,
  Search,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  MoreHorizontal,
  Globe,
  FileText,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn, formatTimestamp, formatFileSize, handleApiError } from '@/lib/utils';
import { getClient, isClientInitialized } from '@/lib/api/client';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import type { Agent } from '@/types';
import type { Source, SourcesListResponse } from '@/types/sources.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SourcePageDetails } from '@/components/projects/SourcePageDetails';
import { useDemoModeContext } from '@/contexts/DemoModeContext';

interface SourcesSettingsProps {
  project: Agent;
}

export const SourcesSettings: React.FC<SourcesSettingsProps> = ({ project }) => {
  const { isMobile } = useBreakpoint();
  const { isFreeTrialMode } = useDemoModeContext();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [sourceType, setSourceType] = useState<'sitemap' | 'file'>('sitemap');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<number | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sourceForDetails, setSourceForDetails] = useState<Source | null>(null);
  
  // Source settings
  const [executiveJs, setExecutiveJs] = useState(true);
  const [dataRefreshFrequency, setDataRefreshFrequency] = useState('never');
  const [createNewPages, setCreateNewPages] = useState(true);
  const [removeUnexistPages, setRemoveUnexistPages] = useState(false);
  const [refreshExistingPages, setRefreshExistingPages] = useState('never');
  const [allowExtraTimeout, setAllowExtraTimeout] = useState(false);

  // Fetch sources from API
  const fetchSources = useCallback(async () => {
    if (!isClientInitialized()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = getClient();
      const response = await client.getSources(project.id);
      
      // Extract all sources from sitemaps and uploads
      const allSources: Source[] = [];
      
      if (response.data.sitemaps) {
        allSources.push(...response.data.sitemaps);
      }
      
      if (response.data.uploads) {
        if (Array.isArray(response.data.uploads)) {
          allSources.push(...response.data.uploads);
        } else {
          allSources.push(response.data.uploads);
        }
      }
      
      // Log sources to debug missing pages
      console.log('Fetched sources:', allSources);
      
      // For each sitemap source, fetch the actual page count
      const sourcesWithCounts = await Promise.all(
        allSources.map(async (source) => {
          // If it's a sitemap and has no pages data, fetch the actual count
          if (source.type === 'sitemap' && (!source.pages || source.pages.length === 0) && source.settings.sitemap_path) {
            try {
              const sitemapDomain = new URL(source.settings.sitemap_path).hostname;
              let pageCount = 0;
              let page = 1;
              const maxPages = 5; // Limit scanning to 5 pages (500 items)
              
              // Scan through pages to count those belonging to this sitemap
              while (page <= maxPages) {
                const response = await client.getPages(project.id, { 
                  limit: 100, 
                  page: page 
                });
                
                const sitemapPages = response.data.pages.data.filter((p: any) => {
                  try {
                    return new URL(p.page_url).hostname === sitemapDomain;
                  } catch {
                    return false;
                  }
                });
                
                pageCount += sitemapPages.length;
                
                // If we got less than 100 or no next page, we're done
                if (response.data.pages.data.length < 100 || !response.data.pages.next_page_url) {
                  break;
                }
                
                page++;
              }
              
              // If we hit the limit, show count with +
              const displayCount = page > maxPages ? `${pageCount}+` : pageCount;
              
              return {
                ...source,
                pageCount: displayCount
              };
            } catch (err) {
              console.error('Failed to fetch page count for source:', source.id, err);
              return {
                ...source,
                pageCount: '?'
              };
            }
          }
          
          // For uploads or sources with pages, use actual count
          return {
            ...source,
            pageCount: source.pages?.length || 0
          };
        })
      );
      
      setSources(sourcesWithCounts);
    } catch (err) {
      const errorData = handleApiError(err);
      setError(errorData.message);
      toast.error('Failed to load sources', {
        description: errorData.message
      });
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  // Drag and drop for file upload
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (isFreeTrialMode) {
      toast.error('File upload is not available in free trial mode');
      return;
    }
    
    if (!isClientInitialized()) {
      toast.error('API client not initialized');
      return;
    }

    setLoading(true);
    try {
      const client = getClient();
      
      for (const file of acceptedFiles) {
        const formData = new FormData();
        // Use 'file' as the field name based on common API patterns
        formData.append('file', file);
        
        // Add source settings with safety checks
        formData.append('executive_js', (executiveJs ?? true).toString());
        formData.append('data_refresh_frequency', dataRefreshFrequency || 'never');
        formData.append('create_new_pages', (createNewPages ?? true).toString());
        formData.append('remove_unexist_pages', (removeUnexistPages ?? false).toString());
        formData.append('refresh_existing_pages', refreshExistingPages || 'never');
        formData.append('allow_extra_timeout', (allowExtraTimeout ?? false).toString());
        
        await client.uploadFileSource(project.id, formData);
      }
      
      toast.success(`Uploaded ${acceptedFiles.length} files successfully`);
      fetchSources();
    } catch (err: any) {
      const errorData = handleApiError(err);
      
      // Log detailed error for debugging
      console.error('File upload error:', {
        status: err.status,
        data: err.data,
        message: err.message,
        errorData
      });
      
      let errorMessage = 'Failed to upload files';
      if (err.status === 400) {
        // Check for specific error messages from the API
        const apiMessage = err.data?.data?.message || err.data?.message || errorData.message;
        errorMessage = apiMessage || 'Invalid file or request. Please check your files.';
      } else if (err.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.status === 404) {
        errorMessage = 'Agent not found. Please refresh and try again.';
      } else if (err.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      toast.error(errorMessage, {
        description: errorData.message
      });
    } finally {
      setLoading(false);
    }
  }, [project.id, executiveJs, dataRefreshFrequency, createNewPages, removeUnexistPages, refreshExistingPages, fetchSources]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled: loading || isFreeTrialMode,
  });

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSources().finally(() => setRefreshing(false));
  };

  // Create sitemap source
  const handleCreateSitemap = async () => {
    if (isFreeTrialMode) {
      toast.error('Creating data sources is not available in free trial mode');
      return;
    }
    
    if (!isClientInitialized()) {
      toast.error('API client not initialized');
      return;
    }

    if (!sitemapUrl.trim()) {
      toast.error('Please enter a sitemap URL');
      return;
    }

    setLoading(true);
    try {
      const client = getClient();
      await client.createSitemapSource(project.id, {
        sitemap_path: sitemapUrl,
        executive_js: executiveJs,
        data_refresh_frequency: dataRefreshFrequency,
        create_new_pages: createNewPages,
        remove_unexist_pages: removeUnexistPages,
        refresh_existing_pages: refreshExistingPages,
        allow_extra_timeout: allowExtraTimeout,
      });
      
      toast.success('Sitemap source created successfully');
      setShowAddModal(false);
      setSitemapUrl('');
      fetchSources();
    } catch (err: any) {
      const errorData = handleApiError(err);
      
      let errorMessage = 'Failed to create sitemap source';
      if (err.status === 400 || errorData.message.toLowerCase().includes('empty')) {
        errorMessage = 'Invalid request. Please check the sitemap URL.';
      } else if (err.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.status === 404) {
        errorMessage = 'Agent not found. Please refresh and try again.';
      } else if (err.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      toast.error(errorMessage, {
        description: errorData.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Update source settings
  const handleUpdateSettings = async () => {
    if (isFreeTrialMode) {
      toast.error('Updating data sources is not available in free trial mode');
      return;
    }
    
    if (!isClientInitialized() || !selectedSource) {
      return;
    }

    setLoading(true);
    try {
      const client = getClient();
      await client.updateSourceSettings(project.id, selectedSource.id, {
        executive_js: executiveJs,
        data_refresh_frequency: dataRefreshFrequency,
        create_new_pages: createNewPages,
        remove_unexist_pages: removeUnexistPages,
        refresh_existing_pages: refreshExistingPages,
        allow_extra_timeout: allowExtraTimeout,
      });
      
      toast.success('Source settings updated successfully');
      setShowEditModal(false);
      fetchSources();
    } catch (err: any) {
      const errorData = handleApiError(err);
      
      let errorMessage = 'Failed to update source settings';
      if (err.status === 400) {
        errorMessage = 'Invalid request. Please check your settings.';
      } else if (err.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.status === 404) {
        errorMessage = 'Source not found. Please refresh and try again.';
      } else if (err.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      toast.error(errorMessage, {
        description: errorData.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete source
  const handleDeleteSource = async () => {
    if (isFreeTrialMode) {
      toast.error('Deleting data sources is not available in free trial mode');
      return;
    }
    
    if (!isClientInitialized() || !sourceToDelete) {
      return;
    }

    try {
      const client = getClient();
      await client.deleteSource(project.id, sourceToDelete);
      toast.success('Source deleted successfully');
      setShowDeleteDialog(false);
      setSourceToDelete(null);
      fetchSources();
    } catch (err: any) {
      const errorData = handleApiError(err);
      
      let errorMessage = 'Failed to delete source';
      if (err.status === 400) {
        errorMessage = 'Invalid request. Please check the source ID.';
      } else if (err.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.status === 404) {
        errorMessage = 'Source not found. It may have already been deleted.';
      } else if (err.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      toast.error(errorMessage, {
        description: errorData.message
      });
    }
  };

  // Instant sync source
  const handleInstantSync = async (sourceId: number) => {
    if (isFreeTrialMode) {
      toast.error('Syncing data sources is not available in free trial mode');
      return;
    }
    
    if (!isClientInitialized()) {
      return;
    }

    setSyncing(sourceId);
    try {
      const client = getClient();
      await client.instantSyncSource(project.id, sourceId);
      toast.success('Source sync started successfully');
      fetchSources();
    } catch (err: any) {
      const errorData = handleApiError(err);
      
      let errorMessage = 'Failed to sync source';
      if (err.status === 400) {
        errorMessage = 'Invalid request. Please check the source ID.';
      } else if (err.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.status === 403) {
        errorMessage = 'Access denied. You may not have permission to sync this source.';
      } else if (err.status === 404) {
        errorMessage = 'Source not found. Please refresh and try again.';
      } else if (err.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      toast.error(errorMessage, {
        description: errorData.message
      });
    } finally {
      setSyncing(null);
    }
  };

  // Filter and search sources
  const filteredSources = sources.filter(source => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = source.type.toLowerCase().includes(searchLower) ||
                         (source.settings.sitemap_path || '').toLowerCase().includes(searchLower) ||
                         (source.pages?.some(page => 
                           page.page_url.toLowerCase().includes(searchLower) ||
                           (page.filename || '').toLowerCase().includes(searchLower)
                         ) || false);
    
    return matchesSearch;
  });

  // Helper to get source display name
  const getSourceName = (source: Source) => {
    if (source.type === 'sitemap' && source.settings.sitemap_path) {
      try {
        const url = new URL(source.settings.sitemap_path);
        return url.hostname;
      } catch {
        return source.settings.sitemap_path;
      }
    }
    return source.type;
  };

  // Helper to get crawl/index status counts
  const getStatusCounts = (source: Source) => {
    const counts = {
      crawled: 0,
      crawling: 0,
      indexed: 0,
      indexing: 0,
      failed: 0,
    };
    
    source.pages?.forEach(page => {
      if (page.crawl_status === 'crawled') counts.crawled++;
      if (page.crawl_status === 'crawling') counts.crawling++;
      if (page.index_status === 'indexed') counts.indexed++;
      if (page.index_status === 'indexing') counts.indexing++;
      if (page.crawl_status === 'failed' || page.index_status === 'failed') counts.failed++;
    });
    
    return counts;
  };

  return (
    <div className={cn(
      "max-w-6xl mx-auto",
      isMobile ? "p-4 mobile-px" : "p-6"
    )}>
      {/* Header */}
      <div className={cn(
        "mb-6",
        isMobile ? "flex-col gap-4" : "flex items-center justify-between"
      )}>
        <div className={isMobile ? "w-full" : ""}>
          <h2 className={cn(
            "font-bold text-foreground",
            isMobile ? "text-xl mobile-text-xl" : "text-2xl"
          )}>Data Sources</h2>
          <p className={cn(
            "text-muted-foreground mt-1",
            isMobile ? "text-sm mobile-text-sm" : ""
          )}>
            Manage files, URLs, and data sources for {project.project_name}
          </p>
        </div>
        
        <div className={cn(
          "flex gap-3",
          isMobile ? "w-full grid grid-cols-2 gap-2 mt-4" : "items-center"
        )}>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            size="sm"
            className={isMobile ? "h-9 px-3 text-sm" : ""}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          
          <Button
            variant="default"
            onClick={() => setShowAddModal(true)}
            disabled={isFreeTrialMode}
            size="sm"
            className={isMobile ? "h-9 px-3 text-sm" : ""}
            title={isFreeTrialMode ? 'Adding data sources is not available in free trial mode' : ''}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Source
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error loading sources</span>
          </div>
          <p className="text-red-700 mt-1 text-sm">{error}</p>
          {error.includes('401') && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <p className="text-yellow-800">
                <strong>Authentication Error:</strong> API key authentication failed. 
                {typeof window !== 'undefined' && localStorage.getItem('customgpt.deploymentMode') === 'demo'
                  ? 'Please check your API key in demo settings.'
                  : 'Please check your API key configuration.'}
              </p>
            </div>
          )}
          {error.includes('403') && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <p className="text-yellow-800">
                <strong>Premium Feature:</strong> This feature may require a premium subscription. 
                Please upgrade your plan to access advanced source management features.
              </p>
            </div>
          )}
          {error.includes('500') && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded text-sm">
              <p className="text-orange-800">
                <strong>Server Error:</strong> Something went wrong on our end. 
                Please try again later or contact support if the issue persists.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sources, URLs, or files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Stats */}
      <div className={cn(
        "grid gap-4 mb-6",
        isMobile ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-4"
      )}>
        <Card className={cn(
          "p-4",
          isMobile ? "mobile-px mobile-py" : ""
        )}>
          <div className="flex items-center">
            <Database className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Sources</p>
              <p className="text-2xl font-bold text-foreground">{sources.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className={cn(
          "p-4",
          isMobile ? "mobile-px mobile-py" : ""
        )}>
          <div className="flex items-center">
            <Globe className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Sitemaps</p>
              <p className="text-2xl font-bold text-foreground">
                {sources.filter(s => s.type === 'sitemap').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className={cn(
          "p-4",
          isMobile ? "mobile-px mobile-py" : ""
        )}>
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">File Uploads</p>
              <p className="text-2xl font-bold text-foreground">
                {sources.filter(s => s.type !== 'sitemap').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className={cn(
          "p-4",
          isMobile ? "mobile-px mobile-py" : ""
        )}>
          <div className="flex items-center">
            <File className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Pages</p>
              <p className="text-2xl font-bold text-foreground">
                {sources.reduce((total, source) => total + (source.pages?.length || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Upload Area */}
      {filteredSources.length === 0 && !loading && (
        <div 
          {...getRootProps()}
          className={cn(
            "text-center py-12 border-2 border-dashed rounded-lg transition-colors mb-6",
            isDragActive ? "border-brand-500 bg-brand-50" : "border-border"
          )}
        >
          <input {...getInputProps()} />
          <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchQuery ? 'No sources found' : 'No sources yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery 
              ? 'Try adjusting your search or filters'
              : isDragActive
                ? 'Drop files here to upload'
                : 'Drag and drop files here, or click to add sources'
            }
          </p>
          {!searchQuery && (
            <Button 
              onClick={() => setShowAddModal(true)}
              disabled={isFreeTrialMode}
              title={isFreeTrialMode ? 'Adding data sources is not available in free trial mode' : ''}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Source
            </Button>
          )}
        </div>
      )}

      {/* Sources Grid */}
      {filteredSources.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSources.map((source) => {
            const statusCounts = getStatusCounts(source);
            const isLoading = syncing === source.id;
            
            return (
              <Card key={source.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {source.type === 'sitemap' ? (
                        <Globe className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                      ) : (
                        <FileText className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground truncate">
                          {getSourceName(source)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {source.type === 'sitemap' ? 'Sitemap' : 'File Upload'}
                        </p>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSourceForDetails(source);
                            setShowDetailsModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (isFreeTrialMode) {
                              toast.error('Editing data sources is not available in free trial mode');
                              return;
                            }
                            setSelectedSource(source);
                            setExecutiveJs(source.settings.executive_js);
                            setDataRefreshFrequency(source.settings.data_refresh_frequency);
                            setCreateNewPages(source.settings.create_new_pages);
                            setRemoveUnexistPages(source.settings.remove_unexist_pages);
                            // Handle invalid "if_modified" value from API
                            const refreshValue = source.settings.refresh_existing_pages;
                            setRefreshExistingPages(refreshValue === 'if_modified' ? 'never' : refreshValue);
                            setAllowExtraTimeout(source.settings.allow_extra_timeout || false);
                            setShowEditModal(true);
                          }}
                          disabled={isFreeTrialMode}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </DropdownMenuItem>
                        {source.type === 'sitemap' && (
                          <DropdownMenuItem
                            onClick={() => handleInstantSync(source.id)}
                            disabled={isLoading || isFreeTrialMode}
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Instant Sync
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            if (isFreeTrialMode) {
                              toast.error('Deleting data sources is not available in free trial mode');
                              return;
                            }
                            setSourceToDelete(source.id);
                            setShowDeleteDialog(true);
                          }}
                          className="text-red-600 hover:text-red-700 focus:text-red-700"
                          disabled={isFreeTrialMode}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* URL/Path Info */}
                  {source.type === 'sitemap' && source.settings.sitemap_path && (
                    <div className="text-xs text-muted-foreground truncate">
                      {source.settings.sitemap_path}
                    </div>
                  )}

                  {/* Pages Info */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      {source.pageCount !== undefined ? source.pageCount : (source.pages?.length || 0)} {source.pageCount === 1 || source.pages?.length === 1 ? 'page' : 'pages'}
                    </div>
                    
                    {/* Status Counts */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {statusCounts.indexed > 0 && (
                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {statusCounts.indexed} indexed
                        </span>
                      )}
                      {statusCounts.indexing > 0 && (
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          <Clock className="w-3 h-3 mr-1" />
                          {statusCounts.indexing} indexing
                        </span>
                      )}
                      {statusCounts.crawling > 0 && (
                        <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          {statusCounts.crawling} crawling
                        </span>
                      )}
                      {statusCounts.failed > 0 && (
                        <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded">
                          <XCircle className="w-3 h-3 mr-1" />
                          {statusCounts.failed} failed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Settings Summary */}
                  <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Refresh:</span>
                      <span>{source.settings.data_refresh_frequency}</span>
                    </div>
                    {source.settings.executive_js && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">JavaScript:</span>
                        <span>Enabled</span>
                      </div>
                    )}
                  </div>

                  {/* Timestamps */}
                  <div className="text-xs text-muted-foreground">
                    <div>Created {formatTimestamp(source.created_at)}</div>
                    <div>Updated {formatTimestamp(source.updated_at)}</div>
                  </div>

                  {/* Sync Loading State */}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Syncing...</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && sources.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
                <div className="flex gap-2">
                  <div className="h-8 bg-muted rounded w-16" />
                  <div className="h-8 bg-muted rounded w-16" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Source Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Source</DialogTitle>
            <DialogDescription>
              Add a sitemap URL or upload files to your agent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Source Type Selection */}
            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select
                value={sourceType}
                onValueChange={(value: 'sitemap' | 'file') => setSourceType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sitemap">
                    <div className="flex items-center">
                      <Globe className="w-4 h-4 mr-2" />
                      Sitemap URL
                    </div>
                  </SelectItem>
                  <SelectItem value="file">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      File Upload
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sourceType === 'sitemap' && (
              <div className="space-y-2">
                <Label htmlFor="sitemap-url">Sitemap URL</Label>
                <Input
                  id="sitemap-url"
                  type="url"
                  placeholder="https://example.com/sitemap.xml"
                  value={sitemapUrl}
                  onChange={(e) => setSitemapUrl(e.target.value)}
                />
              </div>
            )}

            {sourceType === 'file' && (
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  isDragActive ? "border-brand-500 bg-brand-50" : "border-border hover:border-border"
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive
                    ? "Drop files here..."
                    : "Drag and drop files here, or click to select"}
                </p>
              </div>
            )}

            {/* Settings */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Source Settings</h4>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="executive-js" className="flex-1">
                  Execute JavaScript
                  <p className="text-xs text-muted-foreground font-normal mt-1">
                    Enable JavaScript execution for dynamic content
                  </p>
                </Label>
                <Switch
                  id="executive-js"
                  checked={executiveJs}
                  onCheckedChange={setExecutiveJs}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refresh-frequency">Data Refresh Frequency</Label>
                <Select
                  value={dataRefreshFrequency}
                  onValueChange={setDataRefreshFrequency}
                >
                  <SelectTrigger id="refresh-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="create-new" className="flex-1">
                  Create New Pages
                  <p className="text-xs text-muted-foreground font-normal mt-1">
                    Add new pages found in the source
                  </p>
                </Label>
                <Switch
                  id="create-new"
                  checked={createNewPages}
                  onCheckedChange={setCreateNewPages}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="remove-unexist" className="flex-1">
                  Remove Non-existent Pages
                  <p className="text-xs text-muted-foreground font-normal mt-1">
                    Remove pages that no longer exist in the source
                  </p>
                </Label>
                <Switch
                  id="remove-unexist"
                  checked={removeUnexistPages}
                  onCheckedChange={setRemoveUnexistPages}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refresh-existing">
                  Refresh Existing Pages
                  <p className="text-xs text-muted-foreground font-normal mt-1">
                    Control when to refresh already indexed pages
                  </p>
                </Label>
                <Select
                  value={refreshExistingPages}
                  onValueChange={setRefreshExistingPages}
                >
                  <SelectTrigger id="refresh-existing">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="always">Always</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={sourceType === 'sitemap' ? handleCreateSitemap : () => setShowAddModal(false)}
              disabled={loading || (sourceType === 'sitemap' && !sitemapUrl.trim())}
            >
              {loading ? 'Creating...' : sourceType === 'sitemap' ? 'Create Source' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Settings Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Source Settings</DialogTitle>
            <DialogDescription>
              Update settings for {selectedSource && getSourceName(selectedSource)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-executive-js" className="flex-1">
                Execute JavaScript
                <p className="text-xs text-muted-foreground font-normal mt-1">
                  Enable JavaScript execution for dynamic content
                </p>
              </Label>
              <Switch
                id="edit-executive-js"
                checked={executiveJs}
                onCheckedChange={setExecutiveJs}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-refresh-frequency">Data Refresh Frequency</Label>
              <Select
                value={dataRefreshFrequency}
                onValueChange={setDataRefreshFrequency}
              >
                <SelectTrigger id="edit-refresh-frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-create-new" className="flex-1">
                Create New Pages
                <p className="text-xs text-muted-foreground font-normal mt-1">
                  Add new pages found in the source
                </p>
              </Label>
              <Switch
                id="edit-create-new"
                checked={createNewPages}
                onCheckedChange={setCreateNewPages}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-remove-unexist" className="flex-1">
                Remove Non-existent Pages
                <p className="text-xs text-muted-foreground font-normal mt-1">
                  Remove pages that no longer exist in the source
                </p>
              </Label>
              <Switch
                id="edit-remove-unexist"
                checked={removeUnexistPages}
                onCheckedChange={setRemoveUnexistPages}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-refresh-existing">
                Refresh Existing Pages
                <p className="text-xs text-muted-foreground font-normal mt-1">
                  Control when to refresh already indexed pages
                </p>
              </Label>
              <Select
                value={refreshExistingPages}
                onValueChange={setRefreshExistingPages}
              >
                <SelectTrigger id="edit-refresh-existing">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="always">Always</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSettings}
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this source? This action cannot be undone.
              All associated pages will also be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setSourceToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSource}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete Source'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Source Page Details Modal */}
      {sourceForDetails && (
        <SourcePageDetails
          source={sourceForDetails}
          projectId={project.id}
          open={showDetailsModal}
          onOpenChange={(open) => {
            setShowDetailsModal(open);
            if (!open) {
              setSourceForDetails(null);
            }
          }}
        />
      )}
    </div>
  );
};