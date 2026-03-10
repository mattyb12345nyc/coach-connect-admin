import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthEmailMapByUserIds } from '@/lib/admin-directory';
import { getValidatedAdminUser } from '@/lib/admin-auth';
import {
  buildUserPracticeMetrics,
  mergeProfilesWithAuthData,
  type RealProfileRecord,
} from '@/lib/admin-practice';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PROFILE_SELECT = 'id, first_name, last_name, display_name, avatar_url, store_id, role, status, is_approved, created_at, stores(id, store_number, store_name, city, state, region)';
const SESSION_METRICS_SELECT = 'user_id, overall_score, scoring_status';

function matchesProfileSearch(
  profile: RealProfileRecord & { email?: string | null },
  search: string
) {
  const normalized = search.toLowerCase();
  return [
    profile.display_name,
    profile.first_name,
    profile.last_name,
    profile.email ?? null,
  ].some((value) => value?.toLowerCase().includes(normalized));
}

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
      .select(PROFILE_SELECT)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);
    if (role && role !== 'all') query = query.eq('role', role);
    if (storeId) query = query.eq('store_id', storeId);

    const { data: profileRows, error } = await query;
    if (error) throw error;

    const profiles = (profileRows ?? []) as unknown as RealProfileRecord[];
    if (profiles.length === 0) {
      return NextResponse.json([]);
    }

    const userIds = profiles.map((profile) => profile.id);
    const [{ data: sessionRows, error: sessionsError }, emailByUserId] = await Promise.all([
      supabase
        .from('practice_sessions')
        .select(SESSION_METRICS_SELECT)
        .in('user_id', userIds),
      fetchAuthEmailMapByUserIds(supabase, userIds),
    ]);

    if (sessionsError) throw sessionsError;

    const practiceMetricsByUserId = buildUserPracticeMetrics(
      ((sessionRows ?? []) as Array<{
        user_id: string;
        overall_score: number | null;
        scoring_status: string | null;
      }>)
    );

    const enrichedProfiles = mergeProfilesWithAuthData(
      profiles,
      emailByUserId,
      practiceMetricsByUserId
    );

    const filteredProfiles = search
      ? enrichedProfiles.filter((profile) => matchesProfileSearch(profile, search))
      : enrichedProfiles;

    return NextResponse.json(filteredProfiles);
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
      'status', 'role', 'store_id', 'first_name', 'last_name',
      'display_name', 'avatar_url', 'is_approved',
    ];
    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) sanitized[key] = updates[key];
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(sanitized)
      .eq('id', id)
      .select(PROFILE_SELECT)
      .single();

    if (error) throw error;

    const [{ data: sessionRows, error: sessionsError }, emailByUserId] = await Promise.all([
      supabase
        .from('practice_sessions')
        .select(SESSION_METRICS_SELECT)
        .eq('user_id', id),
      fetchAuthEmailMapByUserIds(supabase, [id]),
    ]);

    if (sessionsError) throw sessionsError;

    const practiceMetricsByUserId = buildUserPracticeMetrics(
      ((sessionRows ?? []) as Array<{
        user_id: string;
        overall_score: number | null;
        scoring_status: string | null;
      }>)
    );

    const [enrichedProfile] = mergeProfilesWithAuthData(
      [(data as unknown as RealProfileRecord)],
      emailByUserId,
      practiceMetricsByUserId
    );

    return NextResponse.json(enrichedProfile);
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

    // Bulk delete test accounts by matching auth email, not a profile column.
    if (body.deleteTestAccounts === true) {
      const { data: profileRows, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      const profiles = (profileRows ?? []) as Array<{ id: string }>;
      if (profiles.length === 0) {
        return NextResponse.json({ success: true, deleted: 0 });
      }

      const ids = profiles.map((profile) => profile.id);
      const emailByUserId = await fetchAuthEmailMapByUserIds(supabase, ids);
      const matchingIds = ids.filter((profileId) =>
        (emailByUserId.get(profileId) ?? '').toLowerCase().includes('mattyb123')
      );

      if (matchingIds.length === 0) {
        return NextResponse.json({ success: true, deleted: 0 });
      }

      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .in('id', matchingIds);

      if (deleteError) throw deleteError;
      return NextResponse.json({ success: true, deleted: matchingIds.length });
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
