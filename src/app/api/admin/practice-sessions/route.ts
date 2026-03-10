import { NextRequest, NextResponse } from 'next/server';
import { getValidatedAdminUser } from '@/lib/admin-auth';
import {
  parsePracticeSessionsQuery,
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

function buildEmptyResponse(page: number, limit: number) {
  return {
    sessions: [],
    pagination: {
      page,
      limit,
      total: 0,
      totalPages: 0,
    },
  };
}

function mapScoringStatusFilter(value: string | null): string | null {
  switch (value) {
    case 'completed':
      return 'scored';
    case 'scoring_error':
      return 'scoring_failed';
    case 'pending':
      return 'pending_rescore';
    default:
      return value;
  }
}

function escapeLikeInput(value: string): string {
  return value.replace(/,/g, ' ');
}

function buildAssociateDisplayName(profile: PracticeProfileRecord | undefined): string {
  if (!profile) return 'Unknown Associate';
  const fallback = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  return profile.display_name || fallback || 'Unknown Associate';
}

function applySessionFilters(query: any, options: {
  userIds: string[] | null;
  scoringStatus: string | null;
  difficulty: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}) {
  const { userIds, scoringStatus, difficulty, dateFrom, dateTo } = options;

  if (userIds) {
    query = userIds.length === 1
      ? query.eq('user_id', userIds[0])
      : query.in('user_id', userIds);
  }

  if (scoringStatus) {
    query = query.eq('scoring_status', mapScoringStatusFilter(scoringStatus));
  }

  if (difficulty) {
    query = query.eq('difficulty', difficulty);
  }

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  return query;
}

export async function GET(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getAdminClient();
    const query = parsePracticeSessionsQuery(request.nextUrl.searchParams);

    let filteredProfiles: PracticeProfileRecord[] | null = null;
    if (query.userId || query.storeId || query.search) {
      let profileQuery: any = supabase
        .from('profiles')
        .select(PROFILE_COLUMNS);

      if (query.userId) {
        profileQuery = profileQuery.eq('id', query.userId);
      }

      if (query.storeId) {
        profileQuery = profileQuery.eq('store_id', query.storeId);
      }

      if (query.search) {
        const search = escapeLikeInput(query.search);
        profileQuery = profileQuery.or(
          `display_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
        );
      }

      const { data: profileRows, error: profileError } = await profileQuery;
      if (profileError) throw profileError;

      filteredProfiles = (profileRows ?? []) as unknown as PracticeProfileRecord[];
      if (filteredProfiles.length === 0) {
        return NextResponse.json(buildEmptyResponse(query.page, query.limit));
      }
    }

    const filteredUserIds = filteredProfiles
      ? filteredProfiles.map((profile) => profile.id)
      : null;

    let countQuery: any = supabase
      .from('practice_sessions')
      .select('id', { count: 'exact', head: true });

    countQuery = applySessionFilters(countQuery, {
      userIds: filteredUserIds,
      scoringStatus: query.scoringStatus,
      difficulty: query.difficulty,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    let sessionsQuery: any = supabase
      .from('practice_sessions')
      .select(PRACTICE_SESSION_COLUMNS)
      .order('created_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);

    sessionsQuery = applySessionFilters(sessionsQuery, {
      userIds: filteredUserIds,
      scoringStatus: query.scoringStatus,
      difficulty: query.difficulty,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    const { data: sessionRows, error: sessionsError } = await sessionsQuery;
    if (sessionsError) throw sessionsError;

    const sessions = (sessionRows ?? []) as PracticeSessionRecord[];
    if (sessions.length === 0) {
      return NextResponse.json(buildEmptyResponse(query.page, query.limit));
    }

    const sessionUserIds = Array.from(new Set(sessions.map((session) => session.user_id)));
    const existingProfiles = new Map(
      (filteredProfiles ?? []).map((profile) => [profile.id, profile])
    );
    const missingProfileIds = sessionUserIds.filter((userId) => !existingProfiles.has(userId));

    if (missingProfileIds.length > 0) {
      const { data: additionalProfiles, error: additionalProfilesError } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .in('id', missingProfileIds);

      if (additionalProfilesError) throw additionalProfilesError;

      for (const profile of (additionalProfiles ?? []) as unknown as PracticeProfileRecord[]) {
        existingProfiles.set(profile.id, profile);
      }
    }

    const storeIds = Array.from(
      new Set(
        Array.from(existingProfiles.values())
          .map((profile) => profile.store_id)
          .filter((storeId): storeId is string => Boolean(storeId))
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

    const hydratedSessions = sessions.map((session) => {
      const associate = existingProfiles.get(session.user_id);
      const store = associate?.store_id ? (storesById.get(associate.store_id) ?? null) : null;

      return {
        ...session,
        associate: associate
          ? {
              ...associate,
              name: buildAssociateDisplayName(associate),
            }
          : null,
        store,
      };
    });

    return NextResponse.json({
      sessions: hydratedSessions,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: count ?? 0,
        totalPages: count ? Math.ceil(count / query.limit) : 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load practice sessions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
