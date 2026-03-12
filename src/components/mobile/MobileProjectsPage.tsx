/**
 * Mobile Projects Page Component
 * 
 * Mobile-optimized project management interface with navigation flow.
 * Uses a single-column layout with screens for: Projects List → Settings Tabs → Settings Content
 * 
 * Features:
 * - Navigation flow optimized for mobile
 * - Back button navigation
 * - Touch-optimized UI elements
 * - Full-screen settings content
 * - Responsive design
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Bot, 
  Settings, 
  Search, 
  Plus, 
  ChevronRight,
  Palette,
  MessageCircle,
  Brain,
  BarChart3,
  Info,
  RefreshCw,
  Database,
  FileText,
  Users,
  Shield,
  AlertCircle,
  Activity,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

import { useAgentStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/loading';
import { cn, formatTimestamp } from '@/lib/utils';
import type { Agent } from '@/types';

// Import settings components
import { GeneralSettings } from '@/components/projects/GeneralSettings';
import { AppearanceSettings } from '@/components/projects/AppearanceSettings';
import { BehaviorSettings } from '@/components/projects/BehaviorSettings';
import { SourcesSettings } from '@/components/projects/SourcesSettings';
import { PagesSettings } from '@/components/projects/PagesSettings';
import { ConversationsSettings } from '@/components/projects/ConversationsSettings';
import { ReportsAnalytics } from '@/components/projects/ReportsAnalytics';
import { CustomerIntelligenceTab } from '@/components/projects/CustomerIntelligenceTab';
import { MessagesAndCitations } from '@/components/projects/MessagesAndCitations';
import { UserInterfaceSettings } from '@/components/projects/UserInterfaceSettings';
import { AdvancedSettings } from '@/components/projects/AdvancedSettings';
import { BusinessAndLicensing } from '@/components/projects/BusinessAndLicensing';
import { SecurityAndPrivacy } from '@/components/projects/SecurityAndPrivacy';

type SettingsTab = 'general' | 'appearance' | 'behavior' | 'sources' | 'pages' | 'conversations' | 'analytics' | 'intelligence' | 'messages-citations' | 'interface' | 'advanced' | 'business-licensing' | 'security';

// Screen types for navigation
type ScreenType = 'projects' | 'tabs' | 'settings';

const settingsTabs = [
  { id: 'general' as SettingsTab, label: 'General', icon: Info, description: 'Basic project settings and prompts' },
  { id: 'appearance' as SettingsTab, label: 'Appearance', icon: Palette, description: 'Branding, colors, and UI customization' },
  { id: 'behavior' as SettingsTab, label: 'Behavior', icon: Brain, description: 'AI personality, model, and response settings' },
  { id: 'sources' as SettingsTab, label: 'Data Sources', icon: Database, description: 'Upload files, add websites, manage data' },
  { id: 'pages' as SettingsTab, label: 'Content Pages', icon: FileText, description: 'Manage indexed content and metadata' },
  { id: 'conversations' as SettingsTab, label: 'Conversations', icon: Users, description: 'Chat history, sharing, and management' },
  { id: 'analytics' as SettingsTab, label: 'Reports & Analytics', icon: BarChart3, description: 'Traffic, queries, and conversation reports' },
  { id: 'intelligence' as SettingsTab, label: 'Customer Intelligence', icon: Activity, description: 'Customer interactions, emotions, intents, and behavioral analytics' },
  { id: 'messages-citations' as SettingsTab, label: 'Messages & Citations', icon: MessageCircle, description: 'Custom messages, templates, and citation display settings' },
  { id: 'interface' as SettingsTab, label: 'User Interface', icon: Settings, description: 'Detailed UI customization options' },
  { id: 'advanced' as SettingsTab, label: 'Advanced', icon: Settings, description: 'Advanced configuration settings' },
  { id: 'business-licensing' as SettingsTab, label: 'Business & Licensing', icon: Zap, description: 'Commerce settings, monetization, and license management' },
  { id: 'security' as SettingsTab, label: 'Security & Privacy', icon: Shield, description: 'Access control, data retention, and security settings' },
];

interface MobileProjectsPageProps {
  className?: string;
}

/**
 * Mobile Project Card Component
 */
const MobileProjectCard: React.FC<{
  project: Agent;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}> = ({ project, isSelected, onClick, disabled = false }) => {
  const avatarUrl = project.settings?.chatbot_avatar;
  
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        'w-full p-4 text-left border rounded-xl transition-all',
        'flex items-center gap-4',
        disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'active:scale-[0.98]',
        isSelected 
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-sm' 
          : 'border-border hover:border-accent-foreground/20 bg-card'
      )}
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 overflow-hidden">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${project.project_name} avatar`}
            className="w-full h-full object-cover"
          />
        ) : (
          <Bot className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      
      {/* Project Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-foreground mb-1 truncate">
          {project.project_name}
        </h3>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">
            ID: {project.id}
          </p>
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs font-medium',
              project.is_chat_active ? 'text-green-600' : 'text-muted-foreground'
            )}>
              {project.is_chat_active ? 'Active' : 'Inactive'}
            </span>
            <span className="text-xs text-muted-foreground">
              • Updated {formatTimestamp(project.updated_at)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </button>
  );
};

/**
 * Mobile Settings Tab Button Component
 */
const MobileSettingsTab: React.FC<{
  tab: typeof settingsTabs[0];
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}> = ({ tab, isActive, onClick, disabled = false }) => {
  const Icon = tab.icon;
  
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        'w-full p-4 text-left border rounded-xl transition-all',
        'flex items-center gap-4',
        disabled 
          ? 'opacity-60 cursor-not-allowed' 
          : 'active:scale-[0.98]',
        isActive 
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-sm' 
          : 'border-border hover:border-accent-foreground/20 bg-card'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
        isActive ? 'bg-brand-100 dark:bg-brand-900/30' : 'bg-accent'
      )}>
        {disabled ? (
          <Spinner size="sm" />
        ) : (
          <Icon className={cn(
            'w-5 h-5', 
            isActive ? 'text-brand-600 dark:text-brand-400' : 'text-muted-foreground'
          )} />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          'font-medium text-sm',
          isActive ? 'text-brand-900 dark:text-brand-100' : 'text-foreground'
        )}>
          {tab.label}
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          {tab.description}
        </p>
      </div>
      
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </button>
  );
};

/**
 * Mobile Projects Page Main Component
 */
export const MobileProjectsPage: React.FC<MobileProjectsPageProps> = ({ className }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Store hooks
  const { agents, loading, fetchAgents, loadMoreAgents, paginationMeta } = useAgentStore();
  
  // Local state
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('projects');
  const [selectedProject, setSelectedProject] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentlyLoaded, setRecentlyLoaded] = useState(false);
  const [fromDirectNavigation, setFromDirectNavigation] = useState(false);
  
  // Get URL params
  const projectIdFromUrl = searchParams?.get('id') ?? null;
  const tabFromUrl = (searchParams?.get('tab') as SettingsTab | null) ?? null;
  
  // Initialize data and detect direct navigation
  useEffect(() => {
    // Detect if user came from direct navigation (settings button click)
    if (projectIdFromUrl) {
      console.log('🎯 [Mobile Projects] Direct navigation detected, bypassing interaction delays');
      setFromDirectNavigation(true);
    }
    fetchAgents();
  }, [projectIdFromUrl]);
  
  // Handle URL parameters
  useEffect(() => {
    if (agents.length > 0 && projectIdFromUrl) {
      const project = agents.find(p => p.id.toString() === projectIdFromUrl);
      if (project) {
        console.log('🔍 [Mobile Projects] Selected project:', project.project_name);
        setSelectedProject(project);
        setCurrentScreen('tabs');
        
        if (tabFromUrl && settingsTabs.find(tab => tab.id === tabFromUrl)) {
          console.log('🔍 [Mobile Projects] Selected tab:', tabFromUrl);
          setActiveTab(tabFromUrl);
          setCurrentScreen('settings');
        }
      } else {
        console.log('🔍 [Mobile Projects] Project not found:', projectIdFromUrl);
      }
    }
  }, [agents, projectIdFromUrl, tabFromUrl]);
  
  // Track recent loading to prevent unintended clicks on new elements
  useEffect(() => {
    if (agents.length > 0 && !loading && recentlyLoaded) {
      // Shorter delay for direct navigation, normal delay for organic loading
      const delay = fromDirectNavigation ? 50 : 150; // Reduced from 500ms
      console.log(`⏰ [Mobile Projects] Setting interaction delay: ${delay}ms (direct: ${fromDirectNavigation})`);
      
      const timeout = setTimeout(() => {
        console.log('✅ [Mobile Projects] Interaction protection lifted');
        setRecentlyLoaded(false);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [loading, agents.length, recentlyLoaded, fromDirectNavigation]);
  
  // Filter projects
  const filteredProjects = agents.filter(project =>
    project.project_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Navigation functions
  const goToTabs = (project: Agent) => {
    // Prevent navigation during loading or recently loaded to avoid unintended selections
    if (loading || recentlyLoaded) {
      console.log('🔒 [Mobile Projects] Ignoring selection during loading:', project.project_name, { loading, recentlyLoaded });
      return;
    }
    
    setSelectedProject(project);
    setCurrentScreen('tabs');
    router.push(`/projects?id=${project.id}`);
  };
  
  const goToSettings = (tab: SettingsTab) => {
    // Allow tab navigation immediately when coming from direct navigation
    if (!fromDirectNavigation && (loading || recentlyLoaded)) {
      console.log('🔒 [Mobile Projects] Tab navigation blocked due to loading state');
      return;
    }
    
    console.log('🎯 [Mobile Projects] Navigating to settings tab:', tab);
    setActiveTab(tab);
    setCurrentScreen('settings');
  };
  
  const goBack = () => {
    if (currentScreen === 'settings') {
      setCurrentScreen('tabs');
    } else if (currentScreen === 'tabs') {
      setCurrentScreen('projects');
    }
  };
  
  const handleRefresh = () => {
    fetchAgents();
  };
  
  const handleLoadMore = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading || recentlyLoaded) return;
    
    try {
      setRecentlyLoaded(true);
      await loadMoreAgents();
      console.log('✅ [Mobile Projects] Load more completed successfully');
    } catch (error) {
      console.error('❌ [Mobile Projects] Load more failed:', error);
      setRecentlyLoaded(false); // Reset on error
    }
  };
  
  // Render settings content
  const renderSettingsContent = () => {
    console.log('🔍 [Mobile Projects] Rendering settings content:', { selectedProject: selectedProject?.project_name, activeTab, currentScreen });
    
    if (!selectedProject) {
      return (
        <div className="flex items-center justify-center h-64 text-center">
          <div>
            <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No project selected</p>
          </div>
        </div>
      );
    }


    switch (activeTab) {
      case 'general':
        return <GeneralSettings project={selectedProject} />;
      case 'appearance':
        return <AppearanceSettings project={selectedProject} />;
      case 'behavior':
        return <BehaviorSettings project={selectedProject} />;
      case 'sources':
        return <SourcesSettings project={selectedProject} />;
      case 'pages':
        return <PagesSettings project={selectedProject} />;
      case 'conversations':
        return <ConversationsSettings project={selectedProject} />;
      case 'analytics':
        return <ReportsAnalytics project={selectedProject} />;
      case 'intelligence':
        return <CustomerIntelligenceTab agentId={selectedProject.id} agentName={selectedProject.project_name} />;
      case 'messages-citations':
        return <MessagesAndCitations project={selectedProject} />;
      case 'interface':
        return <UserInterfaceSettings settings={{}} onChange={() => {}} />;
      case 'advanced':
        return <AdvancedSettings project={selectedProject} />;
      case 'business-licensing':
        return <BusinessAndLicensing project={selectedProject} />;
      case 'security':
        return <SecurityAndPrivacy project={selectedProject} />;
      default:
        return (
          <div className="flex items-center justify-center h-64 text-center">
            <div>
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Settings not found</p>
              <p className="text-sm text-muted-foreground mt-1">Active tab: {activeTab}</p>
            </div>
          </div>
        );
    }
  };
  
  // Loading state
  if (loading && agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex items-center gap-2">
          <Spinner size="md" />
          <span className="text-muted-foreground">Loading projects...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn('flex flex-col bg-background', className)} style={{ touchAction: 'manipulation' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 p-4 border-b border-border bg-background/95 backdrop-blur-sm">
        {currentScreen !== 'projects' && (
          <Button
            size="icon"
            variant="ghost"
            onClick={goBack}
            className="h-12 w-12 active:scale-95 transition-transform relative z-20"
            title="Go back"
            style={{ touchAction: 'manipulation' }}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
        )}
        
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-foreground">
            {currentScreen === 'projects' && 'Projects'}
            {currentScreen === 'tabs' && selectedProject?.project_name}
            {currentScreen === 'settings' && settingsTabs.find(t => t.id === activeTab)?.label}
          </h1>
          {currentScreen === 'tabs' && (
            <p className="text-xs text-muted-foreground">Project Settings</p>
          )}
          {currentScreen === 'settings' && (
            <p className="text-xs text-muted-foreground">
              {settingsTabs.find(t => t.id === activeTab)?.description}
            </p>
          )}
        </div>
        
        {currentScreen === 'projects' && (
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRefresh}
            disabled={loading}
            className="h-10 w-10"
          >
            <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} />
          </Button>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
        {currentScreen === 'projects' && (
          <div className="p-4 space-y-4">
            {/* Search */}
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 text-base rounded-xl"
              icon={<Search className="w-5 h-5 text-muted-foreground" />}
            />
            
            {/* Projects List */}
            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bot className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {searchQuery ? 'No projects found' : 'No projects yet'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  {searchQuery 
                    ? 'Try adjusting your search terms.' 
                    : 'Create your first project to get started.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProjects.map((project) => (
                  <MobileProjectCard
                    key={project.id}
                    project={project}
                    isSelected={false}
                    onClick={() => goToTabs(project)}
                    disabled={loading || recentlyLoaded}
                  />
                ))}
                
                {/* Load More */}
                {!searchQuery && paginationMeta?.hasMore && (
                  <div className="pt-4">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={loading || recentlyLoaded}
                      className="w-full mobile-btn"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Load More Projects
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {currentScreen === 'tabs' && (
          <div className="p-4 space-y-3">
            {settingsTabs.map((tab) => (
              <MobileSettingsTab
                key={tab.id}
                tab={tab}
                isActive={false}
                onClick={() => goToSettings(tab.id)}
                disabled={!fromDirectNavigation && (loading || recentlyLoaded)}
              />
            ))}
          </div>
        )}
        
        {currentScreen === 'settings' && (
          <div className="pb-20 overflow-y-auto" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
            {renderSettingsContent()}
          </div>
        )}
      </div>
    </div>
  );
};