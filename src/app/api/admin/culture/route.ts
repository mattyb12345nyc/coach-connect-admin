import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { canManageScope, getRequestAdminContext } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    const supabase = getAdminClient();
    const audience = request.nextUrl.searchParams.get('audience');

    let query = supabase
      .from('culture_feed_items')
      .select('*')
      .order('sort_order');

    if (audience === 'user') {
      if (context.storeId) {
        query = query
          .eq('is_published', true)
          .or(`scope_type.eq.global,and(scope_type.eq.store,store_id.eq.${context.storeId})`);
      } else {
        query = query.eq('is_published', true).eq('scope_type', 'global');
      }
    } else if (context.role === 'manager') {
      query = query.or(`scope_type.eq.global,and(scope_type.eq.store,store_id.eq.${context.storeId})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestAdminContext(request);
    const supabase = getAdminClient();
    const body = await request.json();
    const scopeType = context.role === 'manager' ? 'store' : body.scope_type || 'global';
    const storeId = context.role === 'manager' ? context.storeId : body.store_id || null;

    const permission = canManageScope(context, scopeType, storeId);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('culture_feed_items')
      .insert({ ...body, scope_type: scopeType, store_id: storeId })
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
      .select('scope_type, store_id')
      .eq('id', id)
      .single();

    if (existingError) throw existingError;

    const targetScope = updates.scope_type || existing.scope_type;
    const targetStoreId =
      updates.store_id === undefined ? existing.store_id : updates.store_id;

    const permission = canManageScope(context, targetScope, targetStoreId);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    if (updates.is_published === true && !updates.published_at) {
      updates.published_at = new Date().toISOString();
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
