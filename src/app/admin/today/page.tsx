'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  GripVertical,
  Sparkles,
  Calendar,
  Star,
  X,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type TableName = 'focus_cards' | 'cultural_moments' | 'whats_new';

interface FocusCard {
  id: string;
  badge: string;
  title: string;
  description: string;
  cta_text: string;
  cta_action: string;
  is_active: boolean;
  sort_order: number;
}

interface CulturalMoment {
  id: string;
  name: string;
  icon: string;
  color_gradient: string;
  days_away: number;
  action_text: string;
  sort_order: number;
  is_active: boolean;
}

interface WhatsNewItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  icon: string;
  icon_bg: string;
  icon_color: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY_FOCUS_CARD: Omit<FocusCard, 'id'> = {
  badge: '',
  title: '',
  description: '',
  cta_text: '',
  cta_action: '',
  is_active: true,
  sort_order: 0,
};

const EMPTY_CULTURAL_MOMENT: Omit<CulturalMoment, 'id'> = {
  name: '',
  icon: '',
  color_gradient: '',
  days_away: 0,
  action_text: '',
  sort_order: 0,
  is_active: true,
};

const EMPTY_WHATS_NEW: Omit<WhatsNewItem, 'id'> = {
  tag: '',
  title: '',
  description: '',
  icon: '',
  icon_bg: '',
  icon_color: '',
  sort_order: 0,
  is_active: true,
};

async function apiRequest(method: string, body?: Record<string, unknown>) {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const url = method === 'GET' && body?.table
    ? `/api/admin/today?table=${body.table}`
    : '/api/admin/today';

  const res = await fetch(url, method === 'GET' ? undefined : opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

function ActiveToggle({
  active,
  onChange,
  disabled,
}: {
  active: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={() => onChange(!active)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        active ? 'bg-coach-gold' : 'bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
          active ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

function SectionHeader({
  title,
  icon: Icon,
  count,
  expanded,
  onToggle,
  onAdd,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border border-gray-200 rounded-xl shadow-sm">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 text-left flex-1"
      >
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-coach-mahogany" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
        <Icon className="w-5 h-5 text-coach-gold" />
        <span className="text-lg font-semibold text-gray-900">{title}</span>
        <span className="ml-2 inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
          {count}
        </span>
      </button>
      <Button size="sm" variant="outline" onClick={onAdd}>
        <Plus className="w-4 h-4 mr-1.5" />
        Add
      </Button>
    </div>
  );
}

function FocusCardForm({
  data,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  data: Omit<FocusCard, 'id'> & { id?: string };
  onChange: (d: Omit<FocusCard, 'id'> & { id?: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <Card className="p-5 border-coach-gold/30 bg-amber-50/30">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Badge</Label>
          <Input value={data.badge} onChange={(e) => onChange({ ...data, badge: e.target.value })} placeholder="e.g. Featured" />
        </div>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={data.title} onChange={(e) => onChange({ ...data, title: e.target.value })} placeholder="Card title" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Description</Label>
          <Input value={data.description} onChange={(e) => onChange({ ...data, description: e.target.value })} placeholder="Card description" />
        </div>
        <div className="space-y-1.5">
          <Label>CTA Text</Label>
          <Input value={data.cta_text} onChange={(e) => onChange({ ...data, cta_text: e.target.value })} placeholder="Button label" />
        </div>
        <div className="space-y-1.5">
          <Label>CTA Action</Label>
          <Input value={data.cta_action} onChange={(e) => onChange({ ...data, cta_action: e.target.value })} placeholder="e.g. navigate:/path" />
        </div>
        <div className="space-y-1.5">
          <Label>Sort Order</Label>
          <Input type="number" value={data.sort_order} onChange={(e) => onChange({ ...data, sort_order: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Label>Active</Label>
          <ActiveToggle active={data.is_active} onChange={(v) => onChange({ ...data, is_active: v })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
          {data.id ? 'Update' : 'Create'}
        </Button>
      </div>
    </Card>
  );
}

function CulturalMomentForm({
  data,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  data: Omit<CulturalMoment, 'id'> & { id?: string };
  onChange: (d: Omit<CulturalMoment, 'id'> & { id?: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <Card className="p-5 border-coach-gold/30 bg-amber-50/30">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={data.name} onChange={(e) => onChange({ ...data, name: e.target.value })} placeholder="e.g. Black History Month" />
        </div>
        <div className="space-y-1.5">
          <Label>Icon</Label>
          <Input value={data.icon} onChange={(e) => onChange({ ...data, icon: e.target.value })} placeholder="e.g. ✊ or icon name" />
        </div>
        <div className="space-y-1.5">
          <Label>Color Gradient</Label>
          <Input value={data.color_gradient} onChange={(e) => onChange({ ...data, color_gradient: e.target.value })} placeholder="e.g. from-purple-500 to-pink-500" />
        </div>
        <div className="space-y-1.5">
          <Label>Days Away</Label>
          <Input type="number" value={data.days_away} onChange={(e) => onChange({ ...data, days_away: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label>Action Text</Label>
          <Input value={data.action_text} onChange={(e) => onChange({ ...data, action_text: e.target.value })} placeholder="e.g. Explore →" />
        </div>
        <div className="space-y-1.5">
          <Label>Sort Order</Label>
          <Input type="number" value={data.sort_order} onChange={(e) => onChange({ ...data, sort_order: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Label>Active</Label>
          <ActiveToggle active={data.is_active} onChange={(v) => onChange({ ...data, is_active: v })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
          {data.id ? 'Update' : 'Create'}
        </Button>
      </div>
    </Card>
  );
}

function WhatsNewForm({
  data,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  data: Omit<WhatsNewItem, 'id'> & { id?: string };
  onChange: (d: Omit<WhatsNewItem, 'id'> & { id?: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <Card className="p-5 border-coach-gold/30 bg-amber-50/30">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Tag</Label>
          <Input value={data.tag} onChange={(e) => onChange({ ...data, tag: e.target.value })} placeholder="e.g. New Feature" />
        </div>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={data.title} onChange={(e) => onChange({ ...data, title: e.target.value })} placeholder="Item title" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Description</Label>
          <Input value={data.description} onChange={(e) => onChange({ ...data, description: e.target.value })} placeholder="Item description" />
        </div>
        <div className="space-y-1.5">
          <Label>Icon</Label>
          <Input value={data.icon} onChange={(e) => onChange({ ...data, icon: e.target.value })} placeholder="e.g. Sparkles" />
        </div>
        <div className="space-y-1.5">
          <Label>Icon Background</Label>
          <Input value={data.icon_bg} onChange={(e) => onChange({ ...data, icon_bg: e.target.value })} placeholder="e.g. bg-blue-100" />
        </div>
        <div className="space-y-1.5">
          <Label>Icon Color</Label>
          <Input value={data.icon_color} onChange={(e) => onChange({ ...data, icon_color: e.target.value })} placeholder="e.g. text-blue-600" />
        </div>
        <div className="space-y-1.5">
          <Label>Sort Order</Label>
          <Input type="number" value={data.sort_order} onChange={(e) => onChange({ ...data, sort_order: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Label>Active</Label>
          <ActiveToggle active={data.is_active} onChange={(v) => onChange({ ...data, is_active: v })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
          {data.id ? 'Update' : 'Create'}
        </Button>
      </div>
    </Card>
  );
}

function ItemRow({
  label,
  sublabel,
  active,
  onToggleActive,
  onEdit,
  onDelete,
  deleting,
  toggling,
}: {
  label: string;
  sublabel?: string;
  active: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  toggling: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group">
      <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', !active && 'text-gray-400')}>
          {label}
        </p>
        {sublabel && (
          <p className="text-xs text-gray-500 truncate">{sublabel}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {toggling ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : (
          <ActiveToggle active={active} onChange={onToggleActive} />
        )}
        <Button variant="ghost" size="icon-sm" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onDelete} disabled={deleting}>
          {deleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default function TodayDashboardPage() {
  const [focusCards, setFocusCards] = useState<FocusCard[]>([]);
  const [culturalMoments, setCulturalMoments] = useState<CulturalMoment[]>([]);
  const [whatsNew, setWhatsNew] = useState<WhatsNewItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Record<TableName, boolean>>({
    focus_cards: true,
    cultural_moments: true,
    whats_new: true,
  });

  const [editingForm, setEditingForm] = useState<{
    table: TableName;
    data: Record<string, any>;
  } | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/today');
      if (!res.ok) throw new Error('Failed to load data');
      const data = await res.json();
      setFocusCards(data.focus_cards ?? []);
      setCulturalMoments(data.cultural_moments ?? []);
      setWhatsNew(data.whats_new ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toggleSection = (table: TableName) => {
    setExpanded((prev) => ({ ...prev, [table]: !prev[table] }));
  };

  const openAddForm = (table: TableName) => {
    const defaults: Record<TableName, Record<string, unknown>> = {
      focus_cards: { ...EMPTY_FOCUS_CARD },
      cultural_moments: { ...EMPTY_CULTURAL_MOMENT },
      whats_new: { ...EMPTY_WHATS_NEW },
    };
    setEditingForm({ table, data: defaults[table] });
    setExpanded((prev) => ({ ...prev, [table]: true }));
  };

  const openEditForm = (table: TableName, item: Record<string, any>) => {
    setEditingForm({ table, data: { ...item } });
    setExpanded((prev) => ({ ...prev, [table]: true }));
  };

  const handleSave = async () => {
    if (!editingForm) return;
    const { table, data } = editingForm;

    try {
      setSaving(true);
      const isEdit = !!data.id;
      const method = isEdit ? 'PUT' : 'POST';
      await apiRequest(method, { table, ...data });
      toast.success(isEdit ? 'Item updated' : 'Item created');
      setEditingForm(null);
      await fetchAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (table: TableName, id: string) => {
    try {
      setDeletingId(id);
      await apiRequest('DELETE', { table, id });
      toast.success('Item deleted');
      await fetchAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (
    table: TableName,
    id: string,
    currentActive: boolean
  ) => {
    try {
      setTogglingId(id);
      await apiRequest('PUT', { table, id, is_active: !currentActive });
      await fetchAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Toggle failed';
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  };

  const isEditingTable = (table: TableName) =>
    editingForm?.table === table;

  if (loading) {
    return (
      <PageLayout>
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-coach-gold" />
            <p className="text-sm text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Today Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage the content shown on the Today tab
            </p>
          </div>

          <div className="space-y-6">
            {/* Focus Cards */}
            <section>
              <SectionHeader
                title="Focus Cards"
                icon={Star}
                count={focusCards.length}
                expanded={expanded.focus_cards}
                onToggle={() => toggleSection('focus_cards')}
                onAdd={() => openAddForm('focus_cards')}
              />
              {expanded.focus_cards && (
                <div className="mt-3 space-y-2 pl-2">
                  {isEditingTable('focus_cards') && !editingForm!.data.id && (
                    <FocusCardForm
                      data={editingForm!.data as Omit<FocusCard, 'id'> & { id?: string }}
                      onChange={(d) => setEditingForm({ table: 'focus_cards', data: d })}
                      onSave={handleSave}
                      onCancel={() => setEditingForm(null)}
                      saving={saving}
                    />
                  )}
                  {focusCards.length === 0 && !isEditingTable('focus_cards') && (
                    <p className="text-sm text-gray-400 py-4 text-center">No focus cards yet</p>
                  )}
                  {focusCards.map((card) =>
                    isEditingTable('focus_cards') && editingForm!.data.id === card.id ? (
                      <FocusCardForm
                        key={card.id}
                        data={editingForm!.data as Omit<FocusCard, 'id'> & { id?: string }}
                        onChange={(d) => setEditingForm({ table: 'focus_cards', data: d })}
                        onSave={handleSave}
                        onCancel={() => setEditingForm(null)}
                        saving={saving}
                      />
                    ) : (
                      <ItemRow
                        key={card.id}
                        label={card.title}
                        sublabel={`${card.badge} · ${card.cta_text}`}
                        active={card.is_active}
                        onToggleActive={() => handleToggleActive('focus_cards', card.id, card.is_active)}
                        onEdit={() => openEditForm('focus_cards', card)}
                        onDelete={() => handleDelete('focus_cards', card.id)}
                        deleting={deletingId === card.id}
                        toggling={togglingId === card.id}
                      />
                    )
                  )}
                </div>
              )}
            </section>

            {/* Cultural Moments */}
            <section>
              <SectionHeader
                title="Cultural Moments"
                icon={Calendar}
                count={culturalMoments.length}
                expanded={expanded.cultural_moments}
                onToggle={() => toggleSection('cultural_moments')}
                onAdd={() => openAddForm('cultural_moments')}
              />
              {expanded.cultural_moments && (
                <div className="mt-3 space-y-2 pl-2">
                  {isEditingTable('cultural_moments') && !editingForm!.data.id && (
                    <CulturalMomentForm
                      data={editingForm!.data as Omit<CulturalMoment, 'id'> & { id?: string }}
                      onChange={(d) => setEditingForm({ table: 'cultural_moments', data: d })}
                      onSave={handleSave}
                      onCancel={() => setEditingForm(null)}
                      saving={saving}
                    />
                  )}
                  {culturalMoments.length === 0 && !isEditingTable('cultural_moments') && (
                    <p className="text-sm text-gray-400 py-4 text-center">No cultural moments yet</p>
                  )}
                  {culturalMoments.map((moment) =>
                    isEditingTable('cultural_moments') && editingForm!.data.id === moment.id ? (
                      <CulturalMomentForm
                        key={moment.id}
                        data={editingForm!.data as Omit<CulturalMoment, 'id'> & { id?: string }}
                        onChange={(d) => setEditingForm({ table: 'cultural_moments', data: d })}
                        onSave={handleSave}
                        onCancel={() => setEditingForm(null)}
                        saving={saving}
                      />
                    ) : (
                      <ItemRow
                        key={moment.id}
                        label={moment.name}
                        sublabel={`${moment.icon} · ${moment.days_away} days away`}
                        active={moment.is_active}
                        onToggleActive={() => handleToggleActive('cultural_moments', moment.id, moment.is_active)}
                        onEdit={() => openEditForm('cultural_moments', moment)}
                        onDelete={() => handleDelete('cultural_moments', moment.id)}
                        deleting={deletingId === moment.id}
                        toggling={togglingId === moment.id}
                      />
                    )
                  )}
                </div>
              )}
            </section>

            {/* What's New */}
            <section>
              <SectionHeader
                title="What's New"
                icon={Sparkles}
                count={whatsNew.length}
                expanded={expanded.whats_new}
                onToggle={() => toggleSection('whats_new')}
                onAdd={() => openAddForm('whats_new')}
              />
              {expanded.whats_new && (
                <div className="mt-3 space-y-2 pl-2">
                  {isEditingTable('whats_new') && !editingForm!.data.id && (
                    <WhatsNewForm
                      data={editingForm!.data as Omit<WhatsNewItem, 'id'> & { id?: string }}
                      onChange={(d) => setEditingForm({ table: 'whats_new', data: d })}
                      onSave={handleSave}
                      onCancel={() => setEditingForm(null)}
                      saving={saving}
                    />
                  )}
                  {whatsNew.length === 0 && !isEditingTable('whats_new') && (
                    <p className="text-sm text-gray-400 py-4 text-center">No items yet</p>
                  )}
                  {whatsNew.map((item) =>
                    isEditingTable('whats_new') && editingForm!.data.id === item.id ? (
                      <WhatsNewForm
                        key={item.id}
                        data={editingForm!.data as Omit<WhatsNewItem, 'id'> & { id?: string }}
                        onChange={(d) => setEditingForm({ table: 'whats_new', data: d })}
                        onSave={handleSave}
                        onCancel={() => setEditingForm(null)}
                        saving={saving}
                      />
                    ) : (
                      <ItemRow
                        key={item.id}
                        label={item.title}
                        sublabel={`${item.tag} · ${item.icon}`}
                        active={item.is_active}
                        onToggleActive={() => handleToggleActive('whats_new', item.id, item.is_active)}
                        onEdit={() => openEditForm('whats_new', item)}
                        onDelete={() => handleDelete('whats_new', item.id)}
                        deleting={deletingId === item.id}
                        toggling={togglingId === item.id}
                      />
                    )
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
