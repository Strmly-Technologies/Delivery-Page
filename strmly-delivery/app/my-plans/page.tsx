'use client';

import { useState, useEffect } from 'react';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import { ChevronDown, ChevronUp, Clock, CalendarDays, Package, ArrowLeft, Calendar, ChevronRight, CalendarCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Customization {
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
  price: number;
  image: string;
  category: string;
}

interface PlanItem {
  product: Product;
  customization: Customization;
  quantity: number;
  timeSlot: string;
}

interface DailySchedule {
  date: string;
  _id: string;
  items: PlanItem[];
}

interface FreshPlan {
  isActive: boolean;
  days: number;
  startDate: string;
  schedule: DailySchedule[];
  createdAt: string;
  paymentComplete: boolean;
  _id: string;
}

interface PlanResponse {
  success: boolean;
  plan: FreshPlan | null;
  upcomingPlans: FreshPlan[];
  hasPlans: boolean;
  error?: string;
}

export default function CurrentPlanPage() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<FreshPlan | null>(null);
  const [upcomingPlans, setUpcomingPlans] = useState<FreshPlan[]>([]);
  const [completedPlans, setCompletedPlans] = useState<FreshPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [expandedPlanDays, setExpandedPlanDays] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPlans();
  }, []);
  
  const fetchPlans = async () => {
  try {
    setLoading(true);
    const date = new Date().toISOString();
    const response = await fetch(`/api/freshPlan/${date}`);
    const data = await response.json();
    
    if (!data.success) {
      setError(data.error || 'Failed to fetch plans');
      return;
    }

    // Set all plans from the response
    if (data.plans && data.plans.length > 0) {
      setUpcomingPlans(data.plans);
    }
    
  } catch (error) {
    console.error('Error fetching plans:', error);
    setError('Failed to load your subscription plans');
  } finally {
    setLoading(false);
  }
};

const fetchCompletedPlans = async () => {
  try {
    // Use your actual completed plans endpoint
    const response = await fetch('/api/freshPlan/complete');
    const data = await response.json();
    
    if (data.success) {
      setCompletedPlans(data.plans || []);
    }
  } catch (error) {
    console.error('Error fetching completed plans:', error);
  }
};

  const toggleDay = (dayId: string) => {
    if (expandedDay === dayId) {
      setExpandedDay(null);
    } else {
      setExpandedDay(dayId);
    }
  };
  
  const togglePlanDay = (planId: string, dayId: string) => {
    const key = `${planId}-${dayId}`;
    setExpandedPlanDays(prev => ({
      ...prev,
      [key]: prev[key] ? '' : dayId
    }));
  };

  const calculateDayTotal = (items: PlanItem[]) => {
    return items.reduce((total, item) => total + item.customization.finalPrice, 0);
  };
  
  const cancelPlan = async (planId: string) => {
    if (!confirm('Are you sure you want to cancel this plan?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/freshPlan?planId=${planId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Refresh plans after cancellation
        fetchPlans();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel plan');
      }
    } catch (error) {
      console.error('Error cancelling plan:', error);
      alert(error instanceof Error ? error.message : 'Failed to cancel plan');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your plan...</p>
        </div>
      </div>
    );
  }

  if (error || (!currentPlan && upcomingPlans.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No active plans</h2>
          <p className="text-gray-600 mb-6">You don't have any active or upcoming FreshPlan subscriptions.</p>
          <Link 
            href="/freshplan" 
            className="px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 shadow-md transition-colors inline-block"
          >
            Explore freshplan
          </Link>
        </div>
      </div>
    );
  }

 return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4">
          <div className="py-4 flex items-center">
            <button 
              onClick={() => router.push('/freshplan')}
              className="p-2 rounded-lg hover:bg-gray-100 mr-2 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-black" />
            </button>
            <h1 className="text-xl text-black font-bold">My plans</h1>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
      
        {upcomingPlans.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <CalendarCheck className="w-5 h-5 text-orange-500 mr-2" />
              <h2 className="text-lg text-black font-semibold">My plans</h2>
            </div>
            
            <div className="space-y-4">
              {upcomingPlans.map((plan, planIndex) => {
                const planStartDate = new Date(plan.startDate);
                const planEndDate = addDays(planStartDate, plan.days - 1);
                
                return (
                  <div 
                    key={planIndex} 
                    className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <h3 className="text-lg font-bold text-white">FreshPlan #{planIndex + 1}</h3>
                            {!plan.paymentComplete && (
                              <span className="ml-2 bg-yellow-400 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-medium">
                                Payment pending
                              </span>
                            )}
                          </div>
                          <p className="text-orange-100 text-sm flex items-center mt-1">
                            <Calendar className="w-3.5 h-3.5 mr-1.5" />
                            {plan.days} Days • {format(planStartDate, 'MMM d')} - {format(planEndDate, 'MMM d, yyyy')}
                          </p>
                        </div>
                        
                      </div>
                      
                      {/* Days preview */}
                      <div className="mt-4 space-y-2">
                        {plan.schedule.slice(0, 3).map((day, dayIndex) => (
                          <div 
                            key={dayIndex}
                            className="bg-white/15 hover:bg-white/20 rounded-lg p-2.5 cursor-pointer transition-colors"
                            onClick={() => togglePlanDay(plan._id, day._id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3 shadow-inner">
                                  <span className="text-sm font-bold text-white">
                                    {format(new Date(day.date), 'd')}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">
                                    {format(new Date(day.date), 'EEEE')}
                                  </p>
                                  <p className="text-xs text-orange-100 flex items-center">
                                    <Package className="w-3 h-3 mr-1" />
                                    {day.items.length} {day.items.length === 1 ? 'item' : 'items'}
                                  </p>
                                </div>
                              </div>
                              <div className="bg-white/10 rounded-full p-1">
                                {expandedPlanDays[`${plan._id}-${day._id}`] ? (
                                  <ChevronUp className="w-4 h-4 text-white" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-white" />
                                )}
                              </div>
                            </div>
                            
                            {expandedPlanDays[`${plan._id}-${day._id}`] && (
                              <div className="mt-3 space-y-2 ">
                                {day.items.map((item, itemIndex) => (
                                  <div 
                                    key={itemIndex} 
                                    className="flex items-center bg-white/10 p-2.5 rounded-lg"
                                  >
                                    <div className="relative w-10 h-10 flex-shrink-0 rounded-md overflow-hidden shadow-sm">
                                      <Image 
                                        src={item.product.image} 
                                        alt={item.product.name}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                    <div className="ml-3 flex-1 min-w-0">
                                      <p className="text-sm font-medium text-white truncate">
                                        {item.product.name}
                                      </p>
                                      <div className="flex items-center text-xs text-orange-200 mt-0.5">
                                        <Clock className="w-3 h-3 mr-1" />
                                        <span>{item.timeSlot}</span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-white">
                                        ₹{item.customization.finalPrice}
                                      </p>
                                      {item.customization.size && (
                                        <p className="text-xs text-orange-200">
                                          {item.customization.size}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                <div className="flex justify-end pt-1 border-t border-white/10">
                                  <p className="text-sm font-semibold text-white">
                                    Total: ₹{calculateDayTotal(day.items)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {plan.schedule.length > 3 && (
                          <div className="flex items-center justify-center text-xs text-orange-100 py-2 bg-white/10 rounded-lg">
                            <span>+{plan.schedule.length - 3} more days</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </div>
                        )}
                      </div>
                      

                {!plan.paymentComplete  && (
                  <div className="mt-4 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        href={`/checkout?type=freshplan&planId=${plan._id}`}
                        className="bg-white text-orange-600 text-center py-2.5 rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors shadow"
                      >
                        Complete payment
                      </Link>
                      <Link
                        href={`/freshplan/edit?planId=${plan._id}`}
                        className="bg-white/20 text-white text-center py-2.5 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors border border-white/30"
                      >
                        Edit plan
                      </Link>
                    </div>
                    <button
                      onClick={() => cancelPlan(plan._id)}
                      className="w-full cursor-pointer py-2.5 rounded-lg text-sm font-medium bg-red-500/90 hover:bg-red-500 text-white transition-colors shadow flex items-center justify-center"
                    >
                      <svg 
                        className="w-4 h-4 mr-1.5" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                        />
                      </svg>
                      Cancel plan
                    </button>
                  </div>
                )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Completed Plans */}
        {completedPlans.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <CalendarDays className="w-5 h-5 text-gray-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-800">Past plans</h2>
            </div>
            <div className="space-y-3">
              {completedPlans.map((plan, planIndex) => {
                const planStartDate = new Date(plan.startDate);
                const planEndDate = addDays(planStartDate, plan.days - 1);
                
                return (
                  <div 
                    key={planIndex} 
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 border border-gray-100"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-gray-900 flex items-center">
                          <Calendar className="w-4 h-4 text-orange-500 mr-1.5" />
                          {format(planStartDate, 'MMM d')} - {format(planEndDate, 'MMM d, yyyy')}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <CalendarDays className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                          {plan.days} days • {plan.schedule.length} deliveries
                        </p>
                      </div>
                      <Link
                        href={`/order-history?planId=${plan._id}`}
                        className="flex items-center text-orange-500 hover:text-orange-600 text-sm font-medium bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        View Details
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Create New Plan Button */}
        <div className="mt-8 flex flex-col items-center">
          <Link 
            href="/create-plan" 
            className="inline-block px-8 py-3.5 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 shadow-md transition-colors"
          >
            Create New Plan
          </Link>
          {currentPlan && (
            <p className="mt-3 text-sm text-gray-500 flex items-center">
              <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
              Your current plan ends on {format(addDays(new Date(currentPlan.startDate), currentPlan.days - 1), 'MMMM d, yyyy')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}