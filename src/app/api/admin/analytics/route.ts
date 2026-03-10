import { NextRequest, NextResponse } from 'next/server';
import { getValidatedAdminUser } from '@/lib/admin-auth';
import { getAnalytics } from '@/lib/admin/analytics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const analytics = await getAnalytics();
    
    return NextResponse.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[ADMIN_API] Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
