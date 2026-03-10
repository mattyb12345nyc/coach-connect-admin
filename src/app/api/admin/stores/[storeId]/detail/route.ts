import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthEmailMapByUserIds } from '@/lib/admin-directory';
import { getValidatedAdminUser } from '@/lib/admin-auth';
import {
  buildUserPracticeMetrics,
  type RealProfileRecord,
} from '@/lib/admin-practice';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface Params {
  params: { storeId: string };
}

export async function GET(request: NextRequest, { params }: Params) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { storeId } = params;

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();

    // Fetch profiles assigned to this store
    const { data: associates, error: assocError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, display_name, avatar_url, store_id, role, status, created_at')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (assocError) throw assocError;

    const rows = (associates ?? []) as unknown as RealProfileRecord[];
    const associateIds = rows.map((associate) => associate.id);

    const [{ data: sessionRows, error: sessionsError }, emailByUserId] = await Promise.all([
      associateIds.length > 0
        ? supabase
            .from('practice_sessions')
            .select('user_id, overall_score, scoring_status')
            .in('user_id', associateIds)
        : Promise.resolve({ data: [], error: null }),
      fetchAuthEmailMapByUserIds(supabase, associateIds),
    ]);

    if (sessionsError) throw sessionsError;

    const metricsByUserId = buildUserPracticeMetrics(
      ((sessionRows ?? []) as Array<{
        user_id: string;
        overall_score: number | null;
        scoring_status: string | null;
      }>)
    );

    const enrichedRows = rows.map((associate) => {
      const metrics = metricsByUserId.get(associate.id);
      return {
        id: associate.id,
        first_name: associate.first_name,
        last_name: associate.last_name,
        display_name: associate.display_name,
        email: emailByUserId.get(associate.id) ?? null,
        role: associate.role,
        status: associate.status,
        average_score: metrics?.average_score ?? null,
        practice_sessions: metrics?.practice_sessions ?? 0,
        avatar_url: associate.avatar_url,
        created_at: associate.created_at,
      };
    });

    // Aggregate metrics from profiles
    const associateCount = enrichedRows.length;
    const activeCount = enrichedRows.filter((associate) => associate.status === 'active').length;

    const scoredSessions = ((sessionRows ?? []) as Array<{
      user_id: string;
      overall_score: number | null;
      scoring_status: string | null;
    }>).filter(
      (session) => session.scoring_status === 'scored' && session.overall_score !== null
    );

    const avgScore = scoredSessions.length > 0
      ? Math.round(
          scoredSessions.reduce((sum, session) => sum + (session.overall_score ?? 0), 0) /
            scoredSessions.length
        )
      : null;

    const totalSessions = Array.from(metricsByUserId.values()).reduce(
      (sum, metrics) => sum + metrics.practice_sessions,
      0
    );

    return NextResponse.json({
      associates: enrichedRows,
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
