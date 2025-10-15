/**
 * Chat Layout Component
 * 
 * Top-level layout component that orchestrates the chat interface.
 * Handles different deployment modes and manages the conversation sidebar.
 * 
 * Deployment Modes:
 * - standalone: Full chat with sidebar (default for main app)
 * - widget: Embeddable chat without sidebar
 * - floating: Popup-style chat without sidebar
 * 
 * Features:
 * - Responsive sidebar with collapse/expand
 * - Automatic message loading on conversation change
 * - Mode-specific rendering logic
 * - Clean separation of concerns
 * 
 * Architecture:
 * - ChatLayout (this) - Layout orchestration
 *   - ConversationSidebar - Conversation list and management
 *   - ChatContainer - Main chat interface
 *     - Message - Individual messages
 *     - ChatInput - Message input area
 * 
 * State Management:
 * - currentConversation from conversationStore
 * - loadMessages from messageStore
 * - Local state for sidebar collapse
 * 
 * Features:
 * - Multiple deployment modes with flexible configuration
 * - Professional sidebar with persistent state and responsive design
 * - Full keyboard navigation and accessibility support
 * - Mobile-optimized interface with adaptive layout
 * - Customizable sidebar positioning and behavior options
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { Agent } from '@/types';
import { ChatContainer } from './ChatContainer';
import { ConversationSidebar } from './ConversationSidebar';
import { useConversationStore, useMessageStore } from '@/hooks/useWidgetStore';
import { useBreakpoint } from '@/hooks/useMediaQuery';

/**
 * Props for ChatLayout component
 * 
 * @property mode - Deployment mode: standalone (with sidebar), widget, or floating
 * @property className - Additional CSS classes for styling
 * @property onClose - Callback for closing chat (widget/floating modes)
 * @property onAgentSettings - Callback for opening agent settings
 * @property showSidebar - Whether to show sidebar (only applies to standalone mode)
 * @property enableConversationManagement - Enable conversation switching UI
 * @property maxConversations - Maximum conversations per session
 * @property sessionId - Session ID for conversation isolation
 * @property threadId - Specific conversation thread to load
 * @property onConversationChange - Callback when conversation changes
 * @property onMessage - Callback when message is sent/received
 */
interface ChatLayoutProps {
  mode?: 'standalone' | 'widget' | 'floating';
  className?: string;
  onClose?: () => void;
  onAgentSettings?: (agent: Agent) => void;
  showSidebar?: boolean;
  enableConversationManagement?: boolean;
  maxConversations?: number;
  sessionId?: string;
  threadId?: string;
  onConversationChange?: (conversation: any) => void;
  onMessage?: (message: any) => void;
  widgetInstance?: any; // Widget instance for isolated conversation management
  conversations?: any[]; // Current conversations for isolated mode
  currentConversation?: any; // Current conversation for isolated mode
  conversationRefreshKey?: number; // Key to trigger ConversationManager refresh
  enableCitations?: boolean; // Whether to show citations
}

/**
 * Chat Layout Component
 * 
 * Orchestrates the overall chat interface layout based on deployment mode.
 * In standalone mode, includes a collapsible conversation sidebar.
 * In widget/floating modes, renders only the chat container.
 */
export const ChatLayout: React.FC<ChatLayoutProps> = ({
  mode = 'standalone',
  className,
  onClose,
  onAgentSettings,
  showSidebar = true,
  enableConversationManagement = false,
  maxConversations,
  sessionId,
  threadId,
  onConversationChange,
  onMessage,
  widgetInstance,
  conversations,
  currentConversation,
  conversationRefreshKey,
  enableCitations
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { currentConversation: storeCurrentConversation } = useConversationStore();
  const { loadMessages } = useMessageStore();

  /**
   * Load messages when conversation changes
   * 
   * Automatically fetches messages from the store when user
   * switches between conversations. This ensures the chat
   * always shows the correct message history.
   */
  useEffect(() => {
    // Skip API calls in demo mode to prevent errors
    const isDemoMode = typeof window !== 'undefined' && (window as any).__customgpt_demo_mode;
    
    // In widget mode with isolated conversations, use the prop instead of store
    const conversationToLoad = (mode === 'widget' || mode === 'floating') && currentConversation 
      ? currentConversation 
      : storeCurrentConversation;
    
    if (conversationToLoad && !isDemoMode) {
      console.log('[ChatLayout] Loading messages for conversation:', {
        conversationId: conversationToLoad.id,
        mode,
        isFromProp: !!(currentConversation && (mode === 'widget' || mode === 'floating'))
      });
      loadMessages(conversationToLoad.id.toString());
    }
  }, [storeCurrentConversation, currentConversation, loadMessages, mode]);

  const { isMobile } = useBreakpoint();

  // Hide sidebar for widget and floating modes
  // Only standalone mode shows the conversation sidebar
  const shouldShowSidebar = showSidebar && mode === 'standalone';

  /**
   * Toggle sidebar collapsed state
   * 
   * Toggles sidebar visibility with potential for session persistence
   * to enhance user experience across application sessions
   */
  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (!shouldShowSidebar) {
    // For widget/floating modes, just show the chat container
    return (
      <ChatContainer
        mode={mode}
        className={className}
        onClose={onClose}
        onAgentSettings={onAgentSettings}
        enableConversationManagement={enableConversationManagement}
        maxConversations={maxConversations}
        sessionId={sessionId}
        threadId={threadId}
        onConversationChange={onConversationChange}
        onMessage={onMessage}
        conversationRefreshKey={conversationRefreshKey}
        isMobile={isMobile}
        enableCitations={enableCitations}
      />
    );
  }

  // On mobile, hide the sidebar and use drawer navigation instead
  if (isMobile) {
    return (
      <div className="flex flex-col h-full bg-background">
        <ChatContainer
          mode={mode}
          className="flex-1"
          onClose={onClose}
          onAgentSettings={onAgentSettings}
          enableConversationManagement={enableConversationManagement}
          maxConversations={maxConversations}
          sessionId={sessionId}
          threadId={threadId}
          onConversationChange={onConversationChange}
          onMessage={onMessage}
          conversationRefreshKey={conversationRefreshKey}
          isMobile={true}
          enableCitations={enableCitations}
        />
      </div>
    );
  }

  // Desktop layout with sidebar
  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <ConversationSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
        isMobile={false}
      />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatContainer
          mode={mode}
          className="h-full"
          onClose={onClose}
          onAgentSettings={onAgentSettings}
          enableConversationManagement={enableConversationManagement}
          maxConversations={maxConversations}
          sessionId={sessionId}
          threadId={threadId}
          onConversationChange={onConversationChange}
          onMessage={onMessage}
          conversationRefreshKey={conversationRefreshKey}
          isMobile={false}
          enableCitations={enableCitations}
        />
      </div>
    </div>
  );
};