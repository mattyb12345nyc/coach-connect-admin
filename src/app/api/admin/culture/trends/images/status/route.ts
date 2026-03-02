import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { generateCandidateImagesDetailed } from '@/lib/trend-engine';

export const dynamic = 'force-dynamic';

const STUCK_THRESHOLD_MS = 30_000;

export async function GET(request: NextRequest) {
  try {
    const idsParam = request.nextUrl.searchParams.get('ids');
    if (!idsParam) {
      return NextResponse.json({ error: 'ids query parameter is required' }, { status: 400 });
    }

    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No valid ids provided' }, { status: 400 });
    }

    const supabase = getAdminClient();

    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();
    await supabase
      .from('culture_trend_candidates')
      .update({ image_status: 'pending', image_error: 'Retrying after timeout' })
      .eq('image_status', 'processing')
      .lt('image_requested_at', cutoff);

    const { data, error } = await supabase
      .from('culture_trend_candidates')
      .select('id, image_status, image_url, image_error')
      .in('id', ids);

    if (error) throw error;

    return NextResponse.json({ candidates: data || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Status check failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const _t0 = Date.now();
  // #region agent log
  const _dl = (loc: string, msg: string, data: Record<string, unknown>) => { try { const fs = require('fs'); fs.appendFileSync('/tmp/debug-99cc76.log', JSON.stringify({sessionId:'99cc76',location:loc,message:msg,data,timestamp:Date.now()})+'\n'); } catch {} };
  // #endregion
  try {
    const supabase = getAdminClient();
    const body = await request.json().catch(() => ({}));
    const imageOptions = body?.imageOptions ?? {
      numberOfImages: 1,
      enableSearchGrounding: false,
      realWorldAccuracy: false,
      upscale4k: false,
    };
    const candidateIds: string[] = Array.isArray(body?.candidateIds)
      ? body.candidateIds.filter((id: unknown) => typeof id === 'string' && id.trim().length > 0)
      : [];

    let pendingQuery = supabase
      .from('culture_trend_candidates')
      .select('*')
      .eq('image_status', 'pending')
      .order('image_requested_at', { ascending: true })
      .limit(1);

    if (candidateIds.length > 0) {
      pendingQuery = pendingQuery.in('id', candidateIds);
    }

    const { data: pending, error: fetchErr } = await pendingQuery;

    // #region agent log
    _dl('status/route.ts:POST:pending-query', 'Pending query result', { pendingCount: pending?.length ?? 0, fetchErr: fetchErr?.message ?? null, hypothesisId: 'H1' });
    // #endregion

    if (fetchErr) throw fetchErr;
    if (!pending?.length) {
      // #region agent log
      _dl('status/route.ts:POST:no-pending', 'No pending candidates found', { hypothesisId: 'H1' });
      // #endregion
      return NextResponse.json({ processed: 0, remaining: 0 });
    }

    const candidate = pending[0];
    // #region agent log
    _dl('status/route.ts:POST:processing', 'Starting image generation', { candidateId: candidate.id, title: candidate.title, imagePrompt: (candidate.image_prompt || candidate.title).substring(0, 80), hypothesisId: 'H4' });
    // #endregion

    await supabase
      .from('culture_trend_candidates')
      .update({ image_status: 'processing' })
      .eq('id', candidate.id);

    try {
      const result = await generateCandidateImagesDetailed(
        candidate.image_prompt || candidate.title,
        { numberOfImages: 1, ...imageOptions }
      );
      const imageUrl = result.images[0] || null;
      // #region agent log
      _dl('status/route.ts:POST:gemini-result', 'Gemini generation result', { hasImage: !!imageUrl, imageUrlLength: imageUrl?.length ?? 0, diagnostics: result.diagnostics, elapsedMs: Date.now() - _t0, hypothesisId: 'H3,H4' });
      // #endregion
      const { error: updateErr } = await supabase
        .from('culture_trend_candidates')
        .update({
          image_url: imageUrl,
          image_status: imageUrl ? 'completed' : 'failed',
          image_error: imageUrl ? null : (result.diagnostics || 'No image returned'),
        })
        .eq('id', candidate.id);
      // #region agent log
      _dl('status/route.ts:POST:db-update', 'DB update after generation', { updateErr: updateErr?.message ?? null, hypothesisId: 'H3' });
      // #endregion
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Image generation failed';
      // #region agent log
      _dl('status/route.ts:POST:gemini-error', 'Gemini generation threw', { error: msg, elapsedMs: Date.now() - _t0, hypothesisId: 'H4' });
      // #endregion
      await supabase
        .from('culture_trend_candidates')
        .update({ image_status: 'failed', image_error: msg })
        .eq('id', candidate.id);
    }

    let remainingQuery = supabase
      .from('culture_trend_candidates')
      .select('id', { count: 'exact', head: true })
      .eq('image_status', 'pending');
    if (candidateIds.length > 0) {
      remainingQuery = remainingQuery.in('id', candidateIds);
    }
    const { count: remainingCount } = await remainingQuery;

    // #region agent log
    _dl('status/route.ts:POST:done', 'Processing complete', { remaining: remainingCount, totalElapsedMs: Date.now() - _t0, hypothesisId: 'H4' });
    // #endregion
    return NextResponse.json({ processed: 1, remaining: remainingCount || 0 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Processing failed';
    // #region agent log
    _dl('status/route.ts:POST:top-error', 'Top-level error', { error: msg, elapsedMs: Date.now() - _t0, hypothesisId: 'H1,H4' });
    // #endregion
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
