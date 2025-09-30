'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import RazorPayMethod from '@/components/RazorpayMethod';

interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  image: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: '',
    phone: '',
    address: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const router = useRouter();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomerDetails(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!customerDetails.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!customerDetails.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(customerDetails.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    
    if (!customerDetails.address.trim()) {
      newErrors.address = 'Delivery address is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setSubmitting(true);
    
    try {
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      
      // Step 1: Create order in your database
      const productIds = cartItems.map(item => item.product._id);
      const quantities = cartItems.map(item => item.quantity);
      
      // Ensure each product has a price field before submission
      const productsWithPrice = cartItems.map(item => ({
        ...item,
        price: item.product.price // Adapt based on your data structure
      }));
      
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productIds,
          quantities,
          customerDetails,
          paymentMethod,
          products: productsWithPrice // Use productsWithPrice instead of cartItems
        })
      });

      const orderData = await orderResponse.json();
      
      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to place order');
      }
      
      // Step 2: Handle payment based on method
      if (paymentMethod === 'online') {
        // Step 2a: Create Razorpay order
        const paymentResponse = await fetch('/api/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: orderData.totalAmount,
            orderId: orderData.orderId,
            receipt: `receipt_${orderData.orderId}`
          })
        });
        
        const paymentData = await paymentResponse.json();
        
        if (!paymentData.success) {
          throw new Error(paymentData.error || 'Failed to create payment');
        }
        
        // Step 2b: Initialize and open Razorpay checkout
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: paymentData.order.amount,
          currency: paymentData.order.currency,
          name: "STRMLY Delivery",
          description: "Payment for your STRMLY Delivery order",
          order_id: paymentData.order.id,
          // Step 3: This handler runs AFTER user completes payment
          handler: async function (response: any) {
            try {
              // Step 4: Verify the payment signature on backend
              const verifyResponse = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: orderData.orderId
                })
              });
              
              const verifyData = await verifyResponse.json();
              
              if (verifyData.success) {
                // Step 5: Payment verified, redirect to success page
                router.push(`/order-confirmation?orderId=${orderData.orderId}`);
              } else {
                alert('Payment verification failed. Please contact support.');
                setSubmitting(false);
              }
            } catch (error) {
              console.error('Payment verification error:', error);
              alert('Payment verification failed. Please contact support.');
              setSubmitting(false);
            }
          },
          modal: {
            ondismiss: function() {
              // User closed the payment modal
              setSubmitting(false);
              alert('Payment cancelled');
            }
          },
          prefill: {
            name: customerDetails.name,
            contact: customerDetails.phone
          },
          theme: {
            color: "#f97316"
          }
        };
        
        // Open Razorpay payment window
        const razorpayWindow = new (window as any).Razorpay(options);
        razorpayWindow.open();
        
      } else {
        // For COD, no payment needed, directly redirect
        router.push(`/order-confirmation?orderId=${orderData.orderId}`);
        setSubmitting(false);
      }
      
    } catch (error) {
      console.error('Error during checkout:', error);
      alert(error instanceof Error ? error.message : 'Failed to complete checkout');
      setSubmitting(false);
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Customer Details Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-6">Delivery Details</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={customerDetails.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={customerDetails.phone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter 10-digit phone number"
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Address *
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={customerDetails.address}
                    onChange={handleInputChange}
                    rows={3}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your complete delivery address"
                  />
                  {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
                  <RazorPayMethod value={paymentMethod} onChange={setPaymentMethod} />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-200 ${
                    submitting
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  {submitting 
                    ? 'Processing...' 
                    : `${paymentMethod === 'COD' ? 'Place Order' : 'Proceed to Payment'} - ₹${getTotalPrice()}`}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.product._id} className="flex items-center gap-4">
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
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      ₹{item.product.price * item.quantity}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-base font-semibold text-gray-900">
                  <span>Total</span>
                  <span>₹{getTotalPrice()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}