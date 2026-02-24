'use client';

import React, { useEffect, useState } from 'react';
import { 
  Shield,
  Eye,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  Clock,
  Database,
  Save,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';

import { useProjectSettingsStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SimpleSelect } from '@/components/ui/simple-select';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import type { Agent } from '@/types';
import { useDemoModeContext } from '@/contexts/DemoModeContext';

interface SecurityAndPrivacyProps {
  project: Agent;
}

export const SecurityAndPrivacy: React.FC<SecurityAndPrivacyProps> = ({ project }) => {
  const { isFreeTrialMode } = useDemoModeContext();
  const { isMobile } = useBreakpoint();
  
  const { 
    settings, 
    settingsLoading, 
    settingsError, 
    fetchSettings, 
    updateSettings 
  } = useProjectSettingsStore();

  const [formData, setFormData] = useState({
    // API-documented security fields only
    private_deployment: false,
    enable_recaptcha_for_public_chatbots: false,
    remove_branding: false,
    conversation_time_window: false,
    conversation_retention_period: 'year',
    conversation_retention_days: 180,
  });

  const [isModified, setIsModified] = useState(false);

  useEffect(() => {
    // Clear any previous errors when project changes
    useProjectSettingsStore.setState({ settingsError: null });
    fetchSettings(project.id);
    
    // Cleanup function to clear errors when component unmounts
    return () => {
      useProjectSettingsStore.setState({ settingsError: null });
    };
  }, [project.id, fetchSettings]);

  useEffect(() => {
    if (settings) {
      setFormData({
        // API-documented fields with exact defaults from API docs
        private_deployment: settings.private_deployment || false,
        enable_recaptcha_for_public_chatbots: settings.enable_recaptcha_for_public_chatbots || false,
        remove_branding: settings.remove_branding || false,
        conversation_time_window: settings.conversation_time_window || false,
        conversation_retention_period: settings.conversation_retention_period || 'year',
        conversation_retention_days: settings.conversation_retention_days || 180,
      });
      setIsModified(false);
    }
  }, [settings]);

  const handleInputChange = (field: string, value: any) => {
    if (isFreeTrialMode) {
      toast.error('Editing security settings is not available in free trial mode');
      return;
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsModified(true);
  };

  const handleRefresh = () => {
    // Clear error state before refreshing
    useProjectSettingsStore.setState({ settingsError: null });
    fetchSettings(project.id);
    setIsModified(false);
  };

  const handleSave = async () => {
    if (isFreeTrialMode) {
      toast.error('Updating security settings is not available in free trial mode');
      return;
    }
    
    try {
      await updateSettings(project.id, formData as any);
      setIsModified(false);
      toast.success('Security and privacy settings updated successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save changes');
    }
  };

  return (
    <div className={cn(
      "max-w-4xl mx-auto",
      isMobile ? "p-4" : "p-6"
    )}>
      {/* Header */}
      <div className={cn(
        "mb-6",
        isMobile ? "flex-col gap-4" : "flex items-center justify-between"
      )}>
        <div className={isMobile ? "w-full" : ""}>
          <h2 className={cn(
            "font-bold text-foreground",
            isMobile ? "text-xl" : "text-2xl"
          )}>Security & Privacy</h2>
          <p className={cn(
            "text-muted-foreground mt-1",
            isMobile ? "text-sm" : ""
          )}>
            Configure security controls, access restrictions, and data retention policies
          </p>
        </div>
        
        <div className={cn(
          "flex gap-3",
          isMobile ? "w-full grid grid-cols-2 gap-2 mt-4" : "items-center"
        )}>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={settingsLoading}
            size="sm"
            className={isMobile ? "h-9 px-3 text-sm" : ""}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1.5', settingsLoading && 'animate-spin')} />
            Refresh
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!isModified || settingsLoading || isFreeTrialMode}
            size="sm"
            className={isMobile ? "h-9 px-3 text-sm" : ""}
          >
            <Save className="w-4 h-4 mr-1.5" />
            {settingsLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {settingsError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error loading settings</span>
          </div>
          <p className="text-red-600 dark:text-red-400 mt-1 text-sm">{settingsError}</p>
        </div>
      )}

      {/* Loading State */}
      {settingsLoading && !settings ? (
        <div className={cn("space-y-6", isMobile && "space-y-4")}>
          {[...Array(3)].map((_, i) => (
            <Card key={i} className={cn("p-6 animate-pulse", isMobile && "p-4")}>
              <div className="h-4 bg-muted rounded w-1/4 mb-4" />
              <div className="h-10 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </Card>
          ))}
        </div>
      ) : (
        <div className={cn("space-y-6", isMobile && "space-y-4")}>
          {/* Access Control & Security */}
          <Card className={cn("p-6", isMobile && "p-4")}>
            <div className={cn(
              "flex items-start justify-between mb-4",
              isMobile && "flex-col gap-2"
            )}>
              <div>
                <h3 className={cn(
                  "font-semibold text-foreground flex items-center gap-2",
                  isMobile ? "text-base" : "text-lg"
                )}>
                  <Shield className="w-5 h-5" />
                  Access Control & Security
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure deployment security and access restrictions
                </p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm font-medium text-foreground">Private Deployment</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Restrict access to your chatbot and require authentication
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.private_deployment}
                    onChange={(e) => handleInputChange('private_deployment', e.target.checked)}
                    className="sr-only peer"
                    disabled={isFreeTrialMode}
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-muted peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium text-foreground">Enable reCAPTCHA</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Protect against bots and spam with reCAPTCHA verification
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enable_recaptcha_for_public_chatbots}
                    onChange={(e) => handleInputChange('enable_recaptcha_for_public_chatbots', e.target.checked)}
                    className="sr-only peer"
                    disabled={isFreeTrialMode}
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-muted peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span className="text-sm font-medium text-foreground">Remove Branding</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Hide &ldquo;Powered by CustomGPT&rdquo; branding from your chatbot
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.remove_branding}
                    onChange={(e) => handleInputChange('remove_branding', e.target.checked)}
                    className="sr-only peer"
                    disabled={isFreeTrialMode}
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-muted peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                </label>
              </div>
            </div>
          </Card>

          {/* Data Retention & Privacy */}
          <Card className={cn("p-6", isMobile && "p-4")}>
            <div className={cn(
              "flex items-start justify-between mb-4",
              isMobile && "flex-col gap-2"
            )}>
              <div>
                <h3 className={cn(
                  "font-semibold text-foreground flex items-center gap-2",
                  isMobile ? "text-base" : "text-lg"
                )}>
                  <Database className="w-5 h-5" />
                  Data Retention & Privacy
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure how long conversations and data are stored
                </p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium text-foreground">Conversation Time Window</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enable time-based conversation expiration
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.conversation_time_window}
                    onChange={(e) => handleInputChange('conversation_time_window', e.target.checked)}
                    className="sr-only peer"
                    disabled={isFreeTrialMode}
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-muted peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                </label>
              </div>

              <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2")}>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Retention Period
                  </label>
                  <SimpleSelect
                    value={formData.conversation_retention_period}
                    onValueChange={(value) => handleInputChange('conversation_retention_period', value)}
                    options={[
                      { value: 'day', label: '1 Day' },
                      { value: 'week', label: '1 Week' },
                      { value: 'month', label: '1 Month' },
                      { value: 'quarter', label: '3 Months' },
                      { value: 'year', label: '1 Year' },
                      { value: 'custom', label: 'Custom Days' },
                      { value: 'never', label: 'Never Delete' }
                    ]}
                    className={cn(
                      "w-full",
                      isMobile ? "h-12" : ""
                    )}
                    disabled={isFreeTrialMode}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    How long to keep conversation data
                  </p>
                </div>

                {formData.conversation_retention_period === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Retention Days
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.conversation_retention_days}
                      onChange={(e) => handleInputChange('conversation_retention_days', parseInt(e.target.value) || 0)}
                      className={cn(
                        "w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
                        isMobile ? "px-4 py-3 text-base" : "px-3 py-2"
                      )}
                      disabled={isFreeTrialMode}
                      placeholder="180"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Number of days to retain conversations (API example: 180)
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium text-sm">Data Retention Policy</span>
                </div>
                <p className="text-amber-600 dark:text-amber-400 mt-1 text-sm">
                  Conversations and associated data will be automatically deleted after the specified retention period. 
                  This action cannot be undone. Ensure you comply with your local data protection regulations.
                </p>
              </div>
            </div>
          </Card>

          {/* Security Recommendations */}
          <Card className={cn("p-6", isMobile && "p-4")}>
            <div className="mb-4">
              <h3 className={cn(
                "font-semibold text-foreground flex items-center gap-2",
                isMobile ? "text-base" : "text-lg"
              )}>
                <Shield className="w-5 h-5" />
                Security Recommendations
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Best practices to secure your chatbot deployment
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Enable Private Deployment</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    For sensitive applications, enable private deployment to require authentication and restrict access.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Database className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-green-900 dark:text-green-100">Configure Data Retention</h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Set appropriate data retention periods to comply with privacy regulations and minimize data exposure.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100">Enable reCAPTCHA Protection</h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    Protect your chatbot from automated attacks and spam by enabling reCAPTCHA verification.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Save Button at Bottom */}
          <div className={cn(
            "flex mt-6",
            isMobile ? "justify-center" : "justify-end"
          )}>
            <Button
              onClick={handleSave}
              disabled={!isModified || settingsLoading || isFreeTrialMode}
              size="sm"
              className={isMobile ? "h-9 px-6 text-sm" : ""}
            >
              <Save className="w-4 h-4 mr-2" />
              {settingsLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};