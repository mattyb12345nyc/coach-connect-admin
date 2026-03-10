import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..');

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('profiles route no longer selects or updates non-existent profile columns', () => {
  const source = read('src/app/api/admin/profiles/route.ts');

  assert.equal(source.includes('email.ilike'), false);
  assert.equal(source.includes('job_title'), false);
  assert.equal(source.includes('phone'), false);
  assert.equal(source.includes('hire_date'), false);
});

test('store detail route only selects real profile columns', () => {
  const source = read('src/app/api/admin/stores/[storeId]/detail/route.ts');

  assert.equal(
    source.includes(".select('id, first_name, last_name, display_name, email"),
    false
  );
  assert.equal(
    source.includes('last_active_at'),
    false
  );
  assert.equal(
    source.includes(".select('id, first_name, last_name, display_name, avatar_url, store_id, role, status, created_at')"),
    true
  );
});

test('users page no longer assumes removed profile fields', () => {
  const source = read('src/app/admin/users/page.tsx');

  assert.equal(source.includes('job_title'), false);
  assert.equal(source.includes('phone'), false);
  assert.equal(source.includes('day_streak'), false);
  assert.equal(source.includes('last_active_at'), false);
});

test('stores page no longer assumes last_active_at from profiles', () => {
  const source = read('src/app/admin/stores/page.tsx');

  assert.equal(source.includes('last_active_at'), false);
});

test('admin auth/session no longer treat email as a profile column', () => {
  const authCoreSource = read('src/lib/admin-auth-core.ts');
  const sessionRouteSource = read('src/app/api/admin/session/route.ts');

  assert.equal(authCoreSource.includes('display_name, email, avatar_url'), false);
  assert.equal(authCoreSource.includes('email: string | null;'), false);
  assert.equal(sessionRouteSource.includes('email: adminUser.profile.email'), false);
});

test('stats route uses the real scoring_status enum', () => {
  const source = read('src/app/api/admin/stats/route.ts');

  assert.equal(source.includes("'completed'"), false);
  assert.equal(source.includes("'scored'"), true);
});
