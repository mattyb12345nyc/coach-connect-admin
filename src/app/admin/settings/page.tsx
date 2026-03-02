'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sun,
  Moon,
  Shield,
  Server,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useConfigStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function AdminSettingsPage() {
  const [serverStatus, setServerStatus] = useState<'checking' | 'configured' | 'not-configured'>('checking');
  const { theme, setTheme } = useConfigStore();

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('/api/proxy/projects');
        setServerStatus(response.ok ? 'configured' : 'not-configured');
      } catch {
        setServerStatus('not-configured');
      }
    };
    checkServerStatus();
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-coach-gold/20 flex items-center justify-center">
          <Settings className="w-5 h-5 text-coach-gold" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Application preferences and configuration</p>
        </div>
      </div>

      <Card className="overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Appearance</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Choose your preferred theme</p>
        </div>
        <div className="p-6">
          <div className="flex gap-3">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                'flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-all',
                theme === 'light'
                  ? 'border-coach-gold bg-amber-50/50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <Sun className={cn('w-5 h-5', theme === 'light' ? 'text-coach-gold' : 'text-gray-400')} />
              <div className="text-left">
                <p className="text-sm font-medium">Light</p>
                <p className="text-xs text-muted-foreground">Default light theme</p>
              </div>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                'flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-all',
                theme === 'dark'
                  ? 'border-coach-gold bg-amber-50/50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <Moon className={cn('w-5 h-5', theme === 'dark' ? 'text-coach-gold' : 'text-gray-400')} />
              <div className="text-left">
                <p className="text-sm font-medium">Dark</p>
                <p className="text-xs text-muted-foreground">Reduced brightness</p>
              </div>
            </button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Server Status</h2>
          <p className="text-sm text-muted-foreground mt-0.5">API connection and configuration</p>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3">
            {serverStatus === 'checking' ? (
              <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
            ) : serverStatus === 'configured' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <div>
              <p className="text-sm font-medium">
                {serverStatus === 'checking' && 'Checking connection...'}
                {serverStatus === 'configured' && 'Connected'}
                {serverStatus === 'not-configured' && 'Not connected'}
              </p>
              <p className="text-xs text-muted-foreground">
                {serverStatus === 'configured'
                  ? 'API keys are configured and working'
                  : serverStatus === 'not-configured'
                    ? 'Server-side API keys may not be set'
                    : 'Verifying server configuration'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Security</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Authentication and API access</p>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium">Server-side Authentication</p>
              <p className="text-xs text-muted-foreground">
                API keys are stored securely on the server. No client-side credentials are exposed.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
