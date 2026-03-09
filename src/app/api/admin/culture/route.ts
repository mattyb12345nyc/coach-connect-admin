import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { canManageScope, getRequestAdminContext } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

function buildDisplayName(profile: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
} | null | undefined): string | null {
  if (!profile) return null;
  const fallback = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  return profile.display_name || fallback || null;
}

async function attachSubmittedByNames(
  supabase: ReturnType<typeof getAdminClient>,
  items: any[]
) {
  const submittedByIds = Array.from(
    new Set(items.map((item) => item.submitted_by).filter(Boolean))
  );

  if (submittedByIds.length === 0) {
    return items.map((item) => ({ ...item, submitted_by_name: null }));
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, first_name, last_name')
    .in('id', submittedByIds);

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, buildDisplayName(profile)])
  );

  return items.map((item) => ({
    ...item,
    submitted_by_name: item.submitted_by ? profileMap.get(item.submitted_by) ?? null : null,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    const supabase = getAdminClient();
    const audience = request.nextUrl.searchParams.get('audience');
    let query = supabase
      .from('culture_feed_items')
      .select('*')
      .order('sort_order');

    const { data, error } = await query;
    if (error) throw error;

    let filtered = await attachSubmittedByNames(supabase, data ?? []);

    if (audience === 'user') {
      const now = new Date().toISOString();
      filtered = filtered.filter(
        (item: any) =>
          item.is_published === true &&
          (item.status === 'active' || item.status == null) &&
          (!item.publish_date || item.publish_date <= now)
      );
    }

    if (context.role === 'store_manager') {
      let userRegion: string | null = null;
      if (context.storeId) {
        const { data: store } = await supabase
          .from('stores')
          .select('region')
          .eq('id', context.storeId)
          .single();
        userRegion = store?.region || null;
      }
      filtered = filtered.filter(
        (item: any) =>
          item.scope_type === 'global' ||
          (item.scope_type === 'region' && !!userRegion && item.store_region === userRegion) ||
          (item.scope_type === 'store' && item.store_id && context.storeId && item.store_id === context.storeId)
      );
    }

    if (audience === 'user') {
      if (!context.storeId) {
        filtered = filtered.filter((item: any) => item.scope_type === 'global');
      } else {
        const { data: store } = await supabase
          .from('stores')
          .select('region')
          .eq('id', context.storeId)
          .single();
        const userRegion = store?.region || null;
        filtered = filtered.filter(
          (item: any) =>
            item.scope_type === 'global' ||
            (item.scope_type === 'region' && userRegion && item.store_region === userRegion) ||
            (item.scope_type === 'store' && item.store_id === context.storeId)
        );
      }
    }

    return NextResponse.json(filtered);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    const supabase = getAdminClient();
    const body = await request.json();
    const scopeType = context.role === 'store_manager' ? 'store' : body.scope_type || 'global';
    const storeId = context.role === 'store_manager' ? context.storeId : body.store_id || null;
    const storeRegion =
      scopeType === 'region'
        ? body.store_region || null
        : scopeType === 'store'
        ? null
        : null;

    const permission = canManageScope(context, scopeType, storeId, storeRegion);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('culture_feed_items')
      .insert({
        ...body,
        status: body.status ?? (body.is_published ? 'active' : null),
        scope_type: scopeType,
        store_id: scopeType === 'store' ? storeId : null,
        store_region: scopeType === 'region' ? storeRegion : null,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    const supabase = getAdminClient();
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data: existing, error: existingError } = await supabase
      .from('culture_feed_items')
      .select('scope_type, store_id, store_region, status')
      .eq('id', id)
      .single();

    if (existingError) throw existingError;

    const targetScope = updates.scope_type || existing.scope_type;
    const targetStoreId =
      updates.store_id === undefined ? existing.store_id : updates.store_id;
    const targetRegion =
      updates.store_region === undefined ? existing.store_region : updates.store_region;

    const permission = canManageScope(context, targetScope, targetStoreId, targetRegion);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    if (updates.is_published === true && !updates.published_at) {
      updates.published_at = new Date().toISOString();
    }
    if (updates.is_published === true && updates.status === undefined && existing.status === 'pending_review') {
      updates.status = 'active';
    }

    const { data, error } = await supabase
      .from('culture_feed_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    const supabase = getAdminClient();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data: existing, error: existingError } = await supabase
      .from('culture_feed_items')
      .select('scope_type, store_id')
      .eq('id', id)
      .single();
    if (existingError) throw existingError;

    const permission = canManageScope(context, existing.scope_type, existing.store_id);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    const { error } = await supabase.from('culture_feed_items').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
