'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Store,
  Search,
  MapPin,
  Phone,
  Calendar,
  ChevronRight,
  Loader2,
  Save,
  Users,
  Building2,
  Hash,
  X,
  UserPlus,
  Trophy,
  Award,
  Shield,
  CheckCircle2,
  Clock,
  Activity,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/components/admin/RoleGate';

// ─── Types ───

interface StoreRecord {
  id: string;
  store_number: string;
  store_name: string;
  status: 'OPEN' | 'CLOSED';
  channel: 'RCCH' | 'RFCH';
  region: string;
  region_manager: string;
  district: string;
  district_manager: string;
  area: string;
  area_manager: string;
  street_address: string;
  building_suite: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string;
  fax: string;
  voicemail: string;
  opening_date: string;
  closed_date: string;
  registers_quantity: number;
  number_of_wraps: number;
  people_hub_code: string;
  fms_site_id: string;
}

interface Associate {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string;
  role: string;
  status: string;
  last_active_at: string | null;
  average_score: number | null;
  practice_sessions: number | null;
  avatar_url: string | null;
}

interface StoreMetrics {
  associateCount: number;
  activeCount: number;
  avgScore: number | null;
  totalSessions: number;
}

type StatusFilter = '' | 'OPEN' | 'CLOSED';
type ChannelFilter = '' | 'RCCH' | 'RFCH';

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  associate:        { label: 'Associate',      bg: 'bg-gray-100',   text: 'text-gray-700' },
  store_manager:    { label: 'Store Mgr',      bg: 'bg-blue-50',    text: 'text-blue-700' },
  regional_manager: { label: 'Regional Mgr',   bg: 'bg-indigo-50',  text: 'text-indigo-700' },
  admin:            { label: 'Admin',           bg: 'bg-purple-50',  text: 'text-purple-700' },
  super_admin:      { label: 'Super Admin',     bg: 'bg-rose-50',    text: 'text-rose-700' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(first: string | null, last: string | null, display: string | null): string {
  if (first || last) return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?';
  return (display?.[0] ?? '?').toUpperCase();
}

// ─── Store Detail Drawer ───

function StoreDetailDrawer({
  store,
  onClose,
  onSaveManagers,
}: {
  store: StoreRecord;
  onClose: () => void;
  onSaveManagers: (id: string, data: { region_manager: string; district_manager: string; area_manager: string }) => Promise<void>;
}) {
  const router = useRouter();
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [editingManagers, setEditingManagers] = useState(false);
  const [editForm, setEditForm] = useState({
    region_manager: store.region_manager || '',
    district_manager: store.district_manager || '',
    area_manager: store.area_manager || '',
  });
  const [saving, setSaving] = useState(false);

  // Re-sync edit form if store prop changes
  useEffect(() => {
    setEditForm({
      region_manager: store.region_manager || '',
      district_manager: store.district_manager || '',
      area_manager: store.area_manager || '',
    });
  }, [store.region_manager, store.district_manager, store.area_manager]);

  useEffect(() => {
    let cancelled = false;
    setLoadingDetail(true);
    fetch(`/api/admin/stores/${store.id}/detail`)
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then(data => {
        if (cancelled) return;
        setAssociates(data.associates ?? []);
        setMetrics(data.metrics ?? null);
      })
      .catch(() => { if (!cancelled) toast.error('Failed to load store details'); })
      .finally(() => { if (!cancelled) setLoadingDetail(false); });
    return () => { cancelled = true; };
  }, [store.id]);

  const handleSave = async () => {
    setSaving(true);
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/d78877ce-fd08-4fd0-9385-ac3988fe3944',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f1ddd0'},body:JSON.stringify({sessionId:'f1ddd0',location:'stores/page.tsx:handleSave',message:'drawer handleSave called',data:{storeId:store.id,editForm},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      await onSaveManagers(store.id, editForm);
      setEditingManagers(false);
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/d78877ce-fd08-4fd0-9385-ac3988fe3944',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f1ddd0'},body:JSON.stringify({sessionId:'f1ddd0',location:'stores/page.tsx:handleSave',message:'drawer handleSave SUCCESS',data:{storeId:store.id},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/d78877ce-fd08-4fd0-9385-ac3988fe3944',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f1ddd0'},body:JSON.stringify({sessionId:'f1ddd0',location:'stores/page.tsx:handleSave',message:'drawer handleSave ERROR - was silently swallowed before fix',data:{error:err instanceof Error?err.message:String(err)},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      toast.error(err instanceof Error ? err.message : 'Failed to update managers');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = () => {
    router.push(`/admin/invitations?prefill_store_id=${store.id}`);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-coach-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Store className="w-5 h-5 text-coach-gold" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold font-mono text-coach-mahogany">
                  #{store.store_number}
                </span>
                <span className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
                  store.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', store.status === 'OPEN' ? 'bg-emerald-500' : 'bg-red-400')} />
                  {store.status}
                </span>
                <span className={cn(
                  'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                  store.channel === 'RCCH' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                )}>
                  {store.channel === 'RCCH' ? 'Retail' : 'Factory'}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900 mt-0.5 leading-tight">{store.store_name}</p>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {[store.city, store.state].filter(Boolean).join(', ')}
                {store.region && <> · {store.region}</>}
                {store.district && <> · {store.district}</>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Aggregate Metrics ── */}
          {metrics && (
            <div className="px-6 py-5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Store Metrics
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{metrics.associateCount}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Associates</p>
                  {metrics.activeCount > 0 && (
                    <p className="text-[10px] text-emerald-600 mt-0.5">{metrics.activeCount} active</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {metrics.avgScore !== null ? `${metrics.avgScore}%` : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Avg Practice Score</p>
                  {metrics.avgScore === null && (
                    <p className="text-[10px] text-gray-400 mt-0.5">no scores yet</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{metrics.totalSessions}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Practice Sessions</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Associates ── */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Assigned Associates
                {!loadingDetail && <span className="normal-case font-normal">({associates.length})</span>}
              </p>
              <Button
                size="sm"
                onClick={handleInvite}
                className="bg-coach-gold hover:bg-coach-gold/90 text-white h-7 text-xs"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Invite Associate
              </Button>
            </div>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-coach-gold" />
              </div>
            ) : associates.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">No associates assigned yet</p>
                <p className="text-xs text-gray-400 mb-4">Invite team members to get started</p>
                <Button
                  onClick={handleInvite}
                  className="bg-coach-gold hover:bg-coach-gold/90 text-white"
                >
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Invite Associate to This Store
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {associates.map(a => {
                  const roleConf = ROLE_CONFIG[a.role] ?? ROLE_CONFIG.associate;
                  const initials = getInitials(a.first_name, a.last_name, a.display_name);
                  const displayName = a.display_name || [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email;
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white',
                        a.status !== 'active' && 'opacity-60'
                      )}
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {a.avatar_url ? (
                          <img src={a.avatar_url} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-coach-mahogany/10 flex items-center justify-center">
                            <span className="text-xs font-semibold text-coach-mahogany">{initials}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                          <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium', roleConf.bg, roleConf.text)}>
                            {a.role === 'store_manager' || a.role === 'admin' ? <Shield className="w-2.5 h-2.5" /> : null}
                            {roleConf.label}
                          </span>
                          {a.status === 'pending' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600">
                              <Clock className="w-2.5 h-2.5" />
                              Pending
                            </span>
                          )}
                          {a.status === 'active' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-400 flex items-center gap-0.5 truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            {a.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                          {a.last_active_at && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              Active {formatDate(a.last_active_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 text-xs">
                        {a.average_score != null && a.average_score > 0 && (
                          <span className="flex items-center gap-1 text-amber-600 font-medium" title="Practice score">
                            <Trophy className="w-3 h-3" />
                            {a.average_score}%
                          </span>
                        )}
                        {a.practice_sessions != null && a.practice_sessions > 0 && (
                          <span className="flex items-center gap-1 text-coach-gold font-medium" title="Sessions">
                            <Award className="w-3 h-3" />
                            {a.practice_sessions}
                          </span>
                        )}
                        {(!a.average_score || a.average_score === 0) && (!a.practice_sessions || a.practice_sessions === 0) && (
                          <span className="text-gray-300 text-[10px]">No activity</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Store Info ── */}
          <div className="px-6 py-5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Store Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Address
                </p>
                <div className="text-sm text-gray-700 space-y-0.5">
                  {store.street_address && <p>{store.street_address}</p>}
                  {store.building_suite && <p>{store.building_suite}</p>}
                  <p>{[store.city, store.state].filter(Boolean).join(', ')} {store.zip_code}</p>
                  {store.country && <p className="text-gray-400">{store.country}</p>}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Contact
                </p>
                <div className="text-sm text-gray-700 space-y-0.5">
                  {store.phone && <p>Phone: {store.phone}</p>}
                  {store.fax && <p>Fax: {store.fax}</p>}
                  {store.voicemail && <p>VM: {store.voicemail}</p>}
                  {!store.phone && !store.fax && !store.voicemail && <p className="text-gray-400">No contact info</p>}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Dates
                </p>
                <div className="text-sm text-gray-700 space-y-0.5">
                  <p><span className="text-gray-400">Opened:</span> {formatDate(store.opening_date)}</p>
                  {store.closed_date && <p><span className="text-gray-400">Closed:</span> {formatDate(store.closed_date)}</p>}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Identifiers
                </p>
                <div className="text-sm text-gray-700 space-y-0.5">
                  {store.people_hub_code && <p><span className="text-gray-400">People Hub:</span> {store.people_hub_code}</p>}
                  {store.fms_site_id && <p><span className="text-gray-400">FMS:</span> {store.fms_site_id}</p>}
                  <p><span className="text-gray-400">Registers:</span> {store.registers_quantity ?? '—'}</p>
                  <p><span className="text-gray-400">Wraps:</span> {store.number_of_wraps ?? '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Management ── */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Management
              </p>
              {!editingManagers && (
                <Button size="sm" variant="outline" onClick={() => setEditingManagers(true)} className="h-7 text-xs">
                  Edit
                </Button>
              )}
            </div>

            {editingManagers ? (
              <div className="space-y-3">
                {[
                  { key: 'region_manager', label: 'Region Manager' },
                  { key: 'district_manager', label: 'District Manager' },
                  { key: 'area_manager', label: 'Area Manager' },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <Label size="xs" weight="semibold">{label}</Label>
                    <Input
                      value={editForm[key as keyof typeof editForm]}
                      onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-coach-gold hover:bg-coach-gold/90 text-white"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingManagers(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Region</span>
                  <span className="text-gray-700 font-medium">{store.region_manager || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">District</span>
                  <span className="text-gray-700 font-medium">{store.district_manager || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Area</span>
                  <span className="text-gray-700 font-medium">{store.area_manager || '—'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky invite footer */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 flex-shrink-0">
          <Button
            onClick={handleInvite}
            className="w-full bg-coach-gold hover:bg-coach-gold/90 text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Associate to This Store
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ───

export default function StoresPage() {
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('');
  const [regionFilter, setRegionFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreRecord | null>(null);

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (channelFilter) params.set('channel', channelFilter);
      if (regionFilter) params.set('region', regionFilter);
      if (districtFilter) params.set('district', districtFilter);
      if (search) params.set('search', search);

      const qs = params.toString();
      const res = await fetch(`/api/admin/stores${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch stores');
      setStores(await res.json());
    } catch {
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, channelFilter, regionFilter, districtFilter, search]);

  useEffect(() => {
    const timer = setTimeout(fetchStores, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchStores, search]);

  const stats = useMemo(() => ({
    total: stores.length,
    open: stores.filter(s => s.status === 'OPEN').length,
    rcch: stores.filter(s => s.channel === 'RCCH').length,
    rfch: stores.filter(s => s.channel === 'RFCH').length,
  }), [stores]);

  const regions = useMemo(() =>
    [...new Set(stores.map(s => s.region).filter(Boolean))].sort(),
    [stores]
  );

  const districts = useMemo(() => {
    const filtered = regionFilter ? stores.filter(s => s.region === regionFilter) : stores;
    return [...new Set(filtered.map(s => s.district).filter(Boolean))].sort();
  }, [stores, regionFilter]);

  useEffect(() => {
    if (regionFilter && !districts.includes(districtFilter)) setDistrictFilter('');
  }, [regionFilter, districts, districtFilter]);

  const handleSaveManagers = async (
    id: string,
    data: { region_manager: string; district_manager: string; area_manager: string }
  ) => {
    const res = await fetch('/api/admin/stores', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as Record<string, string>).error ?? 'Update failed');
    }
    const updated = await res.json();
    setStores(prev => prev.map(s => (s.id === id ? updated : s)));
    // Keep the drawer open with updated store data
    setSelectedStore(updated);
    toast.success('Managers updated');
  };

  return (
    <RoleGate minRole="manager">
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          <div className="mb-8">
            <div className="flex items-center gap-2.5 mb-1">
              <Store className="h-6 w-6 text-coach-mahogany" />
              <h1 className="text-2xl font-bold text-coach-black tracking-tight">Stores</h1>
            </div>
            <p className="text-sm text-gray-500">Coach retail store directory — click any row to view details</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Stores', value: stats.total, bg: 'bg-coach-gold/10', icon: Building2, iconColor: 'text-coach-gold' },
              { label: 'Open', value: stats.open, bg: 'bg-emerald-50', icon: Store, iconColor: 'text-emerald-600' },
              { label: 'Retail (RCCH)', value: stats.rcch, bg: 'bg-blue-50', icon: Store, iconColor: 'text-blue-600' },
              { label: 'Factory (RFCH)', value: stats.rfch, bg: 'bg-amber-50', icon: Store, iconColor: 'text-amber-600' },
            ].map(({ label, value, bg, icon: Icon, iconColor }) => (
              <Card key={label} className="p-4 flex items-center gap-3">
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', bg)}>
                  <Icon className={cn('h-5 w-5', iconColor)} />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-coach-black">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-3 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search store number, name, or city..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {([['', 'All'], ['OPEN', 'Open'], ['CLOSED', 'Closed']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setStatusFilter(val as StatusFilter)}
                    className={cn('px-3 py-2 text-sm font-medium transition-colors', statusFilter === val ? 'bg-coach-gold text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {([['', 'All'], ['RCCH', 'Retail'], ['RFCH', 'Factory']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setChannelFilter(val as ChannelFilter)}
                    className={cn('px-3 py-2 text-sm font-medium transition-colors', channelFilter === val ? 'bg-coach-gold text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <select
                value={regionFilter}
                onChange={e => setRegionFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
              >
                <option value="">All Regions</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>

              <select
                value={districtFilter}
                onChange={e => setDistrictFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
              >
                <option value="">All Districts</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-coach-gold" />
            </div>
          ) : stores.length === 0 ? (
            <Card className="py-16 flex flex-col items-center justify-center text-center">
              <Store className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No stores found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
            </Card>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">
                Showing {stores.length} store{stores.length !== 1 && 's'} · click any row to view details
              </p>
              <div className="overflow-y-auto max-h-[calc(100vh-22rem)] space-y-2 pr-1">
                {stores.map(store => (
                  <Card
                    key={store.id}
                    className={cn(
                      'transition-all cursor-pointer hover:shadow-md hover:border-coach-gold/30',
                      selectedStore?.id === store.id && 'ring-1 ring-coach-gold/40 border-coach-gold/30'
                    )}
                    onClick={() => setSelectedStore(store)}
                  >
                    <div className="p-4 flex items-center gap-4">
                      <span className="text-sm font-bold font-mono text-coach-mahogany w-14 flex-shrink-0">
                        {store.store_number}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-coach-black truncate">{store.store_name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {[store.city, store.state].filter(Boolean).join(', ')}
                          </span>
                          {store.region && (
                            <span className="text-xs text-gray-400">
                              {store.region}{store.district ? ` · ${store.district}` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
                        store.channel === 'RCCH' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                      )}>
                        {store.channel}
                      </span>

                      <span className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={cn('h-2 w-2 rounded-full', store.status === 'OPEN' ? 'bg-emerald-500' : 'bg-red-400')} />
                        <span className={cn('text-xs font-medium', store.status === 'OPEN' ? 'text-emerald-700' : 'text-red-600')}>
                          {store.status}
                        </span>
                      </span>

                      <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Store detail drawer */}
      {selectedStore && (
        <StoreDetailDrawer
          store={selectedStore}
          onClose={() => setSelectedStore(null)}
          onSaveManagers={handleSaveManagers}
        />
      )}
    </RoleGate>
  );
}
