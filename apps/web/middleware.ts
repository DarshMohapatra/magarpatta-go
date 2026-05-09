import { NextResponse, type NextRequest } from 'next/server';

/**
 * On the dedicated super-admin host (env `SUPER_ADMIN_HOST=true`), only the
 * `/super-admin/*` routes and the snapshot API for inter-site polling are
 * served. Every other path bounces to /super-admin/signin so the deployment
 * doesn't accidentally expose customer/vendor/rider routes that aren't
 * pointed at any real database for that site.
 *
 * On the per-site instances (Magarpatta, Amanora, …) this var is unset and
 * the middleware is a no-op.
 */
export function middleware(req: NextRequest) {
  const isSuperAdminHost = process.env.SUPER_ADMIN_HOST === 'true';
  if (!isSuperAdminHost) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Allow super-admin pages, the super-admin API, and Next.js internals.
  if (
    pathname.startsWith('/super-admin') ||
    pathname.startsWith('/api/super-admin') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next();
  }

  // Everything else on this deployment redirects to the super-admin signin.
  const url = req.nextUrl.clone();
  url.pathname = '/super-admin/signin';
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next.js internals & static assets — middleware shouldn't touch them.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
