import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { config } from '@/lib/config';
import { canManageScope, getRequestAdminContext } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Supabase session token' }, { status: 401 });
    }

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

    // Insert as pending_review so it goes through the publish-pulse audit trail
    const { data: feedItem, error: insertError } = await supabase
      .from('culture_feed_items')
      .insert({
        type: candidate.type,
        category: candidate.category,
        title: candidate.title,
        description: candidate.description,
        image_url: candidate.image_url,
        engagement_text: candidate.engagement_text,
        status: 'pending_review',
        is_published: false,
        sort_order: 0,
        scope_type: candidate.scope_type,
        store_id: candidate.store_id,
        store_region: candidate.store_region,
        source_candidate_id: candidate.id,
        submitted_by: context.userId,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Publish through the canonical publish-pulse function
    const publishRes = await fetch(config.netlifyFunctions.publishPulse, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify({ cardId: feedItem.id }),
    });

    if (!publishRes.ok) {
      const payload = await publishRes.json().catch(() => null);
      const errMsg = payload?.error || payload?.message || 'publish-pulse failed';
      // Clean up the unpublished feed item on failure
      await supabase.from('culture_feed_items').delete().eq('id', feedItem.id);
      throw new Error(errMsg);
    }

    // Mark the candidate as approved
    const { error: updateError } = await supabase
      .from('culture_trend_candidates')
      .update({
        status: 'approved',
        approved_by: context.userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', candidate.id);

    if (updateError) throw updateError;

    // Re-fetch the published item to return the final state
    const { data: publishedItem } = await supabase
      .from('culture_feed_items')
      .select('*')
      .eq('id', feedItem.id)
      .single();

    return NextResponse.json({ feedItem: publishedItem ?? feedItem });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Approval failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
