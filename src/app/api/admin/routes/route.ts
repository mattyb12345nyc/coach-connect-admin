import { NextRequest, NextResponse } from 'next/server';
import { getValidatedAdminUser } from '@/lib/admin-auth';
import { getRouteProtectionStatus, getAllRouteStatus } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    
    const url = new URL(request.url);
    const path = url.searchParams.get('path');
    
    if (path) {
      // Get status for specific path
      const status = getRouteProtectionStatus(path);
      return NextResponse.json({
        success: true,
        data: status
      });
    } else {
      // Get all route statuses
      const allRoutes = getAllRouteStatus();
      return NextResponse.json({
        success: true,
        data: allRoutes
      });
    }
  } catch (error: any) {
    console.error('[ADMIN_ROUTES] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get route status' },
      { status: error.status || 500 }
    );
  }
}
