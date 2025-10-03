'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface OrderConfirmation {
  _id: string;
  products: {
    product: {
      name: string;
      image: string;
    };
    quantity: number;
    customization: {
      size: string;
      quantity: string;
      ice?: string;
      sugar?: string;
      dilution?: string;
      finalPrice: number;
    };
  }[];
  totalAmount: number;
  status: string;
  customerDetails: {
    name: string;
    phone: string;
    address: string;
  };
  createdAt: string;
}

 function OrderList() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [loading, setLoading] = useState(true);

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
      console.log("order data",data);
      if (data.success) {
        setOrder(data.order);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <p className="text-gray-600 mb-6">We couldn't find the order you're looking for.</p>
          <Link
            href="/orders"
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            View All Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
              <p className="text-gray-600">
                Thank you for your order. We'll start preparing it right away.
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
              <div className="space-y-4 mb-6">
                <p className="text-sm text-gray-600">
                  Order ID: <span className="font-medium text-gray-900">#{order._id}</span>
                </p>
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
                          {item.customization.size} • {item.customization.quantity}
                          {item.customization.ice && ` • ${item.customization.ice}`}
                          {item.customization.sugar && ` • ${item.customization.sugar}`}
                          {item.customization.dilution && ` • ${item.customization.dilution}`}
                        </p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        ₹{item.customization.finalPrice * item.quantity}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between text-base font-semibold text-gray-900">
                  <span>Total Amount</span>
                  <span>₹{order.totalAmount}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Delivery Details</h3>
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{order.customerDetails.name}</p>
                  <p>{order.customerDetails.phone}</p>
                  <p className="whitespace-pre-line">{order.customerDetails.address}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center space-x-4">
              <Link
                href="/orders"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                View All Orders
              </Link>
              <Link
                href="/menu"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Continue Shopping
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
    <Suspense fallback={<div>Loading orders...</div>}>
      <OrderList />
    </Suspense>
  );
}