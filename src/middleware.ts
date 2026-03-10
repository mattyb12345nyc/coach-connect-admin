import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getValidatedAdminUser } from '@/lib/admin-auth';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Get theme from cookie or default to light
  const theme = request.cookies.get('customgpt-theme')?.value || 'light';

  // Set theme header for SSR
  response.headers.set('x-theme', theme);

  const { pathname } = request.nextUrl;
  const isAdminLoginRoute = pathname === '/admin/login';
  const isAdminPageRoute = pathname.startsWith('/admin') && !isAdminLoginRoute;
  const isAdminApiRoute = pathname.startsWith('/api/admin');
  const isProtectedAdminRoute = isAdminPageRoute || isAdminApiRoute;

  if (!isProtectedAdminRoute && !isAdminLoginRoute) {
    return response;
  }

  const adminUser = await getValidatedAdminUser(request);
  if (isAdminLoginRoute) {
    if (adminUser) {
      return NextResponse.redirect(new URL('/admin/today', request.url));
    }

    return response;
  }

  if (adminUser) {
    return response;
  }

  if (isAdminApiRoute) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.redirect(new URL('/admin/login', request.url));
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};