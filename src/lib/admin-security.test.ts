import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('admin permissions must not fail open to an admin role', () => {
  const source = readSource('src/lib/admin-permissions.ts');

  assert.equal(
    source.includes("return { role: 'admin', storeId: null, userId: null };"),
    false,
    'getRequestAdminContext must never synthesize an admin context when auth fails'
  );
});

test('admin auth must not trust the x-admin-email header', () => {
  const source = readSource('src/lib/admin-auth.ts');

  assert.equal(
    source.includes('x-admin-email'),
    false,
    'admin auth must derive identity from a validated Supabase token, not a spoofable header'
  );
});

test('middleware must protect admin pages and admin APIs', () => {
  const source = readSource('src/middleware.ts');

  assert.match(
    source,
    /\/admin\/:path\*/,
    'middleware config must explicitly match admin page routes'
  );
  assert.match(
    source,
    /\/api\/admin\/:path\*/,
    'middleware config must explicitly match admin API routes'
  );
});
