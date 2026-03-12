import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..');

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('compatibility and admin provisioning routes exist', () => {
  assert.equal(
    existsSync(path.join(repoRoot, 'pages/api/users/create.js')),
    true,
    'legacy compatibility route must exist at pages/api/users/create.js'
  );
  assert.equal(
    existsSync(path.join(repoRoot, 'src/app/api/admin/users/create/route.ts')),
    true,
    'authenticated app-router create route must exist'
  );
  assert.equal(
    existsSync(path.join(repoRoot, 'src/app/api/admin/users/[id]/reset-password/route.ts')),
    true,
    'authenticated reset-password route must exist'
  );
});

test('new provisioning routes must use shared helper and recovery links only', () => {
  const compatibilityRoute = read('pages/api/users/create.js');
  const createRoute = read('src/app/api/admin/users/create/route.ts');
  const resetRoute = read('src/app/api/admin/users/[id]/reset-password/route.ts');

  assert.equal(
    compatibilityRoute.includes('createAdminUser'),
    true,
    'legacy compatibility route should delegate to the shared createAdminUser helper'
  );
  assert.equal(
    createRoute.includes('createAdminUser'),
    true,
    'app-router create route should delegate to the shared createAdminUser helper'
  );
  assert.match(
    resetRoute,
    /type:\s*'recovery'/,
    'password reset route must generate recovery links, not invite links'
  );

  for (const source of [compatibilityRoute, createRoute, resetRoute]) {
    assert.equal(
      source.includes("type: 'invite'"),
      false,
      'new provisioning routes must not generate Supabase invite links'
    );
    assert.equal(
      source.includes("from('auth.users')"),
      false,
      'new provisioning routes must never write directly to auth.users'
    );
  }
});

test('user detail route supports permanent admin user deletion', () => {
  const userRoute = read('src/app/api/admin/users/[id]/route.ts');

  assert.equal(
    userRoute.includes('export async function DELETE'),
    true,
    'user detail route should expose a DELETE handler'
  );
  assert.equal(
    userRoute.includes("return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })"),
    true,
    'delete route should block self-deletion'
  );
  assert.equal(
    userRoute.includes(".from('profiles')") && userRoute.includes('.delete()'),
    true,
    'delete route should remove the profile record before deleting auth'
  );
  assert.equal(
    userRoute.includes('.auth.admin.deleteUser('),
    true,
    'delete route should remove the Supabase auth user'
  );
});
