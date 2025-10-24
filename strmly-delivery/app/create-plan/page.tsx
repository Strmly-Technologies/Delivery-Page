'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, isToday, isTomorrow, isAfter, isBefore } from 'date-fns';
import { ChevronRight, Calendar, Clock, Plus, X, ArrowLeft, Minus, AlertCircle } from 'lucide-react';
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // New state variables for sequential plans
  const [earliestStartDate, setEarliestStartDate] = useState<Date | null>(null);
  const [hasExistingPlans, setHasExistingPlans] = useState(false);
  
  // Calendar navigation states
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  useEffect(() => {
    checkExistingPlans();
  }, []);

  const checkExistingPlans = async () => {
    try {
      const response = await fetch('/api/freshPlan');
      const data = await response.json();
      
      if (data.success) {
        setHasExistingPlans(data.hasPlans);
        
        // If earliest start date is provided and it's in the future, use it
        if (data.earliestStartDate) {
          const earliestDate = new Date(data.earliestStartDate);
          console.log("Earliest Start Date from API:", earliestDate);
          if (isAfter(earliestDate, new Date())) {
            setEarliestStartDate(earliestDate);
            setStartDate(earliestDate); // Auto-select earliest allowed date
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing plans:', error);
    }
  };

  // Check if we can start today based on current time
  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Can start today if it's before 6pm and there's no earliest date restriction
    const canStartTodayByTime = currentHour < 18;
    const canStartTodayByPlans = !earliestStartDate || !isAfter(earliestStartDate, new Date());
    
    setCanStartToday(canStartTodayByTime && canStartTodayByPlans);
  }, [earliestStartDate]);

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
  const removeItemFromDay = (dayIndex: number, itemIndex: number) => {
  const updatedSchedule = [...schedule];
  updatedSchedule[dayIndex].items.splice(itemIndex, 1);
  setSchedule(updatedSchedule);
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
      
      const response = await fetch('/api/freshPlan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle specific error for unavailable start date
        if (data.earliestStartDate) {
          const newEarliestDate = new Date(data.earliestStartDate);
          setEarliestStartDate(newEarliestDate);
          setStartDate(newEarliestDate);
          setCurrentStep('start-date');
          throw new Error(`Plan must start after ${format(newEarliestDate, 'MMMM d')}. We've updated your start date.`);
        } else {
          throw new Error(data.error || 'Failed to create plan');
        }
      }
      console.log("Plan created with ID:", data.planId);
      // On success, redirect to checkout
      router.push('/checkout?type=freshplan&planId='+data.planId);
      
    } catch (error) {
      console.error("Error creating plan:", error);
      alert(error instanceof Error ? error.message : "Failed to create plan. Please try again.");
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


  const renderStartDateSelection = () => {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 text-black">When do you want to start?</h3>
        
        {earliestStartDate && isAfter(earliestStartDate, addDays(new Date(), 1)) && (
          <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-800">
                You have an existing plan that ends on {format(addDays(earliestStartDate, -1), 'EEEE, MMMM d')}.
              </p>
              <p className="text-sm text-gray-800 font-medium mt-1">
                Your new plan can start from {format(earliestStartDate, 'MMMM d')} onwards.
              </p>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          {canStartToday && !earliestStartDate && (
            <button
              onClick={() => setStartDate(new Date())}
              disabled={earliestStartDate! && isAfter(earliestStartDate, new Date())}
              className={`p-5 flex items-center justify-between rounded-xl ${
                isToday(startDate) 
                  ? 'bg-orange-500 text-white shadow-lg ring-2 ring-orange-300' 
                  : earliestStartDate && isAfter(earliestStartDate, new Date())
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
            onClick={() => {
              const tomorrow = addDays(new Date(), 1);
              // Only set to tomorrow if it's not before earliest allowed date
              if (!earliestStartDate || !isAfter(earliestStartDate, tomorrow)) {
                setStartDate(tomorrow);
              }
            }}
            disabled={earliestStartDate! && isAfter(earliestStartDate, addDays(new Date(), 1))}
            className={`p-5 flex items-center justify-between rounded-xl ${
              isTomorrow(startDate) 
                ? 'bg-orange-500 text-white shadow-lg ring-2 ring-orange-300' 
                : earliestStartDate && isAfter(earliestStartDate, addDays(new Date(), 1))
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-800 shadow-md hover:shadow-lg'
            } transition-all ${(!canStartToday || (earliestStartDate && isAfter(earliestStartDate, new Date()))) ? 'col-span-2' : ''}`}
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
          
          {/* Custom date button - only show if there are existing plans */}
          {hasExistingPlans && (
            <button
              onClick={() => {
                setCalendarMonth(earliestStartDate ? earliestStartDate.getMonth() : new Date().getMonth());
                setCalendarYear(earliestStartDate ? earliestStartDate.getFullYear() : new Date().getFullYear());
                setShowDatePicker(true);
              }}
              className={`p-5 flex items-center justify-between rounded-xl ${
                !isToday(startDate) && !isTomorrow(startDate)
                  ? 'bg-orange-500 text-white shadow-lg ring-2 ring-orange-300'
                  : 'bg-white text-gray-800 shadow-md hover:shadow-lg'
              } transition-all col-span-2`}
            >
              <div className="flex items-center">
                <Calendar className="w-6 h-6 mr-3 opacity-80" />
                <div className="text-left">
                  <p className="font-semibold">Custom Date</p>
                  {!isToday(startDate) && !isTomorrow(startDate) && (
                    <p className="text-sm opacity-80">{format(startDate, 'EEEE, MMMM d')}</p>
                  )}
                  {(isToday(startDate) || isTomorrow(startDate)) && (
                    <p className="text-sm opacity-80">Select another date</p>
                  )}
                </div>
              </div>
              {!isToday(startDate) && !isTomorrow(startDate) && (
                <div className="w-4 h-4 rounded-full bg-white bg-opacity-30"></div>
              )}
            </button>
          )}
        </div>
        
        <div className="text-center text-sm text-gray-600 mt-6">
          Your plan will run for {duration} days starting {format(startDate, 'MMMM d, yyyy')}
        </div>
        
        {/* Date Picker Modal */}
        {showDatePicker && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl">
              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b border-gray-200">
                <h3 className="text-xl font-bold text-black">Select Start Date</h3>
                <button 
                  onClick={() => setShowDatePicker(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-black" />
                </button>
              </div>
              
              <div className="p-5">
                {/* Info Message */}
                {earliestStartDate && isAfter(earliestStartDate, addDays(new Date(), 1)) && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-black">
                      Earliest available date: <span className="font-semibold">{format(earliestStartDate, 'MMMM d, yyyy')}</span>
                    </p>
                  </div>
                )}
                
                {/* Month/Year Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => {
                      if (calendarMonth === 0) {
                        setCalendarMonth(11);
                        setCalendarYear(calendarYear - 1);
                      } else {
                        setCalendarMonth(calendarMonth - 1);
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-black rotate-180" />
                  </button>
                  
                  <div className="text-center">
                    <h4 className="text-lg font-bold text-black">
                      {format(new Date(calendarYear, calendarMonth), 'MMMM yyyy')}
                    </h4>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (calendarMonth === 11) {
                        setCalendarMonth(0);
                        setCalendarYear(calendarYear + 1);
                      } else {
                        setCalendarMonth(calendarMonth + 1);
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-black" />
                  </button>
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Day Headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-black py-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar Days */}
                  {(() => {
                    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
                    const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);
                    const startingDayOfWeek = firstDayOfMonth.getDay();
                    const daysInMonth = lastDayOfMonth.getDate();
                    
                    const calendarDays = [];
                    
                    // Previous month's days
                    for (let i = 0; i < startingDayOfWeek; i++) {
                      const prevMonthDate = addDays(firstDayOfMonth, -(startingDayOfWeek - i));
                      const isDisabled = earliestStartDate 
                        ? isBefore(prevMonthDate, earliestStartDate) 
                        : isBefore(prevMonthDate, addDays(new Date(), 1));
                      
                      calendarDays.push(
                        <button
                          key={`prev-${i}`}
                          disabled
                          className="h-10 w-full rounded-lg flex items-center justify-center text-sm text-gray-300 cursor-not-allowed"
                        >
                          {prevMonthDate.getDate()}
                        </button>
                      );
                    }
                    
                    // Current month's days
                    for (let day = 1; day <= daysInMonth; day++) {
                      const currentDate = new Date(calendarYear, calendarMonth, day);
                      const normalize = (date:any) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
                      const isDisabled = earliestStartDate 
                        ? isBefore(normalize(currentDate), normalize(earliestStartDate))
                        : isBefore(normalize(currentDate), normalize(new Date()));
                      const isSelected = currentDate.toDateString() === startDate.toDateString();
                      const isToday = currentDate.toDateString() === new Date().toDateString();
                      
                      calendarDays.push(
                        <button
                          key={day}
                          onClick={() => {
                            if (!isDisabled) {
                              setStartDate(currentDate);
                              setShowDatePicker(false);
                            }
                          }}
                          disabled={isDisabled}
                          className={`
                            h-10 w-full rounded-lg flex items-center justify-center text-sm font-medium
                            transition-all duration-200
                            ${isSelected 
                              ? 'bg-orange-500 text-white shadow-md scale-105' 
                              : isToday
                                ? 'bg-orange-100 text-orange-600 border-2 border-orange-300'
                                : 'text-black hover:bg-orange-50'
                            }
                            ${isDisabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer'}
                          `}
                        >
                          {day}
                        </button>
                      );
                    }
                    
                    // Next month's days to fill the grid
                    const remainingDays = 42 - calendarDays.length;
                    for (let i = 1; i <= remainingDays; i++) {
                      const nextMonthDate = new Date(calendarYear, calendarMonth + 1, i);
                      
                      calendarDays.push(
                        <button
                          key={`next-${i}`}
                          disabled
                          className="h-10 w-full rounded-lg flex items-center justify-center text-sm text-gray-300 cursor-not-allowed"
                        >
                          {i}
                        </button>
                      );
                    }
                    
                    return calendarDays;
                  })()}
                </div>
              </div>
              
              {/* Footer */}
              <div className="flex justify-between items-center p-5 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  {startDate && format(startDate, 'MMMM d, yyyy')}
                </p>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors shadow-sm"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
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
   <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={() => router.push('/freshplan')}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center mr-3 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-black" />
              </button>
              <h1 className="text-xl font-bold text-black">Create FreshPlan</h1>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Step {STEPS.findIndex(s => s.id === currentStep) + 1} of {STEPS.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 pt-6 pb-16 overflow-hidden">
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
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setDuration(prev => Math.max(MIN_DURATION, prev - 1))}
                      disabled={duration <= MIN_DURATION}
                      className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-6 h-6" />
                    </button>
                    
                    <div className="w-24 h-24 rounded-full bg-orange-500 text-white flex items-center justify-center text-4xl font-bold shadow-lg">
                      {duration}
                    </div>
                    
                    <button
                      onClick={() => setDuration(prev => Math.min(MAX_DURATION, prev + 1))}
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
              
              {renderStartDateSelection()}
              
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
                        className="flex items-center bg-gray-50 rounded-lg p-2 relative group"
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
                        
                        {/* Remove button - appears on hover */}
                        <button
                            onClick={(e) => {
                            e.stopPropagation();
                            removeItemFromDay(index, itemIndex);
                            }}
                            className="absolute right-1 top-1 w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove item"
                        >
                            <X className="w-3 h-3" />
                        </button>
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