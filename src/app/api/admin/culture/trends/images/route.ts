import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { canManageScope, getRequestAdminContext } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

function getBaseUrl(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  // #region agent log
  const _dl = (loc: string, msg: string, data: Record<string, unknown>) => { try { const fs = require('fs'); fs.appendFileSync('/tmp/debug-99cc76.log', JSON.stringify({sessionId:'99cc76',location:loc,message:msg,data,timestamp:Date.now()})+'\n'); } catch {} };
  // #endregion
  try {
    const context = await getRequestAdminContext(request);
    const supabase = getAdminClient();
    const {
      candidateIds,
      numberOfImages,
      enableSearchGrounding,
      realWorldAccuracy,
      upscale4k,
    } = await request.json();

    // #region agent log
    _dl('images/route.ts:POST:entry', 'Kick-off received', { candidateIds, candidateIdCount: candidateIds?.length, hypothesisId: 'H1' });
    // #endregion

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ error: 'candidateIds must be a non-empty array' }, { status: 400 });
    }

    const { data: candidates, error: fetchError } = await supabase
      .from('culture_trend_candidates')
      .select('*')
      .in('id', candidateIds)
      .eq('status', 'generated');

    // #region agent log
    _dl('images/route.ts:POST:db-query', 'DB query for generated candidates', { foundCount: candidates?.length ?? 0, fetchError: fetchError?.message ?? null, candidateStatuses: candidates?.map((c: any) => ({ id: c.id, status: c.status, image_status: c.image_status })), hypothesisId: 'H1' });
    // #endregion

    if (fetchError) throw fetchError;
    if (!candidates?.length) {
      // #region agent log
      _dl('images/route.ts:POST:no-eligible', 'No eligible candidates', { requestedIds: candidateIds, hypothesisId: 'H1' });
      // #endregion
      return NextResponse.json({ error: 'No eligible candidates found' }, { status: 404 });
    }

    for (const candidate of candidates) {
      const permission = canManageScope(context, candidate.scope_type, candidate.store_id);
      if (!permission.allowed) {
        return NextResponse.json({ error: permission.reason }, { status: 403 });
      }
    }

    const toProcess = candidates.filter((c) => !c.image_url);
    const alreadyDone = candidates.filter((c) => !!c.image_url);

    if (alreadyDone.length > 0) {
      await supabase
        .from('culture_trend_candidates')
        .update({ image_status: 'completed' })
        .in('id', alreadyDone.map((c) => c.id));
    }

    if (toProcess.length === 0) {
      return NextResponse.json({
        queued: 0,
        completed: alreadyDone.length,
        candidateIds: candidates.map((c) => c.id),
      });
    }

    await supabase
      .from('culture_trend_candidates')
      .update({ image_status: 'pending', image_error: null, image_requested_at: new Date().toISOString() })
      .in('id', toProcess.map((c) => c.id));

    const imageOptions = {
      numberOfImages: 1,
      enableSearchGrounding: Boolean(enableSearchGrounding),
      realWorldAccuracy: Boolean(realWorldAccuracy),
      upscale4k: Boolean(upscale4k),
    };

    const baseUrl = getBaseUrl(request);
    const processSecret = process.env.IMAGE_PROCESS_SECRET;
    if (!processSecret) {
      return NextResponse.json(
        { error: 'IMAGE_PROCESS_SECRET is not configured' },
        { status: 500 }
      );
    }
    fetch(`${baseUrl}/api/admin/culture/trends/images/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-process-secret': processSecret },
      body: JSON.stringify({ imageOptions }),
    }).catch(() => {});

    return NextResponse.json({
      queued: toProcess.length,
      completed: alreadyDone.length,
      candidateIds: candidates.map((c) => c.id),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Image generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
