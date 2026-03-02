import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const idsParam = request.nextUrl.searchParams.get('ids');
    if (!idsParam) {
      return NextResponse.json({ error: 'ids query parameter is required' }, { status: 400 });
    }

    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No valid ids provided' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('culture_trend_candidates')
      .select('id, image_status, image_url, image_error')
      .in('id', ids);

    if (error) throw error;

    return NextResponse.json({ candidates: data || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Status check failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
