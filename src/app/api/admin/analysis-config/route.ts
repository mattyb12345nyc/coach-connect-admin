import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getAdminClient();
    const [configRes, categoriesRes] = await Promise.all([
      supabase.from('analysis_config').select('*').limit(1).single(),
      supabase.from('scoring_categories').select('*').order('sort_order'),
    ]);

    if (configRes.error) throw configRes.error;
    if (categoriesRes.error) throw categoriesRes.error;

    return NextResponse.json({
      config: configRes.data,
      categories: categoriesRes.data,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();

    if (body.config) {
      const { id, ...updates } = body.config;
      if (id) {
        const { error } = await supabase
          .from('analysis_config')
          .update(updates)
          .eq('id', id);
        if (error) throw error;
      }
    }

    if (body.categories) {
      for (const cat of body.categories) {
        const { id, ...updates } = cat;
        if (id) {
          const { error } = await supabase
            .from('scoring_categories')
            .update(updates)
            .eq('id', id);
          if (error) throw error;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();

    if (body.type === 'category') {
      const { type, ...record } = body;
      const { data, error } = await supabase
        .from('scoring_categories')
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabase.from('scoring_categories').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
