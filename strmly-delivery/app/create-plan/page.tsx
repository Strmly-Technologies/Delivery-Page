'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, isToday, isTomorrow, isAfter, isBefore } from 'date-fns';
import { ChevronRight, Calendar, Clock, Plus, X, ArrowLeft, Minus, AlertCircle, Info } from 'lucide-react';
import { TIME_SLOTS, TimeSlot } from '@/constants/timeSlots';
import Link from 'next/link';
import Image from 'next/image';
import ProductCustomization, { ProductCustomization as CustomizationType } from '@/app/components/product/ProductCustomization';
import { getAvailableTimeSlots } from '@/lib/timeUtil';
import NutrientsModal from '../components/nutrients/NutrientModal';


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
  regularNutrients?: any;
  largeNutrients?: any;
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
  const [showPopup, setShowPopup] = useState(false);
  const [allDaysHaveItems, setAllDaysHaveItems] = useState(false);
  const [todayTimeSlots,setTodayTimeSlots]=useState<TimeSlot[]>([]);
  const [ProductsToAllDays,setProductsToAllDays]=useState<Boolean>(false);
  const [showNutrientsModal, setShowNutrientsModal] = useState(false);
    const [selectedProductForNutrients, setSelectedProductForNutrients] = useState<Product | null>(null);
  

  useEffect(() => {
    if (schedule.length > 0) {
      const allHaveItems = schedule.every(day => day.items.length > 0);
      setAllDaysHaveItems(allHaveItems);
    }
  }, [schedule]);

  // New state variables for sequential plans
  const [earliestStartDate, setEarliestStartDate] = useState<Date | null>(null);
  const [hasExistingPlans, setHasExistingPlans] = useState(false);

  const openNutrientsModal = (product: Product) => {
      setSelectedProductForNutrients(product);
      setShowNutrientsModal(true);
    };

    const closeNutrientsModal = () => {
    setShowNutrientsModal(false);
    setSelectedProductForNutrients(null);
  };



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
    // find the available time slots for today
    const timeSlots=getAvailableTimeSlots(TIME_SLOTS);
    setTodayTimeSlots(timeSlots);
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
      let defaultTimeSlot = TIME_SLOTS[2].range; // Default to 9-10 AM
      
      // If this is today and there are available slots, use the first available one
      if (isToday(date) && todayTimeSlots.length > 0) {
        defaultTimeSlot = todayTimeSlots[0].range;
      }
      
      newSchedule.push({
        date,
        timeSlot: defaultTimeSlot,
        items: []
      });
    }
    
    setSchedule(newSchedule);
  }
}, [duration, startDate, currentStep, todayTimeSlots]);

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
  if(dayIndex === -1){
    // Set time slot for all days
    const updatedSchedule = schedule.map(day => ({
      ...day,
      timeSlot: timeSlot
    }));
    setSchedule(updatedSchedule);
    setShowTimePicker(null);
    return; // Exit early after setting all days
  }
  
  // Set time slot for specific day
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
    if(dayIndex===-1){
      setProductsToAllDays(true);
    }
    else{
    setProductsToAllDays(false);
    }
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

const addProductToAllDays=()=>{
  if(!selectedProduct || !customization){
    return;
  }
  const updatedSchedule = schedule.map(day => {
    const newDay={
      ...day,
      items:[...day.items,{
        product: selectedProduct,
        customization,
        quantity: customization.orderQuantity || 1,
        timeSlot: day.timeSlot,
        _id: `temp-${Date.now()}`
      }
      ]
    }
    return newDay;
  });
  setSchedule(updatedSchedule);
  setProductsToAllDays(false);
  closeProductCustomization();
    

}
  
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
    console.log(updatedSchedule[activeDayIndex])
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
          
          {/* Custom date button - only show if there are existing plans with future end date */}
          {earliestStartDate && isAfter(earliestStartDate, addDays(new Date(), 1)) && (
            <button
              onClick={() => setStartDate(earliestStartDate)}
              className={`p-5 flex items-center justify-between rounded-xl ${
                startDate.toDateString() === earliestStartDate.toDateString()
                  ? 'bg-orange-500 text-white shadow-lg ring-2 ring-orange-300'
                  : 'bg-white text-gray-800 shadow-md hover:shadow-lg'
              } transition-all col-span-2`}
            >
              <div className="flex items-center">
                <Calendar className="w-6 h-6 mr-3 opacity-80" />
                <div className="text-left">
                  <p className="font-semibold">After current plan</p>
                  <p className="text-sm opacity-80">{format(earliestStartDate, 'EEEE, MMMM d, yyyy')}</p>
                </div>
              </div>
              {startDate.toDateString() === earliestStartDate.toDateString() && (
                <div className="w-4 h-4 rounded-full bg-white bg-opacity-30"></div>
              )}
            </button>
          )}
        </div>
        
        <div className="text-center text-sm text-gray-600 mt-6">
          Your plan will run for {duration} days starting {format(startDate, 'MMMM d, yyyy')}
        </div>
      </div>
    );
  };

  // Updated renderProductSelectionModal function with a more modern UI
const renderProductSelectionModal = () => {
  if (activeDayIndex === null) return null;
  
  const day = activeDayIndex!==-1?schedule[activeDayIndex]:null;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex flex-col">
      <div className="bg-white rounded-t-2xl p-5 flex items-center justify-between shadow-md">
        <div>
          <h3 className="font-bold text-xl text-black">Add item</h3>
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
                      className="object-contain"
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
      {/* Fixed Header */}
      <div className="bg-white rounded-t-2xl shadow-lg flex-shrink-0">
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center flex-1 min-w-0 mr-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              selectedProduct.category === 'juices' ? 'bg-green-100' : 'bg-purple-100'
            }`}>
              {selectedProduct.category === 'juices' ? (
                <span className="text-green-600 text-lg">🥤</span>
              ) : (
                <span className="text-purple-600 text-lg">🥛</span>
              )}
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {selectedProduct.category}
              </p>
              <h3 className="font-bold text-lg text-gray-900 truncate">
                {selectedProduct.name}
              </h3>
            </div>
          </div>
          <button 
            onClick={closeProductCustomization}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Unified Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-5 py-4 space-y-4">
          {/* Product Image Card */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="relative h-48 w-full bg-gradient-to-br from-orange-50 to-white">
              <Image
                src={selectedProduct.image}
                alt={selectedProduct.name}
                fill
                className="object-contain p-4"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>

          {/* Description Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm text-gray-600 leading-relaxed">
              {selectedProduct.description}
            </p>
          </div>

         

          {/* Nutrients Button */}
          {((selectedProduct.regularNutrients && selectedProduct.regularNutrients.length > 0) ||
            (selectedProduct.largeNutrients && selectedProduct.largeNutrients.length > 0)) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openNutrientsModal(selectedProduct);
              }}
              className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all border border-orange-100 hover:border-orange-200 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 group-hover:bg-orange-200 flex items-center justify-center transition-colors">
                    <Info className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="ml-3 text-left">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                      Nutritional information
                    </p>
                    <p className="text-xs text-gray-500">View detailed nutrients</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
              </div>
            </button>
          )}

          {/* Customization Card */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-white p-4 border-b border-gray-100">
              <h4 className="font-bold text-gray-900 text-base">Customize your order</h4>
              <p className="text-xs text-gray-500 mt-0.5">Select size, quantity, and preferences</p>
            </div>
            <div className="p-4">
              <ProductCustomization
                category={selectedProduct.category}
                smallPrice={selectedProduct.smallPrice ?? selectedProduct.price}
                mediumPrice={selectedProduct.mediumPrice ?? (selectedProduct.price * 1.3)}
                onCustomizationChange={handleCustomizationChange}
              />
            </div>
          </div>

          {/* Spacer for fixed footer */}
          <div className="h-24"></div>
        </div>
      </div>
      
      {/* Fixed Footer */}
      <div className="bg-white border-t border-gray-200 shadow-2xl flex-shrink-0">
        <div className="p-4">
          {/* Price Summary */}
          <div className="bg-gradient-to-r from-gray-50 to-orange-50 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Final price</span>
              <div className="flex items-center">
                
                <span className="text-2xl font-bold text-orange-600">₹{finalPrice}</span>
              </div>
            </div>
          </div>

          {/* Add Button */}
          <button
            onClick={!ProductsToAllDays ? addProductToDay : addProductToAllDays}
            disabled={!customization}
            className={`w-full py-4 px-4 rounded-xl font-bold text-base shadow-lg transition-all transform active:scale-95 ${
              customization
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-orange-200'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {customization ? (
              <span className="flex items-center justify-center">
                <Plus className="w-5 h-5 mr-2" />
                Add to {activeDayIndex !== -1 ? `Day ${activeDayIndex! + 1}` : 'All Days'}
              </span>
            ) : (
              'Select Options to Continue'
            )}
          </button>
        </div>
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
                <h2 className="text-2xl font-bold text-gray-900">Choose duration</h2>
                <p className="text-gray-600 mt-1">How many days would you like your plan to run?</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
                <div className="flex flex-col items-center justify-center">
                  <div className="text-center mb-3">
                    <p className="text-sm text-gray-500">Select number of days</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                            <button
                  onClick={() => {
                    if (duration <= MIN_DURATION) {
                      setShowPopup(true);
                      return;
                    }
                    setDuration(prev => prev - 1);
                  }}
                  className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <Minus className="w-6 h-6" />
                </button>

                  {showPopup && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 px-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-scale-in">
      {/* Header with icon */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-400 p-6 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">Minimum duration required</h3>
      </div>
      
      {/* Content */}
      <div className="p-6 text-center">
        <p className="text-gray-700 text-base leading-relaxed">
          FreshPlan requires a minimum duration of <span className="font-bold text-orange-600">{MIN_DURATION} days</span> to ensure the best experience and value.
        </p>
      </div>
      
      {/* Footer */}
      <div className="p-6 pt-0">
        <button
          onClick={() => setShowPopup(false)}
          className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Got it!
        </button>
      </div>
    </div>
  </div>
)}
                    
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
                <h2 className="text-2xl font-bold text-gray-900">Choose start date</h2>
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
          <h2 className="text-2xl font-bold text-gray-900">Set delivery schedule</h2>
          <p className="text-gray-600 mt-1">Choose delivery time for each day</p>
        </div>
        
        {/* Progress indicator */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Schedule progress</span>
            <span className="text-sm font-semibold text-orange-600">
              {schedule.filter(day => day.items.length > 0).length}/{schedule.length} days
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(schedule.filter(day => day.items.length > 0).length / schedule.length) * 100}%` }}
            />
          </div>
          {!allDaysHaveItems && (
            <p className="text-xs text-gray-500 mt-2">
              Add at least one item to each day to continue
            </p>
          )}
        </div>
        
        <div className="relative overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex space-x-4">
            {schedule.map((day, index) => {
              const hasItems = day.items.length > 0;
              
              return (
                <div 
                  key={index}
                  className={`flex-shrink-0 w-64 bg-white rounded-xl shadow-md overflow-hidden ${
                    !hasItems ? 'ring-2 ring-red-300' : ''
                  }`}
                >
                  <div className={`py-2 px-4 ${hasItems ? 'bg-orange-500' : 'bg-orange-300'} text-white`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Day {index + 1}</p>
                        <p className="text-xs opacity-90">{format(day.date, 'EEEE, MMM d')}</p>
                      </div>
                      {!hasItems && (
                        <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center">
                          <AlertCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  

                  <div className="p-4 space-y-4">
                    <div>
                      <p className="text-xs text-black mb-1">Delivery time</p>
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
                                  className="object-contain"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate text-black">{item.product.name}</p>
                                <p className="text-xs text-black">{item.customization.size} • ₹{item.customization.finalPrice}</p>
                              </div>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeItemFromDay(index, itemIndex);
                                }}
                                className="absolute right-1 top-1 w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center opacity-100 group-hover:opacity-100 transition-opacity"
                                aria-label="Remove item"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-20 flex flex-col items-center justify-center bg-orange-50 rounded-lg border border-red-200">
                        <AlertCircle className="w-5 h-5 text-red-500 mb-1" />
                        <p className="text-xs text-red-600 font-medium">No items added</p>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => handleAddItem(index)}
                      className="w-full flex items-center justify-center p-2 border border-dashed border-orange-300 rounded-lg hover:bg-orange-50 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-1 text-orange-500" />
                      <span className="text-sm text-orange-500">Add item</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="pt-4">
          {!allDaysHaveItems && (
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Complete your schedule</p>
                <p className="text-sm text-gray-600 mt-1">
                  Please add at least one item to each day before confirming your plan.
                </p>
              </div>
            </div>
          )}

         <div className="space-y-3 mb-6">
  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quick actions</p>
  
  <div className="grid grid-cols-1 gap-3">
    <button 
      className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
      onClick={() => setShowTimePicker(-1)}
    >
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="relative flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">Set time for all days</p>
            <p className="text-xs text-white/80">Apply same delivery time</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
      </div>
    </button>

    <button 
    onClick={()=>handleAddItem(-1)}
      className="group relative overflow-hidden bg-white border-2 border-orange-200 text-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-orange-300 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="absolute inset-0 bg-orange-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="relative flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
            <Plus className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm text-gray-800">Copy items to all days</p>
            <p className="text-xs text-gray-500"> Add items to all days</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
      </div>
    </button>
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
              onClick={handleConfirmPlan}
              disabled={!allDaysHaveItems}
              className={`flex-1 py-4 rounded-xl font-semibold shadow-md transition-all ${
                allDaysHaveItems
                  ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Confirm schedule
            </button>
          </div>
        </div>
      </div>
    )}
        </div>
      </div>

      {/* Time Slot Picker Modal */}
      {showTimePicker !== null && (
  <div className="fixed inset-0 bg-black/50 text-black z-40 flex items-end justify-center p-4">
    <div className="bg-white rounded-t-2xl text-black w-full max-w-md animate-slide-up">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="font-semibold text-black">Select delivery time</h3>
        <button 
          onClick={() => setShowTimePicker(null)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-4 max-h-96 overflow-y-auto">
        {/* Setting time for all days when showTimePicker === -1 */}
        {showTimePicker === -1 ? (
          <div className="space-y-4">
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-800">
                  You are setting the delivery time for all the days
                </p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-black mb-2">Morning slots</h4>
              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.filter(slot => slot.type === 'morning').map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => handleTimeSlotChange(showTimePicker, slot.range)}
                    className="p-3 rounded-lg text-left bg-gray-100 hover:bg-gray-200 text-gray-800"
                  >
                    <span className="font-medium">{slot.range}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-black mb-2">Evening slots</h4>
              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.filter(slot => slot.type === 'evening').map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => handleTimeSlotChange(showTimePicker, slot.range)}
                    className="p-3 rounded-lg text-left bg-gray-100 hover:bg-gray-200 text-gray-800"
                  >
                    <span className="font-medium">{slot.range}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : isToday(schedule[showTimePicker]?.date) ? (
          // Show only available slots for today
          <div className="space-y-4">
            {todayTimeSlots.length > 0 ? (
              <>
                <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs text-orange-700">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    Only available time slots for today are shown
                  </p>
                </div>
                
                {todayTimeSlots.filter(slot => slot.type === 'morning').length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-black mb-2">Morning slots</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {todayTimeSlots.filter(slot => slot.type === 'morning').map((slot) => (
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
                )}
                
                {todayTimeSlots.filter(slot => slot.type === 'evening').length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-black mb-2">Evening slots</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {todayTimeSlots.filter(slot => slot.type === 'evening').map((slot) => (
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
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No slots available for today</p>
                <p className="text-xs text-gray-500 mt-1">It's too late to schedule delivery for today</p>
              </div>
            )}
          </div>
        ) : (
          // Show all slots for future days
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-black mb-2">Morning slots</h4>
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
              <h4 className="text-sm font-medium text-black mb-2">Evening slots</h4>
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
        )}
      </div>
    </div>
  </div>
)}

      {renderProductSelectionModal()}
      {renderProductCustomizationModal()}
      {selectedProductForNutrients && (
        <NutrientsModal
          isOpen={showNutrientsModal}
          onClose={closeNutrientsModal}
          productName={selectedProductForNutrients.name}
          regularNutrients={selectedProductForNutrients.regularNutrients || []}
          largeNutrients={selectedProductForNutrients.largeNutrients || []}
        />
      )}
    </div>
  );
}