'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, Clock, Package, CheckCircle, LogOut, RefreshCw, Calendar, XCircle, X } from 'lucide-react';
import Image from 'next/image';
import { format, addDays, isSameDay } from 'date-fns';

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
  orderId: string;
  dayId?: string;
  dayStatus?: 'pending' | 'received' | 'done';
}

export default function ChefDashboard() {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'received' | 'done'>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    received: 0,
    done: 0
  });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<{
    orderId: string;
    dayId?: string;
    orderNumber: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const router = useRouter();

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const isToday = isSameDay(selectedDate, today);
  const isTomorrow = isSameDay(selectedDate, tomorrow);



  // Fetch orders when date or filter changes
  useEffect(() => {
    fetchOrdersForDate(selectedDate);
  }, [selectedDate, filter]);

  // Fetch stats when date changes
  useEffect(() => {
    fetchChefStats(selectedDate);
  }, [selectedDate]);

  // Auto-refresh only for today
  useEffect(() => {
    if (isToday) {
      const interval = setInterval(() => {
        fetchOrdersForDate(selectedDate);
        fetchChefStats(selectedDate);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedDate, isToday, filter]);

  const openCancelModal = (orderId: string, orderNumber: string, dayId?: string) => {
    setSelectedOrderForCancel({ orderId, orderNumber, dayId });
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCancelOrder = async () => {
    if (!selectedOrderForCancel) return;
    
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setCancelling(true);

    try {
      const response = await fetch('/api/cancel-order', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrderForCancel.orderId,
          cancelledBy: 'chef',
          reason: cancelReason,
          ...(selectedOrderForCancel.dayId && { dayId: selectedOrderForCancel.dayId })
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Order cancelled successfully!');
        setShowCancelModal(false);
        setSelectedOrderForCancel(null);
        setCancelReason('');
        // Refresh orders
        await fetchOrdersForDate(selectedDate);
        await fetchChefStats(selectedDate);
      } else {
        alert(data.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  // Fetch chef statistics
  const fetchChefStats = async (date: Date) => {
    try {
      const dateStr = date.toISOString();
      const response = await fetch(`/api/chef/stats?date=${dateStr}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/chef/login');
          return;
        }
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      if (data.success) {
        setStats({
          total: data.stats.totalOrders,
          pending: data.stats.pendingOrders,
          received: data.stats.receivedOrders,
          done: data.stats.doneOrders
        });
      }
    } catch (error) {
      console.error('Error fetching chef stats:', error);
    }
  };


const fetchOrdersForDate = async (date: Date) => {
  try {
    setLoading(true);
    
    const isCurrentlyToday = isSameDay(date, today);
    const isCurrentlyTomorrow = isSameDay(date, tomorrow);
    const dateStr = date.toISOString();
    
    let apiEndpoint: string;
    
    // Use filter-specific endpoints when filtering
    if (filter === 'pending') {
      apiEndpoint = `/api/chef/pending-orders?date=${dateStr}`;
    } else if (filter === 'received') {
      apiEndpoint = `/api/chef/received-orders?date=${dateStr}`;
    } else if (filter === 'done') {
      apiEndpoint = `/api/chef/done-orders?date=${dateStr}`;
    } else if (isCurrentlyToday) {
      apiEndpoint = '/api/chef/today-orders';
    } else if (isCurrentlyTomorrow) {
      apiEndpoint = '/api/chef/tomorrow-orders';
    } else {
      apiEndpoint = '/api/chef/today-orders';
    }
    
    const response = await fetch(apiEndpoint, {
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
      console.log(`Fetched ${data.items.length} items for ${filter} filter`);
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
  } finally {
    setLoading(false);
  }
};

  const updateDayStatus = async (orderId: string, dayId: string | undefined, newStatus: 'received' | 'done') => {
    const updateKey = dayId ? `${orderId}-${dayId}` : orderId;
    setUpdating(updateKey);
    const chefTime = new Date().toISOString();
    
    try {
      const response = await fetch('/api/chef/update-item-status', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, dayId, status: newStatus, chefTime })
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh both orders and stats after update
        await fetchOrdersForDate(selectedDate);
        await fetchChefStats(selectedDate);
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

  const switchToToday = () => {
    setSelectedDate(today);
    setFilter('all');
  };

  const switchToTomorrow = () => {
    setSelectedDate(tomorrow);
    setFilter('all');
  };

  // No client-side filtering needed as API handles it
  const filteredItems = items;

  // Group items by time slot and then by order
  const groupedByTimeSlot = filteredItems.reduce((acc, item) => {
    const slot = item.timeSlot || 'No Time Slot';
    if (!acc[slot]) acc[slot] = {};
    
    if (item.orderType === 'freshplan' && item.dayId) {
      const dayKey = `${item.orderId}-${item.dayId}`;
      if (!acc[slot][dayKey]) {
        acc[slot][dayKey] = {
          orderNumber: item.orderNumber,
          orderType: item.orderType,
          orderId: item.orderId,
          dayId: item.dayId,
          dayStatus: item.dayStatus || 'pending',
          items: []
        };
      }
      acc[slot][dayKey].items.push(item);
    } else {
      const orderKey = item.orderId;
      if (!acc[slot][orderKey]) {
        acc[slot][orderKey] = {
          orderNumber: item.orderNumber,
          orderType: item.orderType,
          orderId: item.orderId,
          status: item.status,
          items: []
        };
      }
      acc[slot][orderKey].items.push(item);
    }
    
    return acc;
  }, {} as Record<string, any>);

  const sortedTimeSlots = Object.keys(groupedByTimeSlot).sort((a, b) => {
    const timeSlotOrder = [
      '7-8 AM', '8-9 AM', '9-10 AM', '10-11 AM',
      '3-4 PM', '4-5 PM', '5-6 PM', '6-7 PM', 'ASAP'
    ];
    const indexA = timeSlotOrder.indexOf(a);
    const indexB = timeSlotOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'received': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'done': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading orders...</p>
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
                <p className="text-xs text-gray-500">
                  {isToday ? "Today's Orders" : isTomorrow ? "Tomorrow's Orders" : "Orders"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchOrdersForDate(selectedDate);
                  fetchChefStats(selectedDate);
                }}
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

          {/* Date Selector */}
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={switchToToday}
                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
                  isToday
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Today</span>
                </div>
                <div className="text-xs opacity-80 mt-0.5">
                  {format(today, 'MMM d')}
                </div>
              </button>

              <button
                onClick={switchToTomorrow}
                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
                  isTomorrow
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Tomorrow</span>
                </div>
                <div className="text-xs opacity-80 mt-0.5">
                  {format(tomorrow, 'MMM d')}
                </div>
              </button>
            </div>

            <div className={`flex items-center justify-center rounded-lg p-2 mt-2 ${
              isToday ? 'bg-green-50' : 'bg-orange-50'
            }`}>
              <Clock className={`w-4 h-4 mr-2 ${isToday ? 'text-green-600' : 'text-orange-600'}`} />
              <span className={`text-sm font-medium ${isToday ? 'text-green-900' : 'text-orange-900'}`}>
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </span>
            </div>

            {isTomorrow && (
              <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
                <p className="text-xs text-orange-700 text-center">
                  📋 Preview mode - Status updates are only available for today's orders
                </p>
              </div>
            )}
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
              {filter === 'all' 
                ? `No Orders ${isToday ? 'Today' : isTomorrow ? 'Tomorrow' : 'For This Date'}` 
                : `No ${filter} orders`}
            </h3>
            <p className="text-gray-500 text-sm">
              {filter === 'all' 
                ? `There are no orders scheduled for ${isToday ? 'today' : isTomorrow ? 'tomorrow' : 'this date'} yet.`
                : `All orders have been processed.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTimeSlots.map(timeSlot => (
              <div key={timeSlot} className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className={`px-4 py-3 ${
                  isToday 
                    ? 'bg-gradient-to-r from-green-500 to-green-600' 
                    : 'bg-gradient-to-r from-orange-500 to-orange-600'
                }`}>
                  <div className="flex items-center text-white">
                    <Clock className="w-5 h-5 mr-2" />
                    <span className="font-bold text-lg">{timeSlot}</span>
                    <span className="ml-auto text-sm bg-white/20 px-3 py-1 rounded-full">
                      {Object.keys(groupedByTimeSlot[timeSlot]).length} orders
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {Object.entries(groupedByTimeSlot[timeSlot]).map(([key, orderGroup]: [string, any]) => {
                    const isFreshPlan = orderGroup.orderType === 'freshplan';
                    const currentStatus = isFreshPlan ? orderGroup.dayStatus : orderGroup.status;
                    const updateKey = isFreshPlan ? `${orderGroup.orderId}-${orderGroup.dayId}` : orderGroup.orderId;

                    return (
                      <div key={key} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                              #{orderGroup.orderNumber}
                            </span>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              isFreshPlan
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {isFreshPlan ? 'FreshPlan Day' : 'QuickSip'}
                            </span>
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded border ${getStatusColor(currentStatus)}`}>
                            {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                          </span>
                        </div>
                         {orderGroup.status === 'pending' && (
                              <button
                                onClick={() => openCancelModal(
                                  orderGroup.orderId, 
                                  orderGroup.orderNumber,
                                  orderGroup.dayId
                                )}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-medium"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Cancel
                              </button>
                            )}

                        <div className="space-y-3 mb-3">
                          {orderGroup.items.map((item: OrderItem) => (
                            <div key={item._id} className="flex gap-3 bg-gray-50 p-3 rounded-lg">
                              <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white">
                                <Image
                                  src={item.product?.image || '/placeholder-product.jpg'}
                                  alt={item.product?.name || 'Product'}
                                  fill
                                  className="object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder-product.jpg';
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 mb-1 truncate">
                                  {item.product?.name || 'Unknown Product'}
                                </h4>
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  <p className="font-medium">
                                    {item.customization?.size || 'Unknown'} • {item.customization?.quantity || 'Unknown'}
                                    {item.quantity > 1 && ` • Qty: ${item.quantity}`}
                                  </p>
                                  {item.customization?.ice && <p>Ice: {item.customization.ice}</p>}
                                  {item.customization?.sugar && <p>Sugar: {item.customization.sugar}</p>}
                                  {item.customization?.dilution && <p>Dilution: {item.customization.dilution}</p>}
                                  {item.customization?.fibre && <p className="text-green-600 font-medium">+ Add Fibre</p>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {isToday && currentStatus !== 'done' && (
                          <div className="flex gap-2">
                            {currentStatus === 'pending' && (
                              <button
                                onClick={() => updateDayStatus(orderGroup.orderId, orderGroup.dayId, 'received')}
                                disabled={updating === updateKey}
                                className="flex-1 bg-blue-500 text-white py-2.5 px-4 rounded-lg font-semibold text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              >
                                {updating === updateKey ? 'Updating...' : 'Mark as Received'}
                              </button>
                            )}
                            {currentStatus === 'received' && (
                              <button
                                onClick={() => updateDayStatus(orderGroup.orderId, orderGroup.dayId, 'done')}
                                disabled={updating === updateKey}
                                className="flex-1 bg-green-500 text-white py-2.5 px-4 rounded-lg font-semibold text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              >
                                {updating === updateKey ? 'Updating...' : 'Mark as Done'}
                              </button>
                            )}
                          </div>
                        )}

                        {currentStatus === 'done' && (
                          <div className="flex items-center justify-center py-2 px-4 bg-green-50 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                            <span className="text-sm font-medium text-green-700">Completed</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <XCircle className="w-6 h-6 text-red-600" />
                  <h3 className="text-xl font-bold text-gray-900">Cancel Order</h3>
                </div>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Order Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-gray-900">
                  Order #{selectedOrderForCancel?.orderNumber}
                </p>
              </div>

              {/* Warning Message */}
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <div className="flex items-start">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      Are you sure you want to cancel this order?
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Cancellation Reason *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason (e.g., Out of ingredients, Kitchen issue)..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="flex-1 py-3 px-4 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Keep Order
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling || !cancelReason.trim()}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                    cancelling || !cancelReason.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {cancelling ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Cancelling...
                    </span>
                  ) : (
                    'Cancel Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}