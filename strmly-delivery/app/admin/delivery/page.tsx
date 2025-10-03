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
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Delivery Settings</h1>
          {settings.updatedAt && (
            <p className="text-sm text-gray-500">
              Last updated: {new Date(settings.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Maximum Delivery Range (km)
            </label>
            <input
              type="number"
              value={settings.maxRange}
              onChange={(e) => setSettings({ ...settings, maxRange: Number(e.target.value) })}
              className="mt-1 text-black block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              min="0"
              step="0.1"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Delivery Charges
              </label>
              <button
                type="button"
                onClick={addCharge}
                className="text-sm text-orange-600 hover:text-orange-800"
              >
                + Add Range
              </button>
            </div>
            
            <div className="space-y-4">
              {settings.charges?.map((charge, index) => (
                <div key={charge._id || index} className="flex gap-4 items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm text-gray-600">Range (km)</label>
                    <input
                      type="number"
                      value={charge.range}
                      onChange={(e) => handleChargeChange(index, 'range', Number(e.target.value))}
                      className="mt-1 text-black block w-32 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600">Charge (₹)</label>
                    <input
                      type="number"
                      value={charge.charge}
                      onChange={(e) => handleChargeChange(index, 'charge', Number(e.target.value))}
                      className="mt-1 block text-black w-32 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                      min="0"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCharge(index)}
                    className="mt-6 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 rounded-md text-white ${
                saving ? 'bg-gray-400' : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {saving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}