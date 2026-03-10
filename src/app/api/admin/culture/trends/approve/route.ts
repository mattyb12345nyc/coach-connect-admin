import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { canManageScope, getRequestAdminContext } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = getAdminClient();
    const { candidateId } = await request.json();

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
    }

    const { data: candidate, error: candidateError } = await supabase
      .from('culture_trend_candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError) throw candidateError;
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    if (candidate.status !== 'generated') {
      return NextResponse.json({ error: 'Candidate is not in generated status' }, { status: 400 });
    }
    if (!candidate.image_url) {
      return NextResponse.json(
        { error: 'Generate images for selected candidates before approval' },
        { status: 400 }
      );
    }

    const permission = canManageScope(
      context,
      candidate.scope_type,
      candidate.store_id,
      candidate.store_region
    );
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    const { data: feedItem, error: insertError } = await supabase
      .from('culture_feed_items')
      .insert({
        type: candidate.type,
        category: candidate.category,
        title: candidate.title,
        description: candidate.description,
        image_url: candidate.image_url,
        engagement_text: candidate.engagement_text,
        status: 'active',
        is_published: true,
        published_at: new Date().toISOString(),
        sort_order: 0,
        scope_type: candidate.scope_type,
        store_id: candidate.store_id,
        store_region: candidate.store_region,
        source_candidate_id: candidate.id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from('culture_trend_candidates')
      .update({
        status: 'approved',
        approved_by: context.userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', candidate.id);

    if (updateError) throw updateError;

    return NextResponse.json({ feedItem });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Approval failed' }, { status: 500 });
  }
}
