import { config } from '@/lib/config';

export interface StoreOption {
  id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
  region?: string | null;
}

export interface Invitation {
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

export interface CsvRow {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  store_number: string;
  store_id: string | null;
  valid: boolean;
  errors: string[];
}

export interface BulkResult {
  email: string;
  status: 'success' | 'failed';
  error: string;
}

export type TabFilter = 'all' | 'pending' | 'accepted' | 'expired' | 'revoked';
export type BulkTab = 'csv' | 'store';

export const ROLE_OPTIONS = [
  { value: 'associate', label: 'Associate' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'regional_manager', label: 'Regional Manager' },
  { value: 'admin', label: 'Admin' },
] as const;

export const VALID_ROLES = new Set(['associate', 'store_manager', 'regional_manager', 'admin']);

export function buildInviteUrl(token: string): string {
  return config.inviteUrl(token);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function parseCsv(text: string, stores: StoreOption[]): { rows: CsvRow[]; parseErrors: string[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return { rows: [], parseErrors: ['CSV must have a header row and at least one data row'] };

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
    if (cells.every(c => !c)) continue;

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
