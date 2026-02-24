'use client';

import React, { useEffect, useState } from 'react';
import { 
  DollarSign, 
  ShoppingCart, 
  Key, 
  Save, 
  AlertCircle, 
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  Calendar,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

import { useProjectSettingsStore } from '@/store';
import { useLicenseStore } from '@/store/licenses';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import type { Agent } from '@/types';
import { useDemoModeContext } from '@/contexts/DemoModeContext';

interface LicenseItemProps {
  license: any;
  onEdit: (license: any) => void;
  onDelete: (licenseKey: string) => void;
  disabled?: boolean;
}

const LicenseItem: React.FC<LicenseItemProps> = ({ license, onEdit, onDelete, disabled = false }) => {
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(license.key);
      setCopied(true);
      toast.success('License key copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy license key');
    }
  };

  const handleDelete = () => {
    onDelete(license.key);
    setShowDeleteConfirm(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <h4 className="text-base font-semibold text-foreground">{license.name}</h4>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash className="w-4 h-4" />
              <code className="bg-accent px-2 py-1 rounded font-mono text-xs">
                {license.key}
              </code>
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-accent rounded transition-colors"
                title="Copy license key"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Created {format(new Date(license.created_at), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(license)}
            disabled={disabled}
            className="h-8 px-2"
            title={disabled ? 'Editing licenses is not available in free trial mode' : 'Edit license'}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={disabled}
                className="h-8 px-2"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                className="h-8 px-2"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={disabled}
              className="h-8 px-2"
              title={disabled ? 'Deleting licenses is not available in free trial mode' : 'Delete license'}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

interface BusinessAndLicensingProps {
  project: Agent;
}

export const BusinessAndLicensing: React.FC<BusinessAndLicensingProps> = ({ project }) => {
  const { isFreeTrialMode } = useDemoModeContext();
  const { isMobile } = useBreakpoint();
  
  // Settings store
  const { 
    settings, 
    settingsLoading, 
    settingsError, 
    fetchSettings, 
    updateSettings 
  } = useProjectSettingsStore();

  // License store
  const { 
    licenses, 
    loading: licensesLoading, 
    error: licensesError,
    fetchLicenses,
    createLicense,
    updateLicense,
    deleteLicense
  } = useLicenseStore();

  const [businessFormData, setBusinessFormData] = useState({
    is_selling_enabled: false,
    license_slug: true,
    selling_url: '',
  });

  const [isBusinessModified, setIsBusinessModified] = useState(false);
  const [showCreateLicense, setShowCreateLicense] = useState(false);
  const [editingLicense, setEditingLicense] = useState<any>(null);
  const [licenseName, setLicenseName] = useState('');
  const [licensesNotSupported, setLicensesNotSupported] = useState(false);

  // Load data on component mount
  useEffect(() => {
    useProjectSettingsStore.setState({ settingsError: null });
    fetchSettings(project.id);
    
    return () => {
      useProjectSettingsStore.setState({ settingsError: null });
    };
  }, [project.id, fetchSettings]);

  // Fetch licenses when license management is enabled
  useEffect(() => {
    // Only fetch licenses if license management is enabled
    if (settings?.license_slug) {
      setLicensesNotSupported(false);
      fetchLicenses(project.id).catch(error => {
        // Handle 403 errors for projects that don't support licenses
        if (error?.status === 403 || error?.data?.message?.includes('not allowed')) {
          setLicensesNotSupported(true);
        } else {
          console.error('Failed to fetch licenses:', error);
        }
      });
    }
  }, [project.id, fetchLicenses, settings?.license_slug]);

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setBusinessFormData({
        is_selling_enabled: settings.is_selling_enabled || false,
        license_slug: settings.license_slug ?? true,
        selling_url: settings.selling_url || '',
      });
      setIsBusinessModified(false);
    }
  }, [settings]);

  const handleBusinessInputChange = (field: string, value: any) => {
    if (isFreeTrialMode) {
      toast.error('Editing business settings is not available in free trial mode');
      return;
    }
    
    setBusinessFormData(prev => ({ ...prev, [field]: value }));
    setIsBusinessModified(true);
    
    // If enabling license management, fetch licenses
    if (field === 'license_slug' && value === true) {
      fetchLicenses(project.id);
    }
  };

  const handleSaveBusinessSettings = async () => {
    if (isFreeTrialMode) {
      toast.error('Updating business settings is not available in free trial mode');
      return;
    }
    
    try {
      await updateSettings(project.id, businessFormData);
      setIsBusinessModified(false);
      toast.success('Business settings updated successfully');
    } catch (error) {
      console.error('Failed to save business settings:', error);
      toast.error('Failed to save business settings');
    }
  };

  const handleRefresh = () => {
    useProjectSettingsStore.setState({ settingsError: null });
    fetchSettings(project.id);
    fetchLicenses(project.id);
    setIsBusinessModified(false);
  };

  const handleCreateLicense = async () => {
    if (isFreeTrialMode) {
      toast.error('Creating licenses is not available in free trial mode');
      return;
    }

    if (!licenseName.trim()) {
      toast.error('Please enter a license name');
      return;
    }

    try {
      await createLicense(project.id, licenseName.trim());
      setLicenseName('');
      setShowCreateLicense(false);
      toast.success('License created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create license');
    }
  };

  const handleEditLicense = (license: any) => {
    setEditingLicense(license);
    setLicenseName(license.name);
  };

  const handleUpdateLicense = async () => {
    if (isFreeTrialMode || !editingLicense) return;

    if (!licenseName.trim()) {
      toast.error('Please enter a license name');
      return;
    }

    try {
      await updateLicense(project.id, editingLicense.id, licenseName.trim());
      setEditingLicense(null);
      setLicenseName('');
      toast.success('License updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update license');
    }
  };

  const handleDeleteLicense = async (licenseKey: string) => {
    if (isFreeTrialMode) {
      toast.error('Deleting licenses is not available in free trial mode');
      return;
    }

    try {
      const license = licenses.find(l => l.key === licenseKey);
      if (license && license.id) {
        await deleteLicense(project.id, license.id);
        toast.success('License deleted successfully');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete license');
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
          )}>Business & Licensing</h2>
          <p className={cn(
            "text-muted-foreground mt-1",
            isMobile ? "text-sm" : ""
          )}>
            Configure commerce settings and manage access licenses
          </p>
        </div>
        
        <div className={cn(
          "flex gap-3",
          isMobile ? "w-full grid grid-cols-2 gap-2 mt-4" : "items-center"
        )}>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={settingsLoading || licensesLoading}
            size="sm"
            className={isMobile ? "h-9 px-3 text-sm" : ""}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1.5', (settingsLoading || licensesLoading) && 'animate-spin')} />
            Refresh
          </Button>
          
          <Button
            onClick={handleSaveBusinessSettings}
            disabled={!isBusinessModified || settingsLoading || isFreeTrialMode}
            size="sm"
            className={isMobile ? "h-9 px-3 text-sm" : ""}
          >
            <Save className="w-4 h-4 mr-1.5" />
            {settingsLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Error States */}
      {settingsError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error loading settings</span>
          </div>
          <p className="text-red-600 dark:text-red-400 mt-1 text-sm">
            {settingsError}
          </p>
        </div>
      )}
      
      {/* Show license error only if it's not a 403 error */}
      {licensesError && !licensesError.includes('403') && !licensesError.includes('not allowed') && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error loading licenses</span>
          </div>
          <p className="text-red-600 dark:text-red-400 mt-1 text-sm">
            {licensesError}
          </p>
        </div>
      )}

      <div className={cn("space-y-6", isMobile && "space-y-4")}>
        {/* Commerce Settings */}
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
                <DollarSign className="w-5 h-5" />
                Commerce Settings
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure selling and monetization options
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="text-sm font-medium text-foreground">Enable Selling</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Allow users to purchase products or services through the chatbot
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={businessFormData.is_selling_enabled}
                  onChange={(e) => handleBusinessInputChange('is_selling_enabled', e.target.checked)}
                  className="sr-only peer"
                  disabled={isFreeTrialMode}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-muted peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {businessFormData.is_selling_enabled && (
              <div className="pl-6 border-l-2 border-border space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Selling URL
                </label>
                <input
                  type="url"
                  value={businessFormData.selling_url}
                  onChange={(e) => handleBusinessInputChange('selling_url', e.target.value)}
                  placeholder="https://your-store.com/products"
                  className={cn(
                    "w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
                    isMobile ? "px-4 py-3 text-base" : "px-3 py-2"
                  )}
                />
                <p className="text-sm text-muted-foreground">
                  URL where users will be redirected to complete purchases
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  <span className="text-sm font-medium text-foreground">Enable License Management</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage licenses and access control for your chatbot
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={businessFormData.license_slug}
                  onChange={(e) => handleBusinessInputChange('license_slug', e.target.checked)}
                  className="sr-only peer"
                  disabled={isFreeTrialMode}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-muted peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
              </label>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2">Business Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Commerce integration for product sales</li>
                <li>• License management for access control</li>
                <li>• Custom checkout flows</li>
                <li>• Analytics and reporting</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* License Management */}
        {businessFormData.license_slug && (
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
                  <Key className="w-5 h-5" />
                  License Management
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create and manage access licenses for your chatbot
                </p>
              </div>
            </div>

            {/* Create/Edit License Form */}
            {(showCreateLicense || editingLicense) && (
              <div className="mb-6 p-4 border border-border rounded-lg bg-accent">
                <h4 className="text-sm font-medium mb-3">
                  {editingLicense ? 'Edit License' : 'Create New License'}
                </h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={licenseName}
                    onChange={(e) => setLicenseName(e.target.value)}
                    placeholder="Enter license name"
                    className={cn(
                      "flex-1 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground",
                      isMobile ? "px-4 py-3 text-base" : "px-3 py-2"
                    )}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        editingLicense ? handleUpdateLicense() : handleCreateLicense();
                      }
                      if (e.key === 'Escape') {
                        setShowCreateLicense(false);
                        setEditingLicense(null);
                        setLicenseName('');
                      }
                    }}
                  />
                  <Button
                    onClick={editingLicense ? handleUpdateLicense : handleCreateLicense}
                    disabled={!licenseName.trim() || licensesLoading || isFreeTrialMode}
                    size="sm"
                  >
                    {licensesLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : editingLicense ? (
                      'Update'
                    ) : (
                      'Create'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateLicense(false);
                      setEditingLicense(null);
                      setLicenseName('');
                    }}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Create License Button */}
            {!showCreateLicense && !editingLicense && !licensesNotSupported && (
              <div className="mb-4">
                <Button
                  onClick={() => setShowCreateLicense(true)}
                  disabled={licensesLoading || isFreeTrialMode}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New License
                </Button>
              </div>
            )}

            {/* Licenses List */}
            {licensesNotSupported ? (
              <div className="text-center py-8 px-4 bg-muted/50 rounded-lg">
                <Key className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground mb-2 font-medium">Licenses not available</p>
                <p className="text-sm text-muted-foreground">
                  License management is not supported for this project type. 
                  This feature may require a specific subscription plan.
                </p>
              </div>
            ) : licensesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 border border-border rounded-lg animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-muted rounded" />
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : licenses.length === 0 ? (
              <div className="text-center py-8">
                <Key className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">No licenses created yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first license to start managing access control
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {licenses.map((license) => (
                    <LicenseItem
                      key={license.key}
                      license={license}
                      onEdit={handleEditLicense}
                      onDelete={handleDeleteLicense}
                      disabled={isFreeTrialMode}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Card>
        )}

        {/* Save Button at Bottom */}
        <div className={cn(
          "flex mt-6",
          isMobile ? "justify-center" : "justify-end"
        )}>
          <Button
            onClick={handleSaveBusinessSettings}
            disabled={!isBusinessModified || settingsLoading || isFreeTrialMode}
            size="sm"
            className={isMobile ? "h-9 px-6 text-sm" : ""}
          >
            <Save className="w-4 h-4 mr-2" />
            {settingsLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};