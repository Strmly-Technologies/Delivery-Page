import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';
import jwt from 'jsonwebtoken';

interface UseAuthOptions {
  redirectTo?: string;
  requireAuth?: boolean;
}

export function useAuth({ redirectTo = '/login', requireAuth = true }: UseAuthOptions = {}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function verifyAuthentication() {
      setIsLoading(true);
      try {
        const token = getAuthToken();
        
        if (!token) {
          setIsAuthenticated(false);
          if (requireAuth) {
            router.push(redirectTo);
          }
          return;
        }
        
        // Check if token is valid by decoding it
        try {
          // This is just a local validation of token format
          // We're not using the actual JWT_SECRET here since it's client-side
          const decodedToken = jwt.decode(token);
          
          if (!decodedToken || typeof decodedToken !== 'object') {
            throw new Error('Invalid token');
          }
          
          // Check if token has expired
          const currentTime = Math.floor(Date.now() / 1000);
          if (decodedToken.exp && decodedToken.exp < currentTime) {
            throw new Error('Token expired');
          }
          
          setIsAuthenticated(true);
          setUser(decodedToken);
        } catch (error) {
          console.error('Token validation error:', error);
          setIsAuthenticated(false);
          if (requireAuth) {
            router.push(redirectTo);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }

    verifyAuthentication();
  }, [router, redirectTo, requireAuth]);

  return { isAuthenticated, isLoading, user };
}
