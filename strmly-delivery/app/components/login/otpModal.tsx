'use client';

import { ArrowLeft, ArrowRight, Lock, Mail, Phone, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationComplete: () => void;
}

export default function OtpModal({ isOpen, onClose, onVerificationComplete }: OtpModalProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); // Add phone state
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    setLoading(true);
    setError('');
    
    // Validate phone number (10 digits)
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      setLoading(false);
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }) // Include phone
      });
      
      const data = await response.json();
      if (data.success) {
        setStep('otp');
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp })
      });
      
      const data = await response.json();
      if (data.success) {
        const user = data.user;
        localStorage.setItem('user', JSON.stringify({
          id: (user._id as any).toString(),
          username: user.username,
          email: user.email,
          phone: user.phone,
          fullName: user.username,
          createdAt: user.createdAt,
          role: user.role
        }));
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (onVerificationComplete) {
          onVerificationComplete();
        }
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (error) {
      setError('Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl shadow-2xl w-full max-w-md border border-zinc-700/50 overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500"></div>

        <div className="relative p-8">
          {/* Icon and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-500/10 rounded-xl mb-4 border border-orange-500/20">
              {step === 'email' ? (
                <Mail className="w-6 h-6 text-orange-500" />
              ) : (
                <Lock className="w-6 h-6 text-orange-500" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {step === 'email' ? 'Welcome Back' : 'Verify Code'}
            </h2>
            <p className="text-zinc-400 text-sm">
              {step === 'email' 
                ? 'Enter your details to receive a verification code' 
                : `We sent a code to ${email}`}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center text-red-500">
                <div className="ml-2 text-sm font-medium">{error}</div>
              </div>
            </div>
          )}

          {/* Email & Phone Step */}
          {step === 'email' ? (
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all placeholder:text-zinc-500"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Phone Number Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Whatsapp Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="w-full pl-12 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all placeholder:text-zinc-500"
                    disabled={loading}
                    maxLength={10}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Enter your 10-digit mobile number
                </p>
              </div>
              
              <button
                onClick={handleSendOtp}
                disabled={loading || !email || phone.length !== 10}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending Code...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Continue with Email
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </span>
                )}
              </button>
            </div>
          ) : (
            /* OTP Step */
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Verification Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 text-white text-center text-2xl tracking-[1em] rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all placeholder:text-zinc-600"
                    maxLength={6}
                    disabled={loading}
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-500 text-center">
                  Enter the 6-digit code we sent to your email
                </p>
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>

              <button
                onClick={() => setStep('email')}
                disabled={loading}
                className="w-full text-zinc-400 hover:text-white py-2 text-sm transition-colors flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}