'use client';

import React, { useEffect, useState } from 'react';
import {
  User,
  Edit,
  Save,
  X,
  Camera,
  RefreshCw,
  AlertCircle,
  Calendar,
  Mail,
  Users,
  Package,
  HardDrive,
  MessageCircle,
  HelpCircle,
  UserCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useProfileStore } from '@/store/profile';
import { useDemoModeContext } from '@/contexts/DemoModeContext';
import { useLimits } from '@/hooks/useLimits';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export default function AdminProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { profile, loading, error, fetchProfile, updateProfile } = useProfileStore();
  const { isFreeTrialMode } = useDemoModeContext();
  const { limits, isLoading: limitsLoading } = useLimits();
  const { user, role } = useAdminAuth();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile && !isEditing) {
      setEditName(profile.name);
    }
  }, [profile, isEditing]);

  const handleEdit = () => {
    if (isFreeTrialMode) {
      toast.error('Profile editing is not available in free trial mode');
      return;
    }
    if (profile) {
      setEditName(profile.name);
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (profile) setEditName(profile.name);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    try {
      await updateProfile(editName.trim(), selectedFile || undefined);
      setIsEditing(false);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Allowed JPG or PNG. Max size of 1MB');
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast.error('Allowed JPG or PNG. Max size of 1MB');
      return;
    }
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const getDisplayAvatar = () => {
    if (previewUrl) return previewUrl;
    if (profile?.profile_photo_url) {
      const url = new URL(profile.profile_photo_url);
      url.searchParams.set('t', Date.now().toString());
      return url.toString();
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-8 h-8 animate-spin text-coach-gold" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to load profile</h2>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button onClick={fetchProfile} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
          </Button>
        </Card>
      </div>
    );
  }

  const avatar = getDisplayAvatar();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-coach-gold/20 flex items-center justify-center">
          <UserCircle className="w-5 h-5 text-coach-gold" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground">Manage your account information</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Account Details</h2>
          {!isEditing ? (
            <Button onClick={handleEdit} variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-1.5" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="w-4 h-4 mr-1.5" /> Cancel
              </Button>
              <Button onClick={handleSave} size="sm" className="bg-coach-gold hover:bg-coach-gold/90 text-white">
                <Save className="w-4 h-4 mr-1.5" /> Save
              </Button>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              {avatar ? (
                <img src={avatar} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-coach-gold/20 flex items-center justify-center border-2 border-gray-200">
                  <User className="w-8 h-8 text-coach-gold" />
                </div>
              )}
              {isEditing && (
                <label className="absolute bottom-0 right-0 w-7 h-7 bg-coach-gold rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-coach-gold/90 transition-colors">
                  <Camera className="w-3.5 h-3.5 text-white" />
                  <input type="file" className="hidden" accept="image/jpeg,image/png" onChange={handleFileSelect} />
                </label>
              )}
            </div>
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xl font-semibold bg-transparent border-b-2 border-coach-gold/50 focus:border-coach-gold outline-none pb-0.5"
                  placeholder="Your name"
                />
              ) : (
                <p className="text-xl font-semibold text-gray-900">{profile?.name || 'Unknown'}</p>
              )}
              <p className="text-sm text-gray-500 mt-0.5">{profile?.email || '—'}</p>
            </div>
          </div>

          {user && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Role</p>
                <p className="text-sm font-medium text-gray-700 capitalize">{role}</p>
              </div>
              {user.store_name && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Store</p>
                  <p className="text-sm font-medium text-gray-700">{user.store_name}</p>
                </div>
              )}
            </div>
          )}

          {profile && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              {profile.created_at && (
                <div className="space-y-1 pt-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Member Since</p>
                  <p className="text-sm text-gray-700">{new Date(profile.created_at).toLocaleDateString()}</p>
                </div>
              )}
              {profile.updated_at && (
                <div className="space-y-1 pt-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Last Updated</p>
                  <p className="text-sm text-gray-700">{new Date(profile.updated_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {!limitsLoading && limits && (
        <Card className="mt-6 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold">Usage</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Projects</p>
              <p className="text-sm font-medium text-gray-700">
                {limits.current_projects_num ?? '—'} / {limits.max_projects_num ?? '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Queries</p>
              <p className="text-sm font-medium text-gray-700">
                {limits.current_queries ?? '—'} / {limits.max_queries ?? '—'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
