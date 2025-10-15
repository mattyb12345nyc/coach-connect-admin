import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';

import '../app/globals.css';
import './widget-styles.css';
import { WidgetConfig, Conversation } from '../types';
import type { ConversationStore } from '../store/widget-stores/conversations';
import { useConfigStore, useAgentStore } from '../store';
import { ChatLayout } from '../components/chat/ChatLayout';
import { getClient } from '../lib/api/client';
import { WidgetProvider } from './WidgetContext';
import { WidgetStoreProvider } from './WidgetStoreContext';
import { WidgetToaster } from './isolated-toast';
import { widgetDebugger } from './debug-utils';
import { FloatingButton } from './FloatingButton';

/**
 * Widget Configuration Interface
 * 
 * Defines all configuration options for CustomGPT widget initialization.
 * This interface is used by both embedded widgets and floating buttons.
 * 
 * @property agentId - Required: Agent/Project ID from CustomGPT dashboard
 * @property apiKey - Optional: API key for direct mode (bypasses proxy server)
 * @property apiUrl - Optional: Base URL for API (proxy URL or CustomGPT API URL)
 * @property useProxy - Optional: Force proxy mode even with API key (default: false)
 * @property agentName - Optional: Custom name to display instead of "Agent - {ID}"
 * @property containerId - DOM element ID for embedded mode (ignored in floating mode)
 * @property mode - Widget deployment mode: 'embedded' | 'floating' | 'widget'
 * @property theme - Color theme: 'light' | 'dark'
 * @property position - Position for floating mode: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
 * @property width - Widget width (default: '400px')
 * @property height - Widget height (default: '600px')
 * @property enableCitations - Show citation sources in messages
 * @property enableFeedback - Show thumbs up/down feedback buttons
 * 
 * Conversation Management Options:
 * @property enableConversationManagement - Enable conversation switching UI
 * @property maxConversations - Maximum conversations per session (default: 5)
 * @property sessionId - Custom session ID (auto-generated if not provided)
 * @property threadId - Specific conversation thread to load
 * @property isolateConversations - Whether to isolate conversations from other widgets (default: true)
 * 
 * Event Callbacks:
 * @property onOpen - Called when widget opens
 * @property onClose - Called when widget closes
 * @property onMessage - Called when new message is sent/received
 * @property onConversationChange - Called when conversation switches
 */
export interface CustomGPTWidgetConfig {
  // Required properties
  agentId: number | string;
  
  // API Configuration
  apiKey?: string; // API key for direct mode (bypasses proxy)
  apiUrl?: string; // Base URL for the API server (defaults to CustomGPT API or proxy)
  useProxy?: boolean; // Whether to use proxy mode (default: true if no apiKey)
  
  // Display properties
  agentName?: string;
  containerId?: string;
  mode?: 'embedded' | 'floating' | 'widget';
  theme?: 'light' | 'dark';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  width?: string;
  height?: string;
  
  // Floating button properties
  primaryColor?: string;
  buttonSize?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  
  // Feature flags
  enableCitations?: boolean;
  enableFeedback?: boolean;
  enableConversationManagement?: boolean;
  
  // Conversation management
  maxConversations?: number;
  sessionId?: string;
  threadId?: string;
  isolateConversations?: boolean; // New flag to isolate conversations
  
  // Event callbacks
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (message: any) => void;
  onConversationChange?: (conversation: any) => void;
}

/**
 * CustomGPT Widget Class
 * 
 * Main widget class that manages the lifecycle of CustomGPT chat instances.
 * Supports both embedded and floating deployment modes with full conversation management.
 * Can operate in two modes:
 * - Proxy mode (default): Communicates through a Next.js server proxy
 * - Direct mode: Communicates directly with CustomGPT API using provided API key
 * 
 * @example
 * // Basic embedded widget (proxy mode)
 * const widget = CustomGPTWidget.init({
 *   agentId: '123',
 *   containerId: 'chat-container',
 *   apiUrl: 'https://your-nextjs-app.com'
 * });
 * 
 * @example
 * // Direct mode with API key (no proxy needed)
 * const widget = CustomGPTWidget.init({
 *   agentId: '123',
 *   apiKey: 'your-api-key',
 *   mode: 'floating',
 *   enableConversationManagement: true
 * });
 * 
 * @example
 * // Floating widget with conversation management
 * const widget = CustomGPTWidget.init({
 *   agentId: '123',
 *   mode: 'floating',
 *   enableConversationManagement: true,
 *   maxConversations: 10
 * });
 */
class CustomGPTWidget {
  private container: HTMLElement | null = null;
  private root: any = null;
  private config: CustomGPTWidgetConfig;
  private isOpen: boolean = false;
  public sessionId: string;
  private currentConversationId: string | null = null;
  private instanceKey?: string;
  private conversationRefreshKey: number = 0;
  private floatingButtonContainer: HTMLElement | null = null;
  private floatingButtonRoot: any = null;
  private agentAvatar: string | null = null;

  constructor(config: CustomGPTWidgetConfig) {
    // Validate required fields
    
    if (!config.agentId) {
      throw new Error('CustomGPT Widget: Agent ID is required');
    }

    // Merge with defaults
    this.config = {
      mode: 'embedded',
      theme: 'light',
      position: 'bottom-right',
      width: '400px',
      height: '600px',
      enableCitations: true,
      enableFeedback: true,
      enableConversationManagement: false, // Always false for widget mode
      ...config,
    };

    // Initialize session ID
    // For widget mode, use a persistent session ID based on agentId to maintain conversations across refreshes
    if ((this.config.mode === 'widget' || this.config.mode === 'floating') && this.config.isolateConversations !== false) {
      // Create a stable session ID for widgets that persists across refreshes
      this.sessionId = `widget_session_${this.config.agentId}`;
      
      // Also store this as the persistent session for this agent
      localStorage.setItem(`customgpt_widget_session_${this.config.agentId}`, this.sessionId);
    } else if (this.config.isolateConversations !== false) {
      // For other modes with isolated conversations, create unique session
      const modePrefix = this.config.mode || 'widget';
      const containerId = this.config.containerId || 'default';
      // Create a unique session ID that includes mode, container info, and a random component
      // Use performance.now() for higher precision to avoid collisions
      const timestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const uniqueId = `${timestamp}_${random}_${Math.random().toString(36).substr(2, 5)}`;
      this.sessionId = `session_${modePrefix}_${containerId}_${uniqueId}`;
    } else if (this.config.sessionId) {
      // Use provided session ID for sharing conversations
      this.sessionId = this.config.sessionId;
    } else {
      // Generate a regular session ID
      this.sessionId = this.generateSessionId();
    }
    
    // Store widget instance reference for conversation management
    // Use unique instance key to prevent conflicts between multiple widgets
    if (typeof window !== 'undefined') {
      const instanceKey = `__customgpt_widget_${this.sessionId}`;
      (window as any)[instanceKey] = this;
      
      // Also store in instances object for easier access
      if (!(window as any).__customgpt_widget_instances) {
        (window as any).__customgpt_widget_instances = {};
      }
      (window as any).__customgpt_widget_instances[this.sessionId] = this;
      
      // DEPRECATED: Global reference kept for backward compatibility
      // Don't overwrite if already exists to preserve first widget
      if (!(window as any).__customgpt_widget_instance) {
        (window as any).__customgpt_widget_instance = this;
      }
      
      // Store instance key for later reference
      this.instanceKey = instanceKey;
    }

    this.init();
  }

  /**
   * Generates a unique session ID for conversation isolation
   * @returns Unique session identifier
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async init() {
    // Initialize API client based on configuration
    const { initializeClient } = require('../lib/api/client');
    
    // Determine if using direct mode or proxy mode
    const useDirectMode = this.config.apiKey && (this.config.useProxy !== true);
    
    if (useDirectMode) {
      // Direct mode - API key provided, communicate directly with CustomGPT
      initializeClient({
        mode: 'direct',
        apiKey: this.config.apiKey,
        apiUrl: this.config.apiUrl || 'https://app.customgpt.ai/api/v1'
      });
    } else {
      // Proxy mode - use Next.js server proxy
      const proxyUrl = this.config.apiUrl || '';
      initializeClient({
        mode: 'proxy',
        apiUrl: proxyUrl
      });
      
      // Store globally for the API client to pick up
      if (proxyUrl) {
        (window as any).__customgpt_api_url = proxyUrl;
      }
    }
    
    // Configure session for conversation isolation
    if (this.config.enableConversationManagement) {
      // Store session configuration for conversation management
      // If isolateConversations is true, use instance-specific session storage
      if (this.config.isolateConversations) {
        // Create instance-specific session object
        if (!(window as any).__customgpt_sessions) {
          (window as any).__customgpt_sessions = {};
        }
        (window as any).__customgpt_sessions[this.sessionId] = {
          sessionId: this.sessionId,
          maxConversations: this.config.maxConversations,
          enableConversationManagement: true
        };
      } else {
        // Use shared session (old behavior)
        (window as any).__customgpt_session = {
          sessionId: this.sessionId,
          maxConversations: this.config.maxConversations,
          enableConversationManagement: true
        };
      }
    }
    
    // Check if using demo/test API key
    const isDemoMode = false; // Demo mode removed as API key is server-side
    
    // Store demo mode flag for preventing unnecessary API calls
    if (isDemoMode) {
      (window as any).__customgpt_demo_mode = true;
    } else {
      // Ensure demo mode is disabled for valid API keys
      (window as any).__customgpt_demo_mode = false;
    }
    
    // Agent initialization is now handled by the widget-specific store
    // The WidgetStoreProvider will create and initialize the agent store
    // which includes proper error handling and fallback mechanisms

    // Create container based on mode
    this.createContainer();
    
    // For floating mode, create the floating button first
    if (this.config.mode === 'floating') {
      this.createFloatingButton();
    }
    
    // Render the widget first
    this.render();
    
    // For widget mode, always ensure a single conversation exists and is persisted
    const persistedConversationId = localStorage.getItem(`customgpt_widget_conversation_${this.config.agentId}`);
    
    // Load existing conversations for this session
    const existingConversations = this.getConversations();
    
    if (persistedConversationId && existingConversations.length > 0) {
      // Find the persisted conversation in our saved conversations
      const persistedConversation = existingConversations.find(c => c.id === persistedConversationId);
      
      if (persistedConversation) {
        // Load the persisted conversation
        this.currentConversationId = persistedConversationId;
        
        // Update the widget conversation store after a delay to ensure components are mounted
        setTimeout(async () => {
          if (typeof window !== 'undefined') {
            const widgetStores = (window as any).__customgpt_widget_stores;
            if (widgetStores && widgetStores[this.sessionId]) {
              const conversationStore = widgetStores[this.sessionId].conversationStore;
              const messageStore = widgetStores[this.sessionId].messageStore;
              
              if (conversationStore) {
                // First, ensure the conversation is in the store
                const existingConvs = conversationStore.getState().conversations;
                const convExists = existingConvs.some((c: Conversation) => c.id === persistedConversation.id);
                
                if (!convExists) {
                  // Add the conversation to the store's list
                  conversationStore.getState().setSearchQuery(''); // Clear any filters
                  conversationStore.setState((state: ConversationStore) => ({
                    allConversations: [...state.allConversations, persistedConversation],
                    conversations: [...state.conversations, persistedConversation]
                  }));
                }
                
                const fullConversation = {
                  ...persistedConversation,
                  id: parseInt(persistedConversation.id) || persistedConversation.id,
                  project_id: parseInt(this.config.agentId as string) || 0,
                  session_id: this.sessionId,
                  name: persistedConversation.title || persistedConversation.name || 'Chat'
                };
                
                console.log('[Widget] Restoring persisted conversation:', fullConversation);
                conversationStore.getState().selectConversation(fullConversation as any);
                
                // Load messages for the persisted conversation
                if (messageStore) {
                  // Wait a bit to ensure the conversation is selected
                  setTimeout(() => {
                    console.log('[Widget] Loading messages for conversation:', persistedConversationId);
                    messageStore.getState().loadMessages(persistedConversationId);
                  }, 100);
                }
              }
            }
          }
        }, 300);
      } else {
        // Persisted ID exists but conversation not found, create new
        setTimeout(async () => {
          const newConversation = await this.createConversation('Chat');
          if (newConversation) {
            localStorage.setItem(`customgpt_widget_conversation_${this.config.agentId}`, newConversation.id.toString());
          }
        }, 100);
      }
    } else {
      // No persisted conversation or no conversations exist, create a new one
      setTimeout(async () => {
        const newConversation = await this.createConversation('Chat');
        if (newConversation) {
          // Persist the conversation ID
          localStorage.setItem(`customgpt_widget_conversation_${this.config.agentId}`, newConversation.id.toString());
        }
      }, 100);
    }
    
    // For isolated widgets, we need to prevent the global store from being used
    if (this.config.isolateConversations !== false && typeof window !== 'undefined') {
      // Store the widget instance globally so components can access it
      (window as any).__customgpt_widget_instances = (window as any).__customgpt_widget_instances || {};
      (window as any).__customgpt_widget_instances[this.sessionId] = this;
      
      // Set the current active widget session
      (window as any).__customgpt_active_widget_session = this.sessionId;
    }
  }

  private createContainer() {
    const { mode, containerId } = this.config;

    if (mode === 'embedded' && containerId) {
      // Use provided container
      this.container = document.getElementById(containerId);
      if (!this.container) {
        throw new Error(`Container with id "${containerId}" not found`);
      }
    } else if (mode === 'floating') {
      // Create floating container
      this.container = document.createElement('div');
      this.container.id = 'customgpt-floating-widget';
      this.setupFloatingStyles();
      document.body.appendChild(this.container);
    } else {
      // Create default container
      this.container = document.createElement('div');
      this.container.id = 'customgpt-widget';
      document.body.appendChild(this.container);
    }
  }

  private setupFloatingStyles() {
    if (!this.container || this.config.mode !== 'floating') return;

    const { position, width, height } = this.config;
    
    // Base floating styles
    Object.assign(this.container.style, {
      position: 'fixed',
      zIndex: '9999',
      width: width || '400px',
      height: height || '600px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      backgroundColor: 'white', // Ensure background is set
    });
    
    // Add class for styling
    this.container.classList.add('floating-mode');
    this.container.classList.add('customgpt-floating-container');

    // Position-specific styles
    switch (position) {
      case 'bottom-right':
        Object.assign(this.container.style, {
          bottom: '20px',
          right: '20px',
        });
        break;
      case 'bottom-left':
        Object.assign(this.container.style, {
          bottom: '20px',
          left: '20px',
        });
        break;
      case 'top-right':
        Object.assign(this.container.style, {
          top: '20px',
          right: '20px',
        });
        break;
      case 'top-left':
        Object.assign(this.container.style, {
          top: '20px',
          left: '20px',
        });
        break;
    }

    // Initially hidden for floating mode with proper initial state
    this.container.style.display = 'none';
    this.container.style.opacity = '0';
    this.container.style.transform = 'translateY(20px)';
  }

  private async fetchAgentAvatar() {
    try {
      const client = getClient();
      // Convert agentId to number as required by the API
      const agentId = typeof this.config.agentId === 'string' 
        ? parseInt(this.config.agentId, 10) 
        : this.config.agentId;
      
      const response = await client.getAgentSettings(agentId);
      const settings = response.data || response;
      
      if (settings.chatbot_avatar) {
        this.agentAvatar = settings.chatbot_avatar;
        // Update floating button if it exists
        if (this.floatingButtonRoot) {
          this.createFloatingButton();
        }
      }
    } catch (error) {
      console.warn('Failed to fetch agent avatar:', error);
    }
  }

  private createFloatingButton() {
    if (this.config.mode !== 'floating') return;

    // Create button container if it doesn't exist
    if (!this.floatingButtonContainer) {
      this.floatingButtonContainer = document.createElement('div');
      this.floatingButtonContainer.id = 'customgpt-floating-button-container';
      document.body.appendChild(this.floatingButtonContainer);
    }

    // Create or update the button root
    if (!this.floatingButtonRoot) {
      this.floatingButtonRoot = createRoot(this.floatingButtonContainer);
    }

    const FloatingButtonApp = () => {
      return (
        <FloatingButton
          isOpen={this.isOpen}
          onToggle={() => this.toggle()}
          position={this.config.position}
          primaryColor={this.config.primaryColor || '#007acc'}
          size={this.config.buttonSize || 'md'}
          showLabel={this.config.showLabel !== false}
          label={this.config.label || 'Chat with us'}
          avatarUrl={this.agentAvatar || undefined}
        />
      );
    };

    this.floatingButtonRoot.render(<FloatingButtonApp />);
    
    // Also fetch avatar if we don't have it yet
    if (!this.agentAvatar) {
      this.fetchAgentAvatar();
    }
  }

  private render() {
    if (!this.container) return;

    // Apply proper styling based on mode
    if (this.config.mode === 'embedded') {
      this.container.classList.add('customgpt-embedded-widget');
      // Apply width and height styles directly to container
      Object.assign(this.container.style, {
        width: this.config.width || '400px',
        height: this.config.height || '600px',
        margin: '0 auto', // Center by default
        display: 'block',
      });
    }

    // Only create root once
    if (!this.root) {
      this.root = createRoot(this.container);
    }
    
    const WidgetApp = () => {
      // DEPRECATED: This global reference is kept for backward compatibility
      // New code should use WidgetContext instead
      // Only set if not already set to avoid overwriting first widget
      if (typeof window !== 'undefined' && !(window as any).__customgpt_widget_instance) {
        (window as any).__customgpt_widget_instance = this;
      }
      
      const handleClose = () => {
        this.close();
        this.config.onClose?.();
      };

      // Get current conversation ID or use thread ID
      const currentConvId = this.currentConversationId || this.config.threadId;
      
      // For isolated mode, pass the widget instance to manage conversations locally
      const widgetRef = this;
      
      // Create a unique key for this widget's conversations
      const widgetKey = `widget_${this.sessionId}`;

      return (
        <WidgetStoreProvider sessionId={this.sessionId}>
          <WidgetProvider widgetInstance={widgetRef}>
            <div className={`customgpt-widget-wrapper widget-mode ${this.config.mode}-mode`}>
              <ChatLayout
                mode={this.config.mode === 'embedded' ? 'widget' : 'floating'}
                onClose={this.config.mode === 'floating' ? handleClose : undefined}
                showSidebar={false} // Disable sidebar for widget mode
                className="w-full h-full"
                // Pass conversation management configuration
                enableConversationManagement={this.config.enableConversationManagement}
                maxConversations={this.config.maxConversations}
                sessionId={this.sessionId}
                threadId={currentConvId} // Pass current conversation ID
                onConversationChange={this.config.onConversationChange}
                onMessage={this.config.onMessage}
                // Pass widget instance for isolated conversation management
                widgetInstance={this.config.isolateConversations !== false ? widgetRef : undefined}
                // Pass current conversations for isolated mode
                conversations={this.config.isolateConversations !== false ? this.getConversations() : undefined}
                currentConversation={this.config.isolateConversations !== false && this.currentConversationId ?
                  this.getConversations().find(c => c.id === this.currentConversationId) : undefined}
                // Pass refresh key to trigger ConversationManager updates
                conversationRefreshKey={this.conversationRefreshKey}
                // Pass citation configuration
                enableCitations={this.config.enableCitations}
              />
              <WidgetToaster sessionId={this.sessionId} />
            </div>
          </WidgetProvider>
        </WidgetStoreProvider>
      );
    };

    this.root.render(<WidgetApp />);

    // Auto-open for embedded mode
    if (this.config.mode === 'embedded') {
      this.open();
    }
  }

  /**
   * Get all conversations for current session
   * @returns Array of conversations
   */
  public getConversations(): any[] {
    const stored = localStorage.getItem(`customgpt_conversations_${this.sessionId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse conversations:', e);
      }
    }
    return [];
  }

  /**
   * Switch to a different conversation
   * @param conversationId - ID of conversation to switch to
   */
  public switchConversation(conversationId: string): void {
    widgetDebugger.log('WIDGET', 'switchConversation called', {
      conversationId,
      conversationIdType: typeof conversationId,
      sessionId: this.sessionId,
      isolateConversations: this.config.isolateConversations,
      currentConversations: this.getConversations().map(c => ({
        id: c.id,
        idType: typeof c.id,
        title: c.title
      }))
    });
    
    const conversations = this.getConversations();
    const conversation = conversations.find(c => c.id === conversationId || c.id === parseInt(conversationId));
    
    widgetDebugger.log('WIDGET', 'Found conversation', {
      found: !!conversation,
      conversationId,
      searchedId: conversationId,
      conversationDetails: conversation ? {
        id: conversation.id,
        idType: typeof conversation.id,
        title: conversation.title,
        session_id: conversation.session_id
      } : null
    });
    
    if (conversation) {
      this.currentConversationId = conversationId;
      
      // Increment refresh key to trigger ConversationManager update
      this.conversationRefreshKey++;
      
      // Load messages for the new conversation from widget store
      if (this.config.isolateConversations !== false && typeof window !== 'undefined') {
        // Get the widget's message store and load messages
        const widgetStores = (window as any).__customgpt_widget_stores;
        
        widgetDebugger.log('WIDGET', 'Accessing widget stores', {
          hasWidgetStores: !!widgetStores,
          sessionId: this.sessionId,
          hasSessionStore: widgetStores && !!widgetStores[this.sessionId],
          availableSessions: widgetStores ? Object.keys(widgetStores) : []
        });
        
        if (widgetStores && widgetStores[this.sessionId]) {
          const messageStore = widgetStores[this.sessionId].messageStore;
          const conversationStore = widgetStores[this.sessionId].conversationStore;
          
          if (messageStore) {
            // Load messages for this conversation
            widgetDebugger.log('WIDGET', 'Loading messages via store', {
              conversationId,
              storeHasLoadMessages: typeof messageStore.getState().loadMessages === 'function'
            });
            
            widgetDebugger.traceMessageFlow('SWITCH_CONVERSATION', {
              conversationId,
              sessionId: this.sessionId,
              action: 'Loading messages'
            });
            
            // Ensure conversationId is a string for consistency
            const convIdStr = String(conversationId);
            widgetDebugger.log('WIDGET', 'Calling loadMessages with string ID', {
              originalId: conversationId,
              stringId: convIdStr,
              typeOfOriginal: typeof conversationId
            });
            messageStore.getState().loadMessages(convIdStr);
          }
          
          if (conversationStore) {
            // Update the conversation store's currentConversation
            widgetDebugger.log('WIDGET', 'Updating conversation store', {
              conversationId: conversation.id,
              conversationIdType: typeof conversation.id
            });
            
            const fullConversation = {
              ...conversation,
              id: parseInt(conversation.id) || conversation.id, // Ensure proper ID type
              project_id: parseInt(this.config.agentId as string) || 0,
              session_id: this.sessionId,
              name: conversation.title
            };
            conversationStore.getState().selectConversation(fullConversation as any);
          }
        } else {
          widgetDebugger.log('WIDGET', 'Widget stores not found', {
            sessionId: this.sessionId,
            availableStores: Object.keys(widgetStores || {})
          }, 'error');
        }
      }
      
      // Don't update the global store if we're in isolated mode
      // The render() method will handle passing the correct conversation
      if (!this.config.isolateConversations) {
        // Only update global store if sharing conversations
        if (typeof window !== 'undefined') {
          const { useConversationStore } = require('../store');
          
          // Get all widget conversations
          const allWidgetConversations = this.getConversations();
          
          // Convert all widget conversations to store format
          const storeConversations = allWidgetConversations.map(conv => ({
            ...conv,
            project_id: parseInt(this.config.agentId as string) || 0,
            session_id: this.sessionId,
            name: conv.title
          }));
          
          // Find the selected conversation with proper format
          const fullConversation = storeConversations.find(c => c.id === conversationId);
          
          // Update store with all widget conversations
          useConversationStore.setState({
            conversations: storeConversations as any,
            currentConversation: fullConversation as any
          });
        }
      }
      
      // Trigger re-render with new conversation
      this.render();
      this.config.onConversationChange?.(conversation);
    }
  }

  /**
   * Create a new conversation
   * @param title - Optional title for the conversation
   * @returns The new conversation object
   */
  public async createConversation(title?: string): Promise<any> {
    const conversations = this.getConversations();
    
    // Check max conversations limit (only if specified by user)
    if (this.config.maxConversations && conversations.length >= this.config.maxConversations) {
      console.warn(`Maximum conversation limit (${this.config.maxConversations}) reached`);
      return null; // Return null instead of throwing error
    }
    
    // Use the conversation store to create a proper API conversation
    if (this.config.isolateConversations !== false && typeof window !== 'undefined') {
      const widgetStores = (window as any).__customgpt_widget_stores;
      if (widgetStores && widgetStores[this.sessionId]) {
        const conversationStore = widgetStores[this.sessionId].conversationStore;
        const messageStore = widgetStores[this.sessionId].messageStore;
        
        if (conversationStore) {
          try {
            // Create conversation via the store (which uses API)
            await conversationStore.getState().createConversation(
              parseInt(this.config.agentId as string) || 0,
              title || `Conversation ${conversations.length + 1}`
            );
            
            // Get the newly created conversation
            const newConversation = conversationStore.getState().currentConversation;
            
            if (newConversation) {
              // Add to widget's local conversation list
              const widgetConversation = {
                id: newConversation.id.toString(), // Ensure string ID for consistency
                title: newConversation.name || title || `Conversation ${conversations.length + 1}`,
                createdAt: newConversation.created_at || new Date().toISOString(),
                messages: [],
                project_id: newConversation.project_id,
                session_id: newConversation.session_id,
                name: newConversation.name
              };
              
              conversations.unshift(widgetConversation);
              this.saveConversations(conversations);
              this.currentConversationId = widgetConversation.id;
              
              // Persist the conversation ID for widget mode
              localStorage.setItem(`customgpt_widget_conversation_${this.config.agentId}`, widgetConversation.id.toString());
              
              // Don't clear messages - they should persist
              
              // Increment refresh key to trigger ConversationManager update
              this.conversationRefreshKey++;
              
              // Trigger re-render with new conversation
              this.render();
              
              return widgetConversation;
            }
          } catch (error) {
            console.error('Failed to create conversation via API:', error);
            // Fall back to local creation if API fails
          }
        }
      }
    }
    
    // Fallback: Create conversation locally if API creation fails
    const newConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title || `Conversation ${conversations.length + 1}`,
      createdAt: new Date().toISOString(),
      messages: [],
      project_id: parseInt(this.config.agentId as string) || 0,
      session_id: this.sessionId,
      name: title || `Conversation ${conversations.length + 1}`
    };
    
    conversations.unshift(newConversation);
    this.saveConversations(conversations);
    this.currentConversationId = newConversation.id;
    
    // Persist the conversation ID for widget mode
    localStorage.setItem(`customgpt_widget_conversation_${this.config.agentId}`, newConversation.id.toString());
    
    // Increment refresh key to trigger ConversationManager update
    this.conversationRefreshKey++;
    
    // Trigger re-render with new conversation
    this.render();
    
    return newConversation;
  }

  /**
   * Update conversation title
   * @param conversationId - ID of conversation to update
   * @param newTitle - New title for the conversation
   */
  public updateConversationTitle(conversationId: string, newTitle: string): void {
    const conversations = this.getConversations();
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (conversation) {
      conversation.title = newTitle;
      this.saveConversations(conversations);
      // Increment refresh key to trigger ConversationManager update
      this.conversationRefreshKey++;
      this.render();
    }
  }

  /**
   * Delete a conversation
   * @param conversationId - ID of conversation to delete
   */
  public deleteConversation(conversationId: string): void {
    const conversations = this.getConversations();
    const filtered = conversations.filter(c => c.id !== conversationId);
    
    this.saveConversations(filtered);
    
    // Increment refresh key to trigger ConversationManager update
    this.conversationRefreshKey++;
    
    // If deleting current conversation, switch to another or create new
    if (this.currentConversationId === conversationId) {
      if (filtered.length > 0) {
        this.switchConversation(filtered[0].id);
      } else {
        this.createConversation().catch(err => 
          console.error('Failed to create conversation after deletion:', err)
        );
      }
    } else {
      // Still need to re-render to update the conversation list
      this.render();
    }
  }

  /**
   * Save conversations to localStorage
   * @param conversations - Array of conversations to save
   */
  private saveConversations(conversations: any[]): void {
    try {
      localStorage.setItem(
        `customgpt_conversations_${this.sessionId}`,
        JSON.stringify(conversations)
      );
    } catch (e) {
      console.error('Failed to save conversations:', e);
      // Handle quota exceeded error
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        // Try to clean up old conversations
        this.cleanupOldConversations();
      }
    }
  }

  /**
   * Clean up old conversations to free up localStorage space
   */
  private cleanupOldConversations(): void {
    const conversations = this.getConversations();
    // Keep only the 3 most recent conversations
    const recent = conversations.slice(0, 3);
    this.saveConversations(recent);
  }

  // Public methods
  public open() {
    if (!this.container) return;

    this.isOpen = true;
    
    if (this.config.mode === 'floating') {
      this.container.style.display = 'block';
      // Trigger animation
      setTimeout(() => {
        if (this.container) {
          this.container.style.transform = 'translateY(0)';
          this.container.style.opacity = '1';
        }
      }, 10);
      
      // Update floating button
      if (this.floatingButtonRoot) {
        this.createFloatingButton();
      }
    }

    this.config.onOpen?.();
  }

  public close() {
    if (!this.container) return;

    this.isOpen = false;

    if (this.config.mode === 'floating') {
      this.container.style.transform = 'translateY(20px)';
      this.container.style.opacity = '0';
      
      setTimeout(() => {
        if (this.container) {
          this.container.style.display = 'none';
        }
      }, 300);
      
      // Update floating button
      if (this.floatingButtonRoot) {
        this.createFloatingButton();
      }
    }
  }

  public toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public destroy() {
    if (this.root) {
      this.root.unmount();
    }
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Clean up floating button
    if (this.floatingButtonRoot) {
      this.floatingButtonRoot.unmount();
    }
    
    if (this.floatingButtonContainer && this.floatingButtonContainer.parentNode) {
      this.floatingButtonContainer.parentNode.removeChild(this.floatingButtonContainer);
    }
    
    // Clean up widget stores
    if (typeof window !== 'undefined') {
      const widgetStores = (window as any).__customgpt_widget_stores;
      if (widgetStores && widgetStores[this.sessionId]) {
        delete widgetStores[this.sessionId];
      }
      
      // Clean up widget instance references
      const instances = (window as any).__customgpt_widget_instances;
      if (instances && instances[this.sessionId]) {
        delete instances[this.sessionId];
      }
      
      if (this.instanceKey) {
        delete (window as any)[this.instanceKey];
      }
    }
    
    this.container = null;
    this.root = null;
    this.floatingButtonContainer = null;
    this.floatingButtonRoot = null;
  }

  public updateConfig(newConfig: Partial<CustomGPTWidgetConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    // Re-render with new config
    this.render();
  }
  
  /**
   * Force a re-render of the widget
   * Useful for updating the UI after state changes
   */
  public refresh() {
    this.render();
  }

  // Getters
  public get isOpened() {
    return this.isOpen;
  }

  public get configuration() {
    return { ...this.config };
  }
}

// Global API for the widget
declare global {
  interface Window {
    CustomGPTWidget: {
      init: (config: CustomGPTWidgetConfig) => CustomGPTWidget;
      create: (config: CustomGPTWidgetConfig) => CustomGPTWidget;
    };
  }
}

// Export for UMD build
const CustomGPTWidgetAPI = {
  init: (config: CustomGPTWidgetConfig): CustomGPTWidget => {
    return new CustomGPTWidget(config);
  },
  
  create: (config: CustomGPTWidgetConfig): CustomGPTWidget => {
    return new CustomGPTWidget(config);
  },
};

// Global assignment for browser usage
if (typeof window !== 'undefined') {
  window.CustomGPTWidget = CustomGPTWidgetAPI;
}

// For module usage
export { CustomGPTWidget, CustomGPTWidgetAPI };
export default CustomGPTWidgetAPI;