import { NextRequest, NextResponse } from 'next/server';
import { getValidatedAdminUser } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase';
import { generateTrendCandidates } from '@/lib/trend-engine';

export const dynamic = 'force-dynamic';

function getScheduleSecret() {
  return process.env.TREND_ENGINE_SCHEDULE_SECRET || '';
}

export async function POST(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const secret = request.headers.get('x-trend-schedule-secret');
    if (getScheduleSecret() && secret !== getScheduleSecret()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const topic = body.topic || process.env.TREND_ENGINE_DEFAULT_TOPIC || 'luxury handbag styling';
    const audience = body.audience || process.env.TREND_ENGINE_DEFAULT_AUDIENCE || 'sales associates';
    const season = body.season || process.env.TREND_ENGINE_DEFAULT_SEASON || 'current season';
    const region = body.region || process.env.TREND_ENGINE_DEFAULT_REGION || 'US';
    const type = body.type || 'trend';
    const count = Number(body.count || 4);
    const scopeType = body.scopeType === 'store' ? 'store' : 'global';
    const storeId = body.storeId || null;

    const candidates = await generateTrendCandidates({
      topic,
      audience,
      season,
      region,
      type,
      count,
    });

    const supabase = getAdminClient();
    const rows = candidates.map((candidate) => ({
      type: candidate.type,
      category: candidate.category,
      title: candidate.title,
      description: candidate.description,
      engagement_text: candidate.engagementText,
      image_prompt: candidate.imagePrompt,
      image_url: candidate.imageUrl,
      trend_query: candidate.trendQuery,
      selection_payload: candidate.selectionPayload,
      scope_type: scopeType,
      store_id: storeId,
      trend_source: 'perplexity',
      status: 'generated',
    }));

    const { data, error } = await supabase.from('culture_trend_candidates').insert(rows).select('id');
    if (error) throw error;

    return NextResponse.json({ created: data?.length || 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Scheduled generation failed' }, { status: 500 });
  }
}
