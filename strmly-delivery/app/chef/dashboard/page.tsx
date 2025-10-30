'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, Clock, Package, CheckCircle, LogOut, RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const router = useRouter();

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const isToday = isSameDay(selectedDate, today);
  const isTomorrow = isSameDay(selectedDate, tomorrow);

  useEffect(() => {
    fetchOrdersForDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    // Only refresh automatically if viewing today
    if (isToday) {
      const interval = setInterval(() => fetchOrdersForDate(selectedDate), 30000);
      return () => clearInterval(interval);
    }
  }, [selectedDate, isToday]);

 const fetchOrdersForDate = async (date: Date) => {
  try {
    setLoading(true);
    
    // Determine which API endpoint to use based on selected date
    const isCurrentlyToday = isSameDay(date, today);
    const isCurrentlyTomorrow = isSameDay(date, tomorrow);
    
    let apiEndpoint: string;
    if (isCurrentlyToday) {
      apiEndpoint = '/api/chef/today-orders';
    } else if (isCurrentlyTomorrow) {
      apiEndpoint = '/api/chef/tomorrow-orders';
    } else {
      // Fallback to today if somehow neither matches
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
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
  } finally {
    setLoading(false);
  }
};

  const updateDayStatus = async (orderId: string, dayId: string, newStatus: 'received' | 'done') => {
    const updateKey = `${orderId}-${dayId}`;
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
        // Update local state for all items in this day
        if (dayId !== undefined) {
          setItems(prev => prev.map(item => 
            item.orderId === orderId && item.dayId === dayId 
              ? { ...item, dayStatus: newStatus } 
              : item
          ));
        } else {
          setItems(prev => prev.map(item =>
            item.orderId === orderId
              ? { ...item, status: newStatus }
              : item
          ));
        }
      }
    } catch (error) {
      console.error('Error updating day status:', error);
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

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    // For FreshPlan items, check day status
    if (item.orderType === 'freshplan' && item.dayStatus) {
      return item.dayStatus === filter;
    }
    // For QuickSip items, check item status
    return item.status === filter;
  });

  // Group items by time slot and then by order/day for FreshPlan
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
      // QuickSip items
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
    pending: items.filter(i => (i.orderType === 'freshplan' ? i.dayStatus : i.status) === 'pending').length,
    received: items.filter(i => (i.orderType === 'freshplan' ? i.dayStatus : i.status) === 'received').length,
    done: items.filter(i => (i.orderType === 'freshplan' ? i.dayStatus : i.status) === 'done').length
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
                onClick={() => fetchOrdersForDate(selectedDate)}
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

            {/* Current Date Display */}
            <div className={`flex items-center justify-center rounded-lg p-2 mt-2 ${
              isToday ? 'bg-green-50' : 'bg-orange-50'
            }`}>
              <Clock className={`w-4 h-4 mr-2 ${isToday ? 'text-green-600' : 'text-orange-600'}`} />
              <span className={`text-sm font-medium ${isToday ? 'text-green-900' : 'text-orange-900'}`}>
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </span>
            </div>

            {/* Tomorrow View Notice */}
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
                {/* Time Slot Header */}
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

                {/* Orders */}
                <div className="divide-y divide-gray-100">
                  {Object.entries(groupedByTimeSlot[timeSlot]).map(([key, orderGroup]: [string, any]) => {
                    const isFreshPlan = orderGroup.orderType === 'freshplan';
                    const currentStatus = isFreshPlan ? orderGroup.dayStatus : orderGroup.status;
                    const updateKey = isFreshPlan ? `${orderGroup.orderId}-${orderGroup.dayId}` : key;

                    return (
                      <div key={key} className="p-4">
                        {/* Order Header */}
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

                        {/* Items List */}
                        <div className="space-y-3 mb-3">
                          {orderGroup.items.map((item: OrderItem) => (
                            <div key={item._id} className="flex gap-3 bg-gray-50 p-3 rounded-lg">
                              <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white">
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
                          ))}
                        </div>

                        {/* Action Buttons - Only show for today's orders */}
                        {isToday && currentStatus !== 'done' && (
                          <div className="flex gap-2">
                            {currentStatus === 'pending' && (
                              <button
                                onClick={() => {
                                  updateDayStatus(orderGroup.orderId, orderGroup.dayId, 'received');
                                }}
                                disabled={updating === updateKey}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center"
                              >
                                {updating === updateKey ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Package className="w-4 h-4 mr-2" />
                                    Mark Received
                                  </>
                                )}
                              </button>
                            )}
                            {currentStatus === 'received' && (
                              <button
                                onClick={() => {
                                  updateDayStatus(orderGroup.orderId, orderGroup.dayId, 'done');
                                }}
                                disabled={updating === updateKey}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center"
                              >
                                {updating === updateKey ? (
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

                        {/* Status Display for Today's Completed or Tomorrow's Orders */}
                        {(currentStatus === 'done' || !isToday) && (
                          <div className={`border rounded-lg p-2 flex items-center justify-center ${
                            currentStatus === 'done' 
                              ? 'bg-green-50 border-green-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            {currentStatus === 'done' ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                                <span className="text-sm font-medium text-green-700">Completed</span>
                              </>
                            ) : (
                              <span className="text-sm font-medium text-gray-600">
                                Status: {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                              </span>
                            )}
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
      </main>
    </div>
  );
}