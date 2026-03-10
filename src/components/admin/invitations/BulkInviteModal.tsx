'use client';

import { useState, useMemo, useRef } from 'react';
import {
  StoreOption, CsvRow, BulkResult, BulkTab,
  ROLE_OPTIONS, isValidEmail, parseCsv,
} from '@/lib/admin/invitation-types';
import {
  X, Loader2, Check, Upload, FileText, Building2,
  AlertCircle, CheckCircle2, Users, ChevronDown, Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export function BulkInviteModal({
  stores,
  invitedBy,
  onClose,
  onComplete,
}: {
  stores: StoreOption[];
  invitedBy: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [tab, setTab] = useState<BulkTab>('csv');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV state
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  // Store invite state
  const [storeInviteId, setStoreInviteId] = useState('');
  const [storeInviteRole, setStoreInviteRole] = useState('associate');
  const [storeEmailsRaw, setStoreEmailsRaw] = useState('');

  // Progress state
  const [progress, setProgress] = useState<{ sending: boolean; current: number; total: number } | null>(null);
  const [results, setResults] = useState<BulkResult[] | null>(null);

  // ─── Derived ───
  const validCsvRows = csvRows.filter(r => r.valid);
  const invalidCsvRows = csvRows.filter(r => !r.valid);

  const storeEmails = useMemo(() => {
    return storeEmailsRaw
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);
  }, [storeEmailsRaw]);

  const storeEmailsValid = storeEmails.filter(e => isValidEmail(e));
  const storeEmailsInvalid = storeEmails.filter(e => !isValidEmail(e));
  const selectedStore = stores.find(s => s.id === storeInviteId);

  // ─── CSV handlers ───
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, parseErrors: errs } = parseCsv(text, stores);
      setCsvRows(rows);
      setParseErrors(errs);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const header = 'email,first_name,last_name,role,store_number';
    const example = 'jane.doe@example.com,Jane,Doe,associate,1234';
    const blob = new Blob([`${header}\n${example}\n`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-invite-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Bulk send ───
  const runBulkSend = async (rows: { email: string; first_name: string; last_name: string; role: string; store_id: string | null }[]) => {
    setProgress({ sending: true, current: 0, total: rows.length });
    setResults(null);
    const allResults: BulkResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      setProgress({ sending: true, current: i + 1, total: rows.length });
      const row = rows[i];
      try {
        const res = await fetch('/api/admin/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: row.email,
            first_name: row.first_name || undefined,
            last_name: row.last_name || undefined,
            role: row.role,
            store_id: row.store_id || undefined,
            invited_by: invitedBy,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          allResults.push({ email: row.email, status: 'failed', error: (err as any).error ?? `HTTP ${res.status}` });
        } else {
          allResults.push({ email: row.email, status: 'success', error: '' });
        }
      } catch (e) {
        allResults.push({ email: row.email, status: 'failed', error: e instanceof Error ? e.message : 'Network error' });
      }
    }

    setProgress({ sending: false, current: rows.length, total: rows.length });
    setResults(allResults);
    onComplete();
  };

  const handleCsvSend = () => {
    if (!validCsvRows.length) return;
    runBulkSend(validCsvRows.map(r => ({
      email: r.email,
      first_name: r.first_name,
      last_name: r.last_name,
      role: r.role,
      store_id: r.store_id,
    })));
  };

  const handleStoreSend = () => {
    if (!storeInviteId || !storeEmailsValid.length) return;
    runBulkSend(storeEmailsValid.map(email => ({
      email,
      first_name: '',
      last_name: '',
      role: storeInviteRole,
      store_id: storeInviteRole === 'associate' || storeInviteRole === 'store_manager' ? storeInviteId : null,
    })));
  };

  const successCount = results?.filter(r => r.status === 'success').length ?? 0;
  const failedResults = results?.filter(r => r.status === 'failed') ?? [];

  const isDone = progress && !progress.sending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={isDone ? undefined : onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-coach-gold" />
            <h2 className="text-base font-semibold text-gray-900">Bulk Invite</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Progress overlay */}
        {progress && (
          <div className="flex flex-col items-center justify-center px-8 py-10 gap-5">
            {progress.sending ? (
              <>
                <Loader2 className="w-10 h-10 animate-spin text-coach-gold" />
                <div className="text-center">
                  <p className="text-base font-semibold text-gray-900">
                    Sending {progress.current} of {progress.total} invitation{progress.total !== 1 ? 's' : ''}…
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Please keep this window open</p>
                </div>
                {/* Progress bar */}
                <div className="w-full max-w-sm h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-coach-gold rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  {Math.round((progress.current / progress.total) * 100)}% complete
                </p>
              </>
            ) : results && (
              <>
                {/* Results summary */}
                <div className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center',
                  failedResults.length === 0 ? 'bg-emerald-50' : 'bg-amber-50'
                )}>
                  {failedResults.length === 0
                    ? <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    : <AlertCircle className="w-8 h-8 text-amber-600" />}
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">
                    {successCount > 0 && `${successCount} sent successfully`}
                    {successCount > 0 && failedResults.length > 0 && ', '}
                    {failedResults.length > 0 && (
                      <span className="text-red-600">{failedResults.length} failed</span>
                    )}
                  </p>
                  {failedResults.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">All invitations were delivered</p>
                  )}
                </div>

                {failedResults.length > 0 && (
                  <div className="w-full max-w-md space-y-1.5 max-h-52 overflow-y-auto">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Failed invitations</p>
                    {failedResults.map(r => (
                      <div key={r.email} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-red-700 truncate">{r.email}</p>
                          <p className="text-xs text-red-500">{r.error}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={onClose}
                  className="bg-coach-gold hover:bg-coach-gold/90 text-white px-8"
                >
                  Done
                </Button>
              </>
            )}
          </div>
        )}

        {/* Tab content (hidden while in progress) */}
        {!progress && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {([
                { key: 'csv' as BulkTab, label: 'CSV Upload', icon: FileText },
                { key: 'store' as BulkTab, label: 'Invite by Store', icon: Building2 },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
                    tab === key
                      ? 'border-coach-gold text-coach-gold'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">

              {/* ── CSV Tab ── */}
              {tab === 'csv' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Upload a CSV with columns: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">email, first_name, last_name, role, store_number</code>
                    </p>
                    <Button variant="outline" size="sm" onClick={downloadTemplate} className="flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      Template
                    </Button>
                  </div>

                  {/* File drop zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                      fileName ? 'border-coach-gold/50 bg-amber-50/40' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
                    {fileName ? (
                      <>
                        <CheckCircle2 className="w-8 h-8 text-coach-gold mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-900">{fileName}</p>
                        <p className="text-xs text-gray-500 mt-1">{csvRows.length} row{csvRows.length !== 1 ? 's' : ''} parsed · click to replace</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600">Click to upload CSV</p>
                        <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
                      </>
                    )}
                  </div>

                  {/* Parse errors */}
                  {parseErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                      {parseErrors.map((e, i) => (
                        <p key={i} className="text-xs text-red-700 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          {e}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Preview table */}
                  {csvRows.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Preview — {validCsvRows.length} valid, {invalidCsvRows.length} invalid
                        </p>
                      </div>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto max-h-64">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Email</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Name</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Role</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Store #</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {csvRows.map((row, i) => (
                                <tr key={i} className={cn(row.valid ? 'bg-white' : 'bg-red-50')}>
                                  <td className="px-3 py-2 text-gray-800 font-mono">{row.email || '—'}</td>
                                  <td className="px-3 py-2 text-gray-600">
                                    {[row.first_name, row.last_name].filter(Boolean).join(' ') || '—'}
                                  </td>
                                  <td className="px-3 py-2 text-gray-600">{row.role}</td>
                                  <td className="px-3 py-2 text-gray-600">{row.store_number || '—'}</td>
                                  <td className="px-3 py-2">
                                    {row.valid ? (
                                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                        <Check className="w-3 h-3" /> Valid
                                      </span>
                                    ) : (
                                      <span className="text-red-600" title={row.errors.join('; ')}>
                                        ⚠ {row.errors[0]}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {invalidCsvRows.length > 0 && (
                        <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {invalidCsvRows.length} invalid row{invalidCsvRows.length !== 1 ? 's' : ''} will be skipped
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Store Tab ── */}
              {tab === 'store' && (
                <div className="space-y-5">
                  <p className="text-sm text-gray-600">
                    Select a store and enter email addresses to invite multiple people to the same location at once.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label size="xs" weight="semibold">Store *</Label>
                      <div className="relative">
                        <select
                          value={storeInviteId}
                          onChange={e => setStoreInviteId(e.target.value)}
                          className="w-full h-10 rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold appearance-none"
                        >
                          <option value="">Select a store…</option>
                          {stores.map(s => (
                            <option key={s.id} value={s.id}>
                              #{s.store_number} — {s.store_name} ({s.city}, {s.state})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label size="xs" weight="semibold">Role</Label>
                      <div className="relative">
                        <select
                          value={storeInviteRole}
                          onChange={e => setStoreInviteRole(e.target.value)}
                          className="w-full h-10 rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold appearance-none"
                        >
                          {ROLE_OPTIONS.slice(0, 2).map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {selectedStore && (
                    <div className="bg-coach-gold/5 border border-coach-gold/20 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-coach-gold flex-shrink-0" />
                      <span className="text-sm text-gray-700 font-medium">
                        #{selectedStore.store_number} — {selectedStore.store_name}, {selectedStore.city} {selectedStore.state}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label size="xs" weight="semibold">
                      Email Addresses *
                      <span className="font-normal text-gray-400 ml-1">(one per line, or comma-separated)</span>
                    </Label>
                    <textarea
                      value={storeEmailsRaw}
                      onChange={e => setStoreEmailsRaw(e.target.value)}
                      placeholder={`jane.doe@example.com\njohn.smith@example.com\nteam@store.com`}
                      rows={6}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold resize-none"
                    />
                    {storeEmails.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {storeEmailsValid.length} valid email{storeEmailsValid.length !== 1 ? 's' : ''}
                        {storeEmailsInvalid.length > 0 && (
                          <span className="text-amber-600"> · {storeEmailsInvalid.length} invalid (will be skipped)</span>
                        )}
                      </p>
                    )}
                    {storeEmailsInvalid.length > 0 && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-0.5">
                        <p className="font-medium">Skipping invalid addresses:</p>
                        {storeEmailsInvalid.map(e => <p key={e} className="font-mono">{e}</p>)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-between bg-gray-50/50">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              {tab === 'csv' ? (
                <Button
                  onClick={handleCsvSend}
                  disabled={validCsvRows.length === 0}
                  className="bg-coach-gold hover:bg-coach-gold/90 text-white"
                >
                  <Mail className="w-4 h-4 mr-1.5" />
                  Send {validCsvRows.length} Invitation{validCsvRows.length !== 1 ? 's' : ''}
                </Button>
              ) : (
                <Button
                  onClick={handleStoreSend}
                  disabled={!storeInviteId || storeEmailsValid.length === 0}
                  className="bg-coach-gold hover:bg-coach-gold/90 text-white"
                >
                  <Mail className="w-4 h-4 mr-1.5" />
                  Send {storeEmailsValid.length || 0} Invitation{storeEmailsValid.length !== 1 ? 's' : ''}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
