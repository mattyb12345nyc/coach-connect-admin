import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { canManageScope, getRequestAdminContext } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

const PUBLISH_PULSE_URL = 'https://coach-connect-demo.netlify.app/.netlify/functions/publish-pulse';

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const authorization = request.headers.get('authorization');
    const { cardId } = await request.json();

    if (!cardId) {
      return NextResponse.json({ error: 'cardId is required' }, { status: 400 });
    }

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Supabase session token' }, { status: 401 });
    }

    const supabase = getAdminClient();
    const { data: item, error: itemError } = await supabase
      .from('culture_feed_items')
      .select('id, scope_type, store_id, store_region, status, is_published')
      .eq('id', cardId)
      .single();

    if (itemError) throw itemError;
    if (!item) {
      return NextResponse.json({ error: 'Culture card not found' }, { status: 404 });
    }

    const permission = canManageScope(context, item.scope_type, item.store_id, item.store_region);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    const response = await fetch(PUBLISH_PULSE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify({ cardId }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.error || payload?.message || 'Publish pulse failed' },
        { status: response.status }
      );
    }

    const { data: updatedItem, error: updatedItemError } = await supabase
      .from('culture_feed_items')
      .select('*')
      .eq('id', cardId)
      .single();

    if (updatedItemError) throw updatedItemError;

    return NextResponse.json({ item: updatedItem });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Publish pulse failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
