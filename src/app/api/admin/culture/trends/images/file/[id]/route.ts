import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import { getAdminClient } from '@/lib/supabase';
import { canManageScope, getRequestAdminContext } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

type ImageEntity = 'candidate' | 'feed';

function parseEntity(value: string | null): ImageEntity {
  return value === 'feed' ? 'feed' : 'candidate';
}

function parseStoragePublicPath(imageUrl: string): { bucket: string; objectPath: string } | null {
  const marker = '/storage/v1/object/public/';
  const index = imageUrl.indexOf(marker);
  if (index === -1) return null;

  const rest = imageUrl.slice(index + marker.length);
  const parts = rest.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const [bucket, ...pathParts] = parts;
  const objectPath = decodeURIComponent(pathParts.join('/'));
  if (!bucket || !objectPath) return null;
  return { bucket, objectPath };
}

function decodeDataUriImage(dataUri: string): { blob: Blob; contentType: string } | null {
  const match = dataUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const [, contentType, base64] = match;
  const bytes = Buffer.from(base64, 'base64');
  return { blob: new Blob([bytes], { type: contentType }), contentType };
}

async function getImageUrlForEntity(id: string, entity: ImageEntity, request: NextRequest): Promise<string | null> {
  const context = await getRequestAdminContext(request);
  if (!context) {
    throw new Error('Unauthorized');
  }

  const supabase = getAdminClient();

  if (entity === 'candidate') {
    const { data: candidate, error } = await supabase
      .from('culture_trend_candidates')
      .select('id, image_url, scope_type, store_id, store_region')
      .eq('id', id)
      .single();

    if (error || !candidate) return null;

    const permission = canManageScope(context, candidate.scope_type, candidate.store_id, candidate.store_region);
    if (!permission.allowed) {
      throw new Error(permission.reason || 'Forbidden');
    }

    return candidate.image_url || null;
  }

  const { data: item, error } = await supabase
    .from('culture_feed_items')
    .select('id, image_url, scope_type, store_id, store_region')
    .eq('id', id)
    .single();

  if (error || !item) return null;

  const permission = canManageScope(context, item.scope_type, item.store_id, item.store_region);
  if (!permission.allowed) {
    throw new Error(permission.reason || 'Forbidden');
  }

  return item.image_url || null;
}

async function tryStorageDownload(imageUrl: string) {
  const parsed = parseStoragePublicPath(imageUrl);
  if (!parsed) return null;

  const supabase = getAdminClient();
  const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.objectPath);
  if (error || !data) return null;

  const body = await data.arrayBuffer();
  return { body, contentType: data.type || 'image/png' };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entity = parseEntity(request.nextUrl.searchParams.get('entity'));
    const imageUrl = await getImageUrlForEntity(params.id, entity, request);
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const inlineImage = decodeDataUriImage(imageUrl);
    if (inlineImage) {
      return new NextResponse(inlineImage.blob, {
        status: 200,
        headers: {
          'Content-Type': inlineImage.contentType,
          'Cache-Control': 'private, max-age=60',
        },
      });
    }

    const fromStorage = await tryStorageDownload(imageUrl);
    if (fromStorage) {
      return new NextResponse(fromStorage.body, {
        status: 200,
        headers: {
          'Content-Type': fromStorage.contentType,
          'Cache-Control': 'private, max-age=60',
        },
      });
    }

    let parsed: URL;
    try {
      parsed = new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }

    if (parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only https image URLs are supported' }, { status: 400 });
    }

    const upstream = await fetch(parsed.toString(), { cache: 'no-store' });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Failed to fetch upstream image' }, { status: 502 });
    }

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'image/png',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load image';
    const lowered = message.toLowerCase();
    const status = lowered.includes('unauthorized') ? 401 : lowered.includes('forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
