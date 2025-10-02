import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
  role:string
}

export async function verifyAuth(request: NextRequest): Promise<AuthUser> {
  // Try to get the token from cookies first
  const authToken = request.cookies.get('authToken')?.value;
  
  // If no cookie, try the Authorization header
  const authHeader = request.headers.get('authorization');
  const headerToken = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
    
  const token = authToken || headerToken;
  
  if (!token) {
    throw new Error('No authentication token provided');
  }
  
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
