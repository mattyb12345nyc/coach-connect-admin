import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { getRequestAdminContext } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    const supabase = getAdminClient();
    const status = request.nextUrl.searchParams.get('status');

    let query = supabase
      .from('culture_trend_candidates')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    if (context.role === 'manager') {
      query = query.eq('scope_type', 'store').eq('store_id', context.storeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
