'use client';

import { useState, useRef } from 'react';
import { Loader2, X, Save, ImagePlus, Clock, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { PublishToggle } from './PublishToggle';
import {
  CultureType,
  CultureFormData,
  TYPE_SELECT_OPTIONS,
  toDatetimeLocal,
} from '@/lib/admin/culture-types';

export function CultureForm({
  data,
  onChange,
  onSave,
  onCancel,
  saving,
  adminHeaders = {},
}: {
  data: CultureFormData;
  onChange: (d: CultureFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  adminHeaders?: Record<string, string>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a JPEG, PNG, or WebP image.');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/culture/upload-image', {
        method: 'POST',
        headers: adminHeaders,
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      onChange({ ...data, image_url: json.url });
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const imagePreviewSrc =
    data.image_url &&
    (data.image_url.startsWith('data:') || data.image_url.startsWith('http'))
      ? data.image_url
      : null;

  return (
    <Card className="p-5 border-coach-gold/30 bg-amber-50/30">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <select
            value={data.type}
            onChange={(e) => onChange({ ...data, type: e.target.value as CultureType })}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
          >
            {TYPE_SELECT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Input value={data.category} onChange={(e) => onChange({ ...data, category: e.target.value })} placeholder="e.g. Street Style, Runway" />
        </div>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={data.title} onChange={(e) => onChange({ ...data, title: e.target.value })} placeholder="Content title" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Image</Label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading || saving}
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <ImagePlus className="w-4 h-4 mr-1.5" />}
                {uploading ? 'Uploading…' : 'Upload image'}
              </Button>
              <span className="text-xs text-gray-500">JPEG, PNG or WebP, max 10MB</span>
            </div>
            {imagePreviewSrc && (
              <div className="h-20 w-28 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden shrink-0">
                <img src={imagePreviewSrc} alt="" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
          <Input
            value={data.image_url}
            onChange={(e) => onChange({ ...data, image_url: e.target.value })}
            placeholder="Or paste image URL"
            className="mt-1"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Description</Label>
          <textarea
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder="Content description"
            rows={3}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Engagement Text</Label>
          <Input value={data.engagement_text} onChange={(e) => onChange({ ...data, engagement_text: e.target.value })} placeholder="e.g. 2.4K views" />
        </div>
        <div className="space-y-1.5">
          <Label>Sort Order</Label>
          <Input type="number" value={data.sort_order} onChange={(e) => onChange({ ...data, sort_order: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5 text-violet-500" />
            Publish Date
            <span className="text-xs font-normal text-gray-400">(optional — leave blank to publish immediately)</span>
          </Label>
          <input
            type="datetime-local"
            value={toDatetimeLocal(data.publish_date)}
            onChange={(e) => {
              const val = e.target.value;
              onChange({ ...data, publish_date: val ? new Date(val).toISOString() : null });
            }}
            className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
          />
          {data.publish_date && new Date(data.publish_date) > new Date() && (
            <p className="text-xs text-violet-600 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              Will appear as <strong>Scheduled</strong> — hidden from associates until this date
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Label>Published</Label>
          <PublishToggle published={data.is_published} onChange={(v) => onChange({ ...data, is_published: v })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          {data.id ? 'Update' : 'Create'}
        </Button>
      </div>
    </Card>
  );
}
