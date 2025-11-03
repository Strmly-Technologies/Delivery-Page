'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  Package2,
  ShoppingCart,
  Settings,
  Mail,
  Users,
  Phone,
  MapPin,
  Search,
  User,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  LogOut
} from 'lucide-react';

interface SavedAddress {
  fullName: string;
  addressName: string;
  deliveryAddress: string;
  additionalAddressDetails?: string;
  phoneNumber?: string;
}

interface UserData {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  savedAddresses?: SavedAddress[];
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [filterRole, setFilterRole] = useState<'all' | 'customer' | 'chef' | 'delivery'>('all');
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

  // Filter and search users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm));
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;

    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'chef':
        return 'bg-blue-100 text-blue-800';
      case 'delivery':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <Link href="/admin/users" className="block py-3 px-6 text-gray-900 bg-gray-100 font-medium">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-3" />
              Users
            </div>
          </Link>
          <Link href="/admin/email" className="block py-3 px-6 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium">
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
          <div className="mt-10 px-6">
            <button
              onClick={handleLogout}
              className="flex items-center text-red-500 hover:text-red-700"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">User Management</h1>
          <p className="text-gray-600 text-sm">View and manage all registered users</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
              />
            </div>

            {/* Role Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterRole('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterRole === 'all'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterRole('customer')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterRole === 'customer'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Customers
              </button>
              <button
                onClick={() => setFilterRole('chef')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterRole === 'chef'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Chefs
              </button>
              <button
                onClick={() => setFilterRole('delivery')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterRole === 'delivery'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Delivery
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-4 text-sm">
            <div className="text-gray-600">
              Total Users: <span className="font-semibold text-gray-900">{users.length}</span>
            </div>
            <div className="text-gray-600">
              Showing: <span className="font-semibold text-gray-900">{filteredUsers.length}</span>
            </div>
          </div>
        </div>

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Users Found</h3>
            <p className="text-gray-500 text-sm">
              {searchTerm ? 'Try adjusting your search criteria' : 'No users registered yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const isExpanded = expandedUsers.has(user._id);
              const hasAddresses = user.savedAddresses && user.savedAddresses.length > 0;

              return (
                <div key={user._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  {/* User Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {user.username}
                            </h3>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${getRoleBadgeColor(user.role)}`}>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                                <a href={`tel:${user.phone}`} className="text-blue-600 hover:underline">
                                  {user.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expand Button */}
                      {hasAddresses && (
                        <button
                          onClick={() => toggleUserExpansion(user._id)}
                          className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Saved Addresses Count */}
                    {hasAddresses && (
                      <div className="mt-3 text-sm text-gray-500">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        {user.savedAddresses!.length} saved address{user.savedAddresses!.length !== 1 ? 'es' : ''}
                      </div>
                    )}
                  </div>

                  {/* Expanded Addresses */}
                  {isExpanded && hasAddresses && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Saved Addresses</h4>
                      <div className="space-y-3">
                        {user.savedAddresses!.map((address, index) => (
                          <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h5 className="font-semibold text-gray-900">{address.fullName}</h5>
                                <p className="text-sm text-orange-600 font-medium">{address.addressName}</p>
                              </div>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-start">
                                <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                <p>{address.deliveryAddress}</p>
                              </div>
                              {address.additionalAddressDetails && (
                                <p className="ml-6 text-xs text-gray-500">{address.additionalAddressDetails}</p>
                              )}
                              {address.phoneNumber && (
                                <div className="flex items-center ml-6">
                                  <Phone className="w-3 h-3 mr-1" />
                                  <a href={`tel:${address.phoneNumber}`} className="text-blue-600 hover:underline">
                                    {address.phoneNumber}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}