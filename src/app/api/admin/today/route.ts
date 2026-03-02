import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { canManageScope, getRequestAdminContext } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    const supabase = getAdminClient();
    const table = request.nextUrl.searchParams.get('table');
    const audience = request.nextUrl.searchParams.get('audience');

    let userRegion: string | null = null;
    if (context.storeId) {
      const { data: store } = await supabase.from('stores').select('region').eq('id', context.storeId).single();
      userRegion = store?.region || null;
    }

    const filterScope = <T extends { scope_type?: string; store_id?: string | null; store_region?: string | null }>(
      items: T[]
    ) => {
      if (audience === 'user' || context.role === 'manager') {
        return items.filter(
          (item) =>
            item.scope_type === 'global' ||
            (item.scope_type === 'region' && !!userRegion && item.store_region === userRegion) ||
            (item.scope_type === 'store' && !!context.storeId && item.store_id === context.storeId)
        );
      }
      return items;
    };

    if (table === 'focus_cards') {
      const { data, error } = await supabase
        .from('today_focus_cards')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return NextResponse.json(filterScope(data ?? []));
    }

    if (table === 'cultural_moments') {
      const { data, error } = await supabase
        .from('cultural_moments')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return NextResponse.json(filterScope(data ?? []));
    }

    if (table === 'whats_new') {
      const { data, error } = await supabase
        .from('whats_new_items')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return NextResponse.json(filterScope(data ?? []));
    }

    const [focusCards, moments, whatsNew] = await Promise.all([
      supabase.from('today_focus_cards').select('*').order('sort_order'),
      supabase.from('cultural_moments').select('*').order('sort_order'),
      supabase.from('whats_new_items').select('*').order('sort_order'),
    ]);

    return NextResponse.json({
      focus_cards: filterScope(focusCards.data ?? []),
      cultural_moments: filterScope(moments.data ?? []),
      whats_new: filterScope(whatsNew.data ?? []),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    const supabase = getAdminClient();
    const body = await request.json();
    const { table, ...record } = body;
    const scopeType = context.role === 'manager' ? 'store' : record.scope_type || 'global';
    const storeId = context.role === 'manager' ? context.storeId : record.store_id || null;
    const storeRegion = scopeType === 'region' ? record.store_region || null : null;

    const tableMap: Record<string, string> = {
      focus_cards: 'today_focus_cards',
      cultural_moments: 'cultural_moments',
      whats_new: 'whats_new_items',
    };

    const tableName = tableMap[table];
    if (!tableName) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    const permission = canManageScope(context, scopeType, storeId, storeRegion);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    const { data, error } = await supabase
      .from(tableName)
      .insert({
        ...record,
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
    const body = await request.json();
    const { table, id, ...updates } = body;

    const tableMap: Record<string, string> = {
      focus_cards: 'today_focus_cards',
      cultural_moments: 'cultural_moments',
      whats_new: 'whats_new_items',
    };

    const tableName = tableMap[table];
    if (!tableName) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from(tableName)
      .select('scope_type, store_id, store_region')
      .eq('id', id)
      .single();
    if (existingError) throw existingError;

    const targetScope = updates.scope_type || existing.scope_type;
    const targetStoreId = updates.store_id === undefined ? existing.store_id : updates.store_id;
    const targetRegion =
      updates.store_region === undefined ? existing.store_region : updates.store_region;

    const permission = canManageScope(context, targetScope, targetStoreId, targetRegion);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    const { data, error } = await supabase
      .from(tableName)
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
    const { table, id } = await request.json();

    const tableMap: Record<string, string> = {
      focus_cards: 'today_focus_cards',
      cultural_moments: 'cultural_moments',
      whats_new: 'whats_new_items',
    };

    const tableName = tableMap[table];
    if (!tableName) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from(tableName)
      .select('scope_type, store_id, store_region')
      .eq('id', id)
      .single();
    if (existingError) throw existingError;

    const permission = canManageScope(
      context,
      existing.scope_type,
      existing.store_id,
      existing.store_region
    );
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
