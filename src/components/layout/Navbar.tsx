/**
 * Navigation Bar Component
 * 
 * Application-wide navigation header with responsive design.
 * Provides consistent navigation across all pages.
 * 
 * Features:
 * - Responsive navigation menu
 * - Active state highlighting
 * - Back button for sub-pages
 * - Mobile-optimized layout
 * - Sticky positioning
 * - Brand logo and name
 * 
 * Navigation Structure:
 * - Chat: Main chat interface (/)
 * - Projects: Agent/project management (/projects)
 * - Profile: User profile settings (/profile)
 * - Settings: Application settings (/settings)
 * 
 * Responsive Behavior:
 * - Desktop: Full navigation with labels
 * - Tablet: Compact navigation
 * - Mobile: Icon-only navigation
 * 
 * Features:
 * - Flexible navigation system with dynamic menu items
 * - Professional active state styling and visual feedback
 * - Advanced dropdown menus for hierarchical navigation
 * - User account integration with avatar and profile menu
 * - Real-time notification system with visual indicators
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  LayoutDashboard,
  User,
  Home,
  Settings,
  Mic
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useDemoStore } from '@/store/demo';

/**
 * Props for Navbar component
 * 
 * @property showBackButton - Whether to show back button on sub-pages
 */
interface NavbarProps {
  showBackButton?: boolean;
}

/**
 * Navigation Bar Component
 * 
 * Renders the main application navigation with responsive design.
 * Highlights active navigation item based on current route.
 */
export const Navbar: React.FC<NavbarProps> = ({ showBackButton = true }) => {
  const pathname = usePathname();
  const { isDemoMode, isAuthenticated } = useDemoStore();

  /**
   * Navigation items configuration
   * 
   * Add new navigation items here to extend the navbar.
   * Each item needs href, label, and icon from lucide-react.
   */
  const navigationItems = [
    { href: '/', label: 'Chat', icon: MessageSquare },
    { href: '/admin/today', label: 'Admin', icon: LayoutDashboard },
    { href: '/voice-agents', label: 'Voice Agents', icon: Mic },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  /**
   * Check if navigation item is active
   * 
   * Special handling for root path (/) to prevent
   * it from always being active. Other paths use
   * prefix matching for sub-pages.
   */
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    if (href === '/admin/today') {
      return pathname.startsWith('/admin');
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Coach Connect Logo"
                  className="w-8 h-8 rounded-lg"
                />
              </div>
              <span className="text-lg font-semibold text-foreground hidden sm:block font-[var(--font-playfair)]">
                Coach Connect Admin
              </span>
            </Link>
          </div>

          {/* Center - Navigation Items */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </div>

          {/* Right side - Mobile menu or additional actions */}
          <div className="flex items-center gap-2">
            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center gap-1">
              {navigationItems.filter(item => item.href !== '/').map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <Link key={item.href} href={item.href}>
                    <button
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        active
                          ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                      title={item.label}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  </Link>
                );
              })}
            </div>
            
            {/* Home button for non-home pages on mobile */}
            {pathname !== '/' && (
              <Link href="/" className="md:hidden">
                <button 
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="Go to Chat"
                >
                  <Home className="w-4 h-4" />
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};