import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { canManageScope, getRequestAdminContext } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = getAdminClient();
    const status = request.nextUrl.searchParams.get('status');

    let query = supabase
      .from('culture_trend_candidates')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    if (context.role === 'store_manager') {
      query = query.eq('scope_type', 'store').eq('store_id', context.storeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = getAdminClient();
    const body = await request.json();
    const { id, title, description, engagement_text } = body as {
      id: string;
      title?: string;
      description?: string;
      engagement_text?: string;
    };

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data: candidate, error: fetchError } = await supabase
      .from('culture_trend_candidates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    if (candidate.status !== 'generated') {
      return NextResponse.json({ error: 'Only generated candidates can be edited' }, { status: 400 });
    }

    const permission = canManageScope(
      context,
      candidate.scope_type,
      candidate.store_id,
      candidate.store_region
    );
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason ?? 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof title === 'string') updates.title = title;
    if (typeof description === 'string') updates.description = description;
    if (engagement_text !== undefined) updates.engagement_text = engagement_text ?? null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(candidate);
    }

    const { data: updated, error: updateError } = await supabase
      .from('culture_trend_candidates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Update failed' }, { status: 500 });
  }
}
