import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const table = request.nextUrl.searchParams.get('table');

    if (table === 'focus_cards') {
      const { data, error } = await supabase
        .from('today_focus_cards')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (table === 'cultural_moments') {
      const { data, error } = await supabase
        .from('cultural_moments')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (table === 'whats_new') {
      const { data, error } = await supabase
        .from('whats_new_items')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return NextResponse.json(data);
    }

    const [focusCards, moments, whatsNew] = await Promise.all([
      supabase.from('today_focus_cards').select('*').order('sort_order'),
      supabase.from('cultural_moments').select('*').order('sort_order'),
      supabase.from('whats_new_items').select('*').order('sort_order'),
    ]);

    return NextResponse.json({
      focus_cards: focusCards.data ?? [],
      cultural_moments: moments.data ?? [],
      whats_new: whatsNew.data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();
    const { table, ...record } = body;

    const tableMap: Record<string, string> = {
      focus_cards: 'today_focus_cards',
      cultural_moments: 'cultural_moments',
      whats_new: 'whats_new_items',
    };

    const tableName = tableMap[table];
    if (!tableName) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from(tableName)
      .insert(record)
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

    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
