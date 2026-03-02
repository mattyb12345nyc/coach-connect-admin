import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { generateCandidateImagesDetailed } from '@/lib/trend-engine';

export const dynamic = 'force-dynamic';

const ROUTE_TIME_BUDGET_MS = 20_000;

function getBaseUrl(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  const routeStart = Date.now();

  const secret = request.headers.get('x-process-secret');
  const expected = process.env.IMAGE_PROCESS_SECRET || 'internal';
  if (secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getAdminClient();
    const body = await request.json().catch(() => ({}));
    const imageOptions = body?.imageOptions ?? {
      numberOfImages: 1,
      enableSearchGrounding: false,
      realWorldAccuracy: false,
      upscale4k: false,
    };

    const { data: pending, error: fetchErr } = await supabase
      .from('culture_trend_candidates')
      .select('*')
      .eq('image_status', 'pending')
      .order('image_requested_at', { ascending: true })
      .limit(10);

    if (fetchErr) throw fetchErr;
    if (!pending?.length) {
      return NextResponse.json({ processed: 0, remaining: 0 });
    }

    let processed = 0;
    for (const candidate of pending) {
      const elapsed = Date.now() - routeStart;
      if (elapsed > ROUTE_TIME_BUDGET_MS) break;

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
        await supabase
          .from('culture_trend_candidates')
          .update({
            image_url: imageUrl,
            image_status: imageUrl ? 'completed' : 'failed',
            image_error: imageUrl ? null : (result.diagnostics || 'No image returned'),
          })
          .eq('id', candidate.id);
        processed++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Image generation failed';
        await supabase
          .from('culture_trend_candidates')
          .update({ image_status: 'failed', image_error: msg })
          .eq('id', candidate.id);
        processed++;
      }
    }

    const { count: remainingCount } = await supabase
      .from('culture_trend_candidates')
      .select('id', { count: 'exact', head: true })
      .eq('image_status', 'pending');

    if (remainingCount && remainingCount > 0) {
      const baseUrl = getBaseUrl(request);
      fetch(`${baseUrl}/api/admin/culture/trends/images/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-process-secret': expected },
        body: JSON.stringify({ imageOptions }),
      }).catch(() => {});
    }

    return NextResponse.json({ processed, remaining: remainingCount || 0 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Processing failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
