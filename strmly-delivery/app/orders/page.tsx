'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Customization {
  size: string;
  quantity: string;
  ice?: string;
  sugar?: string;
  dilution?: string;
  finalPrice: number;
}

interface OrderItem {
  product: {
    _id: string;
    name: string;
    image: string;
    category: string;
  };
  quantity: number;
  price: number;
  customization: Customization;
}

interface Order {
  _id: string;
  products: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed';
  customerDetails: {
    name: string;
    phone: string;
    address: string;
  };
  createdAt: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

const getStatusColor = (status?: string) => {
  if (!status) return 'bg-gray-100 text-gray-800';
  
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">No orders found.</p>
            <Link href="/menu" className="text-orange-500 hover:text-orange-600 mt-4 inline-block">
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Order #{order._id.slice(-6).toUpperCase()}
                      </h2>
                      <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {order.status || 'Unknown'}
                      </span>
                      {order.paymentStatus && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.paymentStatus)}`}>
                          {order.paymentStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="space-y-4">
                      {order.products.map((item, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="relative w-16 h-16 flex-shrink-0">
                            <Image
                              src={item.product.image}
                              alt={item.product.name}
                              fill
                              className="object-cover rounded"
                            />
                          </div>
                         <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                          <p className="text-sm text-gray-500">
                            {item.customization?.size} • {item.customization?.quantity}
                            {item.customization?.ice && ` • ${item.customization.ice}`}
                            {item.customization?.sugar && ` • ${item.customization.sugar}`}
                            {item.customization?.dilution && ` • ${item.customization.dilution}`}
                          </p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          ₹{(item.customization?.finalPrice || item.price) * item.quantity}
                        </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 mt-4 pt-4">
                    <div className="flex justify-between text-base font-semibold text-gray-900">
                      <span>Total Amount</span>
                      <span>₹{order.totalAmount}</span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-900">Delivery Details</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {order.customerDetails.name}<br />
                        {order.customerDetails.phone}<br />
                        {order.customerDetails.address}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}