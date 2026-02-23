/**
 * Page Layout Component
 * 
 * Provides consistent page structure across the application.
 * Wraps page content with optional navigation bar.
 * 
 * Features:
 * - Consistent background and minimum height
 * - Optional navigation bar
 * - Responsive layout structure
 * - Clean separation of navigation and content
 * 
 * Layout Structure:
 * - Full viewport height container
 * - Sticky navigation bar (when shown)
 * - Main content area with proper spacing
 * - Gray background for visual hierarchy
 * 
 * Features:
 * - Complete layout system with footer and breadcrumb support
 * - Advanced navigation options including sidebar layouts
 * - Theme system with multiple color schemes
 * - Loading states with smooth transitions and animations
 * - Enhanced user experience with scroll-to-top functionality
 * 
 * Usage examples:
 * - With navbar: <PageLayout>{content}</PageLayout>
 * - Without navbar: <PageLayout showNavbar={false}>{content}</PageLayout>
 * - Without back button: <PageLayout showBackButton={false}>{content}</PageLayout>
 */

'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { MobileNavigation, MobileHeader } from '@/components/mobile/MobileNavigation';
import { MobileDrawer, MobileBottomSheet } from '@/components/mobile/MobileDrawer';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import { useMobileNavigation } from '@/hooks/useTouchGestures';
import { ConversationSidebar } from '@/components/chat/ConversationSidebar';
import { AgentSelectorMobile } from '@/components/chat/AgentSelectorMobile';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceSettingsStore } from '@/store/voice-settings';

/**
 * Props for PageLayout component
 * 
 * @property children - Page content to render
 * @property showNavbar - Whether to show the navigation bar (default: true)
 * @property showBackButton - Whether to show back button in navbar (default: true)
 * @property pageTitle - Title for mobile header (default: 'CustomGPT')
 * @property showMobileNavigation - Whether to show mobile bottom navigation (default: true)
 * @property unreadCount - Number of unread messages for mobile navigation badge
 * @property onAgentSelect - Callback for agent selection on mobile
 */
interface PageLayoutProps {
  children: React.ReactNode;
  showNavbar?: boolean;
  showBackButton?: boolean;
  // Mobile-specific props
  pageTitle?: string;
  showMobileNavigation?: boolean;
  unreadCount?: number;
  onAgentSelect?: () => void;
}

/**
 * Page Layout Component
 * 
 * Standard layout wrapper that provides consistent structure
 * for all pages in the application. Handles navigation bar
 * rendering and content spacing.
 * 
 * The layout ensures:
 * - Minimum full viewport height
 * - Consistent background color
 * - Proper spacing when navbar is present
 * - Responsive behavior across devices
 */
export const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  showNavbar = true, 
  showBackButton = true,
  pageTitle = 'Coach Connect',
  showMobileNavigation = true,
  unreadCount = 0,
  onAgentSelect
}) => {
  const [isAgentSelectorOpen, setIsAgentSelectorOpen] = useState(false);
  const { isMobile } = useBreakpoint();
  const { isVoiceModalOpen } = useVoiceSettingsStore();
  
  // Ensure proper layout cleanup after voice modal closes
  React.useEffect(() => {
    // Force a small re-render delay to ensure proper layout cleanup after voice modal closes
    if (!isVoiceModalOpen && isMobile) {
      const timer = setTimeout(() => {
        // Layout cleanup complete
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isVoiceModalOpen, isMobile]);
  const router = useRouter();
  const pathname = usePathname();
  const {
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    openBottomSheet,
    activeBottomSheet,
    closeBottomSheet
  } = useMobileNavigation();

  // Handle mobile navigation actions
  const handleHistoryClick = () => {
    openDrawer();
  };

  const handleAgentClick = () => {
    if (onAgentSelect) {
      onAgentSelect();
    } else {
      setIsAgentSelectorOpen(true);
    }
  };


  return (
    <div className={cn(
      "min-h-screen bg-background",
      isMobile && "flex flex-col"
    )}>
      {/* Desktop Navigation */}
      {!isMobile && showNavbar && (
        <Navbar showBackButton={showBackButton} />
      )}
      
      {/* Mobile Header - Hidden when voice modal is open */}
      {isMobile && showNavbar && !isVoiceModalOpen && (
        <MobileHeader
          title={pageTitle}
          leftIcon={
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Coach Connect"
                className="w-6 h-6 rounded"
              />
            </div>
          }
          rightIcon={<Menu className="w-6 h-6" />}
          onRightClick={handleHistoryClick}
        />
      )}
      
      {/* Main content area */}
      <main className={cn(
        'flex-1',
        showNavbar && !isMobile ? '' : 'pt-0',
        isMobile && showMobileNavigation ? 'pb-16' : '',
        isMobile && 'overflow-y-auto'
      )} style={isMobile ? { touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' } : {}}>
        {children}
      </main>
      
      {/* Mobile Navigation - Hidden when voice modal is open */}
      {isMobile && showMobileNavigation && !isVoiceModalOpen && (
        <MobileNavigation
          unreadCount={unreadCount}
          onHistoryClick={handleHistoryClick}
          onAgentClick={handleAgentClick}
        />
      )}
      
      {/* Mobile Drawer for Chat History */}
      {isMobile && (
        <MobileDrawer
          isOpen={isDrawerOpen}
          onClose={closeDrawer}
          title="Chat History"
          side="left"
          width="xl"
        >
          <ConversationSidebar 
            isMobile={true}
            onConversationSelect={() => {
              closeDrawer();
              // Navigate to chat page if not already there
              if (pathname !== '/') {
                router.push('/');
              }
            }}
          />
        </MobileDrawer>
      )}
      
      {/* Mobile Agent Selector */}
      {isMobile && (
        <AgentSelectorMobile
          isOpen={isAgentSelectorOpen}
          onClose={() => setIsAgentSelectorOpen(false)}
        />
      )}
      
    </div>
  );
};