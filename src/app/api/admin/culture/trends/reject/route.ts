import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { canManageScope, getRequestAdminContext } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    const supabase = getAdminClient();
    const { candidateId, reason } = await request.json();

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

    const permission = canManageScope(
      context,
      candidate.scope_type,
      candidate.store_id,
      candidate.store_region
    );
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from('culture_trend_candidates')
      .update({
        status: 'rejected',
        rejection_reason: reason || null,
        approved_by: context.userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', candidate.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Reject failed' }, { status: 500 });
  }
}
