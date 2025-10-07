'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DeliveryCharge {
  _id?: string;
  range: number;
  charge: number;
}

interface DeliverySettings {
  _id?: string;
  maxRange: number;
  charges: DeliveryCharge[];
  updatedAt?: string;
}

export default function DeliverySettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<DeliverySettings>({
    maxRange: 5,
    charges: [
      { range: 2, charge: 10 },
      { range: 3, charge: 25 },
      { range: 5, charge: 35 }
    ]
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCharge, setEditingCharge] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/delivery');
      const data = await response.json();
      if (data.success && data.settings) {
        setSettings(data.settin);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChargeChange = async (index: number, field: 'range' | 'charge', value: number) => {
    const newCharges = [...settings.charges];
    newCharges[index] = { ...newCharges[index], [field]: value };
    
    if (field === 'charge' && newCharges[index]._id) {
      try {
        const response = await fetch('/api/admin/delivery', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rangeId: newCharges[index]._id,
            charge: value
          })
        });
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error('Failed to update charge:', error);
        return;
      }
    }
    
    setSettings({ ...settings, charges: newCharges });
  };

  const addCharge = () => {
    const lastCharge = settings.charges[settings.charges.length - 1];
    setSettings({
      ...settings,
      charges: [...settings.charges, { range: lastCharge.range + 1, charge: 0 }]
    });
  };

  const removeCharge = (index: number) => {
    if (settings.charges[index]._id && !confirm('Are you sure you want to remove this range?')) {
      return;
    }
    setSettings({
      ...settings,
      charges: settings.charges.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/admin/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxRange: settings.maxRange,
          charges: settings.charges.map(({ range, charge }) => ({ range, charge }))
        })
      });

      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
        alert('Settings updated successfully!');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      alert('Failed to update settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-gray-50/50">
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-orange-50 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                Delivery Settings
              </h1>
              {settings.updatedAt && (
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {new Date(settings.updatedAt).toLocaleString()}
                </p>
              )}
            </div>
            <button 
            onClick={() => router.push('/admin')}
            className="group flex items-center text-black hover:text-orange-600 mb-4 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Max Range Input */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Maximum Delivery Range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.maxRange}
                onChange={(e) => setSettings({ ...settings, maxRange: Number(e.target.value) })}
                className="flex-1 px-4 py-2.5 text-black rounded-lg border border-gray-200 
                          focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 
                          transition-all duration-200"
                min="0"
                step="0.1"
              />
              <span className="text-sm font-medium text-gray-500">kilometers</span>
            </div>
          </div>

          {/* Delivery Charges Section */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <label className="text-sm font-semibold text-gray-700">
                Delivery Charges
              </label>
              <button
                type="button"
                onClick={addCharge}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-orange-600 
                         bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors duration-200"
              >
                <span className="mr-1">+</span> Add Range
              </button>
            </div>
            
            <div className="space-y-4">
              {settings.charges?.map((charge, index) => (
                <div 
                  key={charge._id || index} 
                  className="flex gap-4 items-center p-4 bg-white rounded-xl border border-gray-100 
                           hover:border-orange-200 transition-colors duration-200"
                >
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                      Range (km)
                    </label>
                    <input
                      type="number"
                      value={charge.range}
                      onChange={(e) => handleChargeChange(index, 'range', Number(e.target.value))}
                      className="w-full px-3 py-2 text-black rounded-lg border border-gray-200 
                               focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 
                               transition-all duration-200"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                      Charge (₹)
                    </label>
                    <input
                      type="number"
                      value={charge.charge}
                      onChange={(e) => handleChargeChange(index, 'charge', Number(e.target.value))}
                      className="w-full px-3 py-2 text-black rounded-lg border border-gray-200 
                               focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 
                               transition-all duration-200"
                      min="0"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCharge(index)}
                    className="self-end p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-2.5 rounded-lg text-white font-medium shadow-lg
                        transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]
                        ${saving 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-orange-500/25'
                        }`}
            >
              {saving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Saving Changes...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  )};
