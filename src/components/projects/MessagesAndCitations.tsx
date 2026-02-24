'use client';

import React, { useEffect, useState } from 'react';
import { Save, MessageCircle, AlertCircle, RefreshCw, RotateCcw, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { useProjectSettingsStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SimpleSelect } from '@/components/ui/simple-select';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import type { Agent } from '@/types';
import { useDemoModeContext } from '@/contexts/DemoModeContext';

interface MessagesAndCitationsProps {
  project: Agent;
}

export const MessagesAndCitations: React.FC<MessagesAndCitationsProps> = ({ project }) => {
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
    // Message Settings
    citations_answer_source_label_msg: '',
    citations_sources_label_msg: '',
    hang_in_there_msg: '',
    chatbot_siesta_msg: '',
    // Citation Display Settings
    enable_citations: 3,
    citations_view_type: 'user',
    image_citation_display: 'default',
    enable_inline_citations_api: false,
    hide_sources_from_responses: false,
    no_answer_message: '',
    ending_message: '',
    try_asking_questions_msg: '',
    view_more_msg: '',
    view_less_msg: '',
  });

  const [isModified, setIsModified] = useState(false);

  const defaultMessages = {
    citations_answer_source_label_msg: 'Where did this answer come from?',
    citations_sources_label_msg: 'Sources',
    hang_in_there_msg: 'Hang in there! I\'m thinking..',
    chatbot_siesta_msg: 'Oops! The agent is taking a siesta. We are aware of this and will get it back soon! Please try again later.',
    no_answer_message: 'Sorry, I don\'t have an answer for that.',
    ending_message: 'Please email us for further support',
    try_asking_questions_msg: 'Try asking these questions...',
    view_more_msg: 'View more',
    view_less_msg: 'View less',
  };

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
        // Message Settings
        citations_answer_source_label_msg: settings.citations_answer_source_label_msg || '',
        citations_sources_label_msg: settings.citations_sources_label_msg || '',
        hang_in_there_msg: settings.hang_in_there_msg || '',
        chatbot_siesta_msg: settings.chatbot_siesta_msg || '',
        // Citation Display Settings
        enable_citations: settings.enable_citations || 3,
        citations_view_type: settings.citations_view_type || 'user',
        image_citation_display: settings.image_citation_display || 'default',
        enable_inline_citations_api: settings.enable_inline_citations_api || false,
        hide_sources_from_responses: settings.hide_sources_from_responses || false,
        no_answer_message: settings.no_answer_message || '',
        ending_message: settings.ending_message || '',
        try_asking_questions_msg: settings.try_asking_questions_msg || '',
        view_more_msg: settings.view_more_msg || '',
        view_less_msg: settings.view_less_msg || '',
      });
      setIsModified(false);
    }
  }, [settings]);

  const handleInputChange = (field: string, value: any) => {
    if (isFreeTrialMode) {
      toast.error('Editing message and citation settings is not available in free trial mode');
      return;
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsModified(true);
  };

  const handleResetToDefault = (field: string) => {
    const defaultValue = defaultMessages[field as keyof typeof defaultMessages];
    if (defaultValue) {
      handleInputChange(field, defaultValue);
    }
  };

  const handleResetAllToDefaults = () => {
    if (isFreeTrialMode) {
      toast.error('Resetting settings is not available in free trial mode');
      return;
    }
    
    const updatedData = { ...formData };
    Object.keys(defaultMessages).forEach(key => {
      const typedKey = key as keyof typeof defaultMessages;
      if (typedKey in updatedData) {
        (updatedData as any)[typedKey] = defaultMessages[typedKey];
      }
    });
    setFormData(updatedData);
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
      toast.error('Updating message and citation settings is not available in free trial mode');
      return;
    }
    
    try {
      await updateSettings(project.id, formData as any);
      setIsModified(false);
      toast.success('Messages and citation settings updated successfully');
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
          )}>Messages & Citations</h2>
          <p className={cn(
            "text-muted-foreground mt-1",
            isMobile ? "text-sm" : ""
          )}>
            Configure custom messages and citation display settings
          </p>
        </div>
        
        <div className={cn(
          "flex gap-3",
          isMobile ? "w-full grid grid-cols-3 gap-2 mt-4" : "items-center"
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
            variant="outline"
            onClick={handleResetAllToDefaults}
            disabled={settingsLoading || isFreeTrialMode}
            size="sm"
            className={isMobile ? "h-9 px-3 text-sm" : ""}
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reset
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
          {/* Citation Display Configuration */}
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
                  <FileText className="w-5 h-5" />
                  Citation Display Settings
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure how citations and sources are displayed in responses
                </p>
              </div>
            </div>
            
            <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Citation Display Mode
                </label>
                <SimpleSelect
                  value={formData.enable_citations.toString()}
                  onValueChange={(value) => handleInputChange('enable_citations', parseInt(value))}
                  options={[
                    { value: '0', label: 'Disabled' },
                    { value: '1', label: 'Inline Only' },
                    { value: '2', label: 'Footer Only' },
                    { value: '3', label: 'Both Inline and Footer' }
                  ]}
                  className={cn(
                    "w-full",
                    isMobile ? "h-12" : ""
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How citations should be displayed in responses
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Citations View Type
                </label>
                <SimpleSelect
                  value={formData.citations_view_type}
                  onValueChange={(value) => handleInputChange('citations_view_type', value)}
                  options={[
                    { value: 'user', label: 'User View' },
                    { value: 'show', label: 'Show Citations' },
                    { value: 'hide', label: 'Hide Citations' }
                  ]}
                  className={cn(
                    "w-full",
                    isMobile ? "h-12" : ""
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Image Citation Display
                </label>
                <SimpleSelect
                  value={formData.image_citation_display}
                  onValueChange={(value) => handleInputChange('image_citation_display', value)}
                  options={[
                    { value: 'default', label: 'Default' },
                    { value: 'inline', label: 'Inline' },
                    { value: 'none', label: 'None' }
                  ]}
                  className={cn(
                    "w-full",
                    isMobile ? "h-12" : ""
                  )}
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="enable_inline_citations_api"
                  checked={formData.enable_inline_citations_api}
                  onChange={(e) => handleInputChange('enable_inline_citations_api', e.target.checked)}
                  className="w-4 h-4 text-brand-600 border-border rounded focus:ring-brand-500"
                />
                <label htmlFor="enable_inline_citations_api" className="text-sm font-medium text-foreground">
                  Enable Inline Citations API
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="hide_sources_from_responses"
                  checked={formData.hide_sources_from_responses}
                  onChange={(e) => handleInputChange('hide_sources_from_responses', e.target.checked)}
                  className="w-4 h-4 text-brand-600 border-border rounded focus:ring-brand-500"
                />
                <label htmlFor="hide_sources_from_responses" className="text-sm font-medium text-foreground">
                  Hide Sources from Responses
                </label>
              </div>
            </div>
          </Card>

          {/* Message Templates */}
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
                  <MessageCircle className="w-5 h-5" />
                  Custom Messages
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Customize system messages and citation labels
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Citation Messages */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">Citation Messages</h4>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-muted-foreground">
                      Citation Source Label
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetToDefault('citations_answer_source_label_msg')}
                      className="h-6 px-2 text-xs"
                    >
                      Reset
                    </Button>
                  </div>
                  <input
                    type="text"
                    value={formData.citations_answer_source_label_msg}
                    onChange={(e) => handleInputChange('citations_answer_source_label_msg', e.target.value)}
                    placeholder={defaultMessages.citations_answer_source_label_msg}
                    className={cn(
                      "w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
                      isMobile ? "px-4 py-3 text-base" : "px-3 py-2"
                    )}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-muted-foreground">
                      Sources Section Label
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetToDefault('citations_sources_label_msg')}
                      className="h-6 px-2 text-xs"
                    >
                      Reset
                    </Button>
                  </div>
                  <input
                    type="text"
                    value={formData.citations_sources_label_msg}
                    onChange={(e) => handleInputChange('citations_sources_label_msg', e.target.value)}
                    placeholder={defaultMessages.citations_sources_label_msg}
                    className={cn(
                      "w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
                      isMobile ? "px-4 py-3 text-base" : "px-3 py-2"
                    )}
                  />
                </div>
              </div>

              {/* System Messages */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">System Messages</h4>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-muted-foreground">
                      Loading Message
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetToDefault('hang_in_there_msg')}
                      className="h-6 px-2 text-xs"
                    >
                      Reset
                    </Button>
                  </div>
                  <input
                    type="text"
                    value={formData.hang_in_there_msg}
                    onChange={(e) => handleInputChange('hang_in_there_msg', e.target.value)}
                    placeholder={defaultMessages.hang_in_there_msg}
                    className={cn(
                      "w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
                      isMobile ? "px-4 py-3 text-base" : "px-3 py-2"
                    )}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-muted-foreground">
                      Service Unavailable Message
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetToDefault('chatbot_siesta_msg')}
                      className="h-6 px-2 text-xs"
                    >
                      Reset
                    </Button>
                  </div>
                  <textarea
                    value={formData.chatbot_siesta_msg}
                    onChange={(e) => handleInputChange('chatbot_siesta_msg', e.target.value)}
                    placeholder={defaultMessages.chatbot_siesta_msg}
                    rows={2}
                    className={cn(
                      "w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none bg-background text-foreground",
                      isMobile ? "px-4 py-3 text-base" : "px-3 py-2"
                    )}
                  />
                </div>
              </div>

              {/* Response Messages */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">Response Messages</h4>

                {[
                  { key: 'no_answer_message', label: 'No Answer Message' },
                  { key: 'ending_message', label: 'Ending Message' },
                  { key: 'try_asking_questions_msg', label: 'Try Asking Message' },
                  { key: 'view_more_msg', label: 'View More Text' },
                  { key: 'view_less_msg', label: 'View Less Text' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-muted-foreground">
                        {label}
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetToDefault(key)}
                        className="h-6 px-2 text-xs"
                      >
                        Reset
                      </Button>
                    </div>
                    <input
                      type="text"
                      value={formData[key as keyof typeof formData] as string}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      placeholder={defaultMessages[key as keyof typeof defaultMessages]}
                      className={cn(
                        "w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
                        isMobile ? "px-4 py-3 text-base" : "px-3 py-2"
                      )}
                    />
                  </div>
                ))}
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