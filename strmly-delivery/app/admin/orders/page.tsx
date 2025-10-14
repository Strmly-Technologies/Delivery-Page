'use client';

import React, { useState, useEffect } from 'react';
import { Suspense } from "react";

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Package2, ShoppingCart, Settings, Search, Eye, RefreshCw, Phone, ChevronDown, SlidersHorizontal } from 'lucide-react';

interface OrderProduct {
  product: {
    _id: string;
    name: string;
    price: number;
  };
  quantity: number;
  price: number;
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
  };
  status: 'pending' | 'accepted' | 'out-for-delivery' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  deliveryTimeSlot?: string;
}

 function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  
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
  }, [filter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const url = filter === 'all' 
        ? '/api/admin/orders' 
        : `/api/admin/orders?status=${filter}`;
      
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
        throw new Error('Failed to update order status');
      }
      
      const data = await response.json();
      if (data.success) {
        // Update order in state
        setOrders(orders.map(order => 
          order._id === orderId 
            ? { ...order, status: newStatus as any } 
            : order
        ));
        
        // Update selected order if it's the one being viewed
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus as any });
        }
      } else {
        throw new Error(data.error || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'out-for-delivery': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  // Filter orders based on search query
  const filteredOrders = orders.filter(order => 
    order.customerDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customerDetails.phone.includes(searchQuery)
  );

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
          <Link href="/admin/orders" className="block py-3 px-6 bg-orange-50 text-orange-600 border-l-4 border-orange-600 font-medium">
            <div className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-3" />
              Orders
            </div>
          </Link>
            <Link href="/admin/delivery" className="block py-3 px-6 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium">
            <div className="flex items-center">
              <Settings className="h-5 w-5 mr-3" />
              Delivery Settings
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

            <div className="flex space-x-2">
              <button
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  filter === 'all' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  filter === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setFilter('pending')}
              >
                Pending
              </button>
              <button
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  filter === 'accepted' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setFilter('accepted')}
              >
                Accepted
              </button>
              <button
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  filter === 'out-for-delivery' ? 'bg-purple-100 text-purple-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setFilter('out-for-delivery')}
              >
                Out for Delivery
              </button>
              <button
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  filter === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setFilter('delivered')}
              >
                Delivered
              </button>
            </div>
          </div>
        </div>

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
                      Time Slot
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
                            <Phone size={12} className="mr-1" /> {order.customerDetails.phone}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {formatDate(order.createdAt)}
                          </div>
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {order.deliveryTimeSlot || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ₹{order.totalAmount}
                          </div>
                          <div className="text-xs text-gray-500">
                            {order.products.reduce((sum, item) => sum + item.quantity, 0)} items
                          </div>
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
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Order Items</h4>
                                <ul className="space-y-2">
                                  {order.products.map((item, index) => (
                                    <li key={index} className="text-sm text-gray-600 flex justify-between">
                                      <span>{item.product.name} x {item.quantity}</span>
                                      <span>₹{item.price}</span>
                                    </li>
                                  ))}
                                  <li className="text-sm font-medium text-gray-900 pt-2 border-t border-gray-200 flex justify-between">
                                    <span>Total</span>
                                    <span>₹{order.totalAmount}</span>
                                  </li>
                                </ul>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Delivery Address</h4>
                                <p className="text-sm text-gray-600 whitespace-pre-line">
                                  {order.customerDetails.address}
                                </p>
                                
                                <div className="mt-4">
                                  <h4 className="text-sm font-medium text-gray-900 mb-2">Update Status</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {order.status !== 'delivered' && order.status !== 'cancelled' && getNextStatus(order.status) && (
                                      (() => {
                                        const nextStatus = getNextStatus(order.status);
                                        if (!nextStatus) return null;
                                        return (
                                          <button
                                            onClick={() => handleStatusChange(order._id, nextStatus)}
                                            disabled={updateStatus === order._id}
                                            className={`px-3 py-1 text-sm rounded-md ${
                                              getStatusColor(nextStatus)
                                            } ${updateStatus === order._id ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                                          >
                                            {updateStatus === order._id ? 'Updating...' : `Mark as ${nextStatus.replace(/-/g, ' ')}`}
                                          </button>
                                        );
                                      })()
                                    )}
                                    
                                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                      <button
                                        onClick={() => handleStatusChange(order._id, 'cancelled')}
                                        disabled={updateStatus === order._id}
                                        className={`px-3 py-1 text-sm rounded-md bg-red-100 text-red-800 ${
                                          updateStatus === order._id ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-200'
                                        }`}
                                      >
                                        Cancel Order
                                      </button>
                                    )}
                                  </div>
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
                {searchQuery ? 'Try a different search term' : filter !== 'all' ? `No ${filter} orders at the moment.` : 'There are no orders yet.'}
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