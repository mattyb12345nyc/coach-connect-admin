/**
 * Mobile Agent Selector Component
 * 
 * Mobile-optimized agent selector using a bottom sheet pattern.
 * Designed for touch interactions with large tap targets.
 * 
 * Features:
 * - Bottom sheet modal for agent selection
 * - Touch-optimized agent cards
 * - Search functionality
 * - Quick agent creation
 * - Swipe-to-close gesture support
 * - Safe area padding for modern devices
 * 
 * Usage:
 * - Triggered from mobile navigation
 * - Full-screen modal with backdrop
 * - Spring-based animations
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Bot, 
  X,
  Search, 
  Plus,
  Check,
  User,
  AlertCircle,
  RefreshCw,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { Agent } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAgentStore } from '@/store';
import { Spinner } from '@/components/ui/loading';
import { MobileBottomSheet } from '@/components/mobile/MobileDrawer';
import { getClient } from '@/lib/api/client';

interface AgentSelectorMobileProps {
  /** Whether the bottom sheet is open */
  isOpen: boolean;
  /** Callback to close the bottom sheet */
  onClose: () => void;
  /** Callback when agent settings are requested */
  onSettingsClick?: (agent: Agent) => void;
  /** Additional CSS classes */
  className?: string;
}

interface MobileAgentCardProps {
  /** Agent data */
  agent: Agent;
  /** Whether this agent is currently selected */
  isSelected: boolean;
  /** Callback when agent is selected */
  onSelect: (agent: Agent) => void;
  /** Callback for settings */
  onSettingsClick?: (agent: Agent) => void;
}

/**
 * Mobile Agent Card Component
 * 
 * Touch-optimized card for agent selection.
 * Features larger tap targets and clear visual feedback.
 */
const MobileAgentCard: React.FC<MobileAgentCardProps> = ({
  agent,
  isSelected,
  onSelect,
  onSettingsClick
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const router = useRouter();
  
  const handleSelect = async () => {
    if (isSelecting || isSelected) return;
    
    setIsSelecting(true);
    try {
      await onSelect(agent);
    } finally {
      setIsSelecting(false);
    }
  };
  
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/projects?id=${agent.id}`);
  };
  
  const avatarUrl = agent.settings?.chatbot_avatar;
  const isActive = agent.is_chat_active;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative p-4 border border-border rounded-xl bg-card touch-target',
        'transition-all duration-200 active:scale-[0.98]',
        isSelected 
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' 
          : 'hover:border-accent-foreground/20'
      )}
      onClick={handleSelect}
    >
      {/* Loading overlay */}
      {isSelecting && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
          <Spinner size="sm" />
        </div>
      )}
      
      <div className="flex items-start gap-4">
        {/* Agent Avatar */}
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden',
          isSelected ? 'bg-brand-600' : 'bg-accent'
        )}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${agent.project_name} avatar`}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className={cn(
              'w-6 h-6',
              isSelected ? 'text-white' : 'text-muted-foreground'
            )} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              'font-medium truncate mobile-text-base',
              isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-foreground'
            )}>
              {agent.project_name}
            </h3>
            {isSelected && (
              <Check className="w-5 h-5 text-brand-600 flex-shrink-0" />
            )}
          </div>
          
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className={cn(
                'w-2 h-2 rounded-full',
                isActive ? 'bg-green-500' : 'bg-gray-400'
              )} />
              <span className="text-xs mobile-text-sm">
                {isActive ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <span className="text-xs mobile-text-sm">
              ID: {agent.id}
            </span>
          </div>
          
          {/* Agent Description */}
          {agent.settings?.default_prompt && (
            <p className="text-sm mobile-text-sm text-muted-foreground mt-2 line-clamp-2">
              {agent.settings.default_prompt}
            </p>
          )}
        </div>
        
        {/* Settings Button */}
        <Button
          size="icon"
          variant="ghost"
          onClick={handleSettingsClick}
          className="h-9 w-9 flex-shrink-0 ml-2"
          title={`Settings for ${agent.project_name}`}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

/**
 * Agent Selector Mobile Component - Main Export
 * 
 * Mobile-optimized agent selector with bottom sheet interface.
 */
export const AgentSelectorMobile: React.FC<AgentSelectorMobileProps> = ({
  isOpen,
  onClose,
  onSettingsClick,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [isLoadingAllForSearch, setIsLoadingAllForSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const { 
    agents, 
    currentAgent, 
    loading, 
    error, 
    fetchAgents, 
    selectAgent,
    loadMoreAgents,
    paginationMeta
  } = useAgentStore();
  
  // Filter agents based on search query
  const filteredAgents = agents.filter(agent =>
    agent.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.id.toString().includes(searchQuery)
  );
  
  // Fetch agents when sheet opens
  useEffect(() => {
    if (isOpen && agents.length === 0) {
      fetchAgents();
    }
  }, [isOpen, agents.length, fetchAgents]);
  
  // Track agents that have had settings fetch attempted to prevent infinite loops
  const settingsFetchAttempted = useRef(new Set<number>());
  
  // Fetch settings for agents that don't have them (ONE TIME ONLY)
  useEffect(() => {
    const fetchMissingSettings = async () => {
      if (!isOpen || agents.length === 0) return;
      
      console.log('🔍 [AgentSelector] Checking for agents needing settings fetch');
      
      const client = getClient();
      const agentsWithoutSettings = agents.filter(agent => 
        !agent.settings && !settingsFetchAttempted.current.has(agent.id)
      );
      
      if (agentsWithoutSettings.length === 0) {
        console.log('✅ [AgentSelector] All agents have settings or fetch already attempted');
        return;
      }
      
      // Limit to first 5 to avoid overwhelming the API
      const agentsToFetch = agentsWithoutSettings.slice(0, 5);
      console.log('📥 [AgentSelector] Fetching settings for agents:', agentsToFetch.map(a => a.id));
      
      // Mark these agents as attempted BEFORE fetching to prevent loops
      agentsToFetch.forEach(agent => {
        settingsFetchAttempted.current.add(agent.id);
      });
      
      // Fetch settings in parallel for better performance
      const settingsPromises = agentsToFetch.map(async (agent) => {
        try {
          const settingsResponse = await client.getAgentSettings(agent.id);
          if (settingsResponse && settingsResponse.data) {
            return { agent, settings: settingsResponse.data };
          }
        } catch (error) {
          console.error(`Failed to fetch settings for agent ${agent.id}:`, error);
        }
        return null;
      });
      
      const settingsResults = await Promise.all(settingsPromises);
      const validResults = settingsResults.filter(result => result !== null);
      
      if (validResults.length > 0) {
        console.log('✅ [AgentSelector] Updating', validResults.length, 'agents with settings');
        // Batch update all agents at once to minimize store updates
        useAgentStore.setState(state => ({
          agents: state.agents.map(a => {
            const result = validResults.find(r => r!.agent.id === a.id);
            return result ? { ...a, settings: result.settings } : a;
          }),
          // Also update current agent if it matches
          currentAgent: state.currentAgent 
            ? (() => {
                const result = validResults.find(r => r!.agent.id === state.currentAgent!.id);
                return result ? { ...state.currentAgent, settings: result.settings } : state.currentAgent;
              })()
            : state.currentAgent
        }));
      }
    };
    
    fetchMissingSettings();
  }, [isOpen, agents]); // Add agents dependency - the function prevents infinite loops
  
  // Removed auto-focus to prevent keyboard from automatically opening
  
  /**
   * Automatically load all pages when searching
   * This ensures search works across all projects, not just loaded ones
   */
  useEffect(() => {
    const loadAllAgentsForSearch = async () => {
      // Only trigger if we have a search query and there are more pages to load
      if (!searchQuery || !paginationMeta?.hasMore || loading || isLoadingAllForSearch) {
        return;
      }

      console.log('🔍 [AgentSelector Mobile] Starting to load all agents for search...');
      setIsLoadingAllForSearch(true);
      
      try {
        // Keep loading pages until we have all agents
        let attempts = 0;
        const maxAttempts = 20; // Safety limit to prevent infinite loops
        
        while (attempts < maxAttempts) {
          // Get fresh pagination state
          const currentState = useAgentStore.getState();
          if (!currentState.paginationMeta?.hasMore) {
            break;
          }
          
          attempts++;
          console.log(`📥 [AgentSelector Mobile] Loading more agents... (attempt ${attempts})`);
          
          await loadMoreAgents();
          
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const finalState = useAgentStore.getState();
        console.log('✅ [AgentSelector Mobile] Finished loading all agents for search');
        toast.success(`Loaded all ${finalState.agents.length} projects for search`);
      } catch (error) {
        console.error('Failed to load all agents for search:', error);
        toast.error('Failed to load all projects for search');
      } finally {
        setIsLoadingAllForSearch(false);
      }
    };

    // Only run if we have a search query
    if (searchQuery) {
      loadAllAgentsForSearch();
    }
  }, [searchQuery, paginationMeta?.hasMore, loading, loadMoreAgents]); // Include all dependencies
  
  const handleSelectAgent = async (agent: Agent) => {
    if (isSelecting || agent.id === currentAgent?.id) {
      return;
    }
    
    setIsSelecting(true);
    try {
      await selectAgent(agent);
      toast.success(`Switched to ${agent.project_name}`);
      
      // Navigate to chat screen after selecting agent
      router.push('/');
      onClose();
    } catch (error) {
      toast.error('Failed to switch agent');
      console.error('Failed to select agent:', error);
    } finally {
      setIsSelecting(false);
    }
  };
  
  const handleRefresh = async () => {
    try {
      await fetchAgents();
      toast.success('Agents refreshed');
    } catch (error) {
      toast.error('Failed to refresh agents');
    }
  };
  
  const handleCurrentAgentSettings = () => {
    if (currentAgent) {
      router.push(`/projects?id=${currentAgent.id}`);
      onClose();
    }
  };
  
  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      header={
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Select Agent</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn(
                'h-4 w-4',
                loading && 'animate-spin'
              )} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      }
      height="lg"
      className={className}
    >
      <div className="flex flex-col h-full">
        {/* Header with search */}
        <div className="px-6 py-4 border-b border-border">
          
          {/* Create New Agent Button */}
          <Link href="/dashboard/projects/create" className="mb-4 block">
            <Button className="w-full mobile-btn touch-target" variant="outline">
              <Plus className="w-5 h-5 mr-2" />
              Create New Agent
            </Button>
          </Link>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 text-base rounded-xl pl-10"
            />
            {/* Loading indicator when fetching all projects for search */}
            {isLoadingAllForSearch && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <RefreshCw className="w-5 h-5 animate-spin text-brand-500" />
              </div>
            )}
          </div>
          
          {/* Search loading message */}
          {isLoadingAllForSearch && paginationMeta && (
            <p className="text-xs text-muted-foreground mt-2">
              Loading all projects for search... ({agents.length} of {paginationMeta.totalCount})
            </p>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && agents.length === 0 ? (
            // Loading skeleton
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border border-border rounded-xl bg-card animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-muted rounded-xl flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-5 bg-muted rounded mb-2" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            // Error state
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Failed to load agents
              </h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                There was an error loading your agents. Please try again.
              </p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : filteredAgents.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchQuery ? 'No agents found' : 'No agents available'}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                {searchQuery 
                  ? 'Try adjusting your search terms.' 
                  : 'Create your first agent to get started.'
                }
              </p>
              {!searchQuery && (
                <Link href="/dashboard/projects/create">
                  <Button className="mobile-btn">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Agent
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            // Agent list
            <>
              <div className="space-y-3">
                {filteredAgents.map((agent, index) => (
                  <MobileAgentCard
                    key={agent.id}
                    agent={agent}
                    isSelected={currentAgent?.id === agent.id}
                    onSelect={handleSelectAgent}
                    onSettingsClick={onSettingsClick}
                  />
                ))}
              </div>
              
              {/* Load More button */}
              {paginationMeta?.hasMore && !searchQuery && (
                <div className="mt-6 flex justify-center">
                  <Button
                    onClick={loadMoreAgents}
                    disabled={loading}
                    variant="outline"
                    className="mobile-btn"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Load More Agents
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {/* Show total count */}
              {paginationMeta && !searchQuery && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Showing {agents.length} of {paginationMeta.totalCount} agents
                </p>
              )}
            </>
          )}
        </div>
        
        {/* Footer removed - Create button moved to top */}
      </div>
    </MobileBottomSheet>
  );
};