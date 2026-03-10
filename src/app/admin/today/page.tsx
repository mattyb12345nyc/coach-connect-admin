'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
  Calendar,
  Star,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/components/admin/RoleGate';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useAdminAuth, type AdminRole } from '@/contexts/AdminAuthContext';

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
  scope_type: 'global' | 'region' | 'store';
  store_id: string | null;
  store_region: string | null;
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
  scope_type: 'global' | 'region' | 'store';
  store_id: string | null;
  store_region: string | null;
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
  scope_type: 'global' | 'region' | 'store';
  store_id: string | null;
  store_region: string | null;
}

interface StoreSummary {
  id: string;
  store_number: string;
  store_name: string;
  region: string;
}

const EMPTY_FOCUS_CARD: Omit<FocusCard, 'id'> = {
  badge: '',
  title: '',
  description: '',
  cta_text: '',
  cta_action: '',
  is_active: true,
  sort_order: 0,
  scope_type: 'global',
  store_id: null,
  store_region: null,
};

const EMPTY_CULTURAL_MOMENT: Omit<CulturalMoment, 'id'> = {
  name: '',
  icon: '',
  color_gradient: '',
  days_away: 0,
  action_text: '',
  sort_order: 0,
  is_active: true,
  scope_type: 'global',
  store_id: null,
  store_region: null,
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
  scope_type: 'global',
  store_id: null,
  store_region: null,
};

async function apiRequest(method: string, headers: Record<string, string>, body?: Record<string, unknown>) {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
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

function TargetingFields({
  data,
  onChange,
  role,
  storeId,
  stores,
}: {
  data: { scope_type: 'global' | 'region' | 'store'; store_id: string | null; store_region: string | null };
  onChange: (next: { scope_type: 'global' | 'region' | 'store'; store_id: string | null; store_region: string | null }) => void;
  role: AdminRole;
  storeId: string | null;
  stores: StoreSummary[];
}) {
  const regions = Array.from(new Set(stores.map((store) => store.region).filter(Boolean))).sort();
  const isManager = role === 'store_manager';
  const scopeValue = isManager ? 'store' : data.scope_type;
  const selectedStoreId = isManager ? storeId : data.store_id;

  return (
    <div className="md:col-span-2 rounded-lg border border-gray-200 bg-white/70 p-3 space-y-3">
      <Label>Target Audience</Label>
      <select
        value={scopeValue}
        onChange={(e) =>
          onChange({
            scope_type: e.target.value as 'global' | 'region' | 'store',
            store_id: e.target.value === 'store' ? data.store_id : null,
            store_region: e.target.value === 'region' ? data.store_region : null,
          })
        }
        disabled={isManager}
        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm disabled:bg-gray-100"
      >
        <option value="global">Global</option>
        <option value="region">Region</option>
        <option value="store">Individual Store</option>
      </select>

      {scopeValue === 'region' && !isManager && (
        <select
          value={data.store_region || ''}
          onChange={(e) =>
            onChange({
              scope_type: 'region',
              store_id: null,
              store_region: e.target.value || null,
            })
          }
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Select region</option>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      )}

      {scopeValue === 'store' && (
        <select
          value={selectedStoreId || ''}
          onChange={(e) =>
            onChange({
              scope_type: 'store',
              store_id: e.target.value || null,
              store_region: null,
            })
          }
          disabled={isManager}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm disabled:bg-gray-100"
        >
          <option value="">Select store</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.store_number} - {store.store_name}
            </option>
          ))}
        </select>
      )}

      {isManager && <p className="text-xs text-gray-500">Managers can only publish to their own store.</p>}
    </div>
  );
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
  role,
  storeId,
  stores,
}: {
  data: Omit<FocusCard, 'id'> & { id?: string };
  onChange: (d: Omit<FocusCard, 'id'> & { id?: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  role: AdminRole;
  storeId: string | null;
  stores: StoreSummary[];
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
        <TargetingFields
          data={{ scope_type: data.scope_type, store_id: data.store_id, store_region: data.store_region }}
          onChange={(targeting) => onChange({ ...data, ...targeting })}
          role={role}
          storeId={storeId}
          stores={stores}
        />
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
  role,
  storeId,
  stores,
}: {
  data: Omit<CulturalMoment, 'id'> & { id?: string };
  onChange: (d: Omit<CulturalMoment, 'id'> & { id?: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  role: AdminRole;
  storeId: string | null;
  stores: StoreSummary[];
}) {
  const [daysAwayError, setDaysAwayError] = useState(false);

  const handleDaysAwayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDaysAwayError(false);
    const raw = e.target.value;
    // Allow empty string during typing — store null so validation can catch it
    const parsed = raw === '' ? (null as unknown as number) : parseInt(raw, 10);
    onChange({ ...data, days_away: isNaN(parsed as number) ? (null as unknown as number) : parsed });
  };

  const handleSaveWithValidation = () => {
    if (data.days_away === null || data.days_away === undefined || isNaN(data.days_away as number)) {
      setDaysAwayError(true);
      return;
    }
    setDaysAwayError(false);
    onSave();
  };

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
          <Label>
            Days Away
            {daysAwayError && (
              <span className="ml-2 text-xs font-normal text-red-500 inline-flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" />
                Days Away is required
              </span>
            )}
          </Label>
          <Input
            type="number"
            value={data.days_away ?? ''}
            onChange={handleDaysAwayChange}
            className={cn(daysAwayError && 'border-red-400 focus:border-red-500 focus:ring-red-200')}
            placeholder="e.g. 14"
            min={0}
          />
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
        <TargetingFields
          data={{ scope_type: data.scope_type, store_id: data.store_id, store_region: data.store_region }}
          onChange={(targeting) => onChange({ ...data, ...targeting })}
          role={role}
          storeId={storeId}
          stores={stores}
        />
      </div>
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSaveWithValidation} disabled={saving}>
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
  role,
  storeId,
  stores,
}: {
  data: Omit<WhatsNewItem, 'id'> & { id?: string };
  onChange: (d: Omit<WhatsNewItem, 'id'> & { id?: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  role: AdminRole;
  storeId: string | null;
  stores: StoreSummary[];
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
        <TargetingFields
          data={{ scope_type: data.scope_type, store_id: data.store_id, store_region: data.store_region }}
          onChange={(targeting) => onChange({ ...data, ...targeting })}
          role={role}
          storeId={storeId}
          stores={stores}
        />
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
  warning,
}: {
  label: string;
  sublabel?: string;
  active: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  toggling: boolean;
  warning?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  const handleToggleClick = () => {
    if (active) {
      setConfirming(true);
    } else {
      onToggleActive();
    }
  };

  const confirmHide = () => {
    setConfirming(false);
    onToggleActive();
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-4 px-4 py-3 bg-amber-50 rounded-lg border border-amber-300">
        <span className="flex-1 text-sm font-medium text-amber-900">
          Hide this card from associates?
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={confirmHide}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Confirm
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-4 px-4 py-3 bg-white rounded-lg border transition-colors group',
      warning ? 'border-amber-300 bg-amber-50/60 hover:border-amber-400' : 'border-gray-100 hover:border-gray-200'
    )}>
      {/* Toggle — left side */}
      <div className="shrink-0">
        {toggling ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        ) : (
          <ActiveToggle active={active} onChange={handleToggleClick} />
        )}
      </div>

      {/* Label — centre */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={cn('text-sm font-medium truncate', !active && 'text-gray-400')}>
            {label}
          </p>
          {warning && (
            <span
              title={warning}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 shrink-0"
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              Fix required
            </span>
          )}
        </div>
        {sublabel && (
          <p className="text-xs text-gray-500 truncate">{sublabel}</p>
        )}
        {warning && (
          <p className="text-xs text-amber-600 mt-0.5">{warning}</p>
        )}
      </div>

      {/* Edit / Delete — right side */}
      <div className="flex items-center gap-4 shrink-0">
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
  const { user, role, storeId } = useAdminAuth();
  const [focusCards, setFocusCards] = useState<FocusCard[]>([]);
  const [culturalMoments, setCulturalMoments] = useState<CulturalMoment[]>([]);
  const [whatsNew, setWhatsNew] = useState<WhatsNewItem[]>([]);
  const [stores, setStores] = useState<StoreSummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ table: TableName; id: string; label: string } | null>(null);

  const [expanded, setExpanded] = useState<Record<TableName, boolean>>({
    focus_cards: true,
    cultural_moments: true,
    whats_new: true,
  });

  const [editingForm, setEditingForm] = useState<{
    table: TableName;
    data: Record<string, any>;
  } | null>(null);

  const adminHeaders = useMemo<Record<string, string>>(
    () => ({} as Record<string, string>),
    []
  );

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/today', { headers: adminHeaders });
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
  }, [adminHeaders]);

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stores?status=OPEN', { headers: adminHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setStores(data ?? []);
    } catch {
      // Non-blocking for Today content management
    }
  }, [adminHeaders]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

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
      await apiRequest(method, adminHeaders, { table, ...data });
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
      await apiRequest('DELETE', adminHeaders, { table, id });
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
      await apiRequest('PUT', adminHeaders, { table, id, is_active: !currentActive });
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
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-coach-gold" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <RoleGate minRole="store_manager">
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
                      role={role}
                      storeId={storeId}
                      stores={stores}
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
                        role={role}
                        storeId={storeId}
                        stores={stores}
                      />
                    ) : (
                      <ItemRow
                        key={card.id}
                        label={card.title}
                        sublabel={`${card.badge} · ${card.cta_text}`}
                        active={card.is_active}
                        onToggleActive={() => handleToggleActive('focus_cards', card.id, card.is_active)}
                        onEdit={() => openEditForm('focus_cards', card)}
                        onDelete={() => setConfirmDelete({ table: 'focus_cards', id: card.id, label: card.title })}
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
                      role={role}
                      storeId={storeId}
                      stores={stores}
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
                        role={role}
                        storeId={storeId}
                        stores={stores}
                      />
                    ) : (
                      <ItemRow
                        key={moment.id}
                        label={moment.name}
                        sublabel={`${moment.icon} · ${moment.days_away ?? '—'} days away`}
                        active={moment.is_active}
                        onToggleActive={() => handleToggleActive('cultural_moments', moment.id, moment.is_active)}
                        onEdit={() => openEditForm('cultural_moments', moment)}
                        onDelete={() => setConfirmDelete({ table: 'cultural_moments', id: moment.id, label: moment.name })}
                        deleting={deletingId === moment.id}
                        toggling={togglingId === moment.id}
                        warning={
                          moment.days_away === null || moment.days_away === undefined
                            ? 'Days Away is missing — edit this card to set a value'
                            : undefined
                        }
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
                      role={role}
                      storeId={storeId}
                      stores={stores}
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
                        role={role}
                        storeId={storeId}
                        stores={stores}
                      />
                    ) : (
                      <ItemRow
                        key={item.id}
                        label={item.title}
                        sublabel={`${item.tag} · ${item.icon}`}
                        active={item.is_active}
                        onToggleActive={() => handleToggleActive('whats_new', item.id, item.is_active)}
                        onEdit={() => openEditForm('whats_new', item)}
                        onDelete={() => setConfirmDelete({ table: 'whats_new', id: item.id, label: item.title })}
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

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Delete this item?"
        description={`"${confirmDelete?.label}" will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDelete) handleDelete(confirmDelete.table, confirmDelete.id);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </RoleGate>
  );
}
