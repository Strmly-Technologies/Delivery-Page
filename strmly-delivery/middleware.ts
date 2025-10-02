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
  
  // Check if the user is trying to access a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  // Check if the user is trying to access an admin route
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  
  // Check if the user is trying to access an auth route (login/signup)
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  try {
    if (isProtectedRoute || isAdminRoute) {
      // If no token and trying to access protected route, redirect to login
      if (!authToken) {
        const url = new URL(isAdminRoute ? '/admin/login' : '/login', request.url);
        url.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(url);
      }
      
      // Verify token
      try {
        // Verify JWT with jose (works in Edge runtime)
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(authToken, secret);
        
        // For admin routes, check if user has admin role
        if (isAdminRoute && payload.role !== 'admin') {
          return NextResponse.redirect(new URL('/admin/login', request.url));
        }
        
        // If token is valid, allow request
        return NextResponse.next();
      } catch (error) {
        // If token is invalid, redirect to login
        console.error('JWT verification failed:', error);
        const url = new URL(isAdminRoute ? '/admin/login' : '/login', request.url);
        url.searchParams.set('returnUrl', pathname);
        
        // Clear invalid cookie
        const response = NextResponse.redirect(url);
        response.cookies.delete('authToken');
        return response;
      }
    } else if (isAuthRoute && authToken) {
      // If user is already logged in and trying to access auth routes,
      // redirect to dashboard
      try {
        // Verify JWT
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(authToken, secret);
        
        // If admin user and trying to access admin/login, redirect to admin dashboard
        if (pathname === '/admin/login' && payload.role === 'admin') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
        
        // For regular login/signup pages, redirect to user dashboard
        if (pathname !== '/admin/login') {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        
        // Allow access otherwise
        return NextResponse.next();
      } catch (error) {
        // If token is invalid, allow access to auth routes
        return NextResponse.next();
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