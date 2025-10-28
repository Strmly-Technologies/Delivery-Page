'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, PlusCircle, ChevronRight, ArrowLeft, Clock } from 'lucide-react';

export default function FreshPlanPage() {
  const router = useRouter();
  const [hasPlan, setHasPlan] = useState<boolean | null>(null);

  // useEffect(() => {
  //   const checkForActivePlan = async () => {
  //     try {
  //       const response = await fetch('/api/freshPlan');
  //       const data = await response.json();
  //       setHasPlan(data.success && !!data.plan);
  //     } catch (error) {
  //       console.error('Error checking for active plan:', error);
  //       setHasPlan(false);
  //     }
  //   };

  //   checkForActivePlan();
  // }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
  <div className="max-w-md mx-auto px-4">
    <div className="py-4 flex items-center justify-between">
      <div className="flex items-center">
        <button 
          onClick={() => router.push('/')}
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center mr-3 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
        <h1 className="text-xl font-bold text-black">FreshPlan</h1>
      </div>
      <Link
        href="/freshplan/orders"
        className="flex items-center px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg transition-colors"
      >
        <Clock className="w-4 h-4 mr-1.5" />
        <span className="text-sm font-medium">View Orders</span>
      </Link>
    </div>
  </div>
</header>

      <div className="max-w-md mx-auto px-4 pt-6 pb-16">
        {/* Intro Section */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Daily Refreshment</h2>
          <p className="text-gray-600">Schedule regular deliveries of your favorite drinks</p>
        </div>

        {/* Cards Section */}
        <div className="space-y-5">
          {/* Current Plan Card */}
          <div className={`rounded-2xl shadow-lg overflow-hidden transition-all duration-300 `}>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center">
                    <CalendarDays className="w-6 h-6 text-white opacity-90 mr-3" />
                    <h3 className="text-xl font-bold text-white">Current FreshPlan</h3>
                  </div>
                  <p className="mt-2 text-blue-100">
                    
                       View and manage your active subscription plan
                        
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <CalendarDays className="w-6 h-6 text-white" />
                </div>
              </div>
              <Link
                href="/my-plans"
                className={`mt-4 inline-flex items-center px-5 py-2.5 rounded-lg ${
                  'bg-white text-blue-600'
                } font-medium`}
              >
                View Plan
                <ChevronRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Create New Plan Card */}
          <div className="rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center">
                    <PlusCircle className="w-6 h-6 text-white opacity-90 mr-3" />
                    <h3 className="text-xl font-bold text-white">Create New Plan</h3>
                  </div>
                  <p className="mt-2 text-orange-100">
                    Set up a new subscription plan with your favorite drinks
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <PlusCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <Link
                href="/create-plan"
                className="mt-4 inline-flex items-center px-5 py-2.5 rounded-lg bg-white text-orange-600 font-medium"
              >
                Start New Plan
                <ChevronRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
          </div>

         
        </div>
      </div>
    </div>
  );
}