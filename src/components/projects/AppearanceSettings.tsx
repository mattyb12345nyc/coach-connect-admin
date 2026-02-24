'use client';

import React, { useEffect, useState } from 'react';
import { Save, Upload, Image, Palette, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { useProjectSettingsStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import type { Agent } from '@/types';
import { useDemoModeContext } from '@/contexts/DemoModeContext';
import { SimpleSelect } from '@/components/ui/simple-select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface AppearanceSettingsProps {
  project: Agent;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ project }) => {
  const { 
    settings, 
    settingsLoading, 
    settingsError, 
    fetchSettings, 
    updateSettings 
  } = useProjectSettingsStore();

  const { isMobile } = useBreakpoint();
  const { isFreeTrialMode } = useDemoModeContext();
  const [formData, setFormData] = useState({
    chatbot_avatar: '',
    chatbot_background_type: 'image' as 'image' | 'color',
    chatbot_background: '',
    chatbot_background_color: '#F5F5F5',
    chatbot_color: '#000000',
    chatbot_toolbar_color: '#000000',
    // User Interface settings
    chatbot_title: '',
    chatbot_title_color: '#000000',
    user_avatar: '',
    user_avatar_enabled: false,
    user_avatar_orientation: 'agent-left-user-right',
    input_field_addendum: '',
    // Spotlight avatar settings
    spotlight_avatar_enabled: false,
    spotlight_avatar: '',
    spotlight_avatar_shape: 'rectangle' as 'rectangle' | 'circle',
    spotlight_avatar_type: 'default' as 'default' | 'image',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [userAvatarFile, setUserAvatarFile] = useState<File | null>(null);
  const [spotlightAvatarFile, setSpotlightAvatarFile] = useState<File | null>(null);
  const [isModified, setIsModified] = useState(false);

  useEffect(() => {
    fetchSettings(project.id);
  }, [project.id]);

  useEffect(() => {
    if (settings) {
      setFormData({
        chatbot_avatar: settings.chatbot_avatar || '',
        chatbot_background_type: settings.chatbot_background_type || 'image',
        chatbot_background: settings.chatbot_background || '',
        chatbot_background_color: settings.chatbot_background_color || '#F5F5F5',
        chatbot_color: settings.chatbot_color || '#000000',
        chatbot_toolbar_color: settings.chatbot_toolbar_color || '#000000',
        // User Interface settings
        chatbot_title: settings.chatbot_title || '',
        chatbot_title_color: settings.chatbot_title_color || '#000000',
        user_avatar: settings.user_avatar || '',
        user_avatar_enabled: settings.user_avatar_enabled || false,
        user_avatar_orientation: settings.user_avatar_orientation || 'agent-left-user-right',
        input_field_addendum: settings.input_field_addendum || '',
        // Spotlight avatar settings
        spotlight_avatar_enabled: settings.spotlight_avatar_enabled || false,
        spotlight_avatar: settings.spotlight_avatar || '',
        spotlight_avatar_shape: (settings.spotlight_avatar_shape || 'rectangle') as 'rectangle' | 'circle',
        spotlight_avatar_type: (settings.spotlight_avatar_type || 'default') as 'default' | 'image',
      });
      setIsModified(false);
    }
  }, [settings]);

  const handleInputChange = (field: string, value: any) => {
    if (isFreeTrialMode) {
      toast.error('Editing appearance settings is not available in free trial mode');
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsModified(true);
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isFreeTrialMode) {
      toast.error('Uploading images is not available in free trial mode');
      return;
    }
    
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be smaller than 5MB');
        return;
      }
      
      setAvatarFile(file);
      setIsModified(true);
    }
  };

  const handleBackgroundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isFreeTrialMode) {
      toast.error('Uploading images is not available in free trial mode');
      return;
    }
    
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be smaller than 5MB');
        return;
      }
      
      setBackgroundFile(file);
      setIsModified(true);
    }
  };

  const handleUserAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isFreeTrialMode) {
      toast.error('Uploading images is not available in free trial mode');
      return;
    }
    
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be smaller than 5MB');
        return;
      }
      
      setUserAvatarFile(file);
      setIsModified(true);
    }
  };

  const handleSpotlightAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isFreeTrialMode) {
      toast.error('Uploading images is not available in free trial mode');
      return;
    }
    
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be smaller than 5MB');
        return;
      }
      
      setSpotlightAvatarFile(file);
      setIsModified(true);
    }
  };

  const handleSave = async () => {
    if (isFreeTrialMode) {
      toast.error('Saving appearance settings is not available in free trial mode');
      return;
    }
    
    try {
      const updateData: any = { ...formData };
      
      if (avatarFile) {
        updateData.chatbot_avatar = avatarFile;
      }
      
      if (backgroundFile) {
        updateData.chatbot_background = backgroundFile;
      }
      
      if (userAvatarFile) {
        updateData.user_avatar = userAvatarFile;
      }
      
      if (spotlightAvatarFile) {
        updateData.spotlight_avatar = spotlightAvatarFile;
      }
      
      await updateSettings(project.id, updateData);
      
      setIsModified(false);
      setAvatarFile(null);
      setBackgroundFile(null);
      setUserAvatarFile(null);
      setSpotlightAvatarFile(null);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleRefresh = () => {
    fetchSettings(project.id);
    setIsModified(false);
    setAvatarFile(null);
    setBackgroundFile(null);
    setUserAvatarFile(null);
    setSpotlightAvatarFile(null);
  };

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
          )}>Appearance Settings</h2>
          <p className={cn(
            "text-muted-foreground mt-1",
            isMobile ? "text-sm mobile-text-sm" : ""
          )}>
            Customize the visual appearance and user interface of your chatbot
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
            title={isFreeTrialMode ? 'Editing settings is not available in free trial mode' : ''}
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
              <div className="h-24 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </Card>
          ))}
        </div>
      ) : (
        <div className={cn(
          "space-y-6",
          isMobile && "space-y-4"
        )}>
          {/* Avatar Settings */}
          <Card className={cn(
            "p-6",
            isMobile && "p-4 mobile-px mobile-py"
          )}>
            <div className={cn(
              "flex items-start justify-between mb-4",
              isMobile && "flex-col gap-2"
            )}>
              <h3 className={cn(
                "font-semibold text-foreground",
                isMobile ? "text-base mobile-text-lg" : "text-lg"
              )}>Chatbot Avatar</h3>
            </div>
            
            <div className={cn(
              "flex items-start gap-6",
              isMobile && "flex-col gap-4"
            )}>
              <div className="flex-1">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Current Avatar
                </label>
                
                <div className="w-20 h-20 rounded-full overflow-hidden bg-accent border-2 border-border mb-4">
                  {formData.chatbot_avatar ? (
                    <img
                      src={formData.chatbot_avatar}
                      alt="Chatbot Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                    disabled={isFreeTrialMode}
                  />
                  <label htmlFor="avatar-upload" className={cn("cursor-pointer", isFreeTrialMode && "cursor-not-allowed opacity-50")}>
                    <div className={cn(
                      "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2",
                      isMobile ? "h-12 w-full mobile-btn touch-target" : "h-10",
                      isFreeTrialMode && "pointer-events-none opacity-50"
                    )}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload New Avatar
                    </div>
                  </label>
                  {avatarFile && (
                    <p className="text-sm text-green-600 mt-2">
                      New avatar selected: {avatarFile.name}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Upload a profile picture or company logo to represent your chatbot. 
                  This image will appear in chat conversations next to AI responses.
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• Recommended size: 200x200 pixels</li>
                  <li>• Accepted formats: JPEG, PNG, JPG, GIF</li>
                  <li>• Maximum file size: 5MB</li>
                  <li>• Note: The avatar must be a valid image file</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Background Settings */}
          <Card className={cn(
            "p-6",
            isMobile && "p-4 mobile-px mobile-py"
          )}>
            <div className={cn(
              "flex items-start justify-between mb-4",
              isMobile && "flex-col gap-2"
            )}>
              <h3 className={cn(
                "font-semibold text-foreground",
                isMobile ? "text-base mobile-text-lg" : "text-lg"
              )}>Chat Background</h3>
            </div>
            
            <div className="space-y-4">
              {/* Background Type */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-3">
                  Background Type
                </label>
                
                <div className={cn(
                  "flex gap-4",
                  isMobile && "flex-col gap-3"
                )}>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="background_type"
                      value="image"
                      checked={formData.chatbot_background_type === 'image'}
                      onChange={(e) => handleInputChange('chatbot_background_type', e.target.value)}
                      className={isMobile ? "touch-target" : ""}
                    />
                    <span className={cn(
                      "text-sm",
                      isMobile && "mobile-text-base"
                    )}>Background Image</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="background_type"
                      value="color"
                      checked={formData.chatbot_background_type === 'color'}
                      onChange={(e) => handleInputChange('chatbot_background_type', e.target.value)}
                      className={isMobile ? "touch-target" : ""}
                    />
                    <span className={cn(
                      "text-sm",
                      isMobile && "mobile-text-base"
                    )}>Background Color</span>
                  </label>
                </div>
              </div>

              {/* Background Image */}
              {formData.chatbot_background_type === 'image' && (
                <div className={cn(
                  "flex items-start gap-6",
                  isMobile && "flex-col gap-4"
                )}>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Background Image
                    </label>
                    
                    <div className="w-32 h-20 rounded-lg overflow-hidden bg-accent border-2 border-border mb-4">
                      {formData.chatbot_background ? (
                        <img
                          src={formData.chatbot_background}
                          alt="Chat Background"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBackgroundUpload}
                        className="hidden"
                        id="background-upload"
                      />
                      <label htmlFor="background-upload" className="cursor-pointer">
                        <div className={cn(
                          "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2",
                          isMobile ? "h-12 w-full mobile-btn touch-target" : "h-10"
                        )}>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Background
                        </div>
                      </label>
                      {backgroundFile && (
                        <p className="text-sm text-green-600 mt-2">
                          New background selected: {backgroundFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Upload a background image for the chat widget. This will be displayed behind the conversation.
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                      <li>• Recommended size: 1200x800 pixels</li>
                      <li>• Accepted formats: JPEG, PNG, JPG, GIF</li>
                      <li>• Maximum file size: 5MB</li>
                      <li>• Note: The background must be a valid image file</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Background Color */}
              {formData.chatbot_background_type === 'color' && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Background Color
                  </label>
                  
                  <div className={cn(
                    "flex items-center gap-4",
                    isMobile && "flex-col gap-3"
                  )}>
                    <input
                      type="color"
                      value={formData.chatbot_background_color}
                      onChange={(e) => handleInputChange('chatbot_background_color', e.target.value)}
                      className={cn(
                        "border border-border rounded cursor-pointer bg-background",
                        isMobile ? "w-16 h-12 touch-target" : "w-12 h-10"
                      )}
                    />
                    
                    <input
                      type="text"
                      value={formData.chatbot_background_color}
                      onChange={(e) => handleInputChange('chatbot_background_color', e.target.value)}
                      placeholder="#F5F5F5"
                      className={cn(
                        "border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
                        isMobile ? "w-full px-4 py-3 text-base mobile-input" : "px-3 py-2"
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Color Settings */}
          <Card className={cn(
            "p-6",
            isMobile && "p-4 mobile-px mobile-py"
          )}>
            <div className={cn(
              "flex items-start justify-between mb-4",
              isMobile && "flex-col gap-2"
            )}>
              <h3 className={cn(
                "font-semibold text-foreground",
                isMobile ? "text-base mobile-text-lg" : "text-lg"
              )}>Color Theme</h3>
            </div>
            
            <div className={cn(
              "grid gap-6",
              isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            )}>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Primary Color
                </label>
                
                <div className={cn(
                  "flex items-center gap-4",
                  isMobile && "flex-col gap-3"
                )}>
                  <input
                    type="color"
                    value={formData.chatbot_color}
                    onChange={(e) => handleInputChange('chatbot_color', e.target.value)}
                    className={cn(
                      "border border-border rounded cursor-pointer",
                      isMobile ? "w-16 h-12 touch-target" : "w-12 h-10"
                    )}
                  />
                  
                  <input
                    type="text"
                    value={formData.chatbot_color}
                    onChange={(e) => handleInputChange('chatbot_color', e.target.value)}
                    placeholder="#000000"
                    className={cn(
                      "flex-1 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
                      isMobile ? "w-full px-4 py-3 text-base mobile-input" : "px-3 py-2"
                    )}
                  />
                </div>
                
                <p className="text-xs text-muted-foreground mt-1">
                  Main accent color for buttons and highlights
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Toolbar Color
                </label>
                
                <div className={cn(
                  "flex items-center gap-4",
                  isMobile && "flex-col gap-3"
                )}>
                  <input
                    type="color"
                    value={formData.chatbot_toolbar_color}
                    onChange={(e) => handleInputChange('chatbot_toolbar_color', e.target.value)}
                    className={cn(
                      "border border-border rounded cursor-pointer",
                      isMobile ? "w-16 h-12 touch-target" : "w-12 h-10"
                    )}
                  />
                  
                  <input
                    type="text"
                    value={formData.chatbot_toolbar_color}
                    onChange={(e) => handleInputChange('chatbot_toolbar_color', e.target.value)}
                    placeholder="#000000"
                    className={cn(
                      "flex-1 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
                      isMobile ? "w-full px-4 py-3 text-base mobile-input" : "px-3 py-2"
                    )}
                  />
                </div>
                
                <p className="text-xs text-muted-foreground mt-1">
                  Color for the chat widget toolbar and header
                </p>
              </div>
            </div>
          </Card>

          {/* Chat Interface Settings */}
          <Card className={cn(
            "p-6",
            isMobile && "p-4 mobile-px mobile-py"
          )}>
            <div className={cn(
              "flex items-start justify-between mb-4",
              isMobile && "flex-col gap-2"
            )}>
              <h3 className={cn(
                "font-semibold text-foreground",
                isMobile ? "text-base mobile-text-lg" : "text-lg"
              )}>Chat Interface</h3>
            </div>
            
            <div className="space-y-4">
              {/* Chatbot Title */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Chatbot Title
                </label>
                <input
                  type="text"
                  value={formData.chatbot_title}
                  onChange={(e) => handleInputChange('chatbot_title', e.target.value)}
                  placeholder="My Custom Agent"
                  disabled={isFreeTrialMode}
                  className={cn(
                    "w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
                    isMobile ? "px-4 py-3 text-base mobile-input" : "px-3 py-2",
                    isFreeTrialMode && "opacity-50 cursor-not-allowed"
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Title displayed at the top of the chat interface
                </p>
              </div>

              {/* Title Color */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Title Color
                </label>
                <div className={cn(
                  "flex items-center gap-4",
                  isMobile && "flex-col gap-3"
                )}>
                  <input
                    type="color"
                    value={formData.chatbot_title_color}
                    onChange={(e) => handleInputChange('chatbot_title_color', e.target.value)}
                    className={cn(
                      "border border-border rounded cursor-pointer",
                      isMobile ? "w-16 h-12 touch-target" : "w-12 h-10"
                    )}
                  />
                  <input
                    type="text"
                    value={formData.chatbot_title_color}
                    onChange={(e) => handleInputChange('chatbot_title_color', e.target.value)}
                    placeholder="#000000"
                    className={cn(
                      "flex-1 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
                      isMobile ? "w-full px-4 py-3 text-base mobile-input" : "px-3 py-2"
                    )}
                  />
                </div>
              </div>

              {/* Input Field Helper Text */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Input Field Helper Text
                </label>
                <textarea
                  value={formData.input_field_addendum}
                  onChange={(e) => handleInputChange('input_field_addendum', e.target.value)}
                  placeholder="Type your question here..."
                  rows={2}
                  className={cn(
                    "w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none bg-background text-foreground",
                    isMobile ? "px-4 py-3 text-base mobile-input" : "px-3 py-2"
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Additional text shown in or near the input field
                </p>
              </div>
            </div>
          </Card>

          {/* User Avatar Settings */}
          <Card className={cn(
            "p-6",
            isMobile && "p-4 mobile-px mobile-py"
          )}>
            <div className={cn(
              "flex items-start justify-between mb-4",
              isMobile && "flex-col gap-2"
            )}>
              <h3 className={cn(
                "font-semibold text-foreground",
                isMobile ? "text-base mobile-text-lg" : "text-lg"
              )}>User Avatar Configuration</h3>
            </div>
            
            <div className="space-y-4">
              {/* User Avatar Enable Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="user_avatar_enabled" className="text-sm font-medium">Enable User Avatar</Label>
                  <p className="text-xs text-muted-foreground">
                    Show user avatars in chat conversations
                  </p>
                </div>
                <Switch
                  id="user_avatar_enabled"
                  checked={formData.user_avatar_enabled}
                  onCheckedChange={(checked) => handleInputChange('user_avatar_enabled', checked)}
                  disabled={isFreeTrialMode}
                />
              </div>

              {/* User Avatar Upload or URL */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  User Avatar
                </label>
                
                <div className="space-y-3">
                  {/* Upload Option */}
                  <div>
                    <input
                      type="file"
                      id="user-avatar-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleUserAvatarUpload}
                      disabled={isFreeTrialMode}
                    />
                    <label htmlFor="user-avatar-upload" className={cn("cursor-pointer", isFreeTrialMode && "cursor-not-allowed opacity-50")}>
                      <div className={cn(
                        "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2",
                        isMobile ? "h-12 w-full mobile-btn touch-target" : "h-10",
                        isFreeTrialMode && "pointer-events-none opacity-50"
                      )}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload User Avatar
                      </div>
                    </label>
                    {userAvatarFile && (
                      <p className="text-sm text-green-600 mt-2">
                        New user avatar selected: {userAvatarFile.name}
                      </p>
                    )}
                  </div>
                  
                  {/* URL Option */}
                  <div>
                    <input
                      type="text"
                      value={formData.user_avatar}
                      onChange={(e) => handleInputChange('user_avatar', e.target.value)}
                      placeholder="Or enter avatar URL: https://example.com/avatar.png"
                      className={cn(
                        "w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
                        isMobile ? "px-4 py-3 text-base mobile-input" : "px-3 py-2"
                      )}
                    />
                  </div>
                </div>
                
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• Default avatar for users in conversations</li>
                  <li>• Accepted formats: JPEG, PNG, JPG, GIF</li>
                  <li>• Maximum file size: 5MB</li>
                  <li>• Note: The user avatar must be a valid image</li>
                </ul>
              </div>

              {/* Avatar Orientation */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Avatar Orientation
                </label>
                <SimpleSelect
                  value={formData.user_avatar_orientation}
                  onValueChange={(value) => handleInputChange('user_avatar_orientation', value)}
                  options={[
                    { value: 'agent-left-user-right', label: 'Agent Left, User Right' },
                    { value: 'agent-right-user-left', label: 'Agent Right, User Left' },
                    { value: 'both-left', label: 'Both Left' },
                    { value: 'both-right', label: 'Both Right' }
                  ]}
                  placeholder="Select avatar orientation"
                  className={cn(
                    isMobile ? "h-12" : "h-10"
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Position of avatars in the chat conversation
                </p>
              </div>
            </div>
          </Card>

          {/* Spotlight Avatar Settings */}
          <Card className={cn(
            "p-6",
            isMobile && "p-4 mobile-px mobile-py"
          )}>
            <div className={cn(
              "flex items-start justify-between mb-4",
              isMobile && "flex-col gap-2"
            )}>
              <h3 className={cn(
                "font-semibold text-foreground",
                isMobile ? "text-base mobile-text-lg" : "text-lg"
              )}>Spotlight Avatar Configuration</h3>
            </div>
            
            <div className="space-y-4">
              {/* Spotlight Avatar Enable Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="spotlight_avatar_enabled" className="text-sm font-medium">Enable Spotlight Avatar</Label>
                  <p className="text-xs text-muted-foreground">
                    Show a highlight avatar for featured messages
                  </p>
                </div>
                <Switch
                  id="spotlight_avatar_enabled"
                  checked={formData.spotlight_avatar_enabled}
                  onCheckedChange={(checked) => handleInputChange('spotlight_avatar_enabled', checked)}
                  disabled={isFreeTrialMode}
                />
              </div>

              {/* Spotlight Avatar Type */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Avatar Type
                </label>
                <SimpleSelect
                  value={formData.spotlight_avatar_type}
                  onValueChange={(value) => handleInputChange('spotlight_avatar_type', value)}
                  options={[
                    { value: 'default', label: 'Default Avatar' },
                    { value: 'image', label: 'Custom Image' }
                  ]}
                  placeholder="Select avatar type"
                  className={cn(
                    isMobile ? "h-12" : "h-10"
                  )}
                  disabled={isFreeTrialMode || !formData.spotlight_avatar_enabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use default avatar or upload a custom image
                </p>
              </div>

              {/* Spotlight Avatar Upload (only if type is 'image') */}
              {formData.spotlight_avatar_type === 'image' && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Spotlight Avatar Image
                  </label>
                  
                  <div className="space-y-3">
                    {/* Upload Option */}
                    <div>
                      <input
                        type="file"
                        id="spotlight-avatar-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleSpotlightAvatarUpload}
                        disabled={isFreeTrialMode || !formData.spotlight_avatar_enabled}
                      />
                      <label htmlFor="spotlight-avatar-upload" className={cn("cursor-pointer", (isFreeTrialMode || !formData.spotlight_avatar_enabled) && "cursor-not-allowed opacity-50")}>
                        <div className={cn(
                          "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2",
                          isMobile ? "h-12 w-full mobile-btn touch-target" : "h-10",
                          (isFreeTrialMode || !formData.spotlight_avatar_enabled) && "pointer-events-none opacity-50"
                        )}>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Spotlight Avatar
                        </div>
                      </label>
                      {spotlightAvatarFile && (
                        <p className="text-sm text-green-600 mt-2">
                          New spotlight avatar selected: {spotlightAvatarFile.name}
                        </p>
                      )}
                    </div>
                    
                    {/* URL Option */}
                    <div>
                      <input
                        type="text"
                        value={formData.spotlight_avatar}
                        onChange={(e) => handleInputChange('spotlight_avatar', e.target.value)}
                        placeholder="Or enter avatar URL: https://example.com/spotlight-avatar.png"
                        className={cn(
                          "w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
                          isMobile ? "px-4 py-3 text-base mobile-input" : "px-3 py-2"
                        )}
                        disabled={isFreeTrialMode || !formData.spotlight_avatar_enabled}
                      />
                    </div>
                  </div>
                  
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• Used for highlighting important messages</li>
                    <li>• Accepted formats: JPEG, PNG, JPG, GIF</li>
                    <li>• Maximum file size: 5MB</li>
                  </ul>
                </div>
              )}

              {/* Spotlight Avatar Shape */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Avatar Shape
                </label>
                <SimpleSelect
                  value={formData.spotlight_avatar_shape}
                  onValueChange={(value) => handleInputChange('spotlight_avatar_shape', value)}
                  options={[
                    { value: 'rectangle', label: 'Rectangle' },
                    { value: 'circle', label: 'Circle' }
                  ]}
                  placeholder="Select avatar shape"
                  className={cn(
                    isMobile ? "h-12" : "h-10"
                  )}
                  disabled={isFreeTrialMode || !formData.spotlight_avatar_enabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Shape of the spotlight avatar display
                </p>
              </div>
            </div>
          </Card>

          {/* Preview */}
          <Card className={cn(
            "p-6",
            isMobile && "p-4 mobile-px mobile-py"
          )}>
            <h3 className={cn(
              "font-semibold text-foreground mb-4",
              isMobile ? "text-base mobile-text-lg" : "text-lg"
            )}>Preview</h3>
            
            <div className="border border-border rounded-lg p-4 bg-accent">
              <div 
                className="w-full h-32 rounded-lg flex items-center justify-center relative"
                style={{
                  backgroundColor: formData.chatbot_background_type === 'color' 
                    ? formData.chatbot_background_color 
                    : '#F5F5F5',
                  backgroundImage: formData.chatbot_background_type === 'image' && formData.chatbot_background
                    ? `url(${formData.chatbot_background})`
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-white bg-opacity-80 rounded-lg" />
                
                <div className="relative flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-accent">
                    {formData.chatbot_avatar ? (
                      <img
                        src={formData.chatbot_avatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div 
                    className="px-3 py-2 rounded-lg text-white text-sm"
                    style={{ backgroundColor: formData.chatbot_color }}
                  >
                    Hello! How can I help you today?
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2 text-center">
                This is how your chatbot will appear to users
              </p>
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