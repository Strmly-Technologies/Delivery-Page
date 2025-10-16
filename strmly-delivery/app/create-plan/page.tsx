'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, isToday, isTomorrow, isAfter } from 'date-fns';
import { ChevronRight, Calendar, Clock, Plus, X, ArrowLeft, Minus } from 'lucide-react';
import { TIME_SLOTS } from '@/constants/timeSlots';
import Link from 'next/link';
import Image from 'next/image';

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

export default function FreshPlanPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<'duration' | 'start-date' | 'schedule'>('duration');
  const [duration, setDuration] = useState<number>(7);
  const [startDate, setStartDate] = useState<Date>(addDays(new Date(), 1));
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [animate, setAnimate] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<number | null>(null);
  const [canStartToday, setCanStartToday] = useState(false);

  // Check if we can start today based on current time
  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours();
    setCanStartToday(currentHour < 18);
  }, []);

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

  const handleConfirmPlan = () => {
    // Here you would save the plan and navigate
    console.log("Final plan:", { duration, startDate, schedule });
    router.push('/current-plan');
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
              <h1 className="text-xl font-bold text-gray-900">Create FreshPlan</h1>
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
                      className="flex-shrink-0 w-56 bg-white rounded-xl shadow-md overflow-hidden"
                    >
                      <div className="bg-orange-500 text-white py-2 px-4">
                        <p className="font-semibold">Day {index + 1}</p>
                        <p className="text-xs opacity-90">{format(day.date, 'EEEE, MMM d')}</p>
                      </div>
                      
                      <div className="p-4 space-y-4">
                        <div>
                          <p className="text-xs  text-black mb-1">Delivery Time</p>
                          <button
                            onClick={() => setShowTimePicker(index)}
                            className="flex items-center justify-between w-full p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-2 text-orange-500" />
                              <span className="text-sm  text-black">{day.timeSlot}</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                        
                        <button className="w-full flex items-center justify-center p-2 border border-dashed border-orange-300 rounded-lg hover:bg-orange-50 transition-colors">
                          <Plus className="w-4 h-4 mr-1 text-orange-500" />
                          <span className="text-sm text-orange-500">Add Item</span>
                        </button>
                        
                        <div className="h-24 flex items-center justify-center">
                          <p className="text-xs text-gray-400">No items added yet</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-4">
                <p className="text-center text-sm text-gray-600 mb-4">
                  You can add items after confirming your schedule
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
    </div>
  );
}