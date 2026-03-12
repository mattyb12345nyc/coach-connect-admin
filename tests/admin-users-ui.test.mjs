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

test('users page promotes the new add user workflow instead of redirecting admins to invitations', () => {
  const source = read('src/app/admin/users/page.tsx');

  assert.equal(
    source.includes('Add User'),
    true,
    'users page should present an Add User entry point'
  );
  assert.equal(
    source.includes('To invite new users, go to the'),
    false,
    'users page should no longer redirect admins to the invitations page for new users'
  );
});

test('add user and credentials modal components exist with the new create or invite affordances', () => {
  assert.equal(
    existsSync(path.join(repoRoot, 'src/components/admin/users/AddUserModal.tsx')),
    true,
    'AddUserModal component must exist'
  );
  assert.equal(
    existsSync(path.join(repoRoot, 'src/components/admin/users/CredentialsModal.tsx')),
    true,
    'CredentialsModal component must exist'
  );

  const modalSource = read('src/components/admin/users/AddUserModal.tsx');

  assert.equal(modalSource.includes('Send invite email'), true);
  assert.equal(modalSource.includes('Temporary Password'), true);
  assert.equal(modalSource.includes('Create & Send Invite'), true);
  assert.equal(modalSource.includes('Create User'), true);
  assert.equal(modalSource.includes('/api/admin/users/create'), true);
});

test('users management UI exposes reset password and status actions', () => {
  assert.equal(
    existsSync(path.join(repoRoot, 'src/components/admin/users/UserActionsMenu.tsx')),
    true,
    'UserActionsMenu component must exist'
  );

  const actionsSource = read('src/components/admin/users/UserActionsMenu.tsx');
  const pageSource = read('src/app/admin/users/page.tsx');

  assert.equal(actionsSource.includes('Reset Password'), true);
  assert.equal(actionsSource.includes('Deactivate'), true);
  assert.equal(actionsSource.includes('Reactivate'), true);
  assert.equal(actionsSource.includes('/api/admin/users/${user.id}/reset-password'), true);
  assert.equal(
    actionsSource.includes("user.status === 'suspended' || user.status === 'deactivated'"),
    true,
    'User actions menu should allow reactivation for suspended and deactivated users'
  );
  assert.equal(pageSource.includes('Status'), true);
});

test('profiles API validates managed user status values', () => {
  const source = read('src/app/api/admin/profiles/route.ts');

  assert.equal(
    source.includes("['pending', 'active', 'suspended', 'deactivated']"),
    true,
    'profiles API should validate allowed status values before updating'
  );
});
