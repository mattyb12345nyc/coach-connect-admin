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

test('main invitations API explicitly creates pending invites and revokes instead of hard deleting', () => {
  const source = read('src/app/api/admin/invitations/route.ts');

  assert.match(
    source,
    /status:\s*'pending'/,
    'main invitations flow must explicitly create invites with pending status'
  );
  assert.match(
    source,
    /status:\s*'revoked'/,
    'main invitations delete/revoke flow must mark invites as revoked'
  );
  assert.equal(
    source.includes(".from('invites')\n      .delete()"),
    false,
    'main invitations flow must not hard delete invite records'
  );
});

test('Invitations page presents revoke semantics instead of delete semantics for pending invites', () => {
  const source = read('src/app/admin/invitations/page.tsx');

  assert.equal(
    source.includes('Invitation revoked'),
    true,
    'Invitations page should surface a revoke success path'
  );
  assert.equal(
    source.includes('>Revoke<') || source.includes('Revoke'),
    true,
    'Invitations page should present a revoke action'
  );
});
