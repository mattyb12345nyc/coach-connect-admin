import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const status = request.nextUrl.searchParams.get('status');

    let query = supabase
      .from('stores')
      .select('id, store_number, store_name, city, state')
      .order('store_number');

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stores';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
