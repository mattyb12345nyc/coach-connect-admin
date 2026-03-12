import { NextRequest, NextResponse } from 'next/server';
import { getValidatedAdminUser } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getAdminClient();
    const storeId = request.nextUrl.searchParams.get('store_id');
    const status = request.nextUrl.searchParams.get('status');

    let query = supabase
      .from('invites')
      .select('*, stores(store_number, store_name, city, state)')
      .order('created_at', { ascending: false });

    if (storeId) query = query.eq('store_id', storeId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(
    { error: 'Legacy invite creation has been retired. Use /api/admin/users/create instead.' },
    { status: 410 }
  );
}

export async function PATCH(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(
    { error: 'Legacy invite resends have been retired. Use the user password reset action instead.' },
    { status: 410 }
  );
}

export async function DELETE(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getAdminClient();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data: existingInvite, error: existingInviteError } = await supabase
      .from('invites')
      .select('id, status')
      .eq('id', id)
      .single();

    if (existingInviteError) throw existingInviteError;

    if (!existingInvite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (existingInvite.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending invites can be revoked' }, { status: 409 });
    }

    const { data: updatedInvite, error } = await supabase
      .from('invites')
      .update({ status: 'revoked' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, invitation: updatedInvite });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
