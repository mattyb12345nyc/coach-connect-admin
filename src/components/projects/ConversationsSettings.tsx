'use client';

import React, { useEffect, useState } from 'react';
import { 
  MessageCircle,
  Trash2,
  Eye,
  Clock,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn, formatTimestamp, handleApiError } from '@/lib/utils';
import { getClient, isClientInitialized } from '@/lib/api/client';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import type { Agent, Conversation, ConversationsResponse } from '@/types';
import { ConversationMessages } from '@/components/projects/ConversationMessages';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDemoModeContext } from '@/contexts/DemoModeContext';

interface ConversationsSettingsProps {
  project: Agent;
}

export const ConversationsSettings: React.FC<ConversationsSettingsProps> = ({ project }) => {
  const { isMobile } = useBreakpoint();
  const { isFreeTrialMode } = useDemoModeContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showMessagesModal, setShowMessagesModal] = useState(false);


  useEffect(() => {
    loadConversations();
  }, [project.id, currentPage]);

  const loadConversations = async () => {
    if (!isClientInitialized()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = getClient();
      const response = await client.getConversations(project.id, {
        page: currentPage,
        per_page: 10
      });
      
      setConversations(response.data.data);
      setCurrentPage(response.data.current_page);
      setTotalPages(response.data.last_page);
      setTotal(response.data.total);
    } catch (err) {
      const errorData = handleApiError(err);
      setError(errorData.message);
      toast.error('Failed to load conversations', {
        description: errorData.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadConversations();
  };

  const handleDeleteConversation = async (sessionId: string) => {
    if (isFreeTrialMode) {
      toast.error('Deleting conversations is not available in free trial mode');
      return;
    }
    
    if (!isClientInitialized()) {
      return;
    }

    try {
      const client = getClient();
      await client.deleteConversation(project.id, sessionId);
      toast.success('Conversation deleted');
      loadConversations();
    } catch (err) {
      const errorData = handleApiError(err);
      toast.error('Failed to delete conversation', {
        description: errorData.message
      });
    }
  };


  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      (conv.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.session_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });


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
          )}>Conversations</h2>
          <p className={cn(
            "text-muted-foreground mt-1",
            isMobile ? "text-sm mobile-text-sm" : ""
          )}>
            Manage chat history, sharing, and analytics for {project.project_name}
          </p>
        </div>
        
        <div className={cn(
          "flex gap-3",
          isMobile ? "w-full justify-center mt-4" : "items-center"
        )}>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            size="sm"
            className={isMobile ? "h-9 px-3 text-sm" : ""}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* API Route Info - Mobile */}
      {isMobile && (
        <div className="mb-4 text-center">
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error loading conversations</span>
          </div>
          <p className="text-red-700 mt-1 text-sm">{error}</p>
          {error.includes('403') && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <p className="text-yellow-800">
                <strong>Premium Feature:</strong> Advanced conversation management may require a premium subscription.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stats Card */}
      <Card className={cn(
        "mb-6",
        isMobile ? "p-4 mobile-px mobile-py" : "p-4"
      )}>
        <div className="flex items-center">
          <MessageCircle className="w-8 h-8 text-blue-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-muted-foreground">Total Conversations</p>
            <p className="text-2xl font-bold text-foreground">{total}</p>
          </div>
        </div>
      </Card>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={isMobile ? "Search conversations..." : "Search conversations by name or session ID..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-10 pr-4 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
              isMobile ? "py-3 text-base mobile-input" : "py-2"
            )}
          />
        </div>
      </div>

      {/* Conversations List */}
      {loading && conversations.length === 0 ? (
        <div className={cn(
          "space-y-4",
          isMobile && "space-y-3"
        )}>
          {[...Array(5)].map((_, i) => (
            <Card key={i} className={cn(
              "animate-pulse",
              isMobile ? "p-4 mobile-px mobile-py" : "p-6"
            )}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-muted rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredConversations.length === 0 ? (
        <Card className={cn(
          "text-center",
          isMobile ? "p-8 mobile-px mobile-py" : "p-12"
        )}>
          <MessageCircle className={cn(
            "text-muted-foreground mx-auto mb-4",
            isMobile ? "w-12 h-12" : "w-16 h-16"
          )} />
          <h3 className={cn(
            "font-medium text-foreground mb-2",
            isMobile ? "text-base mobile-text-lg" : "text-lg"
          )}>
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </h3>
          <p className={cn(
            "text-muted-foreground",
            isMobile ? "text-sm mobile-text-sm mb-4" : "mb-6"
          )}>
            {searchQuery 
              ? 'Try adjusting your search or filters'
              : 'Conversations will appear here once users start chatting with your agent'
            }
          </p>
        </Card>
      ) : (
        <div className={cn(
          "space-y-4",
          isMobile && "space-y-3"
        )}>
          {filteredConversations.map((conversation) => {
            return (
              <Card key={conversation.id} className={cn(
                "hover:shadow-lg transition-shadow",
                isMobile ? "p-4 mobile-px mobile-py" : "p-6"
              )}>
                <div className={cn(
                  "flex items-start gap-4",
                  isMobile && "gap-3"
                )}>
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-brand-600" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "flex items-start justify-between mb-2",
                      isMobile && "flex-col gap-1"
                    )}>
                      <div className="flex-1 min-w-0">
                        <h3 className={cn(
                          "font-semibold text-foreground truncate mb-1",
                          isMobile ? "text-base mobile-text-lg" : "text-lg"
                        )}>
                          {conversation.name || `Conversation ${conversation.id}`}
                        </h3>
                        
                        <div className={cn(
                          "text-muted-foreground mb-2",
                          isMobile ? "flex flex-col gap-1 text-xs" : "flex items-center gap-4 text-sm"
                        )}>
                          <span>Session ID: {conversation.session_id}</span>
                          {conversation.created_by && (
                            <span>User ID: {conversation.created_by}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className={cn(
                      "text-muted-foreground mb-3",
                      isMobile ? "flex flex-col gap-1 text-xs" : "flex items-center gap-4 text-xs"
                    )}>
                      <span>Created {formatTimestamp(conversation.created_at)}</span>
                      {conversation.updated_at && (
                        <span>Updated {formatTimestamp(conversation.updated_at)}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className={cn(
                      "pt-3 border-t",
                      isMobile ? "grid grid-cols-2 gap-2" : "flex items-center gap-2"
                    )}>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setSelectedConversation(conversation);
                          setShowMessagesModal(true);
                        }}
                        className={isMobile ? "h-8 px-3 text-xs" : ""}
                      >
                        <Eye className="w-4 h-4 mr-1.5" />
                        {isMobile ? 'View' : 'View Messages'}
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDeleteConversation(conversation.session_id)}
                        disabled={isFreeTrialMode}
                        className={cn(
                          "text-red-600 hover:text-red-700 hover:bg-red-50",
                          isMobile ? "h-8 px-3 text-xs" : "",
                          isFreeTrialMode && "opacity-50 cursor-not-allowed"
                        )}
                        title={isFreeTrialMode ? 'Deleting conversations is not available in free trial mode' : ''}
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className={cn(
              "flex items-center justify-center gap-2 mt-6",
              isMobile && "gap-1 mt-4"
            )}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className={isMobile ? "h-8 px-3 text-xs" : ""}
              >
                {isMobile ? 'Prev' : 'Previous'}
              </Button>
              <span className={cn(
                "text-muted-foreground",
                isMobile ? "text-xs mx-2" : "text-sm"
              )}>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className={isMobile ? "h-8 px-3 text-xs" : ""}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Messages Modal */}
      <Dialog 
        open={showMessagesModal} 
        onOpenChange={(open) => {
          setShowMessagesModal(open);
          if (!open) {
            setSelectedConversation(null);
          }
        }}
      >
        <DialogContent className={cn(
          "h-[90vh] flex flex-col p-0",
          isMobile ? "max-w-[95vw] w-[95vw]" : "max-w-6xl"
        )}>
          <DialogHeader className={cn(
            "border-b",
            isMobile ? "px-4 py-3" : "px-6 py-4"
          )}>
            <DialogTitle className={isMobile ? "text-base mobile-text-lg" : ""}>
              Conversation Messages
            </DialogTitle>
          </DialogHeader>
          
          {selectedConversation && (
            <div className="flex-1 overflow-hidden">
              <ConversationMessages
                projectId={project.id}
                conversationId={selectedConversation.id}
                sessionId={selectedConversation.session_id}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};