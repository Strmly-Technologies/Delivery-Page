'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, ShoppingCart, Home, History } from 'lucide-react';
import { localCart } from '@/lib/cartStorage';
import { useRouter } from 'next/navigation';
import OtpModal from '../components/login/otpModal';

interface ProductCustomization {
  size: string;
  quantity: string;
  ice?: string;
  sugar?: string;
  dilution?: string;
  finalPrice: number;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: 'juices' | 'shakes';
  image: string;
}

interface CartItem {
  _id?: string;
  product: Product;
  customization: ProductCustomization;
  price: number;
  quantity: number;
  addedAt?: Date;
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const currentUser=localStorage.getItem('user');
    if(currentUser){
      setIsAuthenticated(true);
      fetchCart();
    }else{
      const localItems = localCart.getItems().map((item) => ({
        ...item,
        addedAt: item.addedAt ? new Date(item.addedAt) : undefined,
      }));
      setCartItems(localItems);
      setLoading(false);
    }
  }, []);

  const handleCheckoutClick = (e: React.MouseEvent) => {
  e.preventDefault();
  if (!isAuthenticated) {
    setShowOtpModal(true);
  } else {
    router.push('/checkout');
  }
};

  const fetchCart = async () => {
    try {
      console.log("Fetching cart...");
      const response = await fetch('/api/cart', {
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        setCartItems(data.cart);
        console.log("cart data fetched",data.cart);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId: string) => {
    setRemoving(productId);
    if(isAuthenticated){
    try {
      console.log("Removing item from cart...", productId);
      const response = await fetch('/api/cart', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId })
      });

      const data = await response.json();
      if (data.success) {
        fetchCart();
      } else {
        alert(data.error || 'Failed to remove item');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      alert('Failed to remove item');
    } finally {
      setRemoving(null);
    }}else{
      localCart.removeItem(productId);
      const updatedItems = localCart.getItems().map((item) => ({
        ...item,
        addedAt: item.addedAt ? new Date(item.addedAt) : undefined,
      }));
      setCartItems(updatedItems);
      setRemoving(null);
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + item.price, 0);
  };

  const getTotalItems = () => {
    return cartItems.length;
  };
  const handleVerificationComplete = async () => {
  setShowOtpModal(false);
  
  // Transfer local cart to server
  try {
    const localItems = localCart.getItems();
    await fetch('/api/cart/sync', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: localItems })
    });
    
    // Clear local cart
    localCart.clearCart();
    
    // Redirect to checkout
    router.push('/checkout');
  } catch (error) {
    console.error('Failed to sync cart:', error);
    alert('Failed to sync your cart. Please try again.');
  }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="mx-auto mb-4 text-gray-400" size={64} />
          <h2 className="text-2xl font-semibold text-gray-700">Loading Cart...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center h-16">
      <div className="flex items-center space-x-3">
        <h1 className="text-xl font-bold text-gray-800">My Cart</h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="group relative">
          <Link href='/orders' className="text-gray-700">
            <button className="text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors">
              <History className="w-5 h-5" />
            </button>
          </Link>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
            My Orders
          </span>
        </div>
        
        <div className="group relative">
          <Link href='/dashboard' className="text-gray-700">
            <button className="text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Home className="w-5 h-5" />
            </button>
          </Link>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
            Home
          </span>
        </div>
      </div>
    </div>
  </div>
</header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="mx-auto mb-4 text-gray-300" size={80} />
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">
              Your cart is empty
            </h3>
            <p className="text-gray-500 mb-6">
              Add some delicious juices and shakes to get started!
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-orange-500 text-white px-8 py-3 rounded-xl hover:bg-orange-600 transition duration-200 font-semibold"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Cart Items ({getTotalItems()})
              </h2>
              
              {cartItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="relative w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex-shrink-0 overflow-hidden">
                      <Image
                        src="/images/juice.png"
                        alt={'Product Image'}
                        width={96}
                        height={96}
                        className="object-contain"
                      />
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-gray-900 truncate pr-2">
                          {item.product.name}
                        </h3>
                        <button
                          onClick={() => removeFromCart(item.product._id!)}
                          className="text-red-500 hover:text-red-600 transition p-1 flex-shrink-0 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                      
                      {/* Customization Details */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium mr-2">Size:</span>
                          <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md text-xs font-medium">
                            {item.customization.size} ({item.customization.quantity})
                          </span>
                        </div>
                        
                        {item.customization.ice && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">Ice:</span>
                            <span className="text-gray-700">{item.customization.ice}</span>
                          </div>
                        )}
                        
                        {item.customization.sugar && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">Sugar:</span>
                            <span className="text-gray-700">{item.customization.sugar}</span>
                          </div>
                        )}
                        
                        {item.customization.dilution && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">Dilution:</span>
                            <span className="text-gray-700">{item.customization.dilution}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Price */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                        <span className="text-xl font-bold text-orange-600">
                          ₹{item.price}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary - Sticky on desktop */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:sticky lg:top-24">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  Order Summary
                </h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal ({getTotalItems()} items)</span>
                    <span className="font-semibold">₹{getTotalPrice()}</span>
                  </div>
                  
        
                  
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-orange-600">
                        ₹{getTotalPrice()}
                      </span>
                    </div>
                  </div>
                       <OtpModal
                        isOpen={showOtpModal}
                        onClose={() => setShowOtpModal(false)}
                        onVerificationComplete={handleVerificationComplete}
                      />
                </div>

               <Link
                  href="/checkout"
                  onClick={handleCheckoutClick}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-4 rounded-xl hover:from-orange-600 hover:to-orange-700 transition duration-200 font-bold text-center block shadow-md hover:shadow-lg mb-3"
                >
                  Proceed to Checkout
                </Link>
                
                <Link
                  href="/dashboard"
                  className="w-full border-2 border-gray-200 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-50 transition duration-200 text-center block font-semibold"
                >
                  Add More Items
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
 
    </div>
    
  );
}