'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, ChevronUp, MapPin, Tag, Plus, X } from 'lucide-react';

interface UserData {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  savedAddresses: Array<{
    addressName: string;
    deliveryAddress: string;
    additionalAddressDetails?: string;
    fullName: string;
    phoneNumber: string;
  }>;
  availableCoupons?: Array<{
    code: string;
    discountPercentage: number;
    numberOfUses?: number;
  }>;
  referralWallet?: number;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [filterRole, setFilterRole] = useState<'all' | 'customer' | 'chef' | 'delivery'>('all');
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountPercentage: 10,
  });
  const [addingCoupon, setAddingCoupon] = useState(false);
  const [expandedCoupons, setExpandedCoupons] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, []);

  const checkAdminAndFetchUsers = async () => {
    try {
      // Check admin status
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

      // Fetch users
      await fetchUsers();
    } catch (error) {
      console.error('Error:', error);
      router.push('/admin/login');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        console.log('Fetched users:', data.users[0]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/admin/login');
  };

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const toggleCouponExpansion = (userId: string) => {
    const newExpanded = new Set(expandedCoupons);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedCoupons(newExpanded);
  };

  const openCouponModal = (userId: string) => {
    setSelectedUserId(userId);
    setShowCouponModal(true);
    setNewCoupon({
      code: '',
      discountPercentage: 10,
        });
  };

  const handleAddCoupon = async () => {
    if (!selectedUserId) return;
    
    if (!newCoupon.code.trim()) {
      alert('Please enter a coupon code');
      return;
    }

    if (newCoupon.discountPercentage <= 0 || newCoupon.discountPercentage > 100) {
      alert('Discount percentage must be between 1 and 100');
      return;
    }

   

    setAddingCoupon(true);

    try {
      const response = await fetch('/api/admin/add-coupon', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId,
          code: newCoupon.code.toUpperCase(),
          discountPercentage: newCoupon.discountPercentage,
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Coupon added successfully!');
        setShowCouponModal(false);
        setNewCoupon({
          code: '',
          discountPercentage: 10,
        });
        // Refresh users to show updated coupons
        await fetchUsers();
      } else {
        alert(data.error || 'Failed to add coupon');
      }
    } catch (error) {
      console.error('Error adding coupon:', error);
      alert('Failed to add coupon');
    } finally {
      setAddingCoupon(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm));
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-black pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div className="w-full md:w-48">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">All Roles</option>
                <option value="customer">Customers</option>
                <option value="chef">Chefs</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <div key={user._id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* User Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{user.username}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'chef' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'delivery' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                  {user.phone && (
                    <p className="text-sm text-gray-500 mt-1">📞 {user.phone}</p>
                  )}
                  {user.referralWallet !== undefined && user.referralWallet > 0 && (
                    <p className="text-sm text-green-600 mt-1 font-medium">
                       Referral Wallet: ₹{user.referralWallet}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Add Coupon Button */}
                  <button
                    onClick={() => openCouponModal(user._id)}
                    className="flex items-center gap-1 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Coupon
                  </button>

                  {/* Expand Button */}
                  <button
                    onClick={() => toggleUserExpansion(user._id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {expandedUsers.has(user._id) ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Coupons Preview (Always visible if user has coupons) */}
              {user.availableCoupons && user.availableCoupons.length > 0 && (
                <div className="px-4 pb-2">
                  <button
                    onClick={() => toggleCouponExpansion(user._id)}
                    className="flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
                  >
                    <Tag className="w-4 h-4" />
                    {user.availableCoupons.length} Coupon{user.availableCoupons.length !== 1 ? 's' : ''} Available
                    {expandedCoupons.has(user._id) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {/* Coupons List */}
                  {expandedCoupons.has(user._id) && (
                    <div className="mt-3 space-y-2">
                      {user.availableCoupons.map((coupon, index) => (
                        <div key={index} className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-orange-600" />
                                <span className="font-mono font-bold text-orange-900">{coupon.code}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {coupon.discountPercentage}% discount
                              </p>
                            </div>
                            <div className="text-right">
                              {coupon.numberOfUses !== undefined && (
                                <p className="text-sm text-gray-600">
                                  {coupon.numberOfUses} 

                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Expanded Details */}
              {expandedUsers.has(user._id) && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="space-y-4">
                    {/* Account Info */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Account Details</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">User ID:</span>
                          <p className="font-mono text-gray-900">{user._id}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Joined:</span>
                          <p className="text-gray-900">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Saved Addresses */}
                    {user.savedAddresses && user.savedAddresses.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Saved Addresses ({user.savedAddresses.length})
                        </h4>
                        <div className="space-y-2">
                          {user.savedAddresses.map((address, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{address.addressName}</p>
                                  <p className="text-sm text-gray-600 mt-1">{address.fullName}</p>
                                  <p className="text-sm text-gray-600">{address.phoneNumber}</p>
                                  <p className="text-sm text-gray-600 mt-1">{address.deliveryAddress}</p>
                                  {address.additionalAddressDetails && (
                                    <p className="text-xs text-gray-500 mt-1">{address.additionalAddressDetails}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500">No users found matching your criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-white">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Add Coupon</h3>
                <button
                  onClick={() => setShowCouponModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Coupon Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., WELCOME10"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 font-mono uppercase"
                  maxLength={20}
                />
                <p className="mt-1 text-xs text-gray-500">Use uppercase letters and numbers</p>
              </div>

              {/* Discount Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Percentage *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={newCoupon.discountPercentage}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountPercentage: Number(e.target.value) })}
                    min="1"
                    max="100"
                    className="w-full px-4 py-2.5 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">Between 1% and 100%</p>
              </div>

              {/* Number of Uses */}
             

              {/* Preview */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-orange-600" />
                    <span className="font-mono font-bold text-orange-900">{newCoupon.code || 'CODE'}</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">{newCoupon.discountPercentage}% OFF</span>
                </div>
            
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCouponModal(false)}
                  className="flex-1 py-2.5 px-4 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCoupon}
                  disabled={addingCoupon || !newCoupon.code.trim()}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${
                    addingCoupon || !newCoupon.code.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  {addingCoupon ? 'Adding...' : 'Add Coupon'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}