import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-storage')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/register');
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard');

  // Check if user has auth token in localStorage (stored by zustand)
  // Since middleware runs on server, we'll check cookies or redirect client-side

  if (isDashboardPage && !token) {
    // Redirect to login if trying to access dashboard without auth
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPage && token) {
    // Redirect to dashboard if already logged in
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
