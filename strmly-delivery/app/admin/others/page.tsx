'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Package2 } from 'lucide-react';

interface CustomisablePricing {
  category: string;
  price: number;
}

interface OtherSettings {
  dashboard: {
    image: string;
    text: string;
  };
  customisablePricings: CustomisablePricing[];
}

export default function OtherSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<OtherSettings>({
    dashboard: {
      image: '',
      text: ''
    },
    customisablePricings: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [errors, setErrors] = useState<{ imageUrl?: string }>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const response = await fetch('/api/admin/other', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
  
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB');
        return;
      }
  
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
  
      setIsUploading(true);
      
      // Simulate upload - replace with actual API call
      setTimeout(() => {
        setSettings(prev => ({
        ...prev,
        dashboard: { ...prev.dashboard, image: reader.result as string }
        }));

        if (errors.imageUrl) setErrors(prev => ({ ...prev, imageUrl: '' }));
        setIsUploading(false);
        alert('Image uploaded successfully');
      }, 1500);
    };

  const handlePricingChange = (index: number, field: 'category' | 'price', value: string | number) => {
    const newPricings = [...settings.customisablePricings];
    newPricings[index] = { 
      ...newPricings[index], 
      [field]: field === 'price' ? Number(value) : value 
    };
    setSettings({ ...settings, customisablePricings: newPricings });
  };

  const addPricing = () => {
    setSettings({
      ...settings,
      customisablePricings: [
        ...settings.customisablePricings,
        { category: '', price: 0 }
      ]
    });
  };

  const removePricing = (index: number) => {
    setSettings({
      ...settings,
      customisablePricings: settings.customisablePricings.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const response = await fetch('/api/admin/other', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      if (data.success) {
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-orange-600 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-black font-semibold">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => router.push('/admin')}
            className="group flex items-center text-black hover:text-orange-600 mb-4 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-black">Other Settings</h1>
          <p className="mt-2 text-black opacity-70">Manage dashboard settings and additional charges</p>
        </div>

        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-orange-100">
          <div className="p-8">
            <div className="space-y-8">
              {/* Dashboard Settings Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-black">Dashboard Settings</h2>
                </div>
                
                <div>
                  <label className="flex flex-col items-center justify-center h-80 cursor-pointer">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center">
                              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-black">
                                <span className="text-orange-600 hover:text-orange-700">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-black opacity-70 mt-1">PNG, JPG or WEBP (Max 2MB)</p>
                            </div>
                          </div>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageChange}
                            disabled={isUploading}
                          />
                        </label>
                  
                </div>

                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    Header Text <span className="text-orange-600">*</span>
                  </label>
                  <textarea
                    value={settings.dashboard.text}
                    onChange={(e) => setSettings({
                      ...settings,
                      dashboard: { ...settings.dashboard, text: e.target.value }
                    })}
                    rows={4}
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition resize-none bg-white"
                    placeholder="Enter your welcome message..."
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t-2 border-orange-100"></div>

              {/* Customisable Pricings Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-black">Additional Charges</h2>
                  </div>
                  <button
                    type="button"
                    onClick={addPricing}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Charge</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {settings.customisablePricings.length === 0 ? (
                    <div className="text-center py-12 bg-orange-50 rounded-xl border-2 border-dashed border-orange-200">
                      <svg className="w-16 h-16 text-orange-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-black font-medium">No additional charges configured</p>
                      <p className="text-black opacity-70 text-sm mt-1">Click "Add Charge" to create one</p>
                    </div>
                  ) : (
                    settings.customisablePricings.map((pricing, index) => (
                      <div key={index} className="flex gap-4 items-end p-5 bg-orange-50 rounded-xl border border-orange-100 hover:border-orange-200 transition">
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-black mb-2">
                            Category <span className="text-orange-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={pricing.category}
                            onChange={(e) => handlePricingChange(index, 'category', e.target.value)}
                            className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white"
                            placeholder="e.g., Extra Toppings"
                          />
                        </div>
                        
                        <div className="w-40">
                          <label className="block text-sm font-semibold text-black mb-2">
                            Price (₹) <span className="text-orange-600">*</span>
                          </label>
                          <input
                            type="number"
                            value={pricing.price}
                            onChange={(e) => handlePricingChange(index, 'price', e.target.value)}
                            className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white"
                            min="0"
                            placeholder="0"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removePricing(index)}
                          className="px-4 py-3 bg-white border-2 border-orange-300 text-orange-600 rounded-lg hover:bg-orange-100 transition font-semibold"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-orange-50 px-8 py-6 flex justify-end space-x-3 border-t-2 border-orange-100">
            <button
              type="button"
              className="px-6 py-3 bg-white border-2 border-gray-300 text-black rounded-lg hover:bg-gray-50 transition font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition font-semibold flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving Changes...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}