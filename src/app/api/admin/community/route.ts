import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const status = request.nextUrl.searchParams.get('status');
    const type = request.nextUrl.searchParams.get('type');
    const flagged = request.nextUrl.searchParams.get('flagged');

    let query = supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('post_type', type);
    if (flagged === 'true') query = query.eq('is_flagged', true);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();
    const { data, error } = await supabase
      .from('community_posts')
      .insert(body)
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
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('community_posts')
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
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase.from('community_posts').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
