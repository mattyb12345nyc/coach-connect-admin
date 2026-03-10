import { NextRequest, NextResponse } from 'next/server';
import { getValidatedAdminUser } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getAdminClient();
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const allowedFields = [
      'status', 'role', 'store_id', 'job_title', 'first_name', 'last_name',
      'display_name', 'phone', 'avatar_url', 'hire_date',
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
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getAdminClient();
    const body = await request.json();

    // Bulk delete test accounts (email contains 'mattyb123')
    if (body.deleteTestAccounts === true) {
      const { data: testProfiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', '%mattyb123%');

      if (fetchError) throw fetchError;
      if (!testProfiles || testProfiles.length === 0) {
        return NextResponse.json({ success: true, deleted: 0 });
      }

      const ids = testProfiles.map(p => p.id);
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .in('id', ids);

      if (deleteError) throw deleteError;
      return NextResponse.json({ success: true, deleted: ids.length });
    }

    // Single-user soft delete (deactivate)
    const { id } = body;
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
