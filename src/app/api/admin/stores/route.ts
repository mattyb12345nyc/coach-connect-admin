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
    const channel = params.get('channel');
    const region = params.get('region');
    const district = params.get('district');
    const search = params.get('search');

    let query = supabase
      .from('stores')
      .select('*')
      .order('store_number');

    if (status) query = query.eq('status', status);
    if (channel) query = query.eq('channel', channel);
    if (region) query = query.eq('region', region);
    if (district) query = query.eq('district', district);
    if (search) {
      query = query.or(
        `store_number.ilike.%${search}%,store_name.ilike.%${search}%,city.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getAdminClient();
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('stores')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
