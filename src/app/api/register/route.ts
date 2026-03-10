import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const token = request.nextUrl.searchParams.get('token') || request.nextUrl.searchParams.get('invite');
    const email = request.nextUrl.searchParams.get('email');

    if (token) {
      // Try invites table first (admin-created invites), then legacy invitations
      let inviteTable: 'invites' | 'invitations' = 'invites';
      let { data, error } = await supabase
        .from('invites')
        .select('*, stores(store_number, store_name, city, state)')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !data) {
        const fallback = await supabase
          .from('invitations')
          .select('*, stores(store_number, store_name, city, state)')
          .eq('token', token)
          .eq('status', 'pending')
          .single();
        if (fallback.error || !fallback.data) {
          return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
        }
        data = fallback.data;
        inviteTable = 'invitations';
      }

      if (new Date(data.expires_at) < new Date()) {
        await supabase.from(inviteTable).update({ status: 'expired' }).eq('id', data.id);
        return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
      }

      return NextResponse.json(data);
    }

    if (email) {
      let { data } = await supabase
        .from('invites')
        .select('*, stores(store_number, store_name, city, state)')
        .eq('email', email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) {
        const fallback = await supabase
          .from('invitations')
          .select('*, stores(store_number, store_name, city, state)')
          .eq('email', email)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (fallback.data) data = fallback.data;
      }
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

    // Look up invitation: try invites first (admin-created), then legacy invitations
    let invitation: Record<string, unknown> | null = null;
    let inviteTable: 'invites' | 'invitations' = 'invites';
    if (token) {
      let res = await supabase.from('invites').select('*').eq('token', token).eq('status', 'pending').single();
      if (res.data) {
        invitation = res.data;
      } else {
        res = await supabase.from('invitations').select('*').eq('token', token).eq('status', 'pending').single();
        if (res.data) {
          invitation = res.data;
          inviteTable = 'invitations';
        }
      }
    } else {
      let res = await supabase.from('invites').select('*').eq('email', email).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).single();
      if (res.data) {
        invitation = res.data;
      } else {
        res = await supabase.from('invitations').select('*').eq('email', email).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).single();
        if (res.data) {
          invitation = res.data;
          inviteTable = 'invitations';
        }
      }
    }

    if (!invitation) {
      return NextResponse.json({ error: 'No valid invitation found' }, { status: 404 });
    }

    if (new Date(invitation.expires_at as string) < new Date()) {
      await supabase.from(inviteTable).update({ status: 'expired' }).eq('id', invitation.id);
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      await supabase
        .from(inviteTable)
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      return NextResponse.json({ user: existingUser, already_existed: true });
    }

    const inviteRole = (invitation.role as string) || 'associate';
    const inviteRegion = (invitation.region as string | null) || null;
    const isRegionalManager = inviteRole === 'regional_manager';

    // Regional managers don't need a store; other non-admin roles do.
    const finalStoreId = isRegionalManager || inviteRole === 'admin'
      ? null
      : store_id || (invitation.store_id as string | null);

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

    const titleByRole: Record<string, string> = {
      admin: 'Admin',
      regional_manager: 'Regional Manager',
      store_manager: 'Store Manager',
      manager: 'Store Manager',
    };

    const { data: newUser, error: userError } = await supabase
      .from('app_users')
      .insert({
        email,
        name,
        title: titleByRole[inviteRole] ?? 'Sales Associate',
        store: storeName || null,
        store_number: storeNumber || null,
        city: city || null,
        store_id: finalStoreId,
        region: isRegionalManager ? inviteRegion : null,
        avatar_url: avatar_url || null,
        role: inviteRole,
        is_active: true,
      })
      .select()
      .single();

    if (userError) throw userError;

    // Mark invitation accepted
    await supabase
      .from(inviteTable)
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
