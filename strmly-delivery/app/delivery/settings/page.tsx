'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Clock, RefreshCw } from 'lucide-react';
import { TIME_SLOTS, TimeSlot } from '@/constants/timeSlots';
import Link from 'next/link';
import { getAvailableTimeSlots } from '@/lib/timeUtil';

interface DeliveryActiveInfo {
  isActive: boolean;
  timeSlots: string[];
  lastUpdated?: string;
}

export default function DeliverySettings() {
  const [activeInfo, setActiveInfo] = useState<DeliveryActiveInfo>({
    isActive: false,
    timeSlots: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();
  const [availableSlots,setAvailableSlots]=useState<TimeSlot[]>([]);

  useEffect(() => {
    fetchActiveStatus();
  }, []);

  useEffect(()=>{
    const slots=getAvailableTimeSlots(TIME_SLOTS);
    setAvailableSlots(slots);
  },[TIME_SLOTS])

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
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleActiveToggle = () => {
    setActiveInfo(prev => ({ ...prev, isActive: !prev.isActive }));
  };

  const handleTimeSlotToggle = (timeSlot: string) => {
    setActiveInfo(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.includes(timeSlot)
        ? prev.timeSlots.filter(slot => slot !== timeSlot)
        : [...prev.timeSlots, timeSlot]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/delivery/active', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: activeInfo.isActive,
          timeSlots: activeInfo.timeSlots
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setActiveInfo(data.deliveryActiveInfo);
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link 
                href="/delivery/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg mr-2 transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Delivery settings</h1>
                <p className="text-xs text-gray-500">Configure your availability</p>
              </div>
            </div>
            <button
              onClick={fetchActiveStatus}
              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-20">
        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Active Status Toggle */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery status</h2>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-base font-medium text-gray-900">Available for delivery</h3>
              <p className="text-sm text-gray-500">Turn on to receive delivery orders</p>
            </div>
            <button
              onClick={handleActiveToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                activeInfo.isActive ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  activeInfo.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Time Slots Selection */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select time slots</h2>
          <p className="text-sm text-gray-500 mb-4">Choose the time slots when you'll be available for deliveries</p>
          
          {/* Morning Slots */}
          <div className="mb-6">
            <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-yellow-500" />
              Morning Slots
            </h3>
            <div className="space-y-2">
             {availableSlots && availableSlots.filter(slot => slot.type === 'morning').map((slot) => {
                const isSelected = activeInfo.timeSlots.includes(slot.range);
                return (
                  <button
                    key={slot.id}
                    onClick={() => handleTimeSlotToggle(slot.range)}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{slot.range}</span>
                      <div className={`w-5 h-5 rounded-full border-2 ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      } flex items-center justify-center`}>
                        {isSelected && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
             }
            </div>
          </div>

          {/* Evening Slots */}
          <div>
            <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-orange-500" />
              Evening Slots
            </h3>
            <div className="space-y-2">
              {availableSlots && availableSlots.filter(slot => slot.type === 'evening').map((slot) => {
                const isSelected = activeInfo.timeSlots.includes(slot.range);
                return (
                  <button
                    key={slot.id}
                    onClick={() => handleTimeSlotToggle(slot.range)}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{slot.range}</span>
                      <div className={`w-5 h-5 rounded-full border-2 ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      } flex items-center justify-center`}>
                        {isSelected && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </button>
                );  
                })
              }
            </div>
          </div>
        </div>

        {/* Selected Summary */}
        {activeInfo.timeSlots.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
            <h3 className="text-base font-medium text-blue-900 mb-2">Selected time slots</h3>
            <div className="flex flex-wrap gap-2">
              {activeInfo.timeSlots.map((slot, index) => (
                <span key={index} className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full">
                  {slot}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || (!activeInfo.isActive && activeInfo.timeSlots.length === 0)}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-4 rounded-2xl font-semibold text-base transition flex items-center justify-center"
        >
          {saving ? (
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>

        {/* Info */}
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>Note:</strong> You must be active and have at least one time slot selected to receive delivery orders.
          </p>
        </div>
      </main>
    </div>
  );
}