import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const params = request.nextUrl.searchParams;
    const status = params.get('status');
    const role = params.get('role');
    const storeId = params.get('store_id');
    const search = params.get('search');

    let query = supabase
      .from('profiles')
      .select('*, stores(id, store_number, store_name, city, state, region)')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);
    if (role && role !== 'all') query = query.eq('role', role);
    if (storeId) query = query.eq('store_id', storeId);
    if (search) {
      query = query.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const allowedFields = [
      'status', 'role', 'store_id', 'job_title', 'first_name', 'last_name',
      'phone', 'avatar_url', 'hire_date',
    ];
    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) sanitized[key] = updates[key];
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(sanitized)
      .eq('id', id)
      .select('*, stores(id, store_number, store_name, city, state, region)')
      .single();

    if (error) throw error;
    return NextResponse.json(data);
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

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ status: 'deactivated' })
      .eq('id', id);

    if (profileError) throw profileError;
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
