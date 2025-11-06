'use client';

import React, { useState, useEffect } from 'react';
import { Suspense } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  BarChart3, Package2, ShoppingCart, Settings, Search, Eye, RefreshCw, 
  Phone, ChevronDown, ChevronUp, SlidersHorizontal, Calendar, Clock, Filter,
  X, CalendarIcon,
  User,
  Mail,
  Users
} from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import mongoose from 'mongoose';

interface OrderProduct {
  product: {
    _id: string;
    name: string;
    price: number;
    image?: string;
  };
  quantity: number;
  price: number;
  customization?: any;
}

interface DaySchedule {
  date: string;
  items: Array<{
    product: {
      _id: string;
      name: string;
      price: number;
      image?: string;
    };
    quantity: number;
    price: number;
    customization: any;
    timeSlot: string;
  }>;
   status?: 'pending' | 'received' | 'done' | 'picked' | 'delivered' | 'not-delivered ' | 'pending';
        statusInfo?: {
          chefId?: mongoose.Types.ObjectId;
          receivedTime?: Date;
          doneTime?: Date;
        };
        deliveryInfo?: {
          deliveryPersonId?: mongoose.Types.ObjectId;
          pickedTime?: Date;
          deliveredTime?: Date;
          notDeliveredTime?: Date;
          notDeliveredReason?: string;
        };
  _id: string;
}

interface PlanRelated {
  planDayId?: string;
  isCompletePlanCheckout: boolean;
  daySchedule?: DaySchedule[];
}

interface Order {
  _id: string;
  user: string;
  products: OrderProduct[];
  totalAmount: number;
  customerDetails: {
    name: string;
    phone: string;
    address: string;
    additionalAddressInfo?: string;
  };
  status: 'pending' | 'accepted' | 'out-for-delivery' | 'delivered' | 'cancelled';
   statusInfo?: {
          chefId?: mongoose.Types.ObjectId;
          receivedTime?: Date;
          doneTime?: Date;
        };
    deliveryInfo?: {
      deliveryPersonId?: mongoose.Types.ObjectId;
      pickedTime?: Date;
      deliveredTime?: Date;
      notDeliveredTime?: Date;
      notDeliveredReason?: string;
    };
  createdAt: string;
  updatedAt: string;
  deliveryTimeSlot?: string;
  orderType: 'quicksip' | 'freshplan';
  planRelated?: PlanRelated;
}

function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const [expandedPlanDays, setExpandedPlanDays] = useState<Record<string, string>>({});
  
  // Date filter states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateInput, setDateInput] = useState<string>('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');

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
        
        // Set initial filter from URL parameter
        if (statusParam && ['pending', 'accepted', 'out-for-delivery', 'delivered', 'cancelled'].includes(statusParam)) {
          setFilter(statusParam);
        }
        
        fetchOrders();
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/admin/login');
      }
    };
    
    checkAdmin();
  }, [router, statusParam]);

  useEffect(() => {
    fetchOrders();
  }, [filter, orderTypeFilter, selectedDate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      
      // Build query with filters
      let url = '/api/admin/orders';
      const queryParams = [];
      
      if (filter !== 'all') {
        queryParams.push(`status=${filter}`);
      }
      
      if (orderTypeFilter !== 'all') {
        queryParams.push(`orderType=${orderTypeFilter}`);
      }
      
      if (selectedDate) {
        queryParams.push(`date=${selectedDate}`);
      }
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders);
      } else {
        throw new Error(data.error || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      setUpdateStatus(orderId);
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update order');
      }
      
      const data = await response.json();
      if (data.success) {
        // Update the order in the local state
        setOrders(orders.map(order => 
          order._id === orderId ? { ...order, status: newStatus as any } : order
        ));
      } else {
        throw new Error(data.error || 'Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    } finally {
      setUpdateStatus(null);
    }
  };

  const toggleOrderExpand = (orderId: string) => {
    const newExpandedOrderIds = new Set(expandedOrderIds);
    if (newExpandedOrderIds.has(orderId)) {
      newExpandedOrderIds.delete(orderId);
    } else {
      newExpandedOrderIds.add(orderId);
    }
    setExpandedOrderIds(newExpandedOrderIds);
  };

  const togglePlanDay = (orderId: string, dayId: string) => {
    const key = `${orderId}-${dayId}`;
    setExpandedPlanDays(prev => ({
      ...prev,
      [key]: prev[key] ? '' : dayId
    }));
  };

  const formatDate = (dateString: string) => {
    console.log(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleString('en-IN', options);
  };

  const formatSimpleDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric', 
      month: 'short', 
      weekday: 'short'
    };
    return new Date(dateString).toLocaleString('en-IN', options);
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow: Record<string, string> = {
      'pending': 'accepted',
      'accepted': 'out-for-delivery',
      'out-for-delivery': 'delivered'
    };
    
    return statusFlow[currentStatus] || null;
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'accepted': 'bg-blue-100 text-blue-800',
      'out-for-delivery': 'bg-purple-100 text-purple-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'failed': 'bg-red-100 text-red-800',
      'completed': 'bg-green-100 text-green-800'
    };
    
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  // Handle date selection
  const handleDateSelect = () => {
    if (dateInput) {
      const parsedDate = parse(dateInput, 'yyyy-MM-dd', new Date());
      
      if (isValid(parsedDate)) {
        setSelectedDate(dateInput);
        setShowDatePicker(false);
      }
    }
  };

  const clearDateFilter = () => {
    setSelectedDate('');
    setDateInput('');
  };

  // Filter orders based on search query
  const filteredOrders = orders.filter(order => 
    order.customerDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customerDetails.phone.includes(searchQuery)
  );

  // Format customization for display
  const formatCustomization = (customization: any) => {
    if (!customization) return '';
    
    const parts = [];
    if (customization.size) parts.push(customization.size);
    if (customization.quantity) parts.push(customization.quantity);
    if (customization.ice) parts.push(customization.ice);
    if (customization.sugar) parts.push(customization.sugar);
    if (customization.dilution) parts.push(customization.dilution);
    
    return parts.join(' • ');
  };

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
                         <Link href="/admin/orders" className="block py-3 px-6 bg-gray-100 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium">
                           <div className="flex items-center">
                             <ShoppingCart className="h-5 w-5 mr-3" />
                             Orders
                           </div>
                         </Link>
                         <Link href="/admin/users" className="block py-3 px-6 text-gray-900 hover:bg-gray-50 hover:text-gray-900 font-medium">
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
                         <Link href="/admin/staff" className="block py-3 px-6 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium">
                           <div className="flex items-center">
                             <User className="h-5 w-5 mr-3" />
                             Staff Management
                           </div>
                         </Link>
                         <Link href="/admin/others" className="block py-3 px-6 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium">
                           <div className="flex items-center">
                             <SlidersHorizontal className="h-5 w-5 mr-3" />
                             Customisations
                           </div>
                         </Link>
                         
                       </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Orders</h1>
          <button 
            onClick={fetchOrders}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="relative flex-grow max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="Search by customer name, order ID or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Date Filter */}
            <div className="relative">
              <div className="flex mb-2 items-center justify-between">
                <label className="text-xs font-medium text-black uppercase tracking-wider">Date Filter</label>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowDatePicker(true)}
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                    selectedDate ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {selectedDate ? format(new Date(selectedDate), 'dd MMM yyyy') : 'Select Date'}
                </button>
                
                {selectedDate && (
                  <button
                    onClick={clearDateFilter}
                    className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Date Picker Modal */}
              {showDatePicker && (
  <div className="fixed inset-0 text-black  bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 shadow-xl w-96 border border-gray-100">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-lg font-semibold text-gray-800">Select Date</h3>
        <button 
          onClick={() => setShowDatePicker(false)}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      
      <div className="mb-6 text-black">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter orders by date</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full pl-10 text-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Only orders created on this date will be shown
        </p>
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => setShowDatePicker(false)}
          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDateSelect}
          disabled={!dateInput}
          className={`px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium shadow-sm hover:bg-orange-600 transition-colors flex items-center ${!dateInput ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Filter className="w-4 h-4 mr-2" />
          Apply Filter
        </button>
      </div>
    </div>
  </div>
)}
            </div>

            <div>
              <div className="flex mb-2 items-center justify-between">
                <label className="text-xs font-medium text-black uppercase tracking-wider">Status</label>
              </div>
              <div className="flex space-x-2 flex-wrap">
                <button
                  className={`mb-2 px-3 py-2 rounded-md text-sm font-medium ${
                    filter === 'all' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-black hover:bg-gray-300'
                  }`}
                  onClick={() => setFilter('all')}
                >
                  All
                </button>
                <button
                  className={`mb-2 px-3 py-2 rounded-md text-sm font-medium ${
                    filter === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setFilter('pending')}
                >
                  Pending
                </button>
                <button
                  className={`mb-2 px-3 py-2 rounded-md text-sm font-medium ${
                    filter === 'accepted' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setFilter('accepted')}
                >
                  Accepted
                </button>
                <button
                  className={`mb-2 px-3 py-2 rounded-md text-sm font-medium ${
                    filter === 'out-for-delivery' ? 'bg-purple-100 text-purple-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setFilter('out-for-delivery')}
                >
                  Out for Delivery
                </button>
                <button
                  className={`mb-2 px-3 py-2 rounded-md text-sm font-medium ${
                    filter === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setFilter('delivered')}
                >
                  Delivered
                </button>
                <button
                  className={`mb-2 px-3 py-2 rounded-md text-sm font-medium ${
                    filter === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setFilter('cancelled')}
                >
                  Cancelled
                </button>
              </div>
            </div>

            <div>
              <div className="flex mb-2 items-center justify-between">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Order Type</label>
              </div>
              <div className="flex space-x-2">
                <button
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    orderTypeFilter === 'all' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setOrderTypeFilter('all')}
                >
                  All Types
                </button>
                <button
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    orderTypeFilter === 'quicksip' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setOrderTypeFilter('quicksip')}
                >
                  QuickSip
                </button>
                <button
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    orderTypeFilter === 'freshplan' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setOrderTypeFilter('freshplan')}
                >
                  FreshPlan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Display */}
        {(selectedDate || filter !== 'all' || orderTypeFilter !== 'all') && (
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="text-sm text-gray-600">Active filters:</div>
            {selectedDate && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-indigo-100 text-indigo-800">
                Date: {format(new Date(selectedDate), 'dd MMM yyyy')}
                <button 
                  onClick={clearDateFilter}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filter !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800">
                Status: {filter.charAt(0).toUpperCase() + filter.slice(1).replace(/-/g, ' ')}
                <button 
                  onClick={() => setFilter('all')}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-yellow-400 hover:bg-yellow-200 hover:text-yellow-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {orderTypeFilter !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-green-100 text-green-800">
                Type: {orderTypeFilter === 'quicksip' ? 'QuickSip' : 'FreshPlan'}
                <button 
                  onClick={() => setOrderTypeFilter('all')}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-green-400 hover:bg-green-200 hover:text-green-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Orders */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-700">Loading orders...</p>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <React.Fragment key={order._id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            #{order._id.slice(-6).toUpperCase()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {order.customerDetails.name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {order.customerDetails.phone}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(order.createdAt)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            order.orderType === 'quicksip' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {order.orderType === 'quicksip' ? 'QuickSip' : 'FreshPlan'}
                            {order.orderType === 'freshplan' && order.planRelated?.isCompletePlanCheckout && (
                              <span className="ml-1">(Full)</span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">₹{order.totalAmount}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace(/-/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2 justify-end">
                            <button 
                              className="text-indigo-600 hover:text-indigo-900"
                              onClick={() => toggleOrderExpand(order._id)}
                            >
                              <ChevronDown className={`h-5 w-5 transform ${expandedOrderIds.has(order._id) ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Order Row */}
                      {expandedOrderIds.has(order._id) && (
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Order Details</h4>
                                
                                {order.orderType === 'quicksip' ? (
                                  // QuickSip order items
                                  <div>
                                    <h5 className="text-xs font-medium text-black mb-1">Items:</h5>
                                    <ul className="space-y-2 mb-4">
                                      {order.products.map((item, index) => (
                                        <li key={index} className="flex text-black items-center justify-between text-sm">
                                          <div className="flex items-center">
                                            {item.product && item.product.image && (
                                              <div className="relative w-8 h-8 mr-2 rounded overflow-hidden">
                                                <Image 
                                                  src={item.product.image} 
                                                  alt={item.product.name}
                                                  fill
                                                  className="object-cover"
                                                />
                                              </div>
                                            )}
                                            <div>
                                              <p className="font-medium">{item.product?.name || 'Custom Item'}</p>
                                              {item.customization && (
                                                <p className="text-xs text-gray-500">
                                                  {formatCustomization(item.customization)}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <p>x{item.quantity}</p>
                                            <p>₹{item.price}</p>
                                          </div>
                                        </li>
                                      ))}
                                      <li className="text-sm font-medium text-gray-900 pt-2 border-t border-gray-200 flex justify-between">
                                        <span>Total</span>
                                        <span>₹{order.totalAmount}</span>
                                      </li>
                                    </ul>
                                    
                                    {order.deliveryTimeSlot && (
                                      <div className="text-sm mb-4 text-black">
                                        <h5 className="text-xs font-medium text-gray-700 mb-1">Delivery Time:</h5>
                                        <div className="flex items-center">
                                          <Clock className="h-4 w-4 text-gray-500 mr-1" />
                                          <span>{order.deliveryTimeSlot}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  // FreshPlan order items
                                  <div>
                                    <h5 className="text-xs font-medium text-gray-700 mb-1">
                                      {order.planRelated?.isCompletePlanCheckout 
                                        ? 'FreshPlan Schedule:' 
                                        : 'FreshPlan Single Day:'}
                                    </h5>
                                    
                                    {order.planRelated?.isCompletePlanCheckout && order.planRelated.daySchedule ? (
                                      <div className="space-y-2 mb-4 text-black">
                                        {order.planRelated.daySchedule.map((day, index) => (
                                          <div key={index} className="border border-gray-200 rounded-md overflow-hidden">
                                            <div 
                                              className="flex items-center justify-between bg-gray-100 p-2 cursor-pointer"
                                              onClick={() => togglePlanDay(order._id, day._id)}
                                            >
                                              <div className="flex items-center">
                                                <Calendar className="h-4 w-4 text-gray-600 mr-2" />
                                                <span className="text-sm font-medium">{formatSimpleDate(day.date)}</span>
                                              </div>
                                              <div className="flex items-center">
                                                <span className="text-xs text-gray-600 mr-1">
                                                  {day.items.length} items
                                                </span>
                                                {expandedPlanDays[`${order._id}-${day._id}`] ? (
                                                  <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                  <ChevronDown className="h-4 w-4" />
                                                )}
                                              </div>
                                            </div>
                                            
                                            {expandedPlanDays[`${order._id}-${day._id}`] && (
                                              <div className="p-2 bg-white">
                                                <ul className="space-y-2">
                                                  {day.items.map((item, itemIdx) => (
                                                    <li key={itemIdx} className="flex items-center justify-between text-sm">
                                                      <div className="flex items-center">
                                                        {item.product && item.product.image && (
                                                          <div className="relative w-8 h-8 mr-2 rounded overflow-hidden">
                                                            <Image 
                                                              src={item.product.image} 
                                                              alt={item.product.name}
                                                              fill
                                                              className="object-cover"
                                                            />
                                                          </div>
                                                        )}
                                                        <div>
                                                          <p className="font-medium">{item.product?.name || 'Product'}</p>
                                                          <div className="flex items-center text-xs text-gray-500">
                                                            <Clock className="h-3 w-3 mr-1" />
                                                            <span>{item.timeSlot}</span>
                                                          </div>
                                                          {/* Show customization details */}
                                                          {item.customization && (
                                                            <p className="text-xs text-gray-500">
                                                              {formatCustomization(item.customization)}
                                                            </p>
                                                          )}
                                                        </div>
                                                      </div>
                                                      <div className="text-right">
                                                        <p>₹{item.price}</p>
                                                      </div>
                                                    </li>
                                                  ))}
                                                </ul>
                                                  <div>
                                          {order.planRelated?.daySchedule && (
                                             <>{day?.statusInfo?.receivedTime && (
                                    <>
                                    <p><span className="font-medium text-gray-900">Received:</span> {formatDate(String(day?.statusInfo?.receivedTime))}</p>
                                    <p><span className="font-medium text-gray-900">Prepared:</span> {formatDate(String(day?.statusInfo?.doneTime))}</p>
                                    </>
                                  )}
                                  {day?.deliveryInfo && (
                                    <>
                                    <p><span className="font-medium text-gray-900">Picked:</span> {formatDate(String(day?.deliveryInfo?.pickedTime))}</p>
                                    <p><span className="font-medium text-gray-900">Delivered:</span> {formatDate(String(day?.deliveryInfo?.deliveredTime))}</p>
                                    </>
                                  )
                                  }
                                  </>
                                          )}

                                        </div>
                                              </div>
                                              
                                            )}
                                          </div>
                                        ))}
                                        <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-medium">
                                          <span>Total</span>
                                          <span>₹{order.totalAmount}</span>
                                        </div>
                                      
                                      </div>
                                    ) : (
                                      // Single day checkout for FreshPlan
                                      <ul className="space-y-2 mb-4">
                                        {order.products.map((item, index) => (
                                          <li key={index} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center">
                                              {item.product && item.product.image && (
                                                <div className="relative w-8 h-8 mr-2 rounded overflow-hidden">
                                                  <Image 
                                                    src={item.product.image} 
                                                    alt={item.product.name}
                                                    fill
                                                    className="object-cover"
                                                  />
                                                </div>
                                              )}
                                              <div>
                                                <p className="font-medium">{item.product?.name || 'Custom Item'}</p>
                                                {/* Show customization details */}
                                                {item.customization && (
                                                  <p className="text-xs text-gray-500">
                                                    {formatCustomization(item.customization)}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <p>x{item.quantity}</p>
                                              <p>₹{item.price}</p>
                                            </div>
                                          </li>
                                        ))}
                                        <li className="text-sm font-medium text-gray-900 pt-2 border-t border-gray-200 flex justify-between">
                                          <span>Total</span>
                                          <span>₹{order.totalAmount}</span>
                                        </li>
                                      </ul>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Delivery Address</h4>
                                <div className="text-sm text-gray-600">
                                  <p>{order.customerDetails.name}</p>
                                  <p>{order.customerDetails.phone}</p>
                                  <p className="mt-1">{order.customerDetails.address}</p>
                                  {order.customerDetails.additionalAddressInfo && (
                                    <p className="mt-1 text-gray-500">{order.customerDetails.additionalAddressInfo}</p>
                                  )}
                                </div>
                                
                                <h4 className="text-sm font-medium text-gray-900 mt-6 mb-2">Order Timings</h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p><span className="font-medium text-gray-900">Placed:</span> {formatDate(order.createdAt)}</p>
                                  {order.orderType==='freshplan' && order.planRelated?.daySchedule && (
                                    <p>Check Individual day Timings</p>
                                    )}
                                  {order.orderType==='quicksip' && order.statusInfo && (
                                  <>{order.statusInfo.receivedTime && (
                                    <>
                                    <p><span className="font-medium text-gray-900">Received:</span> {formatDate(String(order?.statusInfo?.receivedTime))}</p>
                                    <p><span className="font-medium text-gray-900">Prepared:</span> {formatDate(String(order?.statusInfo?.doneTime))}</p>
                                    </>
                                  )}
                                  {order.deliveryInfo && (
                                    <>
                                    <p><span className="font-medium text-gray-900">Picked:</span> {formatDate(String(order?.deliveryInfo?.pickedTime))}</p>
                                    <p><span className="font-medium text-gray-900">Delivered:</span> {formatDate(String(order?.deliveryInfo?.deliveredTime))}</p>
                                    </>
                                  )
                                  }
                                  </>
                                  )}
                                 
                                  </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                <ShoppingCart className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'Try a different search term' : 
                 selectedDate ? `No orders found for ${format(new Date(selectedDate), 'MMM d, yyyy')}` :
                 filter !== 'all' ? `No ${filter} orders at the moment.` : 'There are no orders yet.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminOrders() {
  return (
    <Suspense fallback={<div>Loading orders...</div>}>
      <OrdersList />
    </Suspense>
  );
}