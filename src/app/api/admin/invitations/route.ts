import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const MAIN_APP_URL = process.env.MAIN_APP_URL || 'https://futureproof.work/coach-connect';

export async function GET(request: NextRequest) {
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
  try {
    const supabase = getAdminClient();
    const body = await request.json();
    const { email, first_name, last_name, role, store_id, region, invited_by } = body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const inviteRole = role || 'associate';
    const normalizedRegion = typeof region === 'string' ? region.trim() : null;

    if (inviteRole === 'admin' && store_id) {
      return NextResponse.json({ error: 'Admin invites should not include a store' }, { status: 400 });
    }
    if (inviteRole === 'regional_manager' && !normalizedRegion) {
      return NextResponse.json({ error: 'Region is required for regional manager invites' }, { status: 400 });
    }
    if ((inviteRole === 'associate' || inviteRole === 'store_manager') && !store_id) {
      return NextResponse.json({ error: 'Store is required for associate and store manager invites' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('invites')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A pending invitation already exists for this email' },
        { status: 409 }
      );
    }

    const token = crypto.randomBytes(32).toString('hex');

    // invited_by must be a valid auth.users UUID for the FK constraint.
    // If the admin passes their user id, use it; otherwise look up by email.
    let invitedByUuid = invited_by;
    if (invited_by && !invited_by.match(/^[0-9a-f-]{36}$/i)) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', invited_by)
        .single();
      invitedByUuid = adminProfile?.id ?? null;
    }

    const { data: invite, error: insertError } = await supabase
      .from('invites')
      .insert({
        email: normalizedEmail,
        first_name: first_name || null,
        last_name: last_name || null,
        role: inviteRole,
        store_id: inviteRole === 'admin' || inviteRole === 'regional_manager' ? null : store_id || null,
        region: inviteRole === 'regional_manager' ? normalizedRegion : null,
        invited_by: invitedByUuid,
        token,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const inviteUrl = `${MAIN_APP_URL}?token=${token}`;

    const { error: authError } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo: inviteUrl,
    });

    if (authError) {
      const isExistingUser =
        authError.message.toLowerCase().includes('already') &&
        authError.message.toLowerCase().includes('register');

      let existingUserActivated = false;
      if (isExistingUser) {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            status: 'active',
            role: inviteRole,
            store_id: inviteRole === 'admin' || inviteRole === 'regional_manager' ? null : store_id || null,
          })
          .ilike('email', normalizedEmail)
          .eq('status', 'pending');

        if (!profileUpdateError) {
          existingUserActivated = true;
          await supabase
            .from('invites')
            .update({ status: 'accepted', accepted_at: new Date().toISOString() })
            .eq('id', invite.id)
            .eq('status', 'pending');
        }
      }

      return NextResponse.json({
        invitation: invite,
        invite_url: inviteUrl,
        email_sent: false,
        email_error: authError.message,
        existing_user_activated: existingUserActivated,
      }, { status: 201 });
    }

    return NextResponse.json({
      invitation: invite,
      invite_url: inviteUrl,
      email_sent: true,
    }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase
      .from('invites')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
