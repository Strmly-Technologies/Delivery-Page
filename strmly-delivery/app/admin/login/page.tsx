'use client';

import { loginUser } from '@/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'

const Page = () => {

    const [formData,setFormData]=useState({
        email:'',
        password:''
    })
    const [isLoading,setIsLoading]=useState(false);
    const [error,setError]=useState<{[key: string]: string}>({});
    const router=useRouter();

    const handleSubmit=async(e: React.FormEvent)=>{
        e.preventDefault();
        setIsLoading(true);
        const newErrors: {[key: string]: string} = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    }
    
    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setError(newErrors);
      setIsLoading(false);
      return;
    }
        try {
             const response= await loginUser({
                ...formData,
                isAdmin:true}
             )
              if (response.user.role !== 'admin') {
        setError({
          general: 'Access denied. Admin privileges required.'
        });
        setIsLoading(false);
        return;
      }
      
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError({
        general: error instanceof Error ? error.message : 'Login failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

 const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when user starts typing
    if (error[name]) {
      setError({
        ...error,
        [name]: ''
      });
    }
  };
 return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-8 flex flex-col justify-center items-center">
      {/* Logo or App Name */}
      <div className="w-full max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white text-orange-500 text-2xl font-bold mb-4 shadow-lg">
          B
        </div>
        <h1 className="text-white text-3xl font-bold">Admin Portal</h1>
        <p className="text-white/90 mt-2">Besom Delivery Administration</p>
      </div>
      
      {/* Login Form Card */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Admin Sign In</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {error.general && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-sm">
                {error.general}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block text-gray-900 w-full pl-10 pr-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-200 text-sm"
                  placeholder="Enter admin email"
                />
              </div>
              {error.email && <p className="mt-1 text-sm text-red-500">{error.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full text-gray-900 pl-10 pr-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-200 text-sm"
                  placeholder="Enter your password"
                />
              </div>
              {error.password && <p className="mt-1 text-sm text-red-500">{error.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center items-center font-semibold py-2.5 px-4 rounded-xl transition duration-200 text-sm ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed text-white' 
                  : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </>
              ) : 'Sign In as Admin'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              <Link href="/" className="text-orange-500 hover:text-orange-600 font-semibold">
                Return to main site
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Page