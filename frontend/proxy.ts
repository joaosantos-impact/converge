import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge-compatible middleware — checks for session cookie presence.
 * 
 * We can't call auth.api.getSession() here because Better Auth uses
 * Node.js `crypto` which isn't available in the Edge runtime.
 * 
 * Instead, we check for the session token cookie:
 * - Development: "better-auth.session_token"
 * - Production (secure cookies): "__Secure-better-auth.session_token"
 * 
 * The actual session validation (signature, expiry) still happens
 * server-side in each API route via getServerSession().
 * This middleware acts as a fast gate to redirect unauthenticated users.
 */
function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has('better-auth.session_token') ||
    request.cookies.has('__Secure-better-auth.session_token')
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!hasSessionCookie(request)) {
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!hasSessionCookie(request)) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
    // Note: admin email check happens server-side in the admin page/API routes
    // because we can't decode the session token in Edge runtime
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
