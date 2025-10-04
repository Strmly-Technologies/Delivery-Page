'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package2, ShoppingCart, BarChart3, Settings, LogOut, Users, Clock, Truck, CheckCircle, AlertCircle } from 'lucide-react';

interface DashboardStats {
  products: number;
  orders: number;
  pendingOrders: number;
  revenue: number;
  outForDeliveryOrders: number;
  deliveredOrders: number;
  acceptedOrders: number;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    products: 0,
    orders: 0,
    pendingOrders: 0,
    revenue: 0,
    outForDeliveryOrders: 0,
    deliveredOrders: 0,
    acceptedOrders: 0
  });
  
  const router = useRouter();

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
        
        fetchStats();
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/admin/login');
      }
    };
    
    checkAdmin();
  }, [router]);

  const fetchStats = async () => {
    try {
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.error || 'Failed to fetch dashboard stats');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      alert('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    // Clear cookies and redirect to login
    document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading dashboard...</p>
        </div>
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
          <Link href="/admin" className="block py-3 px-6 bg-orange-50 text-orange-600 border-l-4 border-orange-600 font-medium">
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
          <Link href="/admin/settings" className="block py-3 px-6 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium">
            <div className="flex items-center">
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </div>
          </Link>
  <Link
  href="/admin/delivery"
  className="flex items-center px-4 py-2 text-gray-700 hover:bg-orange-50"
>
  <span className="mx-4">Delivery Settings</span>
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
        <h1 className="text-2xl font-semibold text-gray-800 mb-8">Dashboard Overview</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Products</p>
                <h2 className="text-3xl font-bold text-gray-800">{stats.products}</h2>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Package2 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/admin/products" className="text-sm text-orange-600 hover:underline">
                Manage products →
              </Link>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Orders</p>
                <h2 className="text-3xl font-bold text-gray-800">{stats.orders}</h2>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/admin/orders" className="text-sm text-blue-600 hover:underline">
                View all orders →
              </Link>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Pending Orders</p>
                <h2 className="text-3xl font-bold text-gray-800">{stats.pendingOrders}</h2>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/admin/orders?status=pending" className="text-sm text-yellow-600 hover:underline">
                Process pending orders →
              </Link>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Revenue</p>
                <h2 className="text-3xl font-bold text-gray-800">₹{stats.revenue}</h2>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/admin/orders?status=delivered" className="text-sm text-green-600 hover:underline">
                View completed orders →
              </Link>
            </div>
          </div>
        </div>
        
        {/* Order Status Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Status Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <Clock className="h-6 w-6 mx-auto text-yellow-600 mb-2" />
              <div className="text-sm text-gray-600">Pending</div>
              <div className="text-xl font-semibold text-yellow-600">{stats.pendingOrders}</div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto text-blue-600 mb-2" />
              <div className="text-sm text-gray-600">Accepted</div>
              <div className="text-xl font-semibold text-blue-600">
                {/* You can add this to your stats API */}
                {stats.acceptedOrders}
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <Truck className="h-6 w-6 mx-auto text-purple-600 mb-2" />
              <div className="text-sm text-gray-600">Out for Delivery</div>
              <div className="text-xl font-semibold text-purple-600">
                {/* You can add this to your stats API */}
                {stats.outForDeliveryOrders}
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto text-green-600 mb-2" />
              <div className="text-sm text-gray-600">Delivered</div>
              <div className="text-xl font-semibold text-green-600">
                {/* You can add this to your stats API */}
                {stats.deliveredOrders}
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick Links Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/products/add" className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition">
              <Package2 className="h-6 w-6 mx-auto text-orange-600 mb-2" />
              <p className="text-gray-700">Add Product</p>
            </Link>
            
            <Link href="/admin/orders?status=pending" className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition">
              <Clock className="h-6 w-6 mx-auto text-yellow-600 mb-2" />
              <p className="text-gray-700">Pending Orders</p>
            </Link>
            
            <Link href="/admin/orders?status=accepted" className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition">
              <Truck className="h-6 w-6 mx-auto text-blue-600 mb-2" />
              <p className="text-gray-700">Process Orders</p>
            </Link>
           
            <Link 
              href="/admin/others" 
              className="block py-3 px-6 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
            >
              <div className="flex items-center">
                <Package2 className="h-5 w-5 mr-3" />
                Other Settings
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
