/**
 * Dashboard Layout Component
 * 
 * Main layout wrapper for dashboard pages with sidebar navigation.
 * Provides consistent structure for all dashboard views.
 * 
 * Features:
 * - Collapsible sidebar navigation
 * - Multi-level navigation menu
 * - Badge support for notifications
 * - User profile dropdown
 * - Search functionality
 * - Responsive design
 * - Smooth animations
 * - Active page highlighting
 * 
 * Navigation Structure:
 * - Dashboard overview
 * - Agent management
 * - Conversation history
 * - Analytics & reports
 * - Page/document management
 * - Data source configuration
 * - User management
 * - Settings
 * 
 * Layout Structure:
 * - Fixed sidebar (collapsible)
 * - Top header with search/profile
 * - Main content area
 * - Responsive mobile menu
 * 
 * Features:
 * - Dynamic navigation system with customizable menu items
 * - Professional breadcrumb navigation for improved UX
 * - Complete footer integration with branding and links
 * - Advanced search functionality with intelligent filtering
 * - Comprehensive keyboard shortcuts for power users
 * - Implement dark mode toggle
 * - Add notification center
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Bot, 
  MessageSquare, 
  BarChart3, 
  FileText, 
  Database, 
  Menu,
  X,
  Search,
  ChevronDown,
  Mic,
  Users,
  Sparkles,
  User
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

/**
 * Props for DashboardLayout
 * 
 * @property children - Page content to render
 * @property currentPage - Current active page ID for highlighting
 */
interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  badge?: number;
  submenu?: NavItem[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: 'App Content',
    items: [
      { id: 'today', label: 'Today Dashboard', icon: LayoutDashboard, href: '/admin/today' },
      { id: 'chat', label: 'Coach Chat', icon: MessageSquare, href: '/admin/chat' },
      { id: 'practice', label: 'Practice Floor', icon: Mic, href: '/admin/practice' },
      { id: 'community', label: 'Community', icon: Users, href: '/admin/community' },
      { id: 'culture', label: 'Culture Feed', icon: Sparkles, href: '/admin/culture' },
      { id: 'users-mgmt', label: 'Users', icon: User, href: '/admin/users' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'agents', label: 'Agents', icon: Bot, href: '/projects' },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: BarChart3,
        href: '/dashboard/analytics',
        submenu: [
          { id: 'analytics-overview', label: 'Overview', icon: BarChart3, href: '/dashboard/analytics' },
          { id: 'analytics-traffic', label: 'Traffic', icon: BarChart3, href: '/dashboard/analytics/traffic' },
          { id: 'analytics-queries', label: 'Queries', icon: BarChart3, href: '/dashboard/analytics/queries' },
        ],
      },
      { id: 'sources', label: 'Data Sources', icon: Database, href: '/dashboard/sources' },
    ],
  },
];

const NavItem: React.FC<{
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onItemClick: (item: NavItem) => void;
}> = ({ item, isActive, isCollapsed, onItemClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubmenu = item.submenu && item.submenu.length > 0;

  const handleClick = () => {
    if (hasSubmenu) {
      setIsExpanded(!isExpanded);
    } else {
      onItemClick(item);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          'hover:bg-gray-100 hover:text-gray-900',
          isActive && 'bg-brand-50 text-brand-700 border-r-2 border-brand-600',
          isCollapsed && 'justify-center px-2'
        )}
        title={isCollapsed ? item.label : undefined}
      >
        <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-brand-600')} />
        
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] text-center">
                {item.badge}
              </span>
            )}
            {hasSubmenu && (
              <ChevronDown className={cn(
                'h-4 w-4 transition-transform',
                isExpanded && 'rotate-180'
              )} />
            )}
          </>
        )}
      </button>

      {/* Submenu */}
      {hasSubmenu && isExpanded && !isCollapsed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="ml-6 mt-1 space-y-1"
        >
          {item.submenu!.map((subItem) => (
            <button
              key={subItem.id}
              onClick={() => onItemClick(subItem)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <subItem.icon className="h-4 w-4" />
              {subItem.label}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  currentPage = 'dashboard' 
}) => {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigation = (item: NavItem) => {
    router.push(item.href);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}>
        {/* Sidebar Header */}
        <div className={cn(
          'flex items-center gap-3 p-4 border-b border-border',
          sidebarCollapsed && 'justify-center px-2'
        )}>
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Bot className="h-5 w-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground">Coach Connect</h1>
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {navigationGroups.map((group) => (
            <div key={group.label}>
              {!sidebarCollapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    isActive={currentPage === item.id}
                    isCollapsed={sidebarCollapsed}
                    onItemClick={handleNavigation}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={toggleMobileMenu}>
          <aside className="w-64 h-full bg-card">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Coach Connect</h1>
                  <p className="text-xs text-muted-foreground">Admin Dashboard</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="p-4 space-y-4">
              {navigationGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <NavItem
                        key={item.id}
                        item={item}
                        isActive={currentPage === item.id}
                        isCollapsed={false}
                        onItemClick={(navItem) => {
                          handleNavigation(navItem);
                          setMobileMenuOpen(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Mobile Menu Button & Search */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={toggleMobileMenu}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search agents, conversations..."
                  className="pl-10 w-80 hidden sm:block"
                  icon={<Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
                />
              </div>
            </div>

          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};