'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart3, Package2, ShoppingCart, Settings, Mail, User, 
  CheckCircle, AlertCircle, Loader, SlidersHorizontal, Plus, X
} from 'lucide-react';

interface Recipient {
  email: string;
  id: string;
}

export default function EmailPage() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
        const response = await fetch('/api/admin/auth/check', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to verify admin status');
        }
        
        const data = await response.json();
        if (!data.isAdmin) {
          router.push('/admin/login');
          return;
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/admin/login');
      }
    };
    
    checkAdmin();
  }, [router]);

  // Add recipient
  const addRecipient = () => {
    if (!newRecipient || !isValidEmail(newRecipient)) {
      setError('Please enter a valid email address');
      return;
    }

    if (recipients.some(r => r.email === newRecipient)) {
      setError('This email is already added');
      return;
    }

    setRecipients([...recipients, { email: newRecipient, id: Date.now().toString() }]);
    setNewRecipient('');
    setError(null);
  };

  // Remove recipient
  const removeRecipient = (id: string) => {
    setRecipients(recipients.filter(r => r.id !== id));
  };

  // Validate email
  const isValidEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  // Handle send email
  const handleSendEmail = async () => {
    try {
      // Validation
      if (recipients.length === 0) {
        setError('Please add at least one recipient');
        return;
      }

      if (!subject.trim()) {
        setError('Please enter a subject');
        return;
      }

      if (!content.trim()) {
        setError('Please enter some content');
        return;
      }

      setSending(true);
      setError(null);

      // Format content with proper HTML
      const htmlContent = content
        .replace(/\n/g, '<br>')
        .replace(/\r/g, '')
        .trim();

      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const response = await fetch('/api/admin/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: recipients.map(r => r.email),
          subject,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${htmlContent}</div>`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      // Success
      setShowSuccess(true);
      setRecipients([]);
      setSubject('');
      setContent('');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Error sending email:', error);
      setError(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-orange-600">STRMLY Admin</h1>
        </div>
        <nav className="mt-6">
          <Link href="/admin" className="block py-3 px-6 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-3" />
              Dashboard
            </div>
          </Link>
          <Link href="/admin/products" className="block py-3 px-6 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium">
            <div className="flex items-center">
              <Package2 className="h-5 w-5 mr-3" />
              Products
            </div>
          </Link>
          <Link href="/admin/orders" className="block py-3 px-6 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium">
            <div className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-3" />
              Orders
            </div>
          </Link>
          <Link href="/admin/email" className="block py-3 px-6 text-gray-900 bg-gray-100 font-medium">
            <div className="flex items-center">
              <Mail className="h-5 w-5 mr-3" />
              Email
            </div>
          </Link>
          <Link href="/admin/settings" className="block py-3 px-6 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium">
            <div className="flex items-center">
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </div>
          </Link>
          <Link href="/admin/others" className="block py-3 px-6 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium">
            <div className="flex items-center">
              <SlidersHorizontal className="h-5 w-5 mr-3" />
              Customisations 
            </div>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Email Manager</h1>
        </div>

        {/* Email Form */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden p-6">
          {/* Success Message */}
          {showSuccess && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-md flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
              <div>
                <p className="text-green-700 font-medium">Email sent successfully!</p>
                <p className="text-green-600 text-sm mt-1">Your message has been delivered to all recipients.</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <p className="text-red-700 font-medium">Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipients
              </label>
              
              {/* Recipients list */}
              <div className="mb-3 flex flex-wrap gap-2 text-black">
                {recipients.map(recipient => (
                  <div 
                    key={recipient.id}
                    className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-sm flex items-center"
                  >
                    <User className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
                    <span>{recipient.email}</span>
                    <button 
                      onClick={() => removeRecipient(recipient.id)}
                      className="ml-2 text-orange-400 hover:text-orange-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Add recipient */}
              <div className="flex">
                <div className="relative flex-grow text-black">
                  <input
                    type="email"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                  />
                </div>
                <button
                  onClick={addRecipient}
                  className="bg-orange-500 text-white px-4 py-2.5 rounded-r-lg hover:bg-orange-600 transition flex items-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-black text-sm font-medium mb-2">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-black px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition text-sm"
                placeholder="Email subject"
              />
            </div>

            {/* Email Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Email Content
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Compose your email message here..."
                rows={8}
                className="w-full text-black px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition text-sm resize-y"
              />
              <p className="mt-2 text-xs text-gray-500">
                Line breaks will be preserved in the email. You can write plain text here.
              </p>
            </div>

            {/* Send Button */}
            <div className="pt-4">
              <button
                onClick={handleSendEmail}
                disabled={sending}
                className={`w-full sm:w-auto px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 shadow transition-colors flex items-center justify-center ${sending ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {sending ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}