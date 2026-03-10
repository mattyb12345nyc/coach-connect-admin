import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..');

const wiringFiles = [
  'src/app/api/admin/invitations/route.ts',
  'src/app/admin/invitations/page.tsx',
  'src/app/admin/layout.tsx',
  'src/app/api/admin/beta-invite/route.ts',
  'src/app/api/admin/culture/publish-pulse/route.ts',
];

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('central URL config file exists', () => {
  assert.equal(
    existsSync(path.join(repoRoot, 'src/lib/config.ts')),
    true,
    'expected src/lib/config.ts to exist'
  );
});

test('admin wiring files do not hardcode consumer/admin domains', () => {
  for (const relativePath of wiringFiles) {
    const source = read(relativePath);

    assert.equal(
      source.includes('https://coach.futureproof.work'),
      false,
      `${relativePath} must not hardcode the production consumer app domain`
    );

    assert.equal(
      source.includes('https://coach-connect-demo.netlify.app'),
      false,
      `${relativePath} must not hardcode the demo consumer app domain`
    );
  }
});

test('.env.example documents consumer and admin app URL variables', () => {
  const source = read('.env.example');

  assert.match(source, /NEXT_PUBLIC_CONSUMER_APP_URL=/);
  assert.match(source, /NEXT_PUBLIC_ADMIN_APP_URL=/);
});
