'use client';

import { useState, useEffect, Suspense } from 'react';
import { Info } from 'lucide-react';
import DeliveryInfoModal from '../components/delivery/DeliveryInfoModal';
import { Home, ShoppingBag, CalendarDays, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { SHOP_LOCATION } from '@/constants/location';
import { calculateDistance, calculateDeliveryCharge, getAddressFromCoords } from '@/lib/location';
import Link from 'next/link';
import { TIME_SLOTS } from '@/constants/timeSlots';
import { getAvailableTimeSlots } from '@/lib/timeUtil';
import { format } from 'date-fns';
import { buildInversePrefetchSegmentDataRoute } from 'next/dist/server/lib/router-utils/build-prefetch-segment-data-route';

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
  orderQuantity?: number;
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

interface CustomisablePrices {
  category: string;
  price: number;
}

interface PlanItem {
  product: {
    _id: string;
    name: string;
    image: string;
    description?: string;
    price: number;
    category: string;
  };
  customization: Customization;
  quantity: number;
  timeSlot: string;
  _id: string;
}

interface DailySchedule {
  date: string;
  items: PlanItem[];
  _id: string;
}

interface FreshPlan {
  isActive: boolean;
  days: number;
  startDate: string;
  schedule: DailySchedule[];
  createdAt: string;
  _id: string;
}

 function CheckoutPage() {
  const searchParams = useSearchParams();
  const checkoutType = searchParams.get('type') || 'quicksip';
  const selectedDayId = searchParams.get('dayId');
  const planId=searchParams.get('planId');
  console.log("Checkout type:", checkoutType, "Plan ID:", planId);
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [freshPlan, setFreshPlan] = useState<FreshPlan | null>(null);
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
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Array<{
    phoneNumber: string;
    _id: number;
    addressName: string;
    deliveryAddress: string;
    additionalAddressDetails?: string;
  }>>([]);
   const [showSavedAddresses, setShowSavedAddresses] = useState(false);
  const [showSaveAddressModal, setShowSaveAddressModal] = useState(false);
  const [newAddressName, setNewAddressName] = useState('');


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


  // handle save Address

  const handleSaveAddress = async () => {
    if (!newAddressName.trim()) {
      alert('Please enter an address name');
      return;
    }

    if (!customerDetails.address.trim()) {
      alert('Please enter a delivery address first');
      return;
    }

    try {
      const response = await fetch('/api/address', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addressName: newAddressName,
          deliveryAddress: customerDetails.address,
          additionalAddressDetails: customerDetails.additionalAddressInfo || '',
          phoneNumber: customerDetails.phone
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Address saved successfully!');
        setShowSaveAddressModal(false);
        setNewAddressName('');
        fetchSavedAddresses(); // Refresh the list
      } else {
        alert(data.error || 'Failed to save address');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      alert('Failed to save address');
    }
  };

  const fetchSavedAddresses = async () => {
    try {
      const response = await fetch('/api/address', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setSavedAddresses(data.savedAddresses || []);
      }
    } catch (error) {
      console.error('Error fetching saved addresses:', error);
    }
  };

  const handleSelectSavedAddress = (address: any) => {
    setCustomerDetails(prev => ({
      ...prev,
      address: address.deliveryAddress,
      phone: address.phoneNumber || prev.phone,
      additionalAddressInfo: address.additionalAddressDetails || ''
    }));
    setShowSavedAddresses(false);
    setDisableAddressInput(true);
  };

  // Fetch saved addresses on mount
  useEffect(() => {
    fetchSavedAddresses();
  }, []);

  const initialise = async () => {
  setLoading(true);
  try {
    if (checkoutType === 'quicksip') {
      // QuickSip checkout flow - fetch cart items
      const cartData = await fetchCart();
      const pricesData = await fetchCustomisablePrices();
      const settingsData = await fetchDeliverySettings();
      
      await initializeLocationFromStorage(cartData, pricesData, settingsData);
    } else if (checkoutType === 'freshplan') {
      // FreshPlan checkout flow - fetch plan details
      console.log("Initialising freshplan checkout for plan ID:", planId);
      const planData = await fetchFreshPlan();
      
      const settingsData = await fetchDeliverySettings();
      
      if (planData) {
        // Get all items from all days in the plan
        if(planData.paymentComplete===true){
          router.push('/current-plan');
        }
        const allPlanItems: PlanItem[] = [];
        planData.schedule.forEach((day:any) => {
          allPlanItems.push(...day.items);
        });
        console.log("all plan items", allPlanItems);
        setPlanItems(allPlanItems);
        
        // Use the first time slot as default, or let user select
        setSelectedTimeSlot(allPlanItems[0]?.timeSlot || null);
        
        // Calculate delivery charge for all items
        await initializeLocationForPlan(allPlanItems, settingsData);
      }
    }
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    initialise();
  }, [checkoutType, selectedDayId]);

  useEffect(() => {
    // Update available time slots every minute
    const updateTimeSlots = () => {
      setAvailableTimeSlots(getAvailableTimeSlots(TIME_SLOTS));
    };

    updateTimeSlots(); // Initial update
    const interval = setInterval(updateTimeSlots, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

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

      const DELIVERY_RANGES = settingsData || await fetchDeliverySettings();
      
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
      
      if (itemsTotal >= 99) {
        setDeliveryCharge(0);
        console.log("✓ Free delivery applied - items total is ₹" + itemsTotal);
      } else {
        setDeliveryCharge(calculatedCharge);
        console.log("✓ Delivery charge applied: ₹" + calculatedCharge + " - items total is ₹" + itemsTotal);
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
      console.error('Error initializing location:', error);
      setLocationError('Failed to load saved location. Please try getting current location.');
      setDisableAddressInput(false);
    }
  };
  
  const initializeLocationForPlan = async (
    planItems: PlanItem[] = [],
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

      const DELIVERY_RANGES = settingsData || await fetchDeliverySettings();
      
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

      // Calculate items total from plan items
      const itemsTotal = planItems.reduce((total, item) => 
        total + (item.customization?.finalPrice || 0), 0
      );
      
      // Always calculate what the charge would be
      const calculatedCharge = calculateDeliveryCharge(distance, DELIVERY_RANGES.CHARGES);
      setCalculatedDeliveryCharge(calculatedCharge);
      
      if (itemsTotal >= 99) {
        setDeliveryCharge(0);
        console.log("✓ Free delivery applied - plan items total is ₹" + itemsTotal);
      } else {
        setDeliveryCharge(calculatedCharge);
        console.log("✓ Delivery charge applied: ₹" + calculatedCharge + " - plan items total is ₹" + itemsTotal);
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
      console.error('Error initializing location for plan:', error);
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
  
  const fetchFreshPlan = async () => {
    try {
      console.log("Fetching fresh plan with ID:", planId);
      const response = await fetch(`/api/freshPlan/plan/${planId}`);
      const data = await response.json();
      
      if (data.success && data.plan) {
        setFreshPlan(data.plan);
        return data.plan;
      } else {
        console.error('No active plan found');
      }
    } catch (error) {
      console.error('Error fetching fresh plan:', error);
    }
    return null;
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
  if (checkoutType === 'quicksip') {
    // Calculate for cart items
    let itemsTotal = cartItems.reduce((total, item) => 
      total + item.customization.finalPrice, 0
    );
    
    for(let i=0; i < customisablePrices.length; i++) {
      const item = customisablePrices[i];
      itemsTotal += item.price;
    }
    
    return itemsTotal;
  } else {
    // Calculate for ALL plan items, not just one day
    return planItems.reduce((total, item) => 
      total + item.customization.finalPrice, 0
    );
  }
};

  const getTotalPrice = () => {
    return getItemsTotal() + deliveryCharge;
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }

  if (checkoutType === 'quicksip' && cartItems.length === 0) {
    alert('Your cart is empty');
    return;
  }
  
  if (checkoutType === 'freshplan' && planItems.length === 0) {
    alert('No items in your plan');
    return;
  }
  
  if(checkoutType === 'quicksip' && !selectedTimeSlot){
    setErrors(prev => ({
      ...prev,
      timeSlot: "Please select a delivery time slot"
    }));
    return;
  }

  setSubmitting(true);
  
  try {
    const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
    
    // Create order - different payload based on checkout type
    const orderPayload = checkoutType === 'quicksip' 
  ? {
      customerDetails,
      cartItems,
      totalAmount: getTotalPrice(),
      deliveryCharge,
      customisablePrices,
      deliveryTimeSlot: selectedTimeSlot
    }
  : {
      customerDetails,
      planItems, 
      planId,
      totalAmount: getTotalPrice(),
      deliveryCharge,
      checkoutType: 'freshplan',
      completeCheckout: true,
      planDays: freshPlan?.schedule.map(day => ({
        date: day.date,
        items: day.items.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.customization.finalPrice,
          customization: item.customization,
          timeSlot: item.timeSlot
        }))
      }))
    };
      
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
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
              // For QuickSip orders, clear the cart
              if (checkoutType === 'quicksip') {
                await fetch('/api/cart/clear', {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
              }
              
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
  
  const handleGetLocation = async () => {
  try {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by your browser');
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });

    const { latitude, longitude } = position.coords;
    
    // Store coordinates in localStorage
    localStorage.setItem('latitude', latitude.toString());
    localStorage.setItem('longitude', longitude.toString());

    const DELIVERY_RANGES = deliverySettings || await fetchDeliverySettings();
    
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

    const calculatedCharge = calculateDeliveryCharge(distance, DELIVERY_RANGES.CHARGES);
    setCalculatedDeliveryCharge(calculatedCharge);
    
    const itemsTotal = getItemsTotal();
    if (itemsTotal >= 99) {
      setDeliveryCharge(0);
    } else {
      setDeliveryCharge(calculatedCharge);
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

    // For freshplan checkout, recalculate delivery charge with updated location
    if (checkoutType === 'freshplan' && selectedDayId && freshPlan) {
      const selectedDay = freshPlan.schedule.find(day => day._id === selectedDayId);
      if (selectedDay) {
        await initializeLocationForPlan(selectedDay.items, DELIVERY_RANGES);
      }
    }

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

  const toggleDay = (dayId: string) => {
    if (expandedDayId === dayId) {
      setExpandedDayId(null);
    } else {
      setExpandedDayId(dayId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {checkoutType === 'quicksip' ? 'QuickSip Checkout' : 'FreshPlan Checkout'}
          </h1>
          
          <div className="flex items-center space-x-4">
            <div className="group relative">
              <Link href={checkoutType==='quicksip'?'/cart':'/current-plan'} className="text-gray-700">
                <button className="text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ShoppingBag className="w-5 h-5" />
                </button>
              </Link>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                My Cart
              </span>
            </div>
            
            <div className="group relative">
              <Link href={checkoutType==='quicksip'?'/dashboard':'/freshplan'} className="text-gray-700">
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl text-black font-semibold">Delivery Details</h2>
                
                {/* Saved Addresses Button */}
                <button
                  type="button"
                  onClick={() => setShowSavedAddresses(true)}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium underline"
                >
                  Choose Saved Address
                </button>
              </div>
              
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
                    className={`mt-1 block w-full px-3 py-2 border text-black ${errors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
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
                    className={`mt-1 block w-full px-3 py-2 border text-black ${errors.phone ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500`}
                    placeholder="10-digit phone number"
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        Delivery Address *
                      </label>
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        className="text-xs text-orange-600 hover:text-orange-800 underline transition-colors"
                      >
                        Get Current Location
                      </button>
                    </div>
                    <textarea
                      id="address"
                      name="address"
                      value={customerDetails.address}
                      onChange={handleInputChange}
                      disabled={disableAddressInput}
                      className={`mt-1 block text-black w-full px-3 py-2 border ${errors.address ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${disableAddressInput ? 'bg-gray-50' : 'bg-white'}`}
                      rows={3}
                      placeholder="Enter your delivery address"
                    />
                    {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                    {locationError && <p className="mt-1 text-sm text-red-600">{locationError}</p>}
                  </div>
                  
                  <div>
                    <label htmlFor="additionalAddressInfo" className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Address Info <span className="text-xs text-gray-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      id="additionalAddressInfo"
                      name="additionalAddressInfo"
                      value={customerDetails.additionalAddressInfo || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border text-black border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Apartment number, landmarks, etc."
                    />
                  </div>

                  {/* Save Address Button */}
                  {customerDetails.address && (
                    <button
                      type="button"
                      onClick={() => setShowSaveAddressModal(true)}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium underline"
                    >
                      Save this address for future orders
                    </button>
                  )}
                </div>
                
                 {checkoutType === 'quicksip' ? (
                  <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="timeSlot" className="block text-sm font-medium text-gray-700">
                      Delivery Time Slot
                    </label>
                    {errors.timeSlot && <p className="text-sm text-red-600">{errors.timeSlot}</p>}
                  </div>
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
                 ) : null}

                
                <div className="flex items-center justify-between border-t border-b border-gray-200 py-4 mt-4">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-1">Delivery Fee:</span>
                    <button
                      type="button"
                      onClick={() => setShowDeliveryInfo(true)}
                      className=" text-black hover:text-gray-700 focus:outline-none ml-1"
                    >
                      {getTotalPrice() >= 99 ? (<Info className="w-4 h-4" />): ( <p className='text-red-700 text-sm underline cursor-pointer'>(Remove it) </p>)}
                      
                    </button>
                  </div>
                  
                  <div>
                    {deliveryCharge === 0 && calculatedDeliveryCharge > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 line-through">₹{calculatedDeliveryCharge}</span>
                        <span className="text-sm font-semibold text-green-600">FREE</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-black">₹{deliveryCharge}</span>
                    )}
                  </div>
                </div>
                
                 <button
                  type="submit"
                  disabled={submitting || locationError !== ''}
                  className={`w-full py-3 px-4 rounded-lg font-bold text-center ${
                    submitting || locationError !== ''
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600 shadow-md hover:shadow-lg transition-all'
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
              <h2 className="text-xl font-semibold text-black mb-6">
                {checkoutType === 'quicksip' ? 'Order Summary' : 'FreshPlan Summary'}
              </h2>
              
              {/* QuickSip Order Summary */}
              {checkoutType === 'quicksip' && (
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
              )}
              
              {/* FreshPlan Order Summary */}
              {checkoutType === 'freshplan' && freshPlan && (
  <div className="space-y-4 mb-6">
    <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 mb-2">
      <h3 className="font-semibold text-gray-900 mb-2">Complete FreshPlan Checkout</h3>
      <p className="text-sm text-gray-700">
        You are checking out your entire FreshPlan for {freshPlan?.days} days.
      </p>
    </div>

    {freshPlan.schedule.map((day) => {
      const isExpanded = day._id === expandedDayId;
      const dayDate = new Date(day.date);
      const dayTotal = day.items.reduce((total, item) => 
        total + item.customization.finalPrice, 0);
      
      return (
        <div 
          key={day._id}
          className="rounded-xl overflow-hidden transition-all duration-300 bg-gray-50"
        >
          <div 
            onClick={() => toggleDay(day._id)}
            className="p-3 flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-orange-100 text-orange-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{format(dayDate, 'EEEE')}</h3>
                <p className="text-xs text-gray-500">{format(dayDate, 'MMM d')}</p>
              </div>
            </div>
            <div className="flex items-center">
              <p className="text-sm font-semibold text-gray-900 mr-2">₹{dayTotal}</p>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
          
          {isExpanded && (
            <div className="border-t border-gray-100 p-3 space-y-3 bg-white">
              {day.items.map((item) => (
                <div key={item._id} className="flex items-center gap-2">
                  <div className="relative w-10 h-10 flex-shrink-0 rounded overflow-hidden">
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.customization.size}
                      {item.customization.ice && ` • ${item.customization.ice}`}
                      {item.customization.sugar && ` • ${item.customization.sugar}`}
                    </p>
                  </div>
                  <p className="text-xs font-medium text-gray-900">₹{item.customization.finalPrice}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    })}
    
    {/* Add a summary section showing all days total */}
    <div className="p-4 bg-orange-100 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-gray-800">Plan Subtotal</p>
          <p className="text-xs text-gray-600">
            {planItems.length} items across {freshPlan?.days} days
          </p>
        </div>
        <p className="text-lg font-bold text-gray-900">₹{getItemsTotal()}</p>
      </div>
    </div>
  </div>
              )}
              
              {/* Delivery Charge Price */}
              {deliveryCharge >= 0 && (
                <div className="flex items-center justify-between text-gray-700 mb-2">
                  <span>Delivery Fee</span>
                  {deliveryCharge === 0 && calculatedDeliveryCharge > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 line-through">₹{calculatedDeliveryCharge}</span>
                      <span className="font-semibold text-green-600">FREE</span>
                    </div>
                  ) : (
                    <span className="font-semibold text-gray-900">₹{deliveryCharge}</span>
                  )}
                </div>
              )}
              
              {/* Total */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between text-lg font-bold text-gray-900 mb-1">
                  <span>Total</span>
                  <span>₹{getTotalPrice()}</span>
                </div>
                {deliveryCharge === 0 && calculatedDeliveryCharge > 0 && (
                  <p className="text-xs text-green-600 text-right mt-1">
                    Free delivery on orders above ₹99!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showSavedAddresses && (
        <div className="fixed inset-0 bg-gray-300  bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Saved Addresses</h3>
                <button
                  onClick={() => setShowSavedAddresses(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {savedAddresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No saved addresses yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedAddresses.map((address, index) => (
                    <button
                      key={address._id || index}
                      onClick={() => handleSelectSavedAddress(address)}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all"
                    >
                      <h4 className="font-semibold text-black mb-1">{address.addressName}</h4>
                      <p className="text-sm text-gray-600">{address.deliveryAddress}</p>
                      {address.additionalAddressDetails && (
                        <p className="text-xs text-gray-500 mt-1">{address.additionalAddressDetails}</p>
                      )}
                      {address.phoneNumber && (<p className="text-xs text-gray-500 mt-1">Phone: {address.phoneNumber}</p>)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Save Address Modal */}
      {showSaveAddressModal && (
        <div className="fixed inset-0  bg-opacity-80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Save Address</h3>
                <button
                  onClick={() => {
                    setShowSaveAddressModal(false);
                    setNewAddressName('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Name *
                </label>
                <input
                  type="text"
                  value={newAddressName}
                  onChange={(e) => setNewAddressName(e.target.value)}
                  placeholder="e.g., Home, Office, Gym"
                  className="w-full px-3 py-2 border text-black border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Address to save:</p>
                <p className="text-sm text-gray-900">{customerDetails.address}</p>
                {customerDetails.additionalAddressInfo && (
                  <p className="text-xs text-gray-600 mt-1">{customerDetails.additionalAddressInfo}</p>
                )}
              </div>
              
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => {
                    setShowSaveAddressModal(false);
                    setNewAddressName('');
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-black hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAddress}
                  className="flex-1 py-2 px-4 bg-orange-500 text-black rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Save Address
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <DeliveryInfoModal
        isOpen={showDeliveryInfo}
        onClose={() => setShowDeliveryInfo(false)}
        settings={deliverySettings}
        totalPrice={getItemsTotal()}
      />
    </div>
  );
}

export default function Checkout() {
  return (
    <Suspense fallback={<div>Loading orders...</div>}>
      <CheckoutPage />
    </Suspense>
  );
}