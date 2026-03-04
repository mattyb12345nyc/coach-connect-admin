'use client';

import React, { useState, useRef } from 'react';
import {
  User,
  Edit,
  Save,
  X,
  Camera,
  Loader2,
  UserCircle,
  Shield,
  Store,
  Mail,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

const ROLE_LABELS: Record<string, string> = {
  associate: 'Associate',
  store_manager: 'Store Manager',
  regional_manager: 'Regional Manager',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

const ROLE_COLORS: Record<string, string> = {
  associate: 'bg-gray-100 text-gray-700',
  store_manager: 'bg-blue-100 text-blue-700',
  regional_manager: 'bg-indigo-100 text-indigo-700',
  admin: 'bg-purple-100 text-purple-700',
  super_admin: 'bg-amber-100 text-amber-700',
};

export default function AdminProfilePage() {
  const { user, role, loading } = useAdminAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    if (!user) return;
    setEditFirstName(user.first_name ?? '');
    setEditLastName(user.last_name ?? '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast.error('Please select a JPG or PNG image');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;
    const firstName = editFirstName.trim();
    const lastName = editLastName.trim();
    if (!firstName) {
      toast.error('First name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      let avatarUrl: string | undefined;

      // Upload avatar if a file was selected
      if (selectedFile) {
        const fd = new FormData();
        fd.append('file', selectedFile);
        fd.append('userId', user.id);
        const res = await fetch('/api/admin/profile/avatar', { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          avatarUrl = data.avatar_url;
          setLocalAvatarUrl(avatarUrl ?? null);
        } else {
          // Avatar upload failed — proceed without it
          toast.error('Photo upload failed — profile name saved without photo change');
        }
      }

      const displayName = [firstName, lastName].filter(Boolean).join(' ');
      const updates: Record<string, string> = {
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
      };
      if (avatarUrl) updates.avatar_url = avatarUrl;

      const res = await fetch('/api/admin/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, ...updates }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save profile');
      }

      toast.success('Profile updated');
      setIsEditing(false);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-coach-gold" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-gray-500">
        No profile found. Please sign in again.
      </div>
    );
  }

  const avatarSrc = previewUrl ?? localAvatarUrl ?? user.avatar_url ?? null;
  const displayName = isEditing
    ? [editFirstName, editLastName].filter(Boolean).join(' ') || user.display_name
    : user.display_name || `${user.first_name} ${user.last_name}`.trim() || user.email;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-coach-gold/20 flex items-center justify-center">
          <UserCircle className="w-5 h-5 text-coach-gold" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground">Your account information</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Account Details</h2>
          {!isEditing ? (
            <Button onClick={startEditing} variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-1.5" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={cancelEditing} variant="outline" size="sm" disabled={saving}>
                <X className="w-4 h-4 mr-1.5" /> Cancel
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                disabled={saving}
                className="bg-coach-gold hover:bg-coach-gold/90 text-white"
              >
                {saving
                  ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  : <Save className="w-4 h-4 mr-1.5" />}
                Save
              </Button>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar + name */}
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-coach-gold/20 flex items-center justify-center border-2 border-gray-200">
                  <User className="w-8 h-8 text-coach-gold" />
                </div>
              )}
              {isEditing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-coach-gold rounded-full flex items-center justify-center shadow-md hover:bg-coach-gold/90 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png"
                onChange={handleFileSelect}
              />
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={e => setEditFirstName(e.target.value)}
                    placeholder="First name"
                    className="flex-1 text-lg font-semibold bg-transparent border-b-2 border-coach-gold/50 focus:border-coach-gold outline-none pb-0.5"
                  />
                  <input
                    type="text"
                    value={editLastName}
                    onChange={e => setEditLastName(e.target.value)}
                    placeholder="Last name"
                    className="flex-1 text-lg font-semibold bg-transparent border-b-2 border-coach-gold/50 focus:border-coach-gold outline-none pb-0.5"
                  />
                </div>
              ) : (
                <p className="text-xl font-semibold text-gray-900 truncate">{displayName}</p>
              )}
              <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                {user.email}
              </p>
            </div>
          </div>

          {/* Role + Store */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div className="pt-4 space-y-1.5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3 h-3" /> Role
              </p>
              <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-700')}>
                {ROLE_LABELS[role] ?? role}
              </span>
            </div>

            {user.store_name && (
              <div className="pt-4 space-y-1.5">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Store className="w-3 h-3" /> Store
                </p>
                <p className="text-sm font-medium text-gray-700">
                  {user.store_number ? `#${user.store_number} — ` : ''}{user.store_name}
                </p>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
              user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', user.status === 'active' ? 'bg-green-500' : 'bg-gray-400')} />
              {user.status === 'active' ? 'Active' : (user.status ?? 'Unknown')}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Account ID: {user.id.slice(0, 8)}…
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
