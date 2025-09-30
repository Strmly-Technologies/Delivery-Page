'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';


interface Order {
  _id: string;
  totalAmount: number;
  customerDetails: {
    name: string;
    phone: string;
    address: string;
  };
  status: string;
  createdAt: string;
  products: Array<{
    product: {
      name: string;
      price: number;
    };
    quantity: number;
  }>;
}

export default function OrderConfirmationPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    if (!orderId) {
      router.push('/orders');
      return;
    }
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const token = window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setOrder(data.order);
      } else {
        router.push('/orders');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      router.push('/orders');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-semibold text-gray-700">Loading Order...</h2>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Order not found</h2>
          <Link
            href="/orders"
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition duration-200"
          >
            View All Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Order Placed Successfully!
          </h1>
          <p className="text-lg text-gray-600">
            Thank you for your order. We'll prepare your fresh juices right away!
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Order Details</h2>
              <p className="text-gray-600">Order #{order._id.slice(-8).toUpperCase()}</p>
            </div>
            <div className="text-right">
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                order.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                order.status === 'out-for-delivery' ? 'bg-purple-100 text-purple-800' :
                order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('-', ' ')}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Items Ordered</h3>
            <div className="space-y-3">
              {order.products.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">₹{item.product.price * item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total Amount</span>
              <span className="text-orange-600">₹{order.totalAmount}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Payment: Cash on Delivery</p>
          </div>
        </div>

        {/* Delivery Information */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Delivery Information</h3>
          <div className="space-y-2">
            <div className="flex">
              <span className="font-medium text-gray-600 w-20">Name:</span>
              <span className="text-gray-900">{order.customerDetails.name}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-600 w-20">Phone:</span>
              <span className="text-gray-900">{order.customerDetails.phone}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-600 w-20">Address:</span>
              <span className="text-gray-900">{order.customerDetails.address}</span>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">What's Next?</h3>
          <div className="space-y-2 text-blue-800">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span>We'll start preparing your fresh juices</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span>You'll receive a call when your order is ready</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span>Our delivery partner will bring it to your door</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span>Pay cash when you receive your order</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href={`/track-order?orderId=${order._id}`}
            className="flex-1 bg-orange-500 text-white py-3 px-6 rounded-lg hover:bg-orange-600 transition duration-200 text-center font-semibold"
          >
            Track Order
          </Link>
          <Link
            href="/orders"
            className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition duration-200 text-center font-semibold"
          >
            View All Orders
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition duration-200 text-center font-semibold"
          >
            Continue Shopping
          </Link>
        </div>

        {/* Order Date */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Order placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

