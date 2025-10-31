'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Clock, Package, User, Phone, MapPin, AlertCircle, Truck, CheckCircle, XCircle, Filter, Calendar, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { TIME_SLOTS } from '@/constants/timeSlots';

interface Customer {
  name: string;
  phone: string;
  address: string;
  additionalInfo: string;
}

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
  product: Product;
  customization: Customization;
  quantity: number;
}

interface DeliveryOrder {
  _id: string;
  orderNumber: string;
  orderType: 'quicksip' | 'freshplan';
  dayId?: string;
  customer: Customer;
  items: OrderItem[];
  totalAmount: number;
  deliveryCharge: number;
  timeSlot: string;
  status: string;
  deliveryDate: string;
  pickedTime?: string;
  deliveredTime?: string;
  notDeliveredTime?: string;
  notDeliveredReason?: string;
  orderId: string;
}

type OrderStatus = 'done' | 'picked' | 'delivered';

export default function DeliveryOrders() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('done');
  const [timeSlotFilter, setTimeSlotFilter] = useState<string>('all');
  const [isTimeSlotOpen, setIsTimeSlotOpen] = useState(false);
  const [stats, setStats] = useState({ done: 0, picked: 0, delivered: 0 });
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, [selectedDate, statusFilter, timeSlotFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Determine API endpoint based on status filter
      let endpoint = '/api/delivery/orders'; // done orders
      if (statusFilter === 'picked') {
        endpoint = '/api/delivery/picked-orders';
      } else if (statusFilter === 'delivered') {
        endpoint = '/api/delivery/delivered-orders';
      }
      
      // Build query params
      const params = new URLSearchParams();
      params.append('date', selectedDate.toISOString());
      if (timeSlotFilter !== 'all') {
        params.append('timeSlot', timeSlotFilter);
      }
      
      const response = await fetch(`${endpoint}?${params}`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/delivery/login');
          return;
        }
        throw new Error(data.error || 'Failed to fetch orders');
      }
      
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats for all statuses
  const fetchStats = async () => {
    try {
      const dateStr = selectedDate.toISOString();
      const timeSlotParam = timeSlotFilter !== 'all' ? `&timeSlot=${timeSlotFilter}` : '';
      
      const [doneRes, pickedRes, deliveredRes] = await Promise.all([
        fetch(`/api/delivery/orders?date=${dateStr}${timeSlotParam}`, { credentials: 'include' }),
        fetch(`/api/delivery/picked-orders?date=${dateStr}${timeSlotParam}`, { credentials: 'include' }),
        fetch(`/api/delivery/delivered-orders?date=${dateStr}${timeSlotParam}`, { credentials: 'include' })
      ]);

      const [doneData, pickedData, deliveredData] = await Promise.all([
        doneRes.json(),
        pickedRes.json(),
        deliveredRes.json()
      ]);

      setStats({
        done: doneData.success ? doneData.count : 0,
        picked: pickedData.success ? pickedData.count : 0,
        delivered: deliveredData.success ? deliveredData.count : 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedDate, timeSlotFilter]);

  const updateDeliveryStatus = async (orderId: string, dayId: string | undefined, newStatus: 'picked' | 'delivered' | 'not-delivered') => {
    const updateKey = dayId ? `${orderId}-${dayId}` : orderId;
    setUpdating(updateKey);
    const deliveryTime = new Date().toISOString();
    
    try {
      const response = await fetch('/api/delivery/update-status', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, dayId, status: newStatus, deliveryTime })
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh orders and stats
        await fetchOrders();
        await fetchStats();
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
    } finally {
      setUpdating(null);
    }
  };

  const formatCustomization = (customization: Customization) => {
    const parts = [customization.size, customization.quantity];
    if (customization.ice) parts.push(`Ice: ${customization.ice}`);
    if (customization.sugar) parts.push(`Sugar: ${customization.sugar}`);
    if (customization.dilution) parts.push(`Dilution: ${customization.dilution}`);
    if (customization.fibre) parts.push('+ Fibre');
    return parts.join(' • ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'picked': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-300';
      case 'not-delivered': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <Package className="w-4 h-4" />;
      case 'picked': return <Truck className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'not-delivered': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getSelectedTimeSlotLabel = () => {
    if (timeSlotFilter === 'all') return 'All Time Slots';
    return timeSlotFilter;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Link 
                href="/delivery/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg mr-2 transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Delivery Orders</h1>
                <p className="text-xs text-gray-500">Manage your deliveries</p>
              </div>
            </div>
            <button
              onClick={fetchOrders}
              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Date Selector */}
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
              />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              onClick={() => setStatusFilter('done')}
              className={`p-3 rounded-lg border-2 transition ${
                statusFilter === 'done'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Chef Done</p>
                <p className="text-lg font-bold text-yellow-600">{stats.done}</p>
              </div>
            </button>
            <button
              onClick={() => setStatusFilter('picked')}
              className={`p-3 rounded-lg border-2 transition ${
                statusFilter === 'picked'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Picked</p>
                <p className="text-lg font-bold text-blue-600">{stats.picked}</p>
              </div>
            </button>
            <button
              onClick={() => setStatusFilter('delivered')}
              className={`p-3 rounded-lg border-2 transition ${
                statusFilter === 'delivered'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Delivered</p>
                <p className="text-lg font-bold text-green-600">{stats.delivered}</p>
              </div>
            </button>
          </div>

          {/* Custom Time Slot Filter */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <div className="flex-1 relative">
                <button
                  onClick={() => setIsTimeSlotOpen(!isTimeSlotOpen)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white flex items-center justify-between hover:border-blue-400 transition-colors"
                >
                  <span className="text-gray-700">{getSelectedTimeSlotLabel()}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isTimeSlotOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Custom Dropdown */}
                {isTimeSlotOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    <div className="p-1">
                      <button
                        onClick={() => {
                          setTimeSlotFilter('all');
                          setIsTimeSlotOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          timeSlotFilter === 'all'
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          All Time Slots
                        </div>
                      </button>
                      
                      <div className="border-t border-gray-100 my-1"></div>
                      
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => {
                            setTimeSlotFilter(slot.range);
                            setIsTimeSlotOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                            timeSlotFilter === slot.range
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            {slot.range}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Click outside to close dropdown */}
      {isTimeSlotOpen && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => setIsTimeSlotOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="p-4 pb-20">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Unable to Load Orders</h3>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <Link 
              href="/delivery/settings"
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Go to Settings
            </Link>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Orders Found</h3>
            <p className="text-gray-500 text-sm">
              No {statusFilter} orders found for {format(selectedDate, 'MMM d, yyyy')}
              {timeSlotFilter !== 'all' && ` in ${timeSlotFilter} time slot`}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const updateKey = order.dayId ? `${order._id}-${order.dayId}` : order._id;
              const isUpdating = updating === updateKey;
              
              return (
                <div key={order._id} className="bg-white rounded-2xl shadow-md overflow-hidden">
                  {/* Order Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                    <div className="flex items-center justify-between text-white">
                      <div>
                        <h3 className="font-bold text-lg">#{order.orderNumber}</h3>
                        <div className="flex items-center text-sm opacity-90">
                          <Clock className="w-4 h-4 mr-1" />
                          {order.timeSlot}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          order.orderType === 'freshplan' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {order.orderType === 'freshplan' ? 'FreshPlan' : 'QuickSip'}
                        </span>
                        <div className="mt-1">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusColor(order.status)} flex items-center`}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{order.status.replace('-', ' ')}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Customer Info */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        Customer Details
                      </h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="font-medium">{order.customer.name}</p>
                        <div className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          <a href={`tel:${order.customer.phone}`} className="text-blue-600 hover:underline">
                            {order.customer.phone}
                          </a>
                        </div>
                        <div className="flex items-start">
                          <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                          <div>
                            <p>{order.customer.address}</p>
                            {order.customer.additionalInfo && (
                              <p className="text-xs text-gray-500 mt-1">{order.customer.additionalInfo}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Items</h4>
                      <div className="space-y-3">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-white">
                              <Image
                                src={item.product.image}
                                alt={item.product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-gray-900 text-sm truncate">
                                {item.product.name}
                              </h5>
                              <p className="text-xs text-gray-600 mt-1">
                                {formatCustomization(item.customization)}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                                <span className="text-sm font-medium text-gray-900">
                                  ₹{item.customization.finalPrice * item.quantity}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="border-t pt-3 mb-4">
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="text-gray-900">₹{order.totalAmount - order.deliveryCharge}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-gray-600">Delivery Charge:</span>
                        <span className="text-gray-900">₹{order.deliveryCharge}</span>
                      </div>
                      <div className="flex justify-between items-center text-base font-semibold">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-gray-900">₹{order.totalAmount}</span>
                      </div>
                    </div>

                    {/* Delivery Action Buttons - Only for 'done' status filter */}
                    {statusFilter === 'done' && order.status === 'done' && (
                      <button
                        onClick={() => {
                          const orderId = order.dayId ? order.orderId : order._id;
                          updateDeliveryStatus(orderId, order.dayId, 'picked');
                        }}
                        disabled={isUpdating}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center"
                      >
                        {isUpdating ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Truck className="w-4 h-4 mr-2" />
                            Pick Order
                          </>
                        )}
                      </button>
                    )}

                    {statusFilter === 'picked' && order.status === 'picked' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const orderId = order.dayId ? order.orderId : order._id;
                            updateDeliveryStatus(orderId, order.dayId, 'delivered');
                          }}
                          disabled={isUpdating}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center"
                        >
                          {isUpdating ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Delivered
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            const orderId = order.dayId ? order.orderId : order._id;
                            updateDeliveryStatus(orderId, order.dayId, 'not-delivered');
                          }}
                          disabled={isUpdating}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center"
                        >
                          {isUpdating ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-2" />
                              Not Delivered
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Timestamps for completed orders */}
                    {(order.pickedTime || order.deliveredTime || order.notDeliveredTime) && (
                      <div className="mt-4 pt-3 border-t">
                        <h5 className="text-xs font-medium text-gray-700 mb-2">Delivery Timeline</h5>
                        <div className="space-y-1 text-xs text-gray-500">
                          {order.pickedTime && (
                            <p>Picked: {format(new Date(order.pickedTime), 'MMM d, h:mm a')}</p>
                          )}
                          {order.deliveredTime && (
                            <p>Delivered: {format(new Date(order.deliveredTime), 'MMM d, h:mm a')}</p>
                          )}
                          {order.notDeliveredTime && (
                            <div>
                              <p>Not Delivered: {format(new Date(order.notDeliveredTime), 'MMM d, h:mm a')}</p>
                              {order.notDeliveredReason && (
                                <p>Reason: {order.notDeliveredReason}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Order Date */}
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500">
                        Order placed: {format(new Date(order.deliveryDate), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}