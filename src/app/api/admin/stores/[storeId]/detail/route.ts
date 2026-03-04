import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface Params {
  params: { storeId: string };
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { storeId } = params;

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();

    // Fetch profiles assigned to this store
    const { data: associates, error: assocError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, display_name, email, role, status, last_active_at, average_score, practice_sessions, avatar_url')
      .eq('store_id', storeId)
      .order('last_active_at', { ascending: false });

    if (assocError) throw assocError;

    const rows = associates ?? [];

    // Aggregate metrics from profiles
    const associateCount = rows.length;
    const activeCount = rows.filter(a => a.status === 'active').length;

    const withScore = rows.filter(a => a.average_score != null && a.average_score > 0);
    const avgScore = withScore.length > 0
      ? Math.round(withScore.reduce((s, a) => s + (a.average_score ?? 0), 0) / withScore.length)
      : null;

    const totalSessions = rows.reduce((s, a) => s + (a.practice_sessions ?? 0), 0);

    return NextResponse.json({
      associates: rows,
      metrics: {
        associateCount,
        activeCount,
        avgScore,
        totalSessions,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
