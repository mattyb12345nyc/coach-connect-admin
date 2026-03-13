import { NextRequest, NextResponse } from 'next/server';
import { getValidatedAdminUser } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('type, is_read');

    if (error) throw error;

    const rows = data ?? [];
    const byType: Record<string, { total: number; unread: number }> = {};

    for (const row of rows) {
      if (!byType[row.type]) byType[row.type] = { total: 0, unread: 0 };
      byType[row.type].total += 1;
      if (!row.is_read) byType[row.type].unread += 1;
    }

    return NextResponse.json({
      total: rows.length,
      unread: rows.filter(r => !r.is_read).length,
      by_type: byType,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
