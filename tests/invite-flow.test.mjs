import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..');
const srcRoot = path.join(repoRoot, 'src');

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function collectFiles(dir) {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      return collectFiles(fullPath);
    }
    return [fullPath];
  });
}

test('Users page no longer calls the beta-invite API', () => {
  const source = read('src/app/admin/users/page.tsx');

  assert.equal(
    source.includes('/api/admin/beta-invite'),
    false,
    'Users page must not post to the beta invite route'
  );
  assert.equal(
    source.includes('Send a beta invite'),
    false,
    'Users page must not present the beta invite UI'
  );
});

test('beta-invite API route is removed and no src references remain', () => {
  assert.equal(
    existsSync(path.join(repoRoot, 'src/app/api/admin/beta-invite/route.ts')),
    false,
    'beta-invite route file must be deleted'
  );

  const fileContents = collectFiles(srcRoot)
    .filter((filePath) => /\.(ts|tsx|js|jsx)$/.test(filePath))
    .map((filePath) => readFileSync(filePath, 'utf8'));

  for (const source of fileContents) {
    assert.equal(source.includes('beta-invite'), false, 'No src file should reference beta-invite');
    assert.equal(source.includes('beta_invite'), false, 'No src file should reference beta_invite');
  }
});

test('legacy invitations API is revoke-only and never hard deletes invite records', () => {
  const source = read('src/app/api/admin/invitations/route.ts');

  assert.match(
    source,
    /status:\s*'revoked'/,
    'legacy invitations delete/revoke flow must mark invites as revoked'
  );
  assert.equal(
    source.includes('Legacy invite creation has been retired'),
    true,
    'legacy invitations API should explicitly retire old invite creation'
  );
  assert.equal(
    source.includes(".from('invites')\n      .delete()"),
    false,
    'legacy invitations flow must not hard delete invite records'
  );
});

test('Invitations page presents revoke semantics instead of delete semantics for pending invites', () => {
  const pageSource = read('src/app/admin/invitations/page.tsx');
  const hookSource = read('src/hooks/admin/useInvitations.ts');

  assert.equal(
    hookSource.includes('Invitation revoked'),
    true,
    'Legacy invitations flow should surface a revoke success path'
  );
  assert.equal(
    pageSource.includes('>Revoke<') || pageSource.includes('Revoke'),
    true,
    'Invitations page should present a revoke action'
  );
});

test('Invitations page is a legacy history surface and points new user creation to the users page', () => {
  const source = read('src/app/admin/invitations/page.tsx');

  assert.equal(
    source.includes('Legacy Invitations'),
    true,
    'Invitations page should be labeled as a legacy invitation history surface'
  );
  assert.equal(
    source.includes('/admin/users'),
    true,
    'Invitations page should point admins to the users page for new invites'
  );
  assert.equal(
    source.includes('Send Invitation'),
    false,
    'Invitations page should not offer the old single-send invitation flow'
  );
  assert.equal(
    source.includes('Bulk Invite'),
    false,
    'Invitations page should not offer the old bulk invite flow'
  );
});

test('Invitation list no longer exposes resend actions for the retired invite flow', () => {
  const source = read('src/components/admin/invitations/InvitationList.tsx');

  assert.equal(
    source.includes('Resend'),
    false,
    'Invitation list should not expose resend actions for the retired flow'
  );
  assert.equal(
    source.includes('onResend'),
    false,
    'Invitation list should not accept an onResend handler anymore'
  );
});

test('legacy invitations API no longer sends Supabase invite emails for create or resend', () => {
  const source = read('src/app/api/admin/invitations/route.ts');

  assert.equal(
    source.includes('inviteUserByEmail'),
    false,
    'legacy invitations API must not call the retired inviteUserByEmail flow'
  );
});
