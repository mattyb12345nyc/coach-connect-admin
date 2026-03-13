import { NextRequest, NextResponse } from 'next/server';
import { getValidatedAdminUser } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { post_id, reason, flagged_by, detail } = await request.json();

    if (!post_id) {
      return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
    }

    const validReasons = ['profanity', 'spam', 'reported', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `reason must be one of: ${validReasons.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const { data: flag, error: flagError } = await supabase
      .from('flagged_content')
      .insert({
        post_id,
        reason,
        detail: detail || null,
        flagged_by: flagged_by || null,
      })
      .select()
      .single();

    if (flagError) throw flagError;

    await supabase
      .from('community_posts')
      .update({ is_flagged: true, status: 'hidden' })
      .eq('id', post_id);

    return NextResponse.json(flag, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getAdminClient();
    const postId = request.nextUrl.searchParams.get('post_id');

    let query = supabase
      .from('flagged_content')
      .select('*')
      .order('created_at', { ascending: false });

    if (postId) query = query.eq('post_id', postId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
