'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Clock, Package, User, Phone, MapPin, AlertCircle, Truck, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';

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
  deliveryTimeSlot: string;
  status: string;
  createdAt: string;
  dayDate?: string;
}

interface TimeSlotInfo {
  current: string;
  showingFrom: string;
  rule: string;
}

export default function DeliveryOrders() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [timeSlotInfo, setTimeSlotInfo] = useState<TimeSlotInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<{ hour: number; minutes: number }>({
    hour: new Date().getHours(),
    minutes: new Date().getMinutes()
  });
  const router = useRouter();

  useEffect(() => {
    // Update current time every minute
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime({ hour: now.getHours(), minutes: now.getMinutes() });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [currentTime]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/delivery/orders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentTime)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          if (data.error?.includes('not active for this time slot')) {
            setError(data.error);
            setOrders([]);
          } else {
            router.push('/delivery/login');
            return;
          }
        } else {
          throw new Error(data.error || 'Failed to fetch orders');
        }
      } else if (data.success) {
        setOrders(data.orders);
        console.log(data.orders)
        setTimeSlotInfo(data.timeSlotInfo);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

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
        // Update local state
        setOrders(prev => prev.map(order => {
          if (order._id === orderId || (dayId && order._id === `${orderId}-${dayId}`)) {
            return { ...order, status: newStatus === 'picked' ? 'delivered' : newStatus };
          }
          return order;
        }));
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
      case 'accepted': return 'bg-green-100 text-green-800 border-green-300';
      case 'out-for-delivery': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-300';
      case 'not-delivered': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <Package className="w-4 h-4" />;
      case 'out-for-delivery': return <Truck className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'not-delivered': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
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
                <h1 className="text-xl font-bold text-gray-900">Delivery orders</h1>
                <p className="text-xs text-gray-500">Orders for your time slots</p>
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

          {/* Time Info */}
          {timeSlotInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-900 font-medium">
                  Current: {timeSlotInfo.current}
                </span>
                <span className="text-blue-700">
                  Showing: {timeSlotInfo.showingFrom}
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">{timeSlotInfo.rule}</p>
            </div>
          )}
        </div>
      </header>

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
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Unable to load orders</h3>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <Link 
              href="/delivery/settings"
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Go to settings
            </Link>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No orders available</h3>
            <p className="text-gray-500 text-sm">
              {timeSlotInfo 
                ? `No orders found for ${timeSlotInfo.showingFrom} time slot.`
                : 'There are no delivery orders for your active time slots right now.'
              }
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
                          {order.deliveryTimeSlot}
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
                        Customer details
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
                        <span className="text-gray-600">Delivery charge:</span>
                        <span className="text-gray-900">₹{order.deliveryCharge}</span>
                      </div>
                      <div className="flex justify-between items-center text-base font-semibold">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-gray-900">₹{order.totalAmount}</span>
                      </div>
                    </div>

                    {/* Delivery Action Buttons */}
                    {order.status !== 'delivered' && order.status !== 'not-delivered' && (
                      <div className="space-y-2">
                        {order.status === 'done' && (
                          <button
                            onClick={() => {
                              const orderId = order.dayId ? order._id.split('-')[0] : order._id;
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
                                Mark as picked
                              </>
                            )}
                          </button>
                        )}

                        {order.status === 'picked' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const orderId = order.dayId ? order._id.split('-')[0] : order._id;
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
                                const orderId = order.dayId ? order._id.split('-')[0] : order._id;
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
                                  Not delivered
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status Display for Completed Orders */}
                    {(order.status === 'delivered' || order.status === 'not-delivered') && (
                      <div className={`border rounded-lg p-3 flex items-center justify-center ${
                        order.status === 'delivered' 
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}>
                        {getStatusIcon(order.status)}
                        <span className={`text-sm font-medium ml-2 ${
                          order.status === 'delivered' ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {order.status === 'delivered' ? 'Successfully Delivered' : 'Not Delivered'}
                        </span>
                      </div>
                    )}

                    {/* Order Date */}
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500">
                        Order placed: {format(new Date(order.createdAt), 'MMM d, h:mm a')}
                      </p>
                      {order.dayDate && (
                        <p className="text-xs text-gray-500">
                          Delivery date: {format(new Date(order.dayDate), 'MMM d, yyyy')}
                        </p>
                      )}
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