export interface User {
  id: string;
  fullName?: string;
  username: string;
  email: string;
  createdAt: Date;
  role:string
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface AuthError {
  error: string;
}

// Helper function to set cookies
const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
};

// Helper function to delete cookies
const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
};

export async function signupUser(userData: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthResponse> {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Signup failed');
  }

  // Store token in a cookie (not localStorage)
  setCookie('authToken', data.token);
  
  // Store user info in localStorage for convenience (non-sensitive info only)
  localStorage.setItem('user', JSON.stringify(data.user));

  return data;
}

export async function loginUser(credentials: {
  email: string;
  password: string;
  isAdmin?: boolean;
}): Promise<AuthResponse> {
  const endpoint = credentials.isAdmin ? '/api/admin/login' : '/api/auth/login';
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // IMPORTANT: This makes the browser handle cookies
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  // Remove the setCookie call - the server already set it!
  // Just store non-sensitive user info in localStorage
  localStorage.setItem('user', JSON.stringify(data.user));
  localStorage.setItem('userRole', data.user.role);

  return data;
}

export function logout(): void {
  // Clear cookie
  deleteCookie('authToken');
  
  // Clear localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
  
  // Redirect to login page
  window.location.href = '/login';
}

export function getCurrentUser(): User | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
}

export function isUserAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('userRole') === 'admin';
}

export function getAuthCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  
  const cookies = document.cookie.split(';');
  const authCookie = cookies.find(cookie => cookie.trim().startsWith('authToken='));
  
  if (!authCookie) {
    return null;
  }
  
  return authCookie.trim().substring('authToken='.length);
}

// New function to verify token validity
export async function verifyToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
}
