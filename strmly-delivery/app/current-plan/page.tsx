'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Clock, CalendarDays, Package, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProductCustomization, { ProductCustomization as CustomizationType } from '@/app/components/product/ProductCustomization';


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
  description: string;
  price: number;
  category: 'juices' | 'shakes';
  image: string;
  stock: number;
  smallPrice?: number;
  mediumPrice?: number;
}

interface PlanItem {
  product: Product;
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

interface PlanResponse {
  success: boolean;
  plan: FreshPlan | null;
}

export default function CurrentPlanPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<FreshPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlan();
  }, []);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/freshPlan');
      const data: PlanResponse = await response.json();
      
      if (data.success && data.plan) {
        setPlan(data.plan);
      } else {
        setError('No active subscription plan found');
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
      setError('Failed to load your subscription plan');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayId: string) => {
    if (expandedDay === dayId) {
      setExpandedDay(null);
    } else {
      setExpandedDay(dayId);
    }
  };

  const calculateDayTotal = (items: PlanItem[]) => {
    return items.reduce((total, item) => total + item.customization.finalPrice, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-t-orange-500 border-gray-200 animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading your subscription plan...</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-orange-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">No Active Plan</h1>
            <p className="text-gray-600 mb-6">You don't have an active FreshPlan subscription</p>
            <Link 
              href="/freshplan" 
              className="px-6 py-3 bg-orange-500 text-black font-medium rounded-lg hover:bg-orange-600 shadow-md transition-colors"
            >
              Create New Plan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const startDate = new Date(plan.startDate);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4">
          <div className="py-4 flex items-center">
            <button 
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg hover:bg-gray-100 mr-2"
            >
              <ArrowLeft className="w-5 h-5 text-black" />
            </button>
            <h1 className="text-xl text-black font-bold">Current Plan</h1>
          </div>
        </div>
      </header>

      {/* Plan Summary */}
      <div className="max-w-lg mx-auto px-4 pt-6 pb-3">
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl shadow-lg p-5 text-white">
          <h2 className="text-lg font-bold">FreshPlan Subscription</h2>
          <div className="flex items-center mt-2 space-x-2 opacity-90">
            <CalendarDays className="w-4 h-4" />
            <p className="text-sm">
              {plan.days} Days • Started on {format(startDate, 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      </div>

      {/* Days List */}
      <div className="max-w-lg mx-auto px-4 pb-8">
        <div className="space-y-3">
          {plan.schedule.map((day, index) => {
            const dayDate = new Date(day.date);
            const dayTotal = calculateDayTotal(day.items);
            const isExpanded = expandedDay === day._id;
            const isToday = new Date().toDateString() === dayDate.toDateString();
            const isPast = dayDate < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <div 
                key={day._id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'shadow-md' : ''
                }`}
              >
                {/* Day Header - Always visible */}
                <div 
                  onClick={() => toggleDay(day._id)}
                  className={`p-4 flex items-center justify-between cursor-pointer ${
                    isPast ? 'bg-gray-50' : isToday ? 'bg-orange-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                      isPast ? 'bg-gray-200 text-gray-600' : 
                      isToday ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600'
                    }`}>
                      <span className="font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className={`font-semibold ${
                        isPast ? 'text-gray-500' : 'text-gray-900'
                      }`}>
                        {format(dayDate, 'EEEE')}
                        {isToday && <span className="ml-2 text-xs bg-orange-500 text-white py-0.5 px-2 rounded-full">Today</span>}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {format(dayDate, 'MMM d')} • {day.items[0]?.timeSlot}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="text-right mr-3">
                      <p className={`font-semibold ${
                        isPast ? 'text-gray-500' : 'text-gray-900'
                      }`}>
                        ₹{dayTotal}
                      </p>
                      <p className="text-xs text-gray-500">{day.items.length} items</p>
                    </div>
                    {isExpanded ? 
                      <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    }
                  </div>
                </div>

                {/* Expanded Content - Visible when expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-4 bg-white">
                    <div className="flex items-center mb-3">
                      <Clock className="w-4 h-4 text-gray-500 mr-1" />
                      <span className="text-sm text-gray-600">
                        Delivery Time: <span className="font-medium">{day.items[0]?.timeSlot}</span>
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {day.items.map((item) => (
                        <div key={item._id} className="flex items-center space-x-3">
                          <div className="relative w-16 h-16 flex-shrink-0">
                            <Image
                              src={item.product.image}
                              alt={item.product.name}
                              fill
                              className="object-cover rounded-lg"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                            <p className="text-sm text-gray-500">
                              {item.customization.size} • {item.customization.quantity}
                              {item.customization.ice && ` • ${item.customization.ice}`}
                              {item.customization.sugar && ` • ${item.customization.sugar}`}
                            </p>
                            <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-medium text-gray-900">₹{item.customization.finalPrice}</p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between pt-3 border-t border-gray-100">
                      <span className="font-medium text-gray-700">Day Total</span>
                      <span className="font-bold text-gray-900">₹{dayTotal}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}