'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  ChevronDown,
  ChevronRight,
  Loader2,
  Save,
  Users,
  Building2,
  Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/components/admin/RoleGate';

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

type StatusFilter = '' | 'OPEN' | 'CLOSED';
type ChannelFilter = '' | 'RCCH' | 'RFCH';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function StoresPage() {
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('');
  const [regionFilter, setRegionFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ region_manager: '', district_manager: '', area_manager: '' });
  const [saving, setSaving] = useState(false);

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
      const data = await res.json();
      setStores(data);
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
    const filtered = regionFilter
      ? stores.filter(s => s.region === regionFilter)
      : stores;
    return [...new Set(filtered.map(s => s.district).filter(Boolean))].sort();
  }, [stores, regionFilter]);

  useEffect(() => {
    if (regionFilter && !districts.includes(districtFilter)) {
      setDistrictFilter('');
    }
  }, [regionFilter, districts, districtFilter]);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setEditingId(null);
    } else {
      setExpandedId(id);
      setEditingId(null);
    }
  };

  const startEditManagers = (store: StoreRecord) => {
    setEditingId(store.id);
    setEditForm({
      region_manager: store.region_manager || '',
      district_manager: store.district_manager || '',
      area_manager: store.area_manager || '',
    });
  };

  const handleSaveManagers = async (store: StoreRecord) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/stores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: store.id, ...editForm }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as Record<string, string>).error ?? 'Update failed');
      }
      const updated = await res.json();
      setStores(prev => prev.map(s => (s.id === store.id ? updated : s)));
      toast.success('Managers updated');
      setEditingId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update managers');
    } finally {
      setSaving(false);
    }
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
          <p className="text-sm text-gray-500">Coach retail store directory and management</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-coach-gold/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-coach-gold" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-coach-black">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Stores</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Store className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-coach-black">{stats.open}</p>
              <p className="text-xs text-gray-500">Open</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Store className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-coach-black">{stats.rcch}</p>
              <p className="text-xs text-gray-500">Retail (RCCH)</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Store className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-coach-black">{stats.rfch}</p>
              <p className="text-xs text-gray-500">Factory (RFCH)</p>
            </div>
          </Card>
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
                  className={cn(
                    'px-3 py-2 text-sm font-medium transition-colors',
                    statusFilter === val
                      ? 'bg-coach-gold text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
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
                  className={cn(
                    'px-3 py-2 text-sm font-medium transition-colors',
                    channelFilter === val
                      ? 'bg-coach-gold text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
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
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <select
              value={districtFilter}
              onChange={e => setDistrictFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
            >
              <option value="">All Districts</option>
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
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
              Showing {stores.length} store{stores.length !== 1 && 's'}
            </p>
            <div className="overflow-y-auto max-h-[calc(100vh-22rem)] space-y-2 pr-1">
              {stores.map(store => {
                const isExpanded = expandedId === store.id;
                const isEditingManagers = editingId === store.id;

                return (
                  <Card
                    key={store.id}
                    className={cn(
                      'transition-all',
                      isExpanded && 'ring-1 ring-coach-gold/30'
                    )}
                  >
                    <button
                      onClick={() => toggleExpand(store.id)}
                      className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50/50 transition-colors"
                    >
                      <span className="text-sm font-bold font-mono text-coach-mahogany w-14 flex-shrink-0">
                        {store.store_number}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-coach-black truncate">
                          {store.store_name}
                        </p>
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
                        store.channel === 'RCCH'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      )}>
                        {store.channel}
                      </span>

                      <span className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={cn(
                          'h-2 w-2 rounded-full',
                          store.status === 'OPEN' ? 'bg-emerald-500' : 'bg-red-400'
                        )} />
                        <span className={cn(
                          'text-xs font-medium',
                          store.status === 'OPEN' ? 'text-emerald-700' : 'text-red-600'
                        )}>
                          {store.status}
                        </span>
                      </span>

                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/50 p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              Address
                            </p>
                            <p className="text-sm text-gray-700">{store.street_address}</p>
                            {store.building_suite && (
                              <p className="text-sm text-gray-700">{store.building_suite}</p>
                            )}
                            <p className="text-sm text-gray-700">
                              {[store.city, store.state].filter(Boolean).join(', ')} {store.zip_code}
                            </p>
                            {store.country && (
                              <p className="text-sm text-gray-500">{store.country}</p>
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5" />
                              Contact
                            </p>
                            <div className="space-y-1 text-sm">
                              {store.phone && <p className="text-gray-700">Phone: {store.phone}</p>}
                              {store.fax && <p className="text-gray-700">Fax: {store.fax}</p>}
                              {store.voicemail && <p className="text-gray-700">Voicemail: {store.voicemail}</p>}
                              {!store.phone && !store.fax && !store.voicemail && (
                                <p className="text-gray-400">No contact info</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5" />
                              Management
                            </p>
                            {isEditingManagers ? (
                              <div className="space-y-2">
                                <div className="space-y-1">
                                  <Label size="xs" weight="semibold">Region Manager</Label>
                                  <Input
                                    value={editForm.region_manager}
                                    onChange={e => setEditForm(f => ({ ...f, region_manager: e.target.value }))}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label size="xs" weight="semibold">District Manager</Label>
                                  <Input
                                    value={editForm.district_manager}
                                    onChange={e => setEditForm(f => ({ ...f, district_manager: e.target.value }))}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label size="xs" weight="semibold">Area Manager</Label>
                                  <Input
                                    value={editForm.area_manager}
                                    onChange={e => setEditForm(f => ({ ...f, area_manager: e.target.value }))}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveManagers(store)}
                                    disabled={saving}
                                    className="bg-coach-gold hover:bg-coach-gold/90 text-white"
                                  >
                                    {saving ? (
                                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    ) : (
                                      <Save className="w-3.5 h-3.5 mr-1.5" />
                                    )}
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1 text-sm">
                                <p className="text-gray-700">
                                  <span className="text-gray-400">Region:</span>{' '}
                                  {store.region_manager || '—'}
                                </p>
                                <p className="text-gray-700">
                                  <span className="text-gray-400">District:</span>{' '}
                                  {store.district_manager || '—'}
                                </p>
                                <p className="text-gray-700">
                                  <span className="text-gray-400">Area:</span>{' '}
                                  {store.area_manager || '—'}
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditManagers(store)}
                                  className="mt-2"
                                >
                                  <Users className="w-3.5 h-3.5 mr-1.5" />
                                  Edit Managers
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 mt-6 pt-4 border-t border-gray-200/60">
                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              Dates
                            </p>
                            <div className="space-y-1 text-sm">
                              <p className="text-gray-700">
                                <span className="text-gray-400">Opened:</span>{' '}
                                {formatDate(store.opening_date)}
                              </p>
                              {store.closed_date && (
                                <p className="text-gray-700">
                                  <span className="text-gray-400">Closed:</span>{' '}
                                  {formatDate(store.closed_date)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Hash className="h-3.5 w-3.5" />
                              Operations
                            </p>
                            <div className="space-y-1 text-sm">
                              <p className="text-gray-700">
                                <span className="text-gray-400">Registers:</span>{' '}
                                {store.registers_quantity ?? '—'}
                              </p>
                              <p className="text-gray-700">
                                <span className="text-gray-400">Wraps:</span>{' '}
                                {store.number_of_wraps ?? '—'}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5" />
                              Identifiers
                            </p>
                            <div className="space-y-1 text-sm">
                              <p className="text-gray-700">
                                <span className="text-gray-400">People Hub:</span>{' '}
                                {store.people_hub_code || '—'}
                              </p>
                              <p className="text-gray-700">
                                <span className="text-gray-400">FMS Site ID:</span>{' '}
                                {store.fms_site_id || '—'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
    </RoleGate>
  );
}
