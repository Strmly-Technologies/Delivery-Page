'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: 'juices' | 'shakes';
  image: string;
  stock: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();

  // Use auth hook to protect this page
  useEffect(() => {
    fetchCart();
  }, []);


  const fetchCart = async () => {
    try {
      const token = window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const response = await fetch('/api/cart', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        // Transform cart data to include quantities
        const cartItemsMap = new Map();
        data.cart.forEach((product: Product) => {
          const existing = cartItemsMap.get(product._id);
          if (existing) {
            existing.quantity += 1;
          } else {
            cartItemsMap.set(product._id, { product, quantity: 1 });
          }
        });
        setCartItems(Array.from(cartItemsMap.values()));
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId: string) => {
    setUpdating(productId);
    try {
      const token = window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const response = await fetch(`/api/cart?productId=${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchCart(); // Refresh cart
      } else {
        alert(data.error || 'Failed to remove item');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      alert('Failed to remove item');
    } finally {
      setUpdating(null);
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-semibold text-gray-700">Loading Cart...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard" className="text-3xl">🥤</Link>
              <h1 className="text-2xl font-bold text-gray-800">Besom - Cart</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/orders"
                className="text-gray-700 hover:text-gray-900"
              >
                Orders
              </Link>
             
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Your Cart</h2>
          <div className="text-lg text-gray-600">
            {getTotalItems()} items
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Your cart is empty
            </h3>
            <p className="text-gray-500 mb-6">
              Add some delicious juices and shakes to get started!
            </p>
            <Link
              href="/dashboard"
              className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition duration-200"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.product._id}
                  className="bg-white rounded-lg shadow-md p-6 flex items-center space-x-4"
                >
                  <div className="relative w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                    <Image
                                    src="/images/juice.png"
                                    alt="Discount offer"
                                    width={120}
                                    height={120}
                                    className="object-contain"
                                  />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {item.product.name}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {item.product.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-orange-600 font-bold text-lg">
                        ₹{item.product.price} x {item.quantity}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.product._id)}
                        disabled={updating === item.product._id}
                        className={`px-3 py-1 text-sm rounded transition duration-200 ${
                          updating === item.product._id
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        {updating === item.product._id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Order Summary
                </h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className=" text-black">Items ({getTotalItems()})</span>
                    <span className=" text-black">₹{getTotalPrice()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery</span>
                    <span className="font-medium  text-black">Free</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span className=' text-black'>Total</span>
                      <span className="text-orange-600">₹{getTotalPrice()}</span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition duration-200 font-semibold text-center block"
                >
                  Proceed to Checkout
                </Link>
                
                <Link
                  href="/dashboard"
                  className="w-full mt-3 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition duration-200 text-center block"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
