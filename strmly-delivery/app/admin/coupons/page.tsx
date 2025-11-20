'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Plus, Trash2, Edit2 } from 'lucide-react';

interface Coupon {
  _id: string;
  code: string;
  discountPercentage: number;
  isActive: boolean;
  createdAt: string;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountPercentage: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAdminAndFetchCoupons();
  }, []);

  const checkAdminAndFetchCoupons = async () => {
    try {
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const authResponse = await fetch('/api/admin/auth/check', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!authResponse.ok) {
        router.push('/admin/login');
        return;
      }

      const authData = await authResponse.json();
      if (!authData.isAdmin) {
        router.push('/admin/login');
        return;
      }

      await fetchCoupons();
    } catch (error) {
      console.error('Error checking admin status:', error);
      router.push('/admin/login');
    }
  };

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const response = await fetch('/api/coupons', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setCoupons(data.availableCoupons || []);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
      alert('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCoupon.code.trim()) {
      alert('Please enter a coupon code');
      return;
    }

    if (newCoupon.discountPercentage <= 0 || newCoupon.discountPercentage > 100) {
      alert('Discount percentage must be between 1 and 100');
      return;
    }

    try {
      setSubmitting(true);
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const response = await fetch('/api/admin/add-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCoupon)
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Coupon added successfully!');
        setShowAddModal(false);
        setNewCoupon({ code: '', discountPercentage: 0 });
        await fetchCoupons();
      } else {
        alert(data.error || 'Failed to add coupon');
      }
    } catch (error) {
      console.error('Error adding coupon:', error);
      alert('Failed to add coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) {
      return;
    }

    try {
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const response = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Coupon deleted successfully');
        await fetchCoupons();
      } else {
        alert(data.error || 'Failed to delete coupon');
      }
    } catch (error) {
      console.error('Error deleting coupon:', error);
      alert('Failed to delete coupon');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Coupon Management</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Coupon
          </button>
        </div>

        {coupons.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No coupons yet</h3>
            <p className="text-gray-600 mb-6">Create your first coupon to get started</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Coupon
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coupons.map((coupon) => (
              <div key={coupon._id} className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 hover:border-orange-300 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <Tag className="w-5 h-5 text-orange-500 mr-2" />
                    <h3 className="text-lg font-bold text-gray-900">{coupon.code}</h3>
                  </div>
                 
                </div>
                
                <div className="mb-4">
                  <p className="text-3xl font-bold text-orange-600">{coupon.discountPercentage}%</p>
                  <p className="text-sm text-gray-600">Discount</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeleteCoupon(coupon._id)}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Coupon Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Add New Coupon</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewCoupon({ code: '', discountPercentage: 0 });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleAddCoupon} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SAVE20"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Percentage *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={newCoupon.discountPercentage || ''}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountPercentage: Number(e.target.value) })}
                    placeholder="e.g., 20"
                    min="1"
                    max="100"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter a value between 1 and 100</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewCoupon({ code: '', discountPercentage: 0 });
                  }}
                  className="flex-1 py-2.5 px-4 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:bg-gray-400"
                >
                  {submitting ? 'Adding...' : 'Add Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}