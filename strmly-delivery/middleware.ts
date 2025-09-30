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

// Define authentication exempt routes
const authRoutes = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get auth token from cookies
  const authToken = request.cookies.get('authToken')?.value;
  
  // Check if the user is trying to access a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  // Check if the user is trying to access an auth route (login/signup)
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  try {
    if (isProtectedRoute) {
      // If no token and trying to access protected route, redirect to login
      if (!authToken) {
        const url = new URL('/login', request.url);
        url.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(url);
      }
      
      // Verify token
      try {
        // Verify JWT with jose (works in Edge runtime)
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        await jwtVerify(authToken, secret);
        
        // If token is valid, allow request
        return NextResponse.next();
      } catch (error) {
        // If token is invalid, redirect to login
        console.error('JWT verification failed:', error);
        const url = new URL('/login', request.url);
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
        await jwtVerify(authToken, secret);
        
        // If token is valid, redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } catch (error) {
        // If token is invalid, allow access to auth routes
        console.error('JWT verification failed:', error);
        const response = NextResponse.next();
        response.cookies.delete('authToken');
        return response;
      }
    }
  } catch (error) {
    console.error('Middleware error:', error);
  }

  // Allow all other requests
  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
