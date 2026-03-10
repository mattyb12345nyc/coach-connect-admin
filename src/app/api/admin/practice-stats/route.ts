import { NextRequest, NextResponse } from 'next/server';
import { getValidatedAdminUser } from '@/lib/admin-auth';
import {
  computePracticeStats,
  type PracticeProfileRecord,
  type PracticeSessionRecord,
  type PracticeStoreRecord,
} from '@/lib/admin-practice';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PRACTICE_SESSION_COLUMNS = [
  'id',
  'user_id',
  'overall_score',
  'created_at',
  'persona',
  'difficulty',
  'scoring_status',
  'duration_seconds',
  'scores',
  'highlights',
  'summary',
  'transcript',
  'scoring_error',
].join(', ');

const PROFILE_COLUMNS = [
  'id',
  'first_name',
  'last_name',
  'display_name',
  'avatar_url',
  'store_id',
].join(', ');

const STORE_COLUMNS = [
  'id',
  'store_name',
  'store_number',
  'city',
  'state',
].join(', ');

export async function GET(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getAdminClient();
    const storeId = request.nextUrl.searchParams.get('storeId')?.trim() || null;

    let profilesByUserId = new Map<string, PracticeProfileRecord>();
    let filteredUserIds: string[] | null = null;

    if (storeId) {
      const { data: filteredProfiles, error: filteredProfilesError } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('store_id', storeId);

      if (filteredProfilesError) throw filteredProfilesError;

      const profiles = (filteredProfiles ?? []) as unknown as PracticeProfileRecord[];
      profilesByUserId = new Map(profiles.map((profile) => [profile.id, profile]));
      filteredUserIds = profiles.map((profile) => profile.id);

      if (filteredUserIds.length === 0) {
        return NextResponse.json({
          total_sessions: 0,
          completed_sessions: 0,
          average_score: null,
          sessions_by_difficulty: [],
          sessions_by_persona: [],
          top_performers: [],
          sessions_this_week: 0,
          top_performing_store: null,
        });
      }
    }

    let sessionsQuery: any = supabase
      .from('practice_sessions')
      .select(PRACTICE_SESSION_COLUMNS);

    if (filteredUserIds) {
      sessionsQuery = filteredUserIds.length === 1
        ? sessionsQuery.eq('user_id', filteredUserIds[0])
        : sessionsQuery.in('user_id', filteredUserIds);
    }

    const { data: sessionRows, error: sessionsError } = await sessionsQuery;
    if (sessionsError) throw sessionsError;

    const sessions = (sessionRows ?? []) as PracticeSessionRecord[];
    const sessionUserIds = Array.from(new Set(sessions.map((session) => session.user_id)));
    const missingProfileIds = sessionUserIds.filter((userId) => !profilesByUserId.has(userId));

    if (missingProfileIds.length > 0) {
      const { data: additionalProfiles, error: additionalProfilesError } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .in('id', missingProfileIds);

      if (additionalProfilesError) throw additionalProfilesError;

      for (const profile of (additionalProfiles ?? []) as unknown as PracticeProfileRecord[]) {
        profilesByUserId.set(profile.id, profile);
      }
    }

    const storeIds = Array.from(
      new Set(
        Array.from(profilesByUserId.values())
          .map((profile) => profile.store_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    const storesById = new Map<string, PracticeStoreRecord>();
    if (storeIds.length > 0) {
      const { data: storeRows, error: storesError } = await supabase
        .from('stores')
        .select(STORE_COLUMNS)
        .in('id', storeIds);

      if (storesError) throw storesError;

      for (const store of (storeRows ?? []) as unknown as PracticeStoreRecord[]) {
        storesById.set(store.id, store);
      }
    }

    return NextResponse.json(
      computePracticeStats({
        sessions,
        profilesByUserId,
        storesById,
      })
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load practice stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
