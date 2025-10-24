'use client';

import { useState, useEffect } from 'react';
import { format, addDays, isBefore, isAfter, startOfTomorrow, endOfDay, isToday } from 'date-fns';
import { Clock, ArrowLeft, Calendar, ChevronDown, ChevronUp, Package, AlertTriangle, X, CheckCircle, MapPin, Info } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TIME_SLOTS } from '@/constants/timeSlots';

interface ProductDetail {
  _id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description?: string;
}

interface CustomizationDetail {
  size: string;
  quantity: string;
  ice?: string;
  sugar?: string;
  dilution?: string;
  finalPrice?: number;
}

interface OrderItem {
  product: ProductDetail;
  customization: CustomizationDetail;
  quantity: number;
  price: number;
  timeSlot: string;
  _id: string;
}

interface DayScheduleItem {
  date: string;
  items: OrderItem[];
  _id: string;
  timeSlot?: string;
}

interface PlanRelated {
  daySchedule: DayScheduleItem[];
  isCompletePlanCheckout: boolean;
}

interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
  additionalAddressInfo?: string;
}

interface FreshPlanOrder {
  _id: string;
  user: string;
  products: any[];
  totalAmount: number;
  customerDetails: CustomerDetails;
  deliveryCharge: number;
  deliveryTimeSlot: string | null;
  orderType: string;
  planRelated: PlanRelated;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface OrdersResponse {
  success: boolean;
  orders: FreshPlanOrder[];
  error?: string;
}

export default function FreshPlanOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<FreshPlanOrder[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<{ 
    orderId: string;
    dayId: string;
    currentTimeSlot: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Safe date parsing utility
  const safeParseDate = (dateString: string | undefined | null) => {
    try {
      if (!dateString) return new Date();
      const parsed = new Date(dateString);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return new Date();
    }
  };

  // Fetch all FreshPlan orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/freshPlan/orders');
      const data: OrdersResponse = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to fetch orders');
        return;
      }

      // Process orders to add editability info
      const processedOrders = processOrdersEditability(data.orders);
      setOrders(processedOrders);

    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load your orders');
    } finally {
      setLoading(false);
    }
  };

  // Process orders to determine which items are editable based on delivery date
  const processOrdersEditability = (orderList: FreshPlanOrder[]) => {
    return orderList.map(order => {
      try {
        // Deep copy of the order to avoid mutating original data
        const processedOrder = JSON.parse(JSON.stringify(order));
        
        // Process each day in day schedule
        if (processedOrder.planRelated?.daySchedule) {
          processedOrder.planRelated.daySchedule = processedOrder.planRelated.daySchedule.map((day: DayScheduleItem) => {
            const dayDate = safeParseDate(day.date);
            const now = new Date();
            const tomorrow = startOfTomorrow();
            
            // Check if it's tomorrow's delivery
            const isTomorrowDelivery = 
              dayDate.getDate() === tomorrow.getDate() &&
              dayDate.getMonth() === tomorrow.getMonth() &&
              dayDate.getFullYear() === tomorrow.getFullYear();
            
            // If it's tomorrow's delivery, check if it's after cutoff time (11:59 PM today)
            const cutoffTime = new Date(now);
            cutoffTime.setHours(23, 59, 0, 0); // 11:59 PM today
            
            const isPastCutoffTime = isTomorrowDelivery && isAfter(now, cutoffTime);
            const isDayInFuture = isAfter(dayDate, now) || isToday(dayDate);
            
            return {
              ...day,
              isEditable: isDayInFuture && !isPastCutoffTime && !isToday(dayDate),
              isTomorrowDelivery,
              isPastCutoffTime
            };
          });
        }
        
        return processedOrder;
      } catch (error) {
        console.error('Error processing order editability:', order._id, error);
        return order;
      }
    });
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const toggleDay = (orderId: string, dayId: string) => {
    const key = `${orderId}-${dayId}`;
    setExpandedDays(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const openTimePicker = (orderId: string, dayId: string, currentTimeSlot: string) => {
    setShowTimePicker({ orderId, dayId, currentTimeSlot });
  };

  const closeTimePicker = () => {
    setShowTimePicker(null);
  };

  const updateTimeSlot = async (selectedTimeSlot: string) => {
    if (!showTimePicker) return;
    
    try {
      setSubmitting(true);
      
      const { orderId, dayId } = showTimePicker;
      const clientTime = new Date().toISOString(); // Include client time
      
      const response = await fetch('/api/freshPlan/edit-delivery', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          dayId,
          timeSlot: selectedTimeSlot,
          clientTime
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update delivery time');
      }

      // Update local state to reflect the change
      const updatedOrders = orders.map(order => {
        if (order._id === orderId && order.planRelated?.daySchedule) {
          const updatedDaySchedule = order.planRelated.daySchedule.map(day => {
            if (day._id === dayId) {
              // Update all items in this day to have the new time slot
              const updatedItems = day.items.map(item => ({
                ...item,
                timeSlot: selectedTimeSlot
              }));
              return { ...day, items: updatedItems, timeSlot: selectedTimeSlot };
            }
            return day;
          });
          return { 
            ...order, 
            planRelated: { 
              ...order.planRelated, 
              daySchedule: updatedDaySchedule 
            } 
          };
        }
        return order;
      });

      setOrders(updatedOrders);
      closeTimePicker();
      
      // Show success message
      setSuccessMessage('Delivery time updated successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error updating time slot:', error);
      setError(error instanceof Error ? error.message : 'Failed to update delivery time');
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  };

  // Render time picker modal
  const renderTimePicker = () => {
    if (!showTimePicker) return null;
    
    return (
      <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden animate-slide-up">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-medium text-gray-900">Select Delivery Time</h3>
            <button 
              onClick={closeTimePicker}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Morning Slots</h4>
              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.filter(slot => slot.type === 'morning').map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => updateTimeSlot(slot.range)}
                    disabled={submitting}
                    className={`p-3 rounded-lg text-left transition-colors ${
                      showTimePicker.currentTimeSlot === slot.range
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    }`}
                  >
                    <span className="font-medium">{slot.range}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Evening Slots</h4>
              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.filter(slot => slot.type === 'evening').map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => updateTimeSlot(slot.range)}
                    disabled={submitting}
                    className={`p-3 rounded-lg text-left transition-colors ${
                      showTimePicker.currentTimeSlot === slot.range
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    }`}
                  >
                    <span className="font-medium">{slot.range}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 flex justify-end">
            <button
              onClick={closeTimePicker}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Time Picker Modal */}
      {renderTimePicker()}
      
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4">
          <div className="py-4 flex items-center">
            <button 
              onClick={() => router.push('/freshplan')}
              className="p-2 rounded-lg hover:bg-gray-100 mr-2 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-black" />
            </button>
            <h1 className="text-xl text-black font-bold">My FreshPlan Orders</h1>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 mb-20">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-md animate-fade-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md animate-fade-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Help Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">About Delivery Time Changes</h4>
              <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>You can edit tomorrow's delivery times until 11:59 PM today</li>
                <li>Future delivery times (beyond tomorrow) can be changed anytime</li>
                <li>Same-day delivery times cannot be modified</li>
              </ul>
            </div>
          </div>
        </div>
        
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <Calendar className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No Orders Found</h2>
            <p className="text-gray-600 mb-6">You don't have any upcoming FreshPlan orders yet.</p>
            <Link 
              href="/freshplan"
              className="inline-block px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 shadow-md transition-colors"
            >
              Create FreshPlan
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order, orderIndex) => {
              const isExpanded = expandedOrders[order._id] || false;
              const orderDate = safeParseDate(order.createdAt);
              
              return (
                <div key={order._id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                  {/* Order Header */}
                  <div 
                    className="p-4 border-b border-gray-100 flex justify-between items-center cursor-pointer"
                    onClick={() => toggleOrder(order._id)}
                  >
                    <div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                        <h3 className="font-medium text-gray-900">
                          FreshPlan ({format(orderDate, 'MMM d, yyyy')})
                        </h3>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium 
                          ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                            order.status === 'processing' ? 'bg-blue-100 text-blue-700' : 
                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                            'bg-orange-100 text-orange-700'}`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {order.planRelated?.daySchedule?.length || 0} days • ₹{order.totalAmount}
                      </p>
                    </div>
                    <div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  {/* Order Details */}
                  {isExpanded && (
                    <div className="p-4">
                      {/* Delivery Address */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <MapPin className="w-4 h-4 mr-1.5 text-gray-500" />
                          Delivery Address
                        </h4>
                        <p className="text-sm text-gray-800">{order.customerDetails.name} • {order.customerDetails.phone}</p>
                        <p className="text-sm text-gray-600 mt-1">{order.customerDetails.address}</p>
                        {order.customerDetails.additionalAddressInfo && (
                          <p className="text-sm text-gray-500 mt-1">{order.customerDetails.additionalAddressInfo}</p>
                        )}
                      </div>
                      
                      {/* Day Schedule */}
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Delivery Schedule</h4>
                      <div className="space-y-3">
                        {order.planRelated?.daySchedule?.map((day, dayIndex) => {
                          const dayDate = safeParseDate(day.date);
                          const dayKey = `${order._id}-${day._id}`;
                          const isExpanded = expandedDays[dayKey] || false;
                          const isTodays = isToday(dayDate);
                          const isTomorrow = isBefore(dayDate, addDays(startOfTomorrow(), 1)) && 
                                              isAfter(dayDate, new Date());
                          const isPast = isBefore(dayDate, new Date()) && !isToday(dayDate);
                          
                          // Get the time slot from the first item (they should all be the same)
                          const timeSlot = day.items[0]?.timeSlot || day.timeSlot || "Not set";
                          
                          // Check if this day is editable
                          const isEditable = (day as any).isEditable === true;
                          
                          return (
                            <div 
                              key={day._id} 
                              className={`border border-gray-200 rounded-lg overflow-hidden ${
                                isPast ? 'opacity-75' : ''
                              }`}
                            >
                              <div 
                                className={`p-3 flex items-center justify-between cursor-pointer ${
                                  isTodays ? 'bg-blue-50' : 
                                  isTomorrow ? 'bg-orange-50' : 
                                  'bg-white'
                                }`}
                                onClick={() => toggleDay(order._id, day._id)}
                              >
                                <div className="flex items-center">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center mr-3 ${
                                    isTodays ? 'bg-blue-100 text-blue-700' : 
                                    isTomorrow ? 'bg-orange-100 text-orange-700' : 
                                    isPast ? 'bg-gray-100 text-gray-500' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    <span className="text-sm font-bold">
                                      {format(dayDate, 'd')}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {format(dayDate, 'EEEE, MMM d')}
                                      {isTodays && <span className="ml-1.5 text-xs text-blue-600 font-medium">Today</span>}
                                      {isTomorrow && <span className="ml-1.5 text-xs text-orange-600 font-medium">Tomorrow</span>}
                                    </p>
                                    <div className="flex items-center text-xs text-gray-500">
                                      <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
                                      <span>{timeSlot}</span>
                                      {isEditable && (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openTimePicker(order._id, day._id, timeSlot);
                                          }}
                                          className="ml-2 text-orange-500 hover:text-orange-600 text-xs font-medium"
                                        >
                                          Edit time
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>
                              </div>
                              
                              {/* Day Items */}
                              {isExpanded && (
                                <div className="p-3 bg-white border-t border-gray-100">
                                  {!isEditable && isTomorrow && (day as any).isPastCutoffTime && (
                                    <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-md mb-3">
                                      <div className="flex">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        <p className="ml-2 text-xs text-amber-700">
                                          The cutoff time for modifying tomorrow's delivery has passed (11:59 PM).
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="space-y-3">
                                    {day.items.map((item, itemIndex) => (
                                      <div 
                                        key={itemIndex}
                                        className="flex items-center bg-gray-50 p-3 rounded-lg"
                                      >
                                        <div className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden">
                                          <Image 
                                            src={item.product.image} 
                                            alt={item.product.name}
                                            fill
                                            className="object-cover"
                                          />
                                        </div>
                                        <div className="ml-3 flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">
                                            {item.product.name}
                                          </p>
                                          <div className="flex flex-wrap gap-2 mt-1">
                                            <p className="text-xs text-gray-500">
                                              Qty: {item.quantity}
                                            </p>
                                            {item.customization.size && (
                                              <p className="text-xs text-gray-500">
                                                Size: {item.customization.size}
                                              </p>
                                            )}
                                            {item.customization.ice && (
                                              <p className="text-xs text-gray-500">
                                                Ice: {item.customization.ice}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-semibold text-gray-900">
                                            ₹{item.price}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between">
                                    <span className="text-sm text-gray-600">Day Total</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      ₹{day.items.reduce((total, item) => total + item.price, 0)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between">
                        <span className="font-medium text-gray-700">Order Total</span>
                        <span className="font-bold text-gray-900">₹{order.totalAmount}</span>
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