'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Clock, Package, CheckCircle, LogOut, RefreshCw, Calendar, Settings, MapPin } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { TIME_SLOTS } from '@/constants/timeSlots';

interface DeliveryActiveInfo {
  isActive: boolean;
  timeSlots: string[];
  lastUpdated?: string;
}

export default function DeliveryDashboard() {
  const [activeInfo, setActiveInfo] = useState<DeliveryActiveInfo>({
    isActive: false,
    timeSlots: []
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchActiveStatus();
  }, []);

  const fetchActiveStatus = async () => {
    try {
      const response = await fetch('/api/delivery/active', {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/delivery/login');
          return;
        }
        throw new Error(data.error || 'Failed to fetch status');
      }
      
      if (data.success) {
        setActiveInfo(data.deliveryActiveInfo);
      }
    } catch (error) {
      console.error('Error fetching active status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/delivery/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Delivery dashboard</h1>
                <p className="text-xs text-gray-500">Manage your deliveries</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchActiveStatus}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Status Display */}
          <div className={`flex items-center justify-center rounded-lg p-3 mb-3 ${
            activeInfo.isActive ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`w-3 h-3 rounded-full mr-2 ${
              activeInfo.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span className={`text-sm font-medium ${
              activeInfo.isActive ? 'text-green-900' : 'text-red-900'
            }`}>
              {activeInfo.isActive ? 'Active for Delivery' : 'Not Active'}
            </span>
          </div>

          {/* Active Time Slots */}
          {activeInfo.isActive && activeInfo.timeSlots.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 mb-3">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Your active time slots:</h3>
              <div className="flex flex-wrap gap-1">
                {activeInfo.timeSlots.map((slot, index) => (
                  <span key={index} className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                    {slot}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-20">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          <Link 
            href="/delivery/settings"
            className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mr-4">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Delivery settings</h3>
                <p className="text-sm text-gray-500">Set your active time slots</p>
              </div>
              <div className="text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          <Link 
            href="/delivery/orders"
            className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mr-4">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">View orders</h3>
                <p className="text-sm text-gray-500">Check orders for your time slots</p>
              </div>
              <div className="text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Current Status Card */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-600 mr-2" />
                <span className="text-sm text-gray-600">Status</span>
              </div>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                activeInfo.isActive 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {activeInfo.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-gray-600 mr-2" />
                <span className="text-sm text-gray-600">Time slots</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {activeInfo.timeSlots.length} selected
              </span>
            </div>

            {activeInfo.lastUpdated && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="text-sm text-gray-600">Last updated</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {format(new Date(activeInfo.lastUpdated), 'MMM d, h:mm a')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Available Time Slots Info */}
        <div className="bg-white rounded-2xl shadow-md p-6 mt-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available time slots</h2>
          <div className="grid grid-cols-1 gap-2">
            {TIME_SLOTS.map((slot) => {
              const isActive = activeInfo.timeSlots.includes(slot.range);
              return (
                <div key={slot.id} className={`p-3 rounded-lg border ${
                  isActive 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{slot.range}</span>
                    <div className="flex items-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        slot.type === 'morning' 
                          ? 'bg-yellow-100 text-yellow-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {slot.type}
                      </span>
                      {isActive && (
                        <CheckCircle className="w-4 h-4 text-blue-500 ml-2" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}