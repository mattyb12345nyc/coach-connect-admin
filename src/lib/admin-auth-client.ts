import { ADMIN_AUTH_TOKEN_COOKIE_NAME } from '@/lib/admin-auth';

function buildCookieAttributes(): string {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? '; Secure'
    : '';

  return `Path=/; SameSite=Lax${secure}`;
}

export function setAdminAuthTokenCookie(token: string) {
  if (typeof document === 'undefined') return;

  document.cookie = [
    `${ADMIN_AUTH_TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    buildCookieAttributes(),
  ].join('; ');
}

export function clearAdminAuthTokenCookie() {
  if (typeof document === 'undefined') return;

  document.cookie = [
    `${ADMIN_AUTH_TOKEN_COOKIE_NAME}=`,
    'Max-Age=0',
    buildCookieAttributes(),
  ].join('; ');
}
