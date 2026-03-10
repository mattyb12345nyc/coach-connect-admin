import { NextRequest, NextResponse } from 'next/server';
import { getValidatedAdminUser } from '@/lib/admin-auth';
import { config } from '@/lib/config';
import { getAdminClient } from '@/lib/supabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function buildInviteUrl(token: string): string {
  return config.inviteUrl(token);
}

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
        status: 'pending',
        role: inviteRole,
        store_id: inviteRole === 'admin' || inviteRole === 'regional_manager' ? null : store_id || null,
        region: inviteRole === 'regional_manager' ? normalizedRegion : null,
        invited_by: invitedByUuid,
        token,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const inviteUrl = buildInviteUrl(token);

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

export async function PATCH(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getAdminClient();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data: existingInvite, error: fetchError } = await supabase
      .from('invites')
      .select('id, status, email')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!existingInvite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }
    if (existingInvite.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending invites can be resent' }, { status: 409 });
    }

    const newToken = crypto.randomBytes(32).toString('hex');

    const { data: updatedInvite, error: updateError } = await supabase
      .from('invites')
      .update({
        token: newToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    const inviteUrl = buildInviteUrl(newToken);

    const { error: authError } = await supabase.auth.admin.inviteUserByEmail(existingInvite.email, {
      redirectTo: inviteUrl,
    });

    return NextResponse.json({
      invitation: updatedInvite,
      invite_url: inviteUrl,
      email_sent: !authError,
      email_error: authError?.message ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
