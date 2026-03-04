'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail, Plus, Copy, Trash2, Loader2, Check, Clock, UserPlus, Shield, X,
  Upload, FileText, Building2, Eye, AlertCircle, CheckCircle2,
  Users, ChevronDown, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/components/admin/RoleGate';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

// ─── Types ───

interface StoreOption {
  id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
  region?: string | null;
}

interface Invitation {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  store_id: string | null;
  region: string | null;
  invited_by: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  stores: {
    store_number: string;
    store_name: string;
    city: string;
    state: string;
  } | null;
}

interface CsvRow {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  store_number: string;
  // resolved
  store_id: string | null;
  // validation
  valid: boolean;
  errors: string[];
}

interface BulkResult {
  email: string;
  status: 'success' | 'failed';
  error: string;
}

type TabFilter = 'all' | 'pending' | 'accepted' | 'expired' | 'revoked';
type BulkTab = 'csv' | 'store';

// ─── Constants ───

const ROLE_OPTIONS = [
  { value: 'associate', label: 'Associate' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'regional_manager', label: 'Regional Manager' },
  { value: 'admin', label: 'Admin' },
];
const MAIN_APP_URL = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://coach.futureproof.work';

const VALID_ROLES = new Set(['associate', 'store_manager', 'regional_manager', 'admin']);

// ─── Utilities ───

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function parseCsv(text: string, stores: StoreOption[]): { rows: CsvRow[]; parseErrors: string[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return { rows: [], parseErrors: ['CSV must have a header row and at least one data row'] };

  // Parse a single line respecting quoted fields
  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if ((ch === ',' || ch === ';') && !inQuotes) {
        fields.push(field.trim()); field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field.trim());
    return fields;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const col = (name: string) => headers.indexOf(name);

  const emailIdx = col('email');
  if (emailIdx === -1) return { rows: [], parseErrors: ['CSV must have an "email" column'] };

  const firstIdx = col('first_name');
  const lastIdx = col('last_name');
  const roleIdx = col('role');
  const storeNumIdx = col('store_number');

  const storeMap = new Map<string, string>();
  for (const s of stores) storeMap.set(s.store_number.trim().toLowerCase(), s.id);

  const rows: CsvRow[] = [];
  const parseErrors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    if (cells.every(c => !c)) continue; // skip blank rows

    const email = (cells[emailIdx] ?? '').trim().toLowerCase();
    const first_name = firstIdx >= 0 ? (cells[firstIdx] ?? '').trim() : '';
    const last_name = lastIdx >= 0 ? (cells[lastIdx] ?? '').trim() : '';
    const rawRole = roleIdx >= 0 ? (cells[roleIdx] ?? '').trim().toLowerCase().replace(/\s+/g, '_') : 'associate';
    const role = VALID_ROLES.has(rawRole) ? rawRole : 'associate';
    const store_number = storeNumIdx >= 0 ? (cells[storeNumIdx] ?? '').trim() : '';

    const errors: string[] = [];
    if (!email) errors.push('Email is required');
    else if (!isValidEmail(email)) errors.push('Invalid email format');

    let store_id: string | null = null;
    if (store_number) {
      store_id = storeMap.get(store_number.toLowerCase()) ?? null;
      if (!store_id) errors.push(`Store #${store_number} not found in directory`);
    } else if (role === 'associate' || role === 'store_manager') {
      errors.push('store_number required for associate/store_manager');
    }

    rows.push({ email, first_name, last_name, role, store_number, store_id, valid: errors.length === 0, errors });
  }

  if (rows.length === 0) parseErrors.push('No data rows found in CSV');

  return { rows, parseErrors };
}

// ─── Email Preview Modal ───

function EmailPreviewModal({
  recipientEmail,
  firstName,
  storeName,
  role,
  onClose,
}: {
  recipientEmail: string;
  firstName: string;
  storeName: string;
  role: string;
  onClose: () => void;
}) {
  const previewInviteUrl = `${MAIN_APP_URL}?invite=example-token-preview`;
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  const roleLabel = ROLE_OPTIONS.find(r => r.value === role)?.label ?? role;
  const storeText = storeName ? ` at ${storeName}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Eye className="w-4.5 h-4.5 text-coach-gold" />
            <h2 className="text-base font-semibold text-gray-900">Invitation Email Preview</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Email mockup */}
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          <div className="text-xs text-gray-400 space-y-1 mb-4 pb-4 border-b border-gray-100">
            <div><span className="font-medium text-gray-600">To:</span> {recipientEmail || 'recipient@example.com'}</div>
            <div><span className="font-medium text-gray-600">Subject:</span> You've been invited to join Coach Pulse</div>
          </div>

          {/* Email body */}
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-coach-mahogany px-6 py-5 text-center">
              <div className="inline-flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-coach-gold flex items-center justify-center">
                  <span className="text-white text-xs font-bold">C</span>
                </div>
                <span className="text-white font-semibold text-base tracking-wide">Coach Pulse</span>
              </div>
              <p className="text-white/70 text-xs mt-1">Your retail training platform</p>
            </div>

            {/* Body */}
            <div className="bg-white px-6 py-6 space-y-4">
              <p className="text-sm text-gray-800">{greeting}</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                You've been invited to join <strong>Coach Pulse</strong> as a <strong>{roleLabel}</strong>{storeText}.
                Coach Pulse is your team's hub for product knowledge, training, and daily inspiration.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                Click the button below to create your account and get started. This invitation expires in <strong>7 days</strong>.
              </p>

              <div className="text-center py-2">
                <a
                  href={previewInviteUrl}
                  className="inline-block bg-coach-gold hover:bg-coach-gold/90 text-white font-semibold text-sm px-8 py-3 rounded-lg transition-colors"
                  onClick={e => e.preventDefault()}
                >
                  Accept Invitation
                </a>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Or copy this link into your browser:</p>
                <code className="text-xs text-coach-gold break-all">{previewInviteUrl}</code>
              </div>

              <p className="text-xs text-gray-400 text-center">
                If you weren't expecting this invitation, you can ignore this email.
              </p>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                Sent via Coach Pulse Admin · {MAIN_APP_URL}
              </p>
            </div>
          </div>

          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            The actual email styling is determined by your Supabase email template. This preview shows the expected content and structure.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Invite Modal ───

function BulkInviteModal({
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

// ─── Main Page ───

export default function InvitationsPage() {
  const { user, role, storeId, isAdmin } = useAdminAuth();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [inviteRole, setInviteRole] = useState('associate');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');

  const [successResult, setSuccessResult] = useState<{ invite_url: string; email_sent: boolean } | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/invitations');
      if (!res.ok) throw new Error('Failed to fetch invitations');
      setInvitations(await res.json());
    } catch {
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stores?status=OPEN');
      if (!res.ok) throw new Error('Failed to fetch stores');
      setStores(await res.json());
    } catch {
      toast.error('Failed to load stores');
    }
  }, []);

  useEffect(() => { fetchInvitations(); fetchStores(); }, [fetchInvitations, fetchStores]);

  useEffect(() => {
    if (!isAdmin && storeId) setSelectedStoreId(storeId);
  }, [isAdmin, storeId]);

  useEffect(() => {
    if (inviteRole === 'admin') { setSelectedStoreId(''); setSelectedRegion(''); return; }
    if (inviteRole === 'regional_manager') { setSelectedStoreId(''); return; }
    setSelectedRegion('');
  }, [inviteRole]);

  const stats = useMemo(() => ({
    total: invitations.length,
    pending: invitations.filter(i => i.status === 'pending').length,
    accepted: invitations.filter(i => i.status === 'accepted').length,
  }), [invitations]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return invitations;
    return invitations.filter(i => i.status === activeTab);
  }, [invitations, activeTab]);

  const regionOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const s of stores) if (s.region) unique.add(s.region);
    return Array.from(unique).sort();
  }, [stores]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiresStore = inviteRole === 'associate' || inviteRole === 'store_manager';
    const requiresRegion = inviteRole === 'regional_manager';
    if (!email) { toast.error('Please fill in email'); return; }
    if (requiresStore && !selectedStoreId) { toast.error('Please select a store'); return; }
    if (requiresRegion && !selectedRegion) { toast.error('Please select a region'); return; }

    setSending(true);
    setSuccessResult(null);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, first_name: firstName || undefined, last_name: lastName || undefined,
          role: inviteRole,
          store_id: requiresStore ? selectedStoreId : undefined,
          region: requiresRegion ? selectedRegion : undefined,
          invited_by: user?.id ?? user?.email ?? 'admin',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as Record<string, string>).error ?? 'Failed to send invitation');
      }
      const data = await res.json();
      setSuccessResult({ invite_url: data.invite_url, email_sent: data.email_sent });
      setEmail(''); setFirstName(''); setLastName(''); setSelectedStoreId(''); setSelectedRegion('');
      fetchInvitations();
      toast.success('Invitation sent');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete invitation');
      setInvitations(prev => prev.filter(i => i.id !== id));
      toast.success('Invitation deleted');
    } catch {
      toast.error('Failed to delete invitation');
    } finally {
      setDeletingId(null);
    }
  };

  const copyInviteLink = async (invitation: Invitation) => {
    const url = `${MAIN_APP_URL}?invite=${invitation.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(invitation.id);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'expired', label: 'Expired' },
    { key: 'revoked', label: 'Revoked' },
  ];

  // Derive preview data from current form state
  const previewStore = stores.find(s => s.id === selectedStoreId);
  const previewStoreName = previewStore
    ? `${previewStore.store_name} (${previewStore.city}, ${previewStore.state})`
    : selectedRegion ? `Region: ${selectedRegion}` : '';

  return (
    <RoleGate minRole="manager">
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          {/* Page header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Mail className="h-6 w-6 text-coach-mahogany" />
                <h1 className="text-2xl font-bold text-coach-black tracking-tight">Invitations</h1>
              </div>
              <p className="text-sm text-gray-500">Invite team members to Coach Pulse</p>
            </div>
            <Button
              onClick={() => setBulkModalOpen(true)}
              variant="outline"
              className="flex-shrink-0"
            >
              <Users className="w-4 h-4 mr-1.5" />
              Bulk Invite
            </Button>
          </div>

          {/* Single invite form */}
          <Card className="p-6 mb-6">
            <form onSubmit={handleSend}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-coach-gold" />
                  <h2 className="text-base font-semibold text-coach-black">Send Invitation</h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEmailPreviewOpen(true)}
                  className="text-gray-500 hover:text-gray-700 text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Preview Email
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label size="xs" weight="semibold">Email *</Label>
                  <Input type="email" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label size="xs" weight="semibold">First Name</Label>
                  <Input type="text" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label size="xs" weight="semibold">Last Name</Label>
                  <Input type="text" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label size="xs" weight="semibold">Role</Label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
                  >
                    {ROLE_OPTIONS.filter(r => isAdmin || r.value === 'associate').map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inviteRole === 'regional_manager' && (
                  <div className="space-y-1.5">
                    <Label size="xs" weight="semibold">Region *</Label>
                    <select
                      value={selectedRegion}
                      onChange={e => setSelectedRegion(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold"
                    >
                      <option value="">Select a region</option>
                      {regionOptions.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                )}
                {(inviteRole === 'associate' || inviteRole === 'store_manager') && (
                  <div className="space-y-1.5">
                    <Label size="xs" weight="semibold">Store *</Label>
                    <select
                      value={selectedStoreId}
                      onChange={e => setSelectedStoreId(e.target.value)}
                      disabled={!isAdmin && !!storeId}
                      className={cn(
                        'w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold',
                        !isAdmin && storeId && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <option value="">Select an open store</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.store_number} — {s.store_name} ({s.city}, {s.state})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Button type="submit" disabled={sending} className="bg-coach-gold hover:bg-coach-gold/90 text-white">
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Send Invitation
                </Button>
              </div>
            </form>

            {successResult && (
              <div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-emerald-800">
                        Invitation created{successResult.email_sent ? ' and email sent' : ''}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <code className="text-xs bg-white/80 border border-emerald-200 rounded px-2 py-1 text-emerald-700 truncate block max-w-md">
                          {successResult.invite_url}
                        </code>
                        <Button
                          size="sm" variant="outline"
                          onClick={async () => { await navigator.clipboard.writeText(successResult.invite_url); toast.success('Link copied'); }}
                          className="flex-shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                        </Button>
                      </div>
                      {!successResult.email_sent && (
                        <p className="text-xs text-amber-700 mt-1.5">Email delivery is not configured — share the link manually.</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSuccessResult(null)} className="text-emerald-400 hover:text-emerald-600 flex-shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-coach-gold/10 flex items-center justify-center"><Mail className="h-5 w-5 text-coach-gold" /></div>
              <div><p className="text-2xl font-semibold text-coach-black">{stats.total}</p><p className="text-xs text-gray-500">Total Invitations</p></div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center"><Clock className="h-5 w-5 text-amber-600" /></div>
              <div><p className="text-2xl font-semibold text-coach-black">{stats.pending}</p><p className="text-xs text-gray-500">Pending</p></div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center"><Check className="h-5 w-5 text-emerald-600" /></div>
              <div><p className="text-2xl font-semibold text-coach-black">{stats.accepted}</p><p className="text-xs text-gray-500">Accepted</p></div>
            </Card>
          </div>

          {/* Tabs */}
          <Card className="p-3 mb-4">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-colors',
                    activeTab === tab.key ? 'bg-coach-gold text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Invitation list */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-coach-gold" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="py-16 flex flex-col items-center justify-center text-center">
              <Mail className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No invitations found</p>
              <p className="text-xs text-gray-400 mt-1">{activeTab !== 'all' ? 'Try a different filter' : 'Send your first invitation above'}</p>
            </Card>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">Showing {filtered.length} invitation{filtered.length !== 1 && 's'}</p>
              <div className="space-y-2">
                {filtered.map(invitation => (
                  <Card key={invitation.id} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <p className="text-sm font-semibold text-coach-black truncate">
                            {invitation.first_name || invitation.last_name
                              ? `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim()
                              : invitation.email}
                          </p>
                          {(invitation.first_name || invitation.last_name) && (
                            <span className="text-xs text-gray-400 truncate">{invitation.email}</span>
                          )}
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                            invitation.role === 'admin' || invitation.role === 'regional_manager' ? 'bg-purple-50 text-purple-700'
                              : invitation.role === 'store_manager' ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          )}>
                            {(invitation.role === 'store_manager' || invitation.role === 'admin' || invitation.role === 'regional_manager') && (
                              <Shield className="h-3 w-3" />
                            )}
                            {invitation.role.replace('_', ' ')}
                          </span>
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            invitation.status === 'pending' && 'bg-amber-50 text-amber-700',
                            invitation.status === 'accepted' && 'bg-emerald-50 text-emerald-700',
                            (invitation.status === 'expired' || invitation.status === 'revoked') && 'bg-gray-100 text-gray-500'
                          )}>
                            {invitation.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          {invitation.stores && <span>{invitation.stores.store_number} — {invitation.stores.store_name}</span>}
                          {!invitation.stores && invitation.region && <span>Region: {invitation.region}</span>}
                          <span>Sent {formatDate(invitation.created_at)}</span>
                          {invitation.status === 'pending' && <span>Expires {formatDate(invitation.expires_at)}</span>}
                          {invitation.status === 'accepted' && invitation.accepted_at && <span>Accepted {formatDate(invitation.accepted_at)}</span>}
                        </div>
                      </div>

                      {invitation.status === 'pending' && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" onClick={() => copyInviteLink(invitation)}>
                            {copiedId === invitation.id ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                            {copiedId === invitation.id ? 'Copied' : 'Copy Link'}
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            onClick={() => handleDeleteInvite(invitation.id)}
                            disabled={deletingId === invitation.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                          >
                            {deletingId === invitation.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {bulkModalOpen && (
        <BulkInviteModal
          stores={stores}
          invitedBy={user?.id ?? user?.email ?? 'admin'}
          onClose={() => setBulkModalOpen(false)}
          onComplete={fetchInvitations}
        />
      )}

      {emailPreviewOpen && (
        <EmailPreviewModal
          recipientEmail={email}
          firstName={firstName}
          storeName={previewStoreName}
          role={inviteRole}
          onClose={() => setEmailPreviewOpen(false)}
        />
      )}
    </RoleGate>
  );
}
