'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, isToday, isTomorrow, isAfter } from 'date-fns';
import { ChevronRight, Calendar, Clock, Plus, X, ArrowLeft, Minus } from 'lucide-react';
import { TIME_SLOTS } from '@/constants/timeSlots';
import Link from 'next/link';
import Image from 'next/image';
import ProductCustomization, { ProductCustomization as CustomizationType } from '@/app/components/product/ProductCustomization';


interface PlanStep {
  id: 'duration' | 'start-date' | 'schedule';
  title: string;
  description: string;
}

interface DaySchedule {
  date: Date;
  timeSlot: string;
  items: any[]; // Will be expanded later
}

const STEPS: PlanStep[] = [
  {
    id: 'duration',
    title: 'Plan Duration',
    description: 'How many days would you like your plan to run?'
  },
  {
    id: 'start-date',
    title: 'Start Date',
    description: 'When would you like your plan to start?'
  },
  {
    id: 'schedule',
    title: 'Schedule',
    description: 'Set delivery times for each day'
  }
];

const MIN_DURATION = 3;
const MAX_DURATION = 30;

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: 'juices' | 'shakes';
  image: string;
  stock: number;
  smallPrice?: number;
  mediumPrice?: number;
}

export default function FreshPlanPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<'duration' | 'start-date' | 'schedule'>('duration');
  const [duration, setDuration] = useState<number>(7);
  const [startDate, setStartDate] = useState<Date>(addDays(new Date(), 1));
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [animate, setAnimate] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<number | null>(null);
  const [canStartToday, setCanStartToday] = useState(false);
   const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customization, setCustomization] = useState<CustomizationType | null>(null);
  const [finalPrice, setFinalPrice] = useState(0);
  

  // Check if we can start today based on current time
  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours();
    setCanStartToday(currentHour < 18);
  }, []);

   useEffect(() => {
    if (activeDayIndex !== null) {
      fetchProducts();
    }
  }, [activeDayIndex]);

   const fetchProducts = async () => {
    try {
      setProductLoading(true);
      const response = await fetch('/api/products');
      const data = await response.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductLoading(false);
    }
  };

  // Initialize schedule when duration and start date are set
  useEffect(() => {
    if (currentStep === 'schedule' && duration > 0 && startDate) {
      const newSchedule: DaySchedule[] = [];
      
      for (let i = 0; i < duration; i++) {
        const date = addDays(startDate, i);
        newSchedule.push({
          date,
          timeSlot: TIME_SLOTS[2].range, // Default to 9-10 AM
          items: []
        });
      }
      
      setSchedule(newSchedule);
    }
  }, [duration, startDate, currentStep]);

  const handleNextStep = () => {
    setAnimate(true);
    
    setTimeout(() => {
      if (currentStep === 'duration') {
        setCurrentStep('start-date');
      } else if (currentStep === 'start-date') {
        setCurrentStep('schedule');
      }
      setAnimate(false);
    }, 300);
  };

  const handlePreviousStep = () => {
    setAnimate(true);
    
    setTimeout(() => {
      if (currentStep === 'start-date') {
        setCurrentStep('duration');
      } else if (currentStep === 'schedule') {
        setCurrentStep('start-date');
      }
      setAnimate(false);
    }, 300);
  };

  const handleTimeSlotChange = (dayIndex: number, timeSlot: string) => {
    const updatedSchedule = [...schedule];
    updatedSchedule[dayIndex].timeSlot = timeSlot;
    setSchedule(updatedSchedule);
    setShowTimePicker(null);
  };

  const incrementDuration = () => {
    if (duration < MAX_DURATION) {
      setDuration(duration + 1);
    }
  };

  const decrementDuration = () => {
    if (duration > MIN_DURATION) {
      setDuration(duration - 1);
    }
  };

  const handleAddItem = (dayIndex: number) => {
    setActiveDayIndex(dayIndex);
  };
  
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
  };
  
  const handleCustomizationChange = (custom: CustomizationType, price: number) => {
    setCustomization(custom);
    setFinalPrice(price);
  };
  
  const closeProductSelection = () => {
    setActiveDayIndex(null);
  };
  
  const closeProductCustomization = () => {
    setSelectedProduct(null);
    setCustomization(null);
  };
  
  const handleConfirmPlan = async () => {
  try {
    // Prepare schedule data for submission
    const planData = {
      days: duration,
      startDate: startDate.toISOString(),
      schedule: schedule.map(day => ({
        date: day.date.toISOString(),
        items: day.items.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          timeSlot: item.timeSlot,
          customization: item.customization
        }))
      }))
    };
    
    console.log("Submitting plan:", planData);
    
    const response = await fetch('/api/freshPlan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(planData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create plan');
    }
    
    // On success, redirect to current plan page
    router.push('/current-plan');
    
  } catch (error) {
    console.error("Error creating plan:", error);
    alert("Failed to create plan. Please try again.");
  }
};
  const addProductToDay = () => {
    if (!selectedProduct || !customization || activeDayIndex === null) return;
    
    const updatedSchedule = [...schedule];
    const newItem = {
      product: selectedProduct,
      customization,
      quantity: customization.orderQuantity || 1,
      timeSlot: updatedSchedule[activeDayIndex].timeSlot,
      _id: `temp-${Date.now()}`
    };
    
    updatedSchedule[activeDayIndex].items.push(newItem);
    setSchedule(updatedSchedule);
    
    // Reset selection
    closeProductCustomization();
  };
  
  // Updated renderProductSelectionModal function with a more modern UI
const renderProductSelectionModal = () => {
  if (activeDayIndex === null) return null;
  
  const day = schedule[activeDayIndex];
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex flex-col">
      <div className="bg-white rounded-t-2xl p-5 flex items-center justify-between shadow-md">
        <div>
          <h3 className="font-bold text-xl text-black">Add Item</h3>
          <p className="text-sm text-black/70">
            {day ? format(day.date, 'EEEE, MMM d') : 'Select a product'}
          </p>
        </div>
        <button 
          onClick={closeProductSelection}
          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-black" />
        </button>
      </div>
      
      {productLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-black/70">Loading products...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              {['All', 'Juices', 'Shakes'].map((category) => (
                <button 
                  key={category}
                  className="py-2.5 px-4 rounded-full text-black font-medium bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          
          <div className="px-4 pb-6">
            <div className="grid grid-cols-2 gap-4">
              {products.map(product => (
                <div 
                  key={product._id}
                  onClick={() => handleSelectProduct(product)}
                  className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow transform hover:translate-y-[-2px] transition-transform duration-200"
                >
                  <div className="h-32 relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10"></div>
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                    {product.category === 'juices' && (
                      <span className="absolute top-2 left-2 bg-green-100 text-black text-xs px-2 py-0.5 rounded-full font-medium z-20">
                        Juice
                      </span>
                    )}
                    {product.category === 'shakes' && (
                      <span className="absolute top-2 left-2 bg-purple-100 text-black text-xs px-2 py-0.5 rounded-full font-medium z-20">
                        Shake
                      </span>
                    )}
                  </div>
                  <div className="p-3.5">
                    <h4 className="font-semibold text-black text-sm truncate">{product.name}</h4>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-black font-bold">₹{product.price}</p>
                      <span className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5 text-orange-600" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Updated product customization modal
const renderProductCustomizationModal = () => {
  if (!selectedProduct) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col">
      <div className="bg-white rounded-t-2xl p-5 flex items-center justify-between shadow-md">
        <div className="flex-1">
          <div className="flex items-center">
            <span className={`inline-block w-2 h-2 rounded-full ${
              selectedProduct.category === 'juices' ? 'bg-green-500' : 'bg-purple-500'
            } mr-2`}></span>
            <span className="text-xs font-medium text-black/60 uppercase">
              {selectedProduct.category}
            </span>
          </div>
          <h3 className="font-bold text-xl text-black mt-1">{selectedProduct.name}</h3>
          <p className="text-sm text-black/70 mt-0.5 line-clamp-1">{selectedProduct.description}</p>
        </div>
        <button 
          onClick={closeProductCustomization}
          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center ml-4 transition-colors"
        >
          <X className="w-5 h-5 text-black" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-5 bg-white">
          <div className="relative h-40 w-full rounded-xl overflow-hidden mb-4">
            <Image
              src={selectedProduct.image}
              alt={selectedProduct.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-black/60">Base Price</p>
              <p className="text-2xl font-bold text-black">₹{selectedProduct.price}</p>
            </div>
            <div className="px-3 py-1.5 bg-orange-100 rounded-lg">
              <p className="text-xs font-medium text-orange-700">Customizable</p>
            </div>
          </div>
        </div>
        
        <div className="px-5 py-4">
          <h4 className="font-semibold text-black mb-2">Customize Your Order</h4>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <ProductCustomization
              category={selectedProduct.category}
              smallPrice={selectedProduct.smallPrice ?? selectedProduct.price}
              mediumPrice={selectedProduct.mediumPrice ?? (selectedProduct.price * 1.3)}
              onCustomizationChange={handleCustomizationChange}
            />
          </div>
        </div>
      </div>
      
      <div className="bg-white p-5 shadow-lg border-t">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-black">Total Price:</span>
          <span className="text-xl font-bold text-black">₹{finalPrice}</span>
        </div>
        <button
          onClick={addProductToDay}
          disabled={!customization}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm ${
            customization
              ? 'bg-orange-500 text-white'
              : 'bg-gray-200 text-black/50'
          } transition-colors`}
        >
          {customization ? 'Add to Day ' + (activeDayIndex !== null ? activeDayIndex + 1 : '') : 'Select Options'}
        </button>
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 pb-16">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-30">
        <div className="max-w-md mx-auto px-4">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center">
              <Link 
                href="/"
                className="p-2 rounded-lg hover:bg-gray-100 mr-2"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </Link>
              <h1 className="text-xl font-bold text-black">Create FreshPlan</h1>
            </div>
            <div className="flex items-center space-x-1">
              {STEPS.map((step, index) => (
                <div 
                  key={step.id}
                  className={`w-2 h-2 rounded-full ${
                    currentStep === step.id 
                      ? 'bg-orange-500' 
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 pt-6 overflow-hidden">
        <div 
          className={`transition-all duration-300 ${
            animate ? 'opacity-0 transform translate-x-full' : 'opacity-100'
          }`}
        >
          {/* Step 1: Duration Selection */}
          {currentStep === 'duration' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Choose Duration</h2>
                <p className="text-gray-600 mt-1">How many days would you like your plan to run?</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
                <div className="flex flex-col items-center justify-center">
                  <div className="text-center mb-3">
                    <p className="text-sm text-gray-500">Select number of days</p>
                    <p className="text-xs text-gray-400">(3-30 days)</p>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-6">
                    <button 
                      onClick={decrementDuration}
                      disabled={duration <= MIN_DURATION}
                      className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-6 h-6" />
                    </button>
                    
                    <div className="w-24 h-24 rounded-full bg-orange-500 shadow-lg flex items-center justify-center text-white">
                      <span className="text-4xl font-bold">{duration}</span>
                    </div>
                    
                    <button 
                      onClick={incrementDuration}
                      disabled={duration >= MAX_DURATION}
                      className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <p className="text-center text-gray-600 mt-4 font-medium">
                    {duration} {duration === 1 ? 'day' : 'days'}
                  </p>
                </div>
                
                <p className="text-center text-sm text-gray-500">
                  Your plan will include {duration} consecutive days of delivery
                </p>
              </div>
              
              <button
                onClick={handleNextStep}
                className="mt-6 w-full py-4 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center"
              >
                <span>Continue</span>
                <ChevronRight className="ml-2 w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: Start Date Selection */}
          {currentStep === 'start-date' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Choose Start Date</h2>
                <p className="text-gray-600 mt-1">When would you like your plan to start?</p>
              </div>
              
              <div className="flex flex-col space-y-4">
                {canStartToday && (
                  <button
                    onClick={() => setStartDate(new Date())}
                    className={`p-5 flex items-center justify-between rounded-xl ${
                      isToday(startDate) 
                        ? 'bg-orange-500 text-white shadow-lg ring-2 ring-orange-300' 
                        : 'bg-white text-gray-800 shadow-md hover:shadow-lg'
                    } transition-all`}
                  >
                    <div className="flex items-center">
                      <Calendar className="w-6 h-6 mr-3 opacity-80" />
                      <div className="text-left">
                        <p className="font-semibold">Today</p>
                        <p className="text-sm opacity-80">{format(new Date(), 'EEEE, MMMM d')}</p>
                      </div>
                    </div>
                    {isToday(startDate) && (
                      <div className="w-4 h-4 rounded-full bg-white bg-opacity-30"></div>
                    )}
                  </button>
                )}
                
                <button
                  onClick={() => setStartDate(addDays(new Date(), 1))}
                  className={`p-5 flex items-center justify-between rounded-xl ${
                    isTomorrow(startDate) 
                      ? 'bg-orange-500 text-white shadow-lg ring-2 ring-orange-300' 
                      : 'bg-white text-gray-800 shadow-md hover:shadow-lg'
                  } transition-all`}
                >
                  <div className="flex items-center">
                    <Calendar className="w-6 h-6 mr-3 opacity-80" />
                    <div className="text-left">
                      <p className="font-semibold">Tomorrow</p>
                      <p className="text-sm opacity-80">{format(addDays(new Date(), 1), 'EEEE, MMMM d')}</p>
                    </div>
                  </div>
                  {isTomorrow(startDate) && (
                    <div className="w-4 h-4 rounded-full bg-white bg-opacity-30"></div>
                  )}
                </button>

                <div className="text-center text-sm text-gray-600 mt-6 mb-4">
                  Plan will run for {duration} days starting from {format(startDate, 'MMM d')}
                </div>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={handlePreviousStep}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-xl font-semibold shadow-md flex items-center justify-center"
                >
                  <span>Continue</span>
                  <ChevronRight className="ml-2 w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Schedule Configuration */}
          {currentStep === 'schedule' && (
  <div className="space-y-6">
    <div className="text-center mb-6">
      <h2 className="text-2xl font-bold text-gray-900">Set Delivery Schedule</h2>
      <p className="text-gray-600 mt-1">Choose delivery time for each day</p>
    </div>
    
    <div className="relative overflow-x-auto pb-4 -mx-4 px-4">
      <div className="flex space-x-4">
        {schedule.map((day, index) => (
          <div 
            key={index}
            className="flex-shrink-0 w-64 bg-white rounded-xl shadow-md overflow-hidden"
          >
            <div className="bg-orange-500 text-white py-2 px-4">
              <p className="font-semibold">Day {index + 1}</p>
              <p className="text-xs opacity-90">{format(day.date, 'EEEE, MMM d')}</p>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-black mb-1">Delivery Time</p>
                <button
                  onClick={() => setShowTimePicker(index)}
                  className="flex items-center justify-between w-full p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-orange-500" />
                    <span className="text-sm text-black">{day.timeSlot}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              
              {/* Items List */}
              {day.items.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Items ({day.items.length})</p>
                  <div className="max-h-40 overflow-y-auto pr-1 space-y-2">
                    {day.items.map((item, itemIndex) => (
                      <div 
                        key={itemIndex}
                        className="flex items-center bg-gray-50 rounded-lg p-2"
                      >
                        <div className="w-10 h-10 relative rounded overflow-hidden mr-2">
                          <Image
                            src={item.product.image}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate text-black">{item.product.name}</p>
                          <p className="text-xs text-black">{item.customization.size} • ₹{item.customization.finalPrice}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center">
                  <p className="text-xs text-gray-400">No items added yet</p>
                </div>
              )}
              
              <button 
                onClick={() => handleAddItem(index)}
                className="w-full flex items-center justify-center p-2 border border-dashed border-orange-300 rounded-lg hover:bg-orange-50 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1 text-orange-500" />
                <span className="text-sm text-orange-500">Add Item</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
    
    <div className="pt-4">
      <p className="text-center text-sm text-gray-600 mb-4">
        You can modify your schedule anytime
      </p>
      
      <div className="flex space-x-4">
        <button
          onClick={handlePreviousStep}
          className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleConfirmPlan}
          className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-xl font-semibold shadow-md"
        >
          Confirm Schedule
        </button>
      </div>
    </div>
  </div>
)}
        </div>
      </div>

      {/* Time Slot Picker Modal */}
      {showTimePicker !== null && (
        <div className="fixed inset-0 bg-black/50  text-black z-40 flex items-end justify-center p-4">
          <div className="bg-white rounded-t-2xl text-black w-full max-w-md animate-slide-up">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-black">Select Delivery Time</h3>
              <button 
                onClick={() => setShowTimePicker(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-black mb-2">Morning Slots</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.filter(slot => slot.type === 'morning').map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => handleTimeSlotChange(showTimePicker, slot.range)}
                        className={`p-3 rounded-lg text-left ${
                          schedule[showTimePicker]?.timeSlot === slot.range
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                        }`}
                      >
                        <span className="font-medium">{slot.range}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium  text-black mb-2">Evening Slots</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.filter(slot => slot.type === 'evening').map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => handleTimeSlotChange(showTimePicker, slot.range)}
                        className={`p-3 rounded-lg text-left ${
                          schedule[showTimePicker]?.timeSlot === slot.range
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                        }`}
                      >
                        <span className="font-medium">{slot.range}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {renderProductSelectionModal()}
      {renderProductCustomizationModal()}
    </div>
  );
}