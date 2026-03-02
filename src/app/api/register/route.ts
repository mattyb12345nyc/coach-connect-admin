import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const token = request.nextUrl.searchParams.get('token') || request.nextUrl.searchParams.get('invite');
    const email = request.nextUrl.searchParams.get('email');

    if (token) {
      const { data, error } = await supabase
        .from('invitations')
        .select('*, stores(store_number, store_name, city, state)')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
      }

      if (new Date(data.expires_at) < new Date()) {
        await supabase
          .from('invitations')
          .update({ status: 'expired' })
          .eq('id', data.id);
        return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
      }

      return NextResponse.json(data);
    }

    if (email) {
      const { data } = await supabase
        .from('invitations')
        .select('*, stores(store_number, store_name, city, state)')
        .eq('email', email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'No invitation found' }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();
    const { token: bodyToken, invite, email, name, store_id, avatar_url } = body;
    const token = bodyToken || invite;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Look up invitation
    let invitation = null;
    if (token) {
      const { data } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();
      invitation = data;
    } else {
      const { data } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      invitation = data;
    }

    if (!invitation) {
      return NextResponse.json({ error: 'No valid invitation found' }, { status: 404 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Mark invitation accepted
      await supabase
        .from('invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      return NextResponse.json({ user: existingUser, already_existed: true });
    }

    // Resolve store info
    const finalStoreId = store_id || invitation.store_id;
    let storeName = '';
    let storeNumber = '';
    let city = '';

    if (finalStoreId) {
      const { data: store } = await supabase
        .from('stores')
        .select('store_name, store_number, city, state')
        .eq('id', finalStoreId)
        .single();
      if (store) {
        storeName = store.store_name;
        storeNumber = store.store_number;
        city = `${store.city}, ${store.state}`;
      }
    }

    // Create app_users record
    const { data: newUser, error: userError } = await supabase
      .from('app_users')
      .insert({
        email,
        name,
        title: invitation.role === 'manager' ? 'Store Manager' : 'Sales Associate',
        store: storeName,
        store_number: storeNumber,
        city,
        store_id: finalStoreId,
        avatar_url: avatar_url || null,
        role: invitation.role,
        is_active: true,
      })
      .select()
      .single();

    if (userError) throw userError;

    // Mark invitation accepted
    await supabase
      .from('invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
