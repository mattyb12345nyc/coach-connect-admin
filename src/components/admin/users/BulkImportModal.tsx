'use client';

import { useCallback, useState } from 'react';
import { AlertCircle, CheckCircle, Download, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type StoreOption = {
  id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
};

type CsvRow = {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  store_id: string;
};

type ImportResult = {
  email: string;
  success: boolean;
  error?: string;
};

type BulkImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: StoreOption[];
  onComplete: () => void;
};

const VALID_ROLES = new Set(['associate', 'store_manager', 'regional_manager', 'admin']);

const CSV_TEMPLATE = 'email,first_name,last_name,role,store_id\njane@example.com,Jane,Doe,associate,\njohn@example.com,John,Smith,store_manager,';

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  const emailIdx = header.indexOf('email');
  const fnIdx = header.indexOf('first_name');
  const lnIdx = header.indexOf('last_name');
  const roleIdx = header.indexOf('role');
  const storeIdx = header.indexOf('store_id');

  if (emailIdx === -1) return [];

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = line.split(',').map(c => c.trim());
    return {
      email: cols[emailIdx] || '',
      first_name: fnIdx >= 0 ? cols[fnIdx] || '' : '',
      last_name: lnIdx >= 0 ? cols[lnIdx] || '' : '',
      role: roleIdx >= 0 ? cols[roleIdx] || 'associate' : 'associate',
      store_id: storeIdx >= 0 ? cols[storeIdx] || '' : '',
    };
  });
}

function validateRow(row: CsvRow): string | null {
  if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) return 'Invalid email';
  if (!row.first_name) return 'Missing first name';
  if (!VALID_ROLES.has(row.role)) return `Invalid role "${row.role}"`;
  return null;
}

export function BulkImportModal({
  open,
  onOpenChange,
  stores,
  onComplete,
}: BulkImportModalProps) {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [progress, setProgress] = useState(0);

  const reset = useCallback(() => {
    setRows([]);
    setFileName(null);
    setResults(null);
    setProgress(0);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (importing) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast.error('No valid rows found. Ensure the CSV has an "email" column header.');
        return;
      }
      setRows(parsed);
      setFileName(file.name);
      setResults(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_invite_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);
    const importResults: ImportResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const validationError = validateRow(row);

      if (validationError) {
        importResults.push({ email: row.email || `Row ${i + 1}`, success: false, error: validationError });
        setProgress(i + 1);
        continue;
      }

      try {
        const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ');
        const res = await fetch('/api/admin/users/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: row.email,
            full_name: fullName,
            role: row.role,
            store_id: row.store_id || null,
            send_email: true,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        importResults.push({ email: row.email, success: true });
      } catch (err) {
        importResults.push({
          email: row.email,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      setProgress(i + 1);
    }

    setResults(importResults);
    setImporting(false);

    const succeeded = importResults.filter(r => r.success).length;
    const failed = importResults.filter(r => !r.success).length;

    if (failed === 0) {
      toast.success(`All ${succeeded} user(s) imported successfully`);
    } else {
      toast.warning(`${succeeded} imported, ${failed} failed`);
    }

    onComplete();
  };

  const storeMap = new Map(stores.map(s => [s.id, `${s.store_number} - ${s.store_name}`]));
  const validationErrors = rows.map(validateRow);
  const hasErrors = validationErrors.some(e => e !== null);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Users</DialogTitle>
          <DialogDescription>
            Upload a CSV file to create multiple users at once. Each user will receive a branded invite email.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {!results ? (
            <>
              <div className="flex items-center gap-3">
                <label className="flex-1">
                  <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 cursor-pointer hover:border-coach-gold/50 hover:bg-coach-gold/5 transition-colors">
                    <Upload className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {fileName ? fileName : 'Choose CSV file...'}
                    </span>
                  </div>
                  <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                </label>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Template
                </Button>
              </div>

              {rows.length > 0 && (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Preview ({rows.length} row{rows.length !== 1 ? 's' : ''})
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="text-left text-xs text-gray-500">
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Role</th>
                          <th className="px-3 py-2">Store</th>
                          <th className="px-3 py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rows.map((row, i) => {
                          const err = validationErrors[i];
                          return (
                            <tr key={i} className={cn(err && 'bg-red-50/50')}>
                              <td className="px-3 py-2 text-gray-700">{row.email || '—'}</td>
                              <td className="px-3 py-2 text-gray-700">{[row.first_name, row.last_name].filter(Boolean).join(' ') || '—'}</td>
                              <td className="px-3 py-2">
                                <span className={cn(
                                  'inline-block rounded px-1.5 py-0.5 text-xs font-medium',
                                  VALID_ROLES.has(row.role) ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-600'
                                )}>
                                  {row.role || '—'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-500 text-xs">
                                {row.store_id ? (storeMap.get(row.store_id) ?? row.store_id) : '—'}
                              </td>
                              <td className="px-3 py-2">
                                {err ? (
                                  <span title={err} className="text-red-500"><AlertCircle className="h-4 w-4" /></span>
                                ) : (
                                  <span className="text-emerald-500"><CheckCircle className="h-4 w-4" /></span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {hasErrors && (
                    <div className="bg-red-50 px-4 py-2 text-xs text-red-600 border-t border-red-100">
                      Some rows have validation errors. They will be skipped during import.
                    </div>
                  )}
                </div>
              )}

              {importing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Importing...</span>
                    <span>{progress}/{rows.length}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-coach-gold transition-all duration-300"
                      style={{ width: `${(progress / rows.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center">
                  <p className="text-2xl font-semibold text-emerald-700">{results.filter(r => r.success).length}</p>
                  <p className="text-xs text-emerald-600">Succeeded</p>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center">
                  <p className="text-2xl font-semibold text-red-700">{results.filter(r => !r.success).length}</p>
                  <p className="text-xs text-red-600">Failed</p>
                </div>
              </div>

              {results.some(r => !r.success) && (
                <div className="rounded-lg border border-red-200 overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50 sticky top-0">
                      <tr className="text-left text-xs text-red-600">
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {results.filter(r => !r.success).map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-700">{r.email}</td>
                          <td className="px-3 py-2 text-red-600 text-xs">{r.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!results ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={importing}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={rows.length === 0 || importing}
                className="bg-coach-gold hover:bg-coach-gold/90 text-white"
              >
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Import {rows.length} User{rows.length !== 1 ? 's' : ''}
              </Button>
            </>
          ) : (
            <Button onClick={() => { reset(); handleOpenChange(false); }}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
