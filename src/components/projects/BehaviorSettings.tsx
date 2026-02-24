'use client';

import React, { useEffect, useState } from 'react';
import { Save, Brain, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';

import { useProjectSettingsStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SimpleSelect } from '@/components/ui/simple-select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import type { Agent } from '@/types';
import { useDemoModeContext } from '@/contexts/DemoModeContext';

interface BehaviorSettingsProps {
  project: Agent;
}

export const BehaviorSettings: React.FC<BehaviorSettingsProps> = ({ project }) => {
  const { isFreeTrialMode } = useDemoModeContext();
  const { 
    settings, 
    settingsLoading, 
    settingsError, 
    fetchSettings, 
    updateSettings 
  } = useProjectSettingsStore();

  const { isMobile } = useBreakpoint();
  const [formData, setFormData] = useState({
    persona_instructions: '',
    response_source: 'own_content' as 'default' | 'own_content' | 'openai_content',
    chatbot_msg_lang: 'en',
    use_context_aware_starter_question: false,
  });

  const [isModified, setIsModified] = useState(false);

  useEffect(() => {
    fetchSettings(project.id);
  }, [project.id]);

  useEffect(() => {
    if (settings) {
      setFormData({
        persona_instructions: settings.persona_instructions || '',
        response_source: settings.response_source || 'own_content',
        chatbot_msg_lang: settings.chatbot_msg_lang || 'en',
        use_context_aware_starter_question: settings.use_context_aware_starter_question || false,
      });
      setIsModified(false);
    }
  }, [settings]);

  const handleInputChange = (field: string, value: any) => {
    if (isFreeTrialMode) {
      toast.error('Editing behavior settings is not available in free trial mode');
      return;
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsModified(true);
  };

  const handleSave = async () => {
    if (isFreeTrialMode) {
      toast.error('Updating behavior settings is not available in free trial mode');
      return;
    }
    
    try {
      await updateSettings(project.id, formData);
      setIsModified(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleRefresh = () => {
    fetchSettings(project.id);
    setIsModified(false);
  };

  const responseSourceOptions = [
    { 
      value: 'own_content', 
      label: 'My Content Only', 
      description: 'Agent will only use information from your uploaded content and sources',
      recommended: true,
    },
    { 
      value: 'openai_content', 
      label: 'My Content + ChatGPT Knowledge', 
      description: 'Agent can use both your content and ChatGPT\'s general knowledge base',
      recommended: false,
    },
    { 
      value: 'default', 
      label: 'Default Setting', 
      description: 'Use the system default response source configuration',
      recommended: false,
    },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish (Español)' },
    { value: 'fr', label: 'French (Français)' },
    { value: 'de', label: 'German (Deutsch)' },
    { value: 'it', label: 'Italian (Italiano)' },
    { value: 'pt', label: 'Portuguese (Português)' },
    { value: 'zh', label: 'Chinese (中文)' },
    { value: 'ja', label: 'Japanese (日本語)' },
    { value: 'ko', label: 'Korean (한국어)' },
    { value: 'ru', label: 'Russian (Русский)' },
    { value: 'ar', label: 'Arabic (العربية)' },
    { value: 'hi', label: 'Hindi (हिन्दी)' },
  ];

  const personaExamples = [
    {
      title: "Customer Support Agent",
      content: "You are a helpful customer support agent for our company. You should be friendly, professional, and focused on solving customer problems. Always try to provide clear, actionable solutions and escalate complex issues when appropriate."
    },
    {
      title: "Technical Documentation Assistant",
      content: "You are a technical documentation assistant. You help users understand complex technical concepts by breaking them down into simple, easy-to-follow explanations. Always provide examples and step-by-step instructions when possible."
    },
    {
      title: "Sales Assistant",
      content: "You are a knowledgeable sales assistant. You help potential customers understand our products and services, answer questions about features and pricing, and guide them toward making informed purchasing decisions. Be enthusiastic but not pushy."
    },
  ];

  return (
    <div 
      className={cn(
        "max-w-4xl mx-auto",
        isMobile ? "p-4 mobile-px" : "p-6"
      )}
    >
      {/* Header */}
      <div className={cn(
        "mb-6",
        isMobile ? "flex-col gap-4" : "flex items-center justify-between"
      )}>
        <div className={isMobile ? "w-full" : ""}>
          <h2 className={cn(
            "font-bold text-foreground",
            isMobile ? "text-xl mobile-text-xl" : "text-2xl"
          )}>Behavior Settings</h2>
          <p className={cn(
            "text-muted-foreground mt-1",
            isMobile ? "text-sm mobile-text-sm" : ""
          )}>
            Configure how your AI agent behaves and responds to users
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
            className={cn(
              isMobile ? "h-9 px-3 text-sm" : "",
              isFreeTrialMode && "opacity-50 cursor-not-allowed"
            )}
            title={isFreeTrialMode ? 'Saving behavior settings is not available in free trial mode' : ''}
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
        <div className={cn(
          "space-y-6",
          isMobile && "space-y-4"
        )}>
          {[...Array(3)].map((_, i) => (
            <Card key={i} className={cn(
              "p-6 animate-pulse",
              isMobile && "p-4 mobile-px mobile-py"
            )}>
              <div className="h-4 bg-muted rounded w-1/4 mb-4" />
              <div className="h-32 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </Card>
          ))}
        </div>
      ) : (
        <div className={cn(
          "space-y-6",
          isMobile && "space-y-4"
        )}>
          {/* Persona Instructions */}
          <Card className={cn(
            "p-6",
            isMobile && "p-4 mobile-px mobile-py"
          )}>
            <div className={cn(
              "mb-4",
              isMobile ? "flex-col gap-3" : "flex items-start justify-between"
            )}>
              <div className="flex items-start gap-3">
                <Brain className="w-6 h-6 text-brand-600 mt-1" />
                <div>
                  <h3 className={cn(
                    "font-semibold text-foreground",
                    isMobile ? "text-base mobile-text-lg" : "text-lg"
                  )}>AI Persona Instructions</h3>
                  <p className={cn(
                    "text-muted-foreground mt-1",
                    isMobile ? "text-xs mobile-text-sm" : "text-sm"
                  )}>
                    Define your AI agent&apos;s personality, role, and behavior patterns
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  System Instructions
                </label>
                <textarea
                  value={formData.persona_instructions}
                  onChange={(e) => handleInputChange('persona_instructions', e.target.value)}
                  placeholder="You are a helpful assistant that..."
                  rows={isMobile ? 5 : 6}
                  disabled={isFreeTrialMode}
                  className={cn(
                    "w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none bg-background text-foreground",
                    isMobile ? "px-4 py-3 text-base mobile-input" : "px-3 py-2",
                    isFreeTrialMode && "opacity-50 cursor-not-allowed bg-muted"
                  )}
                  title={isFreeTrialMode ? 'Editing behavior settings is not available in free trial mode' : ''}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  These instructions control your AI&apos;s personality and behavior. Be specific about tone, expertise, and how it should interact with users.
                </p>
              </div>

              {/* Persona Examples */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Example Personas
                </h4>
                
                <div className="space-y-3">
                  {personaExamples.map((example, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded p-3 border border-blue-100 dark:border-blue-900">
                      <h5 className="text-sm font-medium text-foreground mb-2">
                        {example.title}
                      </h5>
                      <p className="text-xs text-muted-foreground mb-2">
                        {example.content}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInputChange('persona_instructions', example.content)}
                        disabled={isFreeTrialMode}
                        className={cn(
                          "text-xs",
                          isMobile ? "w-full h-8 px-3" : "",
                          isFreeTrialMode && "opacity-50 cursor-not-allowed"
                        )}
                        title={isFreeTrialMode ? 'Using persona examples is not available in free trial mode' : ''}
                      >
                        Use This Example
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Response Source */}
          <Card className={cn(
            "p-6",
            isMobile && "p-4 mobile-px mobile-py"
          )}>
            <div className={cn(
              "mb-4",
              isMobile ? "flex-col gap-2" : "flex items-start justify-between"
            )}>
              <h3 className={cn(
                "font-semibold text-foreground",
                isMobile ? "text-base mobile-text-lg" : "text-lg"
              )}>Knowledge Source</h3>
            </div>
            <p className={cn(
              "text-muted-foreground mb-4",
              isMobile ? "text-xs mobile-text-sm" : "text-sm"
            )}>
              Control what information your AI agent can access when generating responses
            </p>
            
            <div className="space-y-3">
              {responseSourceOptions.map((option) => (
                <label 
                  key={option.value} 
                  className={cn(
                    "flex items-start gap-3 p-4 border rounded-lg transition-colors",
                    formData.response_source === option.value
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                      : "border-border hover:bg-accent",
                    isFreeTrialMode ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                  )}
                >
                  <input
                    type="radio"
                    name="response_source"
                    value={option.value}
                    checked={formData.response_source === option.value}
                    onChange={(e) => handleInputChange('response_source', e.target.value)}
                    disabled={isFreeTrialMode}
                    className={cn(
                      "mt-1",
                      isMobile && "touch-target",
                      isFreeTrialMode && "cursor-not-allowed"
                    )}
                    title={isFreeTrialMode ? 'Changing response source is not available in free trial mode' : ''}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{option.label}</span>
                      {option.recommended && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                    
                    {option.value === 'own_content' && formData.response_source === option.value && (
                      <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-800 dark:text-green-300">
                        <strong>Benefits:</strong> More accurate responses based on your specific content, 
                        better brand consistency, and reduced risk of hallucinated information.
                      </div>
                    )}
                    
                    {option.value === 'openai_content' && formData.response_source === option.value && (
                      <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-300">
                        <strong>Note:</strong> The AI may provide information beyond your uploaded content, 
                        which could be less accurate or relevant to your specific use case.
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* Language Settings */}
          <Card className={cn(
            "p-6",
            isMobile && "p-4 mobile-px mobile-py"
          )}>
            <div className={cn(
              "mb-4",
              isMobile ? "flex-col gap-2" : "flex items-start justify-between"
            )}>
              <h3 className={cn(
                "font-semibold text-foreground",
                isMobile ? "text-base mobile-text-lg" : "text-lg"
              )}>Language Settings</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interface Language
              </label>
              <SimpleSelect
                value={formData.chatbot_msg_lang}
                onValueChange={(value) => handleInputChange('chatbot_msg_lang', value)}
                options={languageOptions}
                disabled={isFreeTrialMode}
                placeholder="Select language"
                className={cn(
                  isMobile && "mobile-input",
                  isFreeTrialMode && "opacity-50"
                )}
              />
              
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Important:</strong> This setting only affects system messages like &ldquo;Ask me anything&rdquo; 
                  or error messages. The AI will respond in whatever language the user uses in their questions.
                </p>
              </div>
            </div>
          </Card>

          {/* Advanced Settings */}
          <Card className={cn(
            "p-6",
            isMobile && "p-4 mobile-px mobile-py"
          )}>
            <h3 className={cn(
              "font-semibold text-foreground mb-4",
              isMobile ? "text-base mobile-text-lg" : "text-lg"
            )}>Advanced Behavior</h3>
            
            <div className="space-y-4">
              {/* Context-Aware Starter Questions */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="use_context_aware_starter_question" className="text-sm font-medium">
                    Context-Aware Starter Questions
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Generate starter questions based on your content
                  </p>
                </div>
                <Switch
                  id="use_context_aware_starter_question"
                  checked={formData.use_context_aware_starter_question}
                  onCheckedChange={(checked) => handleInputChange('use_context_aware_starter_question', checked)}
                  disabled={isFreeTrialMode}
                />
              </div>

              <div className="p-4 bg-accent border border-border rounded-lg">
                <h4 className="text-sm font-medium text-foreground mb-2">Response Guidelines</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• The AI will always try to be helpful and accurate</li>
                  <li>• Responses are generated based on your configured knowledge source</li>
                  <li>• The AI will indicate when it doesn&apos;t have enough information</li>
                  <li>• Persona instructions override default behavior patterns</li>
                </ul>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-2">Best Practices</h4>
                <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                  <li>• Be specific in your persona instructions</li>
                  <li>• Test different instruction variations to find what works best</li>
                  <li>• Consider your target audience when defining personality</li>
                  <li>• Update instructions as your use case evolves</li>
                </ul>
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
              disabled={!isModified || settingsLoading}
              size="sm"
              className={isMobile ? "h-9 px-6 text-sm" : ""}
            >
              <Save className="w-4 h-4 mr-1.5" />
              {settingsLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};