import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { canManageScope, getRequestAdminContext, type ScopeType } from '@/lib/admin-permissions';
import { generateTrendCandidates, type TrendSelections } from '@/lib/trend-engine';

export const dynamic = 'force-dynamic';

interface GenerateRequestBody {
  selections: TrendSelections;
  scopeType?: ScopeType;
  storeId?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    const supabase = getAdminClient();
    const body = (await request.json()) as GenerateRequestBody;

    if (!body?.selections?.topic) {
      return NextResponse.json({ error: 'selections.topic is required' }, { status: 400 });
    }

    const requestedScope = body.scopeType ?? 'global';
    const requestedStoreId = body.storeId ?? null;

    const permission = canManageScope(context, requestedScope, requestedStoreId);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    const finalScope: ScopeType = context.role === 'manager' ? 'store' : requestedScope;
    const finalStoreId = context.role === 'manager' ? context.storeId : requestedStoreId;

    const generated = await generateTrendCandidates({
      ...body.selections,
      count: 7,
    });

    const rows = generated.map((candidate) => ({
      type: candidate.type,
      category: candidate.category,
      title: candidate.title,
      description: candidate.description,
      engagement_text: candidate.engagementText,
      image_prompt: candidate.imagePrompt,
      image_url: candidate.imageUrl,
      trend_query: candidate.trendQuery,
      selection_payload: candidate.selectionPayload,
      scope_type: finalScope,
      store_id: finalStoreId,
      generated_by: context.userId,
      trend_source: 'perplexity',
      status: 'generated',
    }));

    const { data, error } = await supabase
      .from('culture_trend_candidates')
      .insert(rows)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ candidates: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Generation failed' }, { status: 500 });
  }
}
