'use client';

import React, { useEffect, useState } from 'react';
import { Save, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { useProjectSettingsStore, useAgentStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import type { Agent } from '@/types';
import { useDemoModeContext } from '@/contexts/DemoModeContext';

interface GeneralSettingsProps {
  project: Agent;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ project }) => {
  const { 
    settings, 
    settingsLoading, 
    settingsError, 
    fetchSettings, 
    updateSettings 
  } = useProjectSettingsStore();

  const { updateAgent, deleteAgent } = useAgentStore();

  const [formData, setFormData] = useState({
    project_name: '',
    default_prompt: '',
    example_questions: [''],
  });

  const [isModified, setIsModified] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();
  const { isMobile } = useBreakpoint();
  const { isFreeTrialMode } = useDemoModeContext();

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
        project_name: project.project_name || '',
        default_prompt: settings.default_prompt || '',
        example_questions: settings.example_questions?.length ? settings.example_questions : [''],
      });
      setIsModified(false);
    }
  }, [settings, project.project_name]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Don't mark as modified for read-only fields
    if (field !== 'example_questions') {
      setIsModified(true);
    }
  };

  // Example questions are read-only - these handlers are no longer needed
  // but kept for potential future use if the API changes

  const handleSave = async () => {
    try {
      const { project_name, example_questions, ...settingsData } = formData;
      
      // Update project name if it changed
      if (project_name !== project.project_name) {
        console.log('[GeneralSettings] Updating project name:', {
          old: project.project_name,
          new: project_name,
          projectId: project.id
        });
        const updatedAgent = await updateAgent(project.id, { project_name });
        console.log('[GeneralSettings] Update response:', updatedAgent);
        toast.success('Project name updated successfully');
      }
      
      // Update settings (excluding read-only example_questions)
      if (Object.keys(settingsData).length > 0) {
        await updateSettings(project.id, settingsData);
        toast.success('Settings updated successfully');
      }
      
      setIsModified(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save changes');
    }
  };

  const handleRefresh = () => {
    // Clear error state before refreshing
    useProjectSettingsStore.setState({ settingsError: null });
    fetchSettings(project.id);
    setIsModified(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAgent(project.id);
      toast.success('Project deleted successfully');
      // Redirect to dashboard after successful deletion
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      toast.error(error.message || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };


  return (
    <div className={cn(
      "max-w-4xl mx-auto",
      isMobile ? "p-4 mobile-px" : "p-6"
    )}>
      {/* Header */}
      <div className={cn(
        "mb-6",
        isMobile ? "flex-col gap-4" : "flex items-center justify-between"
      )}>
        <div className={isMobile ? "w-full" : ""}>
          <h2 className={cn(
            "font-bold text-foreground",
            isMobile ? "text-xl mobile-text-xl" : "text-2xl"
          )}>General Settings</h2>
          <p className={cn(
            "text-muted-foreground mt-1",
            isMobile ? "text-sm mobile-text-sm" : ""
          )}>
            Configure basic project information and behavior
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
            disabled={!isModified || settingsLoading}
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
              <div className="h-10 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </Card>
          ))}
        </div>
      ) : (
        <div className={cn(
          "space-y-6",
          isMobile && "space-y-4"
        )}>
          {/* Project Info */}
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
              )}>Project Information</h3>
            </div>
            
            <div className={cn(
              "grid gap-6",
              isMobile ? "grid-cols-1 gap-4" : "grid-cols-1 md:grid-cols-2"
            )}>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={formData.project_name}
                  onChange={(e) => handleInputChange('project_name', e.target.value)}
                  placeholder="Enter project name"
                  maxLength={100}
                  className={cn(
                    "w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
                    isMobile ? "px-4 py-3 text-base mobile-input" : "px-3 py-2"
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A descriptive name for your project ({formData.project_name.length}/100)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Project ID
                </label>
                <input
                  type="text"
                  value={project.id}
                  disabled
                  className={cn(
                    "w-full border border-border rounded-lg bg-accent text-muted-foreground cursor-not-allowed",
                    isMobile ? "px-4 py-3 text-base mobile-input" : "px-3 py-2"
                  )}
                />
              </div>
            </div>
          </Card>

          {/* Default Prompt */}
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
              )}>Default Prompt</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Welcome Message
              </label>
              <textarea
                value={formData.default_prompt}
                onChange={(e) => handleInputChange('default_prompt', e.target.value)}
                placeholder="How can I help you?"
                rows={isMobile ? 4 : 3}
                maxLength={255}
                className={cn(
                  "w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none bg-background text-foreground",
                  isMobile ? "px-4 py-3 text-base mobile-input" : "px-3 py-2"
                )}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This message is shown to users when they start a conversation ({formData.default_prompt.length}/255)
              </p>
            </div>
          </Card>

          {/* Example Questions */}
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
              )}>Example Questions</h3>
            </div>
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>Note:</strong> Example questions are currently read-only and managed by CustomGPT. They cannot be edited through the API.
              </p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              These questions help guide users on what they can ask your agent
            </p>
            
            <div className="space-y-3">
              {formData.example_questions.length === 0 || (formData.example_questions.length === 1 && !formData.example_questions[0]) ? (
                <p className="text-sm text-muted-foreground italic">No example questions have been set by CustomGPT.</p>
              ) : (
                formData.example_questions.map((question, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={question}
                      readOnly
                      disabled
                      placeholder="No example question set"
                      className={cn(
                        "flex-1 border border-border rounded-lg bg-accent text-muted-foreground cursor-not-allowed",
                        isMobile ? "px-4 py-3 text-base mobile-input" : "px-3 py-2"
                      )}
                    />
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Danger Zone - Hidden in free trial mode */}
          {!isFreeTrialMode && (
            <Card className={cn(
            "border-red-500/20 bg-red-500/5",
            isMobile ? "p-4 mobile-px mobile-py" : "p-6"
          )}>
            <div className={cn(
              "flex items-start justify-between mb-4",
              isMobile && "flex-col gap-2"
            )}>
              <h3 className={cn(
                "font-semibold text-red-600 dark:text-red-400",
                isMobile ? "text-base mobile-text-lg" : "text-lg"
              )}>Danger Zone</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Delete this project</h4>
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                  Once you delete a project, there is no going back. This action will permanently delete the project, 
                  all its data sources, conversations, and settings.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDeleting}
                  size="sm"
                  className={isMobile ? "w-full h-9 px-3 text-sm" : ""}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Project
                </Button>
              </div>
            </div>
          </Card>
          )}

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
              <Save className="w-4 h-4 mr-2" />
              {settingsLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              <span className="font-semibold"> &ldquo;{project.project_name}&rdquo;</span> and remove all of its data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All data sources and uploaded files</li>
                <li>All conversations and messages</li>
                <li>All settings and configurations</li>
                <li>All analytics and usage data</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Project
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};