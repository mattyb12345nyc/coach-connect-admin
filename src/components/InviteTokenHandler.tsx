'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export const PENDING_INVITE_KEY = 'pendingInviteToken';

/**
 * On mount, if the URL has ?invite=<token>, store the token in sessionStorage
 * and redirect to /register so the registration view can consume it.
 * This runs on the client so invite links (e.g. https://coach.futureproof.work/?invite=TOKEN)
 * trigger the registration flow.
 */
export function InviteTokenHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (inviteToken) {
      sessionStorage.setItem(PENDING_INVITE_KEY, inviteToken);
      // Redirect to register so the token is consumed there (avoid leaving token in URL)
      if (pathname !== '/register') {
        router.replace('/register');
      }
    }
  }, [pathname, router]);

  return null;
}
