'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface OrderItem {
  timeSlot: string;
  product: {
    name: string;
    image: string;
    category?: string;
  };
  quantity: number;
  customization: {
    category: string;
    size: string;
    quantity: string;
    ice?: string;
    sugar?: string;
    dilution?: string;
    finalPrice: number;
  };
}

interface DaySchedule {
  date: string;
  items: OrderItem[];
}

interface OrderConfirmation {
  _id: string;
  products: OrderItem[];
  totalAmount: number;
  status: string;
  orderType: 'quicksip' | 'freshplan';
  customerDetails: {
    name: string;
    phone: string;
    address: string;
    additionalAddressInfo?: string;
  };
  createdAt: string;
  deliveryCharge?: number;
  deliveryTimeSlot?: string;
  customisablePrices?: {
    category: string;
    price: number;
  }[];
  planRelated?: {
    planDayId?: string;
    isCompletePlanCheckout?: boolean;
    daySchedule?: DaySchedule[];
  };
}

function OrderList() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log("order data", data);
      if (data.success) {
        setOrder(data.order);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dateStr: string) => {
    if (expandedDay === dateStr) {
      setExpandedDay(null);
    } else {
      setExpandedDay(dateStr);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'EEE, MMM d');
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
        <p className="text-gray-600 mb-8">
          We couldn't find any details for this order. Please check the order ID and try again.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto px-4">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Order Confirmation Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 py-8 px-6 text-white">
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-orange-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h1>
              <p className="text-white text-opacity-90">
                Thank you for your order. We'll start preparing it right away.
              </p>
            </div>
          </div>

          {/* Order Details */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-600">
                Order ID: <span className="font-medium text-gray-900">#{order._id.toString().slice(-6).toUpperCase()}</span>
              </p>
              <p className="text-sm text-gray-600">
                Date: <span className="font-medium text-gray-900">{format(new Date(order.createdAt), 'PPP')}</span>
              </p>
              <p className="text-sm text-gray-600">
                Order Type: <span className="font-medium text-gray-900 capitalize">{order.orderType}</span>
              </p>
            </div>

            {/* Show different layouts based on order type */}
            {order.orderType === 'quicksip' ? (
              // QuickSip Order Items
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Items</h3>
                <div className="space-y-4">
                  {order.products.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      {item.product && (
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <Image
                            src={item.product.image}
                            alt={item.product.name}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {item.product ? item.product.name : item.customization.category}
                        </p>
                        {item.product && (
                          <p className="text-sm text-gray-500">
                            {item.customization.size} • {item.customization.quantity}
                            {item.customization.ice && ` • ${item.customization.ice}`}
                            {item.customization.sugar && ` • ${item.customization.sugar}`}
                            {item.customization.dilution && ` • ${item.customization.dilution}`}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        ₹{item.customization.finalPrice}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // FreshPlan Order Items (Day-wise)
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">FreshPlan Schedule</h3>
                
                {order.planRelated?.isCompletePlanCheckout && order.planRelated.daySchedule ? (
                  // Complete FreshPlan checkout with day-wise data
                  <div className="space-y-3">
                    {order.planRelated.daySchedule.map((day, index) => (
                      <div 
                        key={index} 
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <div 
                          className="flex items-center justify-between p-3 cursor-pointer bg-gray-50"
                          onClick={() => toggleDay(day.date)}
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-orange-100 text-orange-600">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{formatDate(day.date)}</h4>
                              <p className="text-xs text-gray-500">
                                {day.items.length} {day.items.length === 1 ? 'item' : 'items'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900 mr-2">
                              ₹{day.items.reduce((total, item) => total + item.customization.finalPrice, 0)}
                            </p>
                            {expandedDay === day.date ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                        
                        {expandedDay === day.date && (
                          <div className="p-3 border-t border-gray-200 space-y-3">
                            {day.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex items-center gap-3">
                                <div className="relative w-12 h-12 flex-shrink-0">
                                  <Image
                                    src={item.product.image}
                                    alt={item.product.name}
                                    fill
                                    className="object-cover rounded-md"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {item.customization.size}
                                    {item.customization.ice && ` • ${item.customization.ice}`}
                                    {item.customization.sugar && ` • ${item.customization.sugar}`}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">₹{item.customization.finalPrice}</p>
                                  <div className="flex items-center text-xs text-gray-500">
                                    <Clock className="w-3 h-3 mr-1" />
                                    <span>{item.timeSlot}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Single day checkout
                  <div className="space-y-4">
                    {order.products.map((item, index) => (
                      <div key={index} className="flex items-center gap-4">
                        {item.product && (
                          <div className="relative w-16 h-16 flex-shrink-0">
                            <Image
                              src={item.product.image}
                              alt={item.product.name}
                              fill
                              className="object-cover rounded"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {item.product ? item.product.name : item.customization.category}
                          </p>
                          {item.product && (
                            <p className="text-sm text-gray-500">
                              {item.customization.size} • {item.customization.quantity}
                              {item.customization.ice && ` • ${item.customization.ice}`}
                              {item.customization.sugar && ` • ${item.customization.sugar}`}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          ₹{item.customization.finalPrice}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Delivery Information */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Delivery Information</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{order.customerDetails.name}</p>
                <p className="text-sm text-gray-700">{order.customerDetails.phone}</p>
                <p className="text-sm text-gray-700">{order.customerDetails.address}</p>
                {order.customerDetails.additionalAddressInfo && (
                  <p className="text-sm text-gray-700 mt-1">{order.customerDetails.additionalAddressInfo}</p>
                )}
                {order.orderType === 'quicksip' && order.deliveryTimeSlot && (
                  <div className="mt-2 flex items-center">
                    <Clock className="w-4 h-4 text-gray-500 mr-2" />
                    <p className="text-sm text-gray-700">Delivery Time: {order.deliveryTimeSlot}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              {order.deliveryCharge !== undefined && (
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Delivery Fee</span>
                  <span>₹{order.deliveryCharge}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">₹{order.totalAmount}</span>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="mt-8 space-y-3">
              <Link
                href="/dashboard"
                className="block w-full py-3 bg-orange-500 text-white text-center font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                Back to Dashboard
              </Link>
              <Link
                href={order.orderType === 'freshplan' ? '/my-plans' : '/orders'}
                className="block w-full py-3 bg-gray-100 text-gray-700 text-center font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                {order.orderType === 'freshplan' ? 'View Current Plan' : 'View All Orders'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
    </div>}>
      <OrderList />
    </Suspense>
  );
}