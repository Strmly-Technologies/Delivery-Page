import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Define which routes require authentication
const protectedRoutes = [
  '/dashboard',
  '/cart',
  '/checkout',
  '/orders',
  '/order-confirmation',
];

// Define admin routes
const adminRoutes = [
  '/admin/dashboard',
  '/admin/orders',
  '/admin/products/add',
  '/admin/users',
];

// Define authentication exempt routes
const authRoutes = ['/login', '/signup', '/admin/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get auth token from cookies
  const authToken = request.cookies.get('authToken')?.value;

    console.log('=== MIDDLEWARE DEBUG ===');
  console.log('Pathname:', pathname);
  console.log('Has authToken:', !!authToken);
  console.log('All cookies:', request.cookies.getAll());
  console.log('=======================');
  
  // Check if the user is trying to access a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  try {
    // First, handle the case when user is already logged in and tries to access auth routes
    if (isAuthRoute && authToken) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(authToken, secret);
        
        // If token is valid, redirect to appropriate dashboard
        if (pathname === '/admin/login' && payload.role === 'admin') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        } else if (pathname === '/login' || pathname === '/signup') {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      } catch (error) {
        // If token verification fails, clear it and continue to auth page
        const response = NextResponse.next();
        response.cookies.delete('authToken');
        return response;
      }
    }

    // Then handle protected routes
    if (isProtectedRoute || isAdminRoute) {
      if (!authToken) {
        const url = new URL(isAdminRoute ? '/admin/login' : '/login', request.url);
        url.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(url);
      }

      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(authToken, secret);

        if (isAdminRoute && payload.role !== 'admin') {
          return NextResponse.redirect(new URL('/login', request.url));
        }

        // If we get here, the token is valid and the user has proper permissions
        return NextResponse.next();
      } catch (error) {
        // If token verification fails, clear it and redirect to login
        const url = new URL(isAdminRoute ? '/admin/login' : '/login', request.url);
        const response = NextResponse.redirect(url);
        response.cookies.delete('authToken');
        return response;
      }
    }

    // For all other routes, proceed normally
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};