'use client';

import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import DeliveryInfoModal from '../components/delivery/DeliveryInfoModal';
import { Home, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { SHOP_LOCATION, getDeliverySettings } from '@/constants/location';
import { calculateDistance, calculateDeliveryCharge, getAddressFromCoords } from '@/lib/location';
import Link from 'next/link';
import { TIME_SLOTS } from '@/constants/timeSlots';
import { getAvailableTimeSlots } from '@/lib/timeUtil';


interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
  additionalAddressInfo?: string;
}

interface Customization {
  size: string;
  quantity: string;
  ice?: string;
  sugar?: string;
  dilution?: string;
  finalPrice: number;
}

interface CartItem {
  product: {
    _id: string;
    name: string;
    image: string;
  };
  customization: Customization;
  price: number;
  quantity: number;
  addedAt: Date;
}

interface CustomisablePrices{
  category:string;
  price:number;
}

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: '',
    phone: '',
    address: '',
    additionalAddressInfo: ''
  });
  const [products, setProducts] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<number[]>([]);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [locationError, setLocationError] = useState('');
  const [customisablePrices, setCustomisablePrices] = useState<CustomisablePrices[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [disableAddressInput, setDisableAddressInput] = useState(false);
  const [showDeliveryInfo, setShowDeliveryInfo] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState(TIME_SLOTS);
  const [calculatedDeliveryCharge, setCalculatedDeliveryCharge] = useState(0);


  const router = useRouter();

  const fetchDeliverySettings = async () => {
  try {
    const response = await fetch('/api/admin/delivery');
    const data = await response.json();
    if (data.success) {
      setDeliverySettings(data.settings);
      return data.settings;
    }
  } catch (error) {
    console.error('Error fetching delivery settings:', error);
  }
  return null;
};

const initialise = async () => {
  setLoading(true);
  try {
    // Fetch all data and get the returned values
    const cartData = await fetchCart();
    const pricesData = await fetchCustomisablePrices();
    const settingsData = await fetchDeliverySettings();
    
    // Now initialize location with the actual data
    await initializeLocationFromStorage(cartData, pricesData, settingsData);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
     initialise();
  }, []);

  useEffect(() => {
    // Update available time slots every minute
    const updateTimeSlots = () => {
      setAvailableTimeSlots(getAvailableTimeSlots(TIME_SLOTS));
    };

    updateTimeSlots(); // Initial update
    const interval = setInterval(updateTimeSlots, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);


  // Replace your initializeLocationFromStorage function with this:

const initializeLocationFromStorage = async (
  cartData: CartItem[] = [],
  pricesData: CustomisablePrices[] = [],
  settingsData: any = null
) => {
  try {
    const storedLat = localStorage.getItem('latitude');
    const storedLng = localStorage.getItem('longitude');

    if (!storedLat || !storedLng) {
      console.log('No stored coordinates found');
      return;
    }

    const latitude = parseFloat(storedLat);
    const longitude = parseFloat(storedLng);

    // Get delivery settings if not provided
    let DELIVERY_RANGES = settingsData?.settings;
    if (!DELIVERY_RANGES) {
      const settingsResponse = await fetch('/api/admin/delivery');
      if (!settingsResponse.ok) {
        throw new Error('Failed to fetch delivery settings');
      }
      
      const settingsDataFetched = await settingsResponse.json();
      if (!settingsDataFetched.success) {
        throw new Error('Failed to fetch delivery settings');
      }
      
      DELIVERY_RANGES = settingsDataFetched.settings;
    }
    
    const distance = calculateDistance(
      latitude, 
      longitude, 
      SHOP_LOCATION.lat, 
      SHOP_LOCATION.lng
    );
    
    const address = await getAddressFromCoords(latitude, longitude);
    if (!address) {
      throw new Error('Failed to get address from coordinates');
    }
    
    setCustomerDetails(prev => ({
      ...prev,
      address
    }));

    if (distance > DELIVERY_RANGES.MAX_RANGE) {
      setLocationError(`Sorry, we don't deliver beyond ${DELIVERY_RANGES.MAX_RANGE}km from our shop (Your distance: ${distance.toFixed(2)}km)`);
      return;
    }

    // Calculate items total using the passed data (not state)
    const cartTotal = cartData.reduce((total, item) => 
      total + (item.customization?.finalPrice || 0), 0
    );
    
    let additionalTotal = 0;
    for(let i = 0; i < pricesData.length; i++) {
      additionalTotal += pricesData[i].price;
    }
    
    const itemsTotal = cartTotal + additionalTotal;
    
    // Always calculate what the charge would be
    const calculatedCharge = calculateDeliveryCharge(distance, DELIVERY_RANGES.CHARGES);
    setCalculatedDeliveryCharge(calculatedCharge);
    
    if (itemsTotal >= 150) {
      setDeliveryCharge(0);
      console.log("✓ Free delivery applied - items total is ₹" + itemsTotal);
    } else {
      setDeliveryCharge(calculatedCharge);
      console.log("✓ Delivery charge applied: ₹" + calculatedCharge + " - items total is ₹" + itemsTotal);
    }
   
    setLocationError('');
    setDisableAddressInput(true);

  } catch (error) {
    console.error('Error initializing location:', error);
    setLocationError('Failed to load saved location. Please try getting current location.');
    setDisableAddressInput(false);
  }
};
const fetchCustomisablePrices = async () => {
  try {
    const response = await fetch('/api/ui-header', {
      method: 'GET',
      credentials: 'include'
    });
    const data = await response.json();
    if (data.success) {
      const prices = data.customisablePricings || [];
      setCustomisablePrices(prices);
      return prices;
    }
  } catch (error) {
    console.error('Error fetching customisable prices:', error);
  }
  return [];
};

const handleGetLocation = async () => {
  if (!navigator.geolocation) {
    setLocationError('Geolocation is not supported by your browser');
    return;
  }

  try {
    setCustomerDetails(prev => ({
      ...prev,
      address: ''
    }));
    setDisableAddressInput(false);
    
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error: GeolocationPositionError) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject('Please allow location access to use this feature.');
              break;
            case error.POSITION_UNAVAILABLE:
              reject('Location information is unavailable.');
              break;
            case error.TIMEOUT:
              reject('Location request timed out.');
              break;
            default:
              reject('An unknown error occurred.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });

    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    localStorage.setItem('latitude', latitude.toString());
    localStorage.setItem('longitude', longitude.toString());
    
    const settingsResponse = await fetch('/api/admin/delivery');
    if (!settingsResponse.ok) {
      throw new Error('Failed to fetch delivery settings');
    }
    
    const settingsData = await settingsResponse.json();
    if (!settingsData.success) {
      throw new Error('Failed to fetch delivery settings');
    }
    
    const DELIVERY_RANGES = settingsData.settings;
    
    const distance = calculateDistance(
      latitude, 
      longitude, 
      SHOP_LOCATION.lat, 
      SHOP_LOCATION.lng
    );

    if (distance > DELIVERY_RANGES.MAX_RANGE) {
      setLocationError(`Sorry, we don't deliver beyond ${DELIVERY_RANGES.MAX_RANGE}km from our shop (Your distance: ${distance.toFixed(2)}km)`);
      return;
    }

    const itemsTotal = getItemsTotal();
    const calculatedCharge = calculateDeliveryCharge(distance, DELIVERY_RANGES.CHARGES);
    setCalculatedDeliveryCharge(calculatedCharge);
    
    if (itemsTotal >= 150) {
      setDeliveryCharge(0);
      console.log("Free delivery applied");
    } else {
      setDeliveryCharge(calculatedCharge);
      console.log("Delivery charge applied:", calculatedCharge);
    }

    const address = await getAddressFromCoords(latitude, longitude);
    if (!address) {
      throw new Error('Failed to get address from coordinates');
    }
    
    setCustomerDetails(prev => ({
      ...prev,
      address
    }));
    setLocationError('');
    setDisableAddressInput(true);

  } catch (error) {
    console.error('Location error:', error instanceof Error ? error.message : String(error));
    setLocationError(
      error instanceof Error ? 
      error.message : 
      'Unable to get your location. Please ensure location services are enabled and try again.'
    );
    setDisableAddressInput(false);
  }
};


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
      setCartItems(data.cart);
      setProducts(data.cart.map((item: CartItem) => item.product._id));
      setQuantities(data.cart.map((item: CartItem) => item.quantity));
      return data.cart;
    }
  } catch (error) {
    console.error('Error fetching cart:', error);
  }
  return [];
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

  const getItemsTotal = () => {
  let itemsTotal = cartItems.reduce((total, item) => 
    total + item.customization.finalPrice, 0
  );
  
  for(let i=0; i < customisablePrices.length; i++) {
    const item = customisablePrices[i];
    itemsTotal += item.price;
  }
  
  return itemsTotal;
};
const getTotalPrice = () => {
  return getItemsTotal() + deliveryCharge;
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
    if(!selectedTimeSlot){
      setErrors(prev => ({
        ...prev,
        timeSlot:"Please select a delivery time slot"
      }));
      return;
    }

    setSubmitting(true);
    
    try {
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      
      // Create order
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerDetails,
          cartItems,
          totalAmount: getTotalPrice(),
          deliveryCharge,
          customisablePrices,
          deliveryTimeSlot: selectedTimeSlot
        })
      });

      const orderData = await orderResponse.json();
      
      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to place order');
      }

      // Create Razorpay order
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
      
      // Initialize Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: paymentData.order.amount,
        currency: paymentData.order.currency,
        name: "STRMLY Delivery",
        description: "Payment for your order",
        order_id: paymentData.order.id,
        handler: async function (response: any) {
          try {
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
              await fetch('/api/cart/clear', {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
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
      
      const razorpayWindow = new (window as any).Razorpay(options);
      razorpayWindow.open();
      
    } catch (error) {
      console.error('Error during checkout:', error);
      alert(error instanceof Error ? error.message : 'Failed to complete checkout');
      setSubmitting(false);
    }
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


  function handleTimeSlotSelect(e: React.MouseEvent, range: string): void {
  // Prevent form submission
  e.preventDefault();
  e.stopPropagation();
  
  // Toggle selection: if the same slot is clicked again, deselect it
  setSelectedTimeSlot(prev => (prev === range ? null : range));

  // Clear any validation error related to time slot selection
  if (errors.timeSlot) {
    setErrors(prev => ({ ...prev, timeSlot: '' }));
  }
}
  return (
    <div className="min-h-screen bg-gray-50">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
     <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <div className="flex items-center justify-between mb-8">
    <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
    
    <div className="flex items-center space-x-4">
      <div className="group relative">
        <Link href='/cart' className="text-gray-700">
          <button className="text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ShoppingBag className="w-5 h-5" />
          </button>
        </Link>
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
          My Cart
        </span>
      </div>
      
      <div className="group relative">
        <Link href='/dashboard' className="text-gray-700">
          <button className="text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Home className="w-5 h-5" />
          </button>
        </Link>
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
          Dashboard
        </span>
      </div>
    </div>
  </div>

        
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Customer Details Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl text-black font-semibold mb-6">Delivery Details</h2>
              
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
                    className={`w-full px-4 py-2 border text-black rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
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
                    className={`w-full px-4 py-2 border text-black rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
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
  <div className="flex gap-2">
    <textarea
      id="address"
      name="address"
      value={customerDetails.address}
      onChange={handleInputChange}
      disabled={customerDetails.address==='' ? true : disableAddressInput}
      rows={3}
      className={`w-full text-black px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
        errors.address ? 'border-red-500' : 'border-gray-300'
      }`}
      placeholder="Enter your complete delivery address"
    />
    <button
      type="button"
      onClick={handleGetLocation}
      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
    >
      Get Current Location
    </button>
  </div>
  {locationError && (
    <p className="mt-1 text-sm text-red-500">{locationError}</p>
  )}
  <div>
    <textarea
      id='additionalAddressInfo'
      name='additionalAddressInfo'
      value={customerDetails.additionalAddressInfo}
      onChange={handleInputChange}
      rows={2}
      className="mt-2 w-full text-black px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
      placeholder="Additional address info (landmarks, floor, etc.)"
    />
  </div>
  <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Delivery Time Slot
      </label>
      {availableTimeSlots.length > 0 ? (
       <div className="grid grid-cols-2 gap-2">
  {availableTimeSlots.map((slot) => (
    <button
      key={slot.id}
      type="button" 
      onClick={(e) => handleTimeSlotSelect(e, slot.range)}
      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
        selectedTimeSlot === slot.range
          ? 'bg-orange-500 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {slot.range}
    </button>
  ))}
</div>
      ) : (
        <div className="text-center p-4 bg-orange-50 rounded-lg text-orange-600">
          No delivery slots available for today. Please try again tomorrow.
        </div>
      )}
    </div>
  {deliveryCharge >= 0 && (
    <div className="flex items-center space-x-2 mt-2">
      <p className="text-sm font-medium text-gray-900">
        Delivery Charge: ₹{deliveryCharge}
      </p>
      <button
        type="button"
        onClick={() => setShowDeliveryInfo(true)}
        className="inline-flex items-center justify-center p-1.5 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all duration-200"
      >
        <Info className="w-4 h-4" />
      </button>
    </div>
  )}
  {errors.address && (
    <p className="mt-1 text-sm text-red-500">{errors.address}</p>
  )}
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
                    : `Proceed to Payment - ₹${getTotalPrice()}`}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-black mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={`${item.product._id}-${item.addedAt}`} className="flex items-center gap-4">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-black font-medium">{item.product.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.customization.size} • {item.customization.quantity}
                        {item.customization.ice && ` • ${item.customization.ice}`}
                        {item.customization.sugar && ` • ${item.customization.sugar}`}
                        {item.customization.dilution && ` • ${item.customization.dilution}`}
                      </p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      ₹{item.customization.finalPrice}
                    </p>
                  </div>
                ))}
              </div>
              {/* Delivery Charge Price */}
              {deliveryCharge >= 0 && (
  <div className="flex items-center justify-between text-gray-700 mb-2">
    <span>Delivery Fee</span>
    {deliveryCharge === 0 && calculatedDeliveryCharge > 0 ? (
      <div className="flex items-center gap-2">
        <span className="line-through text-red-500">₹{calculatedDeliveryCharge}</span>
        <span className="font-semibold text-green-600">₹0</span>
      </div>
    ) : (
      <span className="font-semibold text-green-600">₹{deliveryCharge}</span>
    )}
  </div>
)}
                {/* Customisable Prices if any */}
                {customisablePrices.length > 0 && (
                  <div className="mt-4 border-t pt-4 space-y-2">
                    {customisablePrices.map((item, index) => (
                      <div key={index} className="flex justify-between text-gray-700">
                        <span>{item.category} Price</span>
                        <span className="font-semibold text-gray-900">₹{item.price}</span>
                      </div>
                    ))}
                  </div>
                )}

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
      <DeliveryInfoModal
  isOpen={showDeliveryInfo}
  onClose={() => setShowDeliveryInfo(false)}
  settings={deliverySettings}
  totalPrice={getItemsTotal()}
/>
    </div>
    
  );
}