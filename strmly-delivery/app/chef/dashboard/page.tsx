'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, Clock, Package, CheckCircle, LogOut, RefreshCw, Calendar } from 'lucide-react';
import Image from 'next/image';
import { format, isToday, parseISO } from 'date-fns';

interface Product {
  _id: string;
  name: string;
  image: string;
  category: string;
}

interface Customization {
  size: string;
  quantity: string;
  ice?: string;
  sugar?: string;
  dilution?: string;
  fibre?: boolean;
  finalPrice: number;
}

interface OrderItem {
  _id: string;
  product: Product;
  customization: Customization;
  quantity: number;
  timeSlot: string;
  status: 'pending' | 'received' | 'done';
  orderNumber: string;
  orderType: 'quicksip' | 'freshplan';
  deliveryDate: string;
}

export default function ChefDashboard() {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'received' | 'done'>('all');
  const router = useRouter();

  useEffect(() => {
    fetchTodaysOrders();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchTodaysOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodaysOrders = async () => {
    try {
      const response = await fetch('/api/chef/today-orders', {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/chef/login');
          return;
        }
        throw new Error(data.error || 'Failed to fetch orders');
      }
      
      if (data.success) {
        setItems(data.items);
        console.log('Fetched items:', data.items);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateItemStatus = async (itemId: string, newStatus: 'received' | 'done') => {
    setUpdating(itemId);
    try {
      const response = await fetch('/api/chef/update-item-status', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, status: newStatus })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setItems(prev => prev.map(item => 
          item._id === itemId ? { ...item, status: newStatus } : item
        ));
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/chef/login');
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  // Group items by time slot
  const groupedByTimeSlot = filteredItems.reduce((acc, item) => {
    const slot = item.timeSlot || 'No Time Slot';
    if (!acc[slot]) acc[slot] = [];
    acc[slot].push(item);
    return acc;
  }, {} as Record<string, OrderItem[]>);

  const sortedTimeSlots = Object.keys(groupedByTimeSlot).sort();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'received': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'done': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    received: items.filter(i => i.status === 'received').length,
    done: items.filter(i => i.status === 'done').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading today's orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Chef Dashboard</h1>
                <p className="text-xs text-gray-500">Today's Orders</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchTodaysOrders}
                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
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

          {/* Date Display */}
          <div className="flex items-center justify-center bg-green-50 rounded-lg p-2 mb-3">
            <Calendar className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-900">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`p-2 rounded-lg text-center transition ${
                filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <p className="text-xs font-medium">Total</p>
              <p className="text-lg font-bold">{stats.total}</p>
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`p-2 rounded-lg text-center transition ${
                filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700'
              }`}
            >
              <p className="text-xs font-medium">Pending</p>
              <p className="text-lg font-bold">{stats.pending}</p>
            </button>
            <button
              onClick={() => setFilter('received')}
              className={`p-2 rounded-lg text-center transition ${
                filter === 'received' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700'
              }`}
            >
              <p className="text-xs font-medium">Received</p>
              <p className="text-lg font-bold">{stats.received}</p>
            </button>
            <button
              onClick={() => setFilter('done')}
              className={`p-2 rounded-lg text-center transition ${
                filter === 'done' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700'
              }`}
            >
              <p className="text-xs font-medium">Done</p>
              <p className="text-lg font-bold">{stats.done}</p>
            </button>
          </div>
        </div>
      </header>

      {/* Orders List */}
      <main className="p-4 pb-20">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {filter === 'all' ? 'No Orders Today' : `No ${filter} orders`}
            </h3>
            <p className="text-gray-500 text-sm">
              {filter === 'all' 
                ? "There are no orders scheduled for today yet." 
                : `All orders have been marked as ${filter === 'pending' ? 'received or done' : filter === 'received' ? 'pending or done' : 'pending or received'}.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTimeSlots.map(timeSlot => (
              <div key={timeSlot} className="bg-white rounded-2xl shadow-md overflow-hidden">
                {/* Time Slot Header */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3">
                  <div className="flex items-center text-white">
                    <Clock className="w-5 h-5 mr-2" />
                    <span className="font-bold text-lg">{timeSlot}</span>
                    <span className="ml-auto text-sm bg-white/20 px-3 py-1 rounded-full">
                      {groupedByTimeSlot[timeSlot].length} items
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-100">
                  {groupedByTimeSlot[timeSlot].map((item) => (
                    <div key={item._id} className="p-4">
                      {/* Order Number & Type */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                            #{item.orderNumber}
                          </span>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            item.orderType === 'freshplan' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.orderType === 'freshplan' ? 'FreshPlan' : 'QuickSip'}
                          </span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded border ${getStatusColor(item.status)}`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </div>

                      {/* Product Info */}
                      <div className="flex gap-3 mb-3">
                        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={item.product.image}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 mb-1 truncate">
                            {item.product.name}
                          </h4>
                          <div className="text-xs text-gray-600 space-y-0.5">
                            <p className="font-medium">
                              {item.customization.size} • {item.customization.quantity}
                              {item.quantity > 1 && ` • Qty: ${item.quantity}`}
                            </p>
                            {item.customization.ice && (
                              <p>Ice: {item.customization.ice}</p>
                            )}
                            {item.customization.sugar && (
                              <p>Sugar: {item.customization.sugar}</p>
                            )}
                            {item.customization.dilution && (
                              <p>Dilution: {item.customization.dilution}</p>
                            )}
                            {item.customization.fibre && (
                              <p className="text-green-600 font-medium">+ Add Fibre</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {item.status !== 'done' && (
                        <div className="flex gap-2">
                          {item.status === 'pending' && (
                            <button
                              onClick={() => updateItemStatus(item._id, 'received')}
                              disabled={updating === item._id}
                              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center"
                            >
                              {updating === item._id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Package className="w-4 h-4 mr-2" />
                                  Mark Received
                                </>
                              )}
                            </button>
                          )}
                          {item.status === 'received' && (
                            <button
                              onClick={() => updateItemStatus(item._id, 'done')}
                              disabled={updating === item._id}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center"
                            >
                              {updating === item._id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark Done
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {item.status === 'done' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                          <span className="text-sm font-medium text-green-700">Completed</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}