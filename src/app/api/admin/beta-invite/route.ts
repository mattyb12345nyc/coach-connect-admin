import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const SEND_INVITE_URL = 'https://coach.futureproof.work/.netlify/functions/send-invite';

export async function POST(request: NextRequest) {
  try {
    const { email, name, storeId } = await request.json();
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedName = typeof name === 'string' ? name.trim() : '';

    if (!trimmedEmail || !trimmedName || !storeId) {
      return NextResponse.json(
        { error: 'Name, email, and store are required' },
        { status: 400 }
      );
    }

    const res = await fetch(SEND_INVITE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmedEmail, name: trimmedName, storeId }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return NextResponse.json(
        { error: data.error || 'Failed to send invite' },
        { status: res.status >= 400 ? res.status : 500 }
      );
    }

    const spaceIdx = trimmedName.indexOf(' ');
    const firstName = spaceIdx === -1 ? trimmedName : trimmedName.slice(0, spaceIdx);
    const lastName = spaceIdx === -1 ? null : trimmedName.slice(spaceIdx + 1);

    const supabase = getAdminClient();
    const { error: insertError } = await supabase.from('invites').insert({
      email: trimmedEmail,
      first_name: firstName,
      last_name: lastName,
      store_id: storeId,
      status: 'sent',
      role: 'associate',
      token: crypto.randomUUID(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    if (insertError) {
      console.error('Failed to log invite:', insertError);
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
