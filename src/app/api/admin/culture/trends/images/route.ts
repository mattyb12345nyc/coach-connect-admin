import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { canManageScope, getRequestAdminContext } from '@/lib/admin-permissions';
import { generateCandidateImagesDetailed } from '@/lib/trend-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ error: 'candidateIds must be a non-empty array' }, { status: 400 });
    }

    const { data: candidates, error: fetchError } = await supabase
      .from('culture_trend_candidates')
      .select('*')
      .in('id', candidateIds)
      .eq('status', 'generated');

    if (fetchError) throw fetchError;
    if (!candidates?.length) {
      return NextResponse.json({ error: 'No eligible candidates found' }, { status: 404 });
    }

    for (const candidate of candidates) {
      const permission = canManageScope(context, candidate.scope_type, candidate.store_id);
      if (!permission.allowed) {
        return NextResponse.json({ error: permission.reason }, { status: 403 });
      }
    }

    const updates = await Promise.all(
      candidates.map(async (candidate) => {
        const detailedResult =
          candidate.image_url
            ? { images: [candidate.image_url], diagnostics: 'existing image reused' }
            : await generateCandidateImagesDetailed(candidate.image_prompt || candidate.title, {
                numberOfImages: Number(numberOfImages) || 1,
                enableSearchGrounding: Boolean(enableSearchGrounding),
                realWorldAccuracy: Boolean(realWorldAccuracy),
                upscale4k: Boolean(upscale4k),
              });
        const imageUrl = detailedResult.images[0] || null;
        const { data, error } = await supabase
          .from('culture_trend_candidates')
          .update({ image_url: imageUrl })
          .eq('id', candidate.id)
          .select('*')
          .single();
        if (error) throw error;
        return {
          ...data,
          generated_image_count: detailedResult.images.length,
          image_diagnostics: detailedResult.diagnostics,
        };
      })
    );

    const generatedCount = updates.filter((candidate) => Boolean(candidate.image_url)).length;
    const failedCount = updates.length - generatedCount;
    const totalImagesGenerated = updates.reduce(
      (sum, candidate) => sum + Number(candidate.generated_image_count || 0),
      0
    );

    const diagnostics = updates
      .map((candidate) => candidate.image_diagnostics)
      .filter(Boolean)
      .slice(0, 3)
      .join(' | ');

    if (generatedCount === 0) {
      return NextResponse.json(
        {
          error: 'Image provider returned no images for the selected trends',
          candidates: updates,
          generatedCount,
          failedCount,
          totalImagesGenerated,
          diagnostics,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      candidates: updates,
      generatedCount,
      failedCount,
      totalImagesGenerated,
      diagnostics,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Image generation failed' }, { status: 500 });
  }
}
