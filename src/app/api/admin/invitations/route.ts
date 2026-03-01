import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const storeId = request.nextUrl.searchParams.get('store_id');
    const status = request.nextUrl.searchParams.get('status');

    let query = supabase
      .from('invitations')
      .select('*, stores(store_number, store_name, city, state)')
      .order('created_at', { ascending: false });

    if (storeId) query = query.eq('store_id', storeId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();
    const { email, role, store_id, invited_by } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A pending invitation already exists for this email' },
        { status: 409 }
      );
    }

    const token = crypto.randomBytes(32).toString('hex');

    const { data: invitation, error: insertError } = await supabase
      .from('invitations')
      .insert({
        email,
        role: role || 'associate',
        store_id: store_id || null,
        invited_by: invited_by || null,
        token,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Send magic link via Supabase Auth
    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const redirectTo = `${origin}/register?token=${token}`;

    const { error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    });

    const inviteUrl = redirectTo;

    if (authError) {
      // Auth invite failed but DB record created -- return URL for manual sharing
      return NextResponse.json({
        invitation,
        invite_url: inviteUrl,
        email_sent: false,
        email_error: authError.message,
      }, { status: 201 });
    }

    return NextResponse.json({
      invitation,
      invite_url: inviteUrl,
      email_sent: true,
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase
      .from('invitations')
      .update({ status: 'expired' })
      .eq('id', id)
      .eq('status', 'pending');

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
