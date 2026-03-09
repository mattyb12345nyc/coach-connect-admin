import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function buildDisplayName(profile: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
} | null | undefined): string {
  if (!profile) return 'Unknown';
  const fallback = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  return profile.display_name || fallback || 'Unknown';
}

async function hydratePosts(
  supabase: ReturnType<typeof getAdminClient>,
  posts: any[]
) {
  if (posts.length === 0) return [];

  const userIds = Array.from(new Set(posts.map((post) => post.user_id).filter(Boolean)));
  const postIds = posts.map((post) => post.id);

  const [{ data: profiles }, { data: comments }] = await Promise.all([
    userIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, display_name, first_name, last_name, role, avatar_url, store_id')
          .in('id', userIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabase
          .from('community_comments')
          .select('post_id')
          .in('post_id', postIds)
      : Promise.resolve({ data: [] }),
  ]);

  const storeIds = Array.from(
    new Set((profiles ?? []).map((profile) => profile.store_id).filter(Boolean))
  );

  const { data: stores } = storeIds.length > 0
    ? await supabase
        .from('stores')
        .select('id, store_number, store_name')
        .in('id', storeIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const storeMap = new Map((stores ?? []).map((store) => [store.id, store]));
  const commentCountMap = new Map<string, number>();

  for (const comment of comments ?? []) {
    commentCountMap.set(comment.post_id, (commentCountMap.get(comment.post_id) ?? 0) + 1);
  }

  return posts.map((post) => {
    const profile = profileMap.get(post.user_id);
    const store = profile?.store_id ? storeMap.get(profile.store_id) : null;

    return {
      ...post,
      post_type: post.type,
      author_name: buildDisplayName(profile),
      author_avatar: profile?.avatar_url ?? null,
      author_role: profile?.role ?? '',
      author_store: store ? `${store.store_number} — ${store.store_name}` : '',
      comments_count: commentCountMap.get(post.id) ?? 0,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const status = request.nextUrl.searchParams.get('status');
    const type = request.nextUrl.searchParams.get('type');
    const flagged = request.nextUrl.searchParams.get('flagged');

    let query = supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);
    if (flagged === 'true') query = query.eq('is_flagged', true);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(await hydratePosts(supabase, data ?? []));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();
    const { data, error } = await supabase
      .from('community_posts')
      .insert(body)
      .select()
      .single();
    if (error) throw error;

    const [hydrated] = await hydratePosts(supabase, data ? [data] : []);
    return NextResponse.json(hydrated ?? data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('community_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    const [hydrated] = await hydratePosts(supabase, data ? [data] : []);
    return NextResponse.json(hydrated ?? data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase.from('community_posts').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
