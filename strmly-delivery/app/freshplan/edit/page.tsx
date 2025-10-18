'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Clock, Plus, X, ArrowLeft, Save, Trash2 } from 'lucide-react';
import { TIME_SLOTS } from '@/constants/timeSlots';
import Link from 'next/link';
import Image from 'next/image';
import ProductCustomization, { ProductCustomization as CustomizationType } from '@/app/components/product/ProductCustomization';

interface Customization {
  size: string;
  quantity: string;
  ice?: string;
  sugar?: string;
  dilution?: string;
  finalPrice: number;
  orderQuantity?: number;
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
  paymentComplete?: boolean;
}

export default function EditFreshPlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<FreshPlan | null>(null);
  const [schedule, setSchedule] = useState<DailySchedule[]>([]);
  
  const [showTimePicker, setShowTimePicker] = useState<{dayId: string, timeSlot: string} | null>(null);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customization, setCustomization] = useState<CustomizationType | null>(null);
  const [finalPrice, setFinalPrice] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPlan();
  }, []);

  useEffect(() => {
    if (activeDayId !== null) {
      fetchProducts();
    }
  }, [activeDayId]);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/freshPlan');
      const data = await response.json();
      
      if (!data.success || !data.plan) {
        setError('No active plan found');
        router.push('/freshplan');
        return;
      }

      setPlan(data.plan);
      setSchedule(data.plan.schedule);
    } catch (error) {
      console.error('Error fetching plan:', error);
      setError('Failed to load your plan');
    } finally {
      setLoading(false);
    }
  };

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

  const handleTimeSlotChange = (dayId: string, timeSlot: string) => {
    const updatedSchedule = schedule.map(day => {
      if (day._id === dayId) {
        // Update all items in this day with the new time slot
        const updatedItems = day.items.map(item => ({
          ...item,
          timeSlot: timeSlot
        }));
        
        return {
          ...day,
          items: updatedItems
        };
      }
      return day;
    });
    
    setSchedule(updatedSchedule);
    setShowTimePicker(null);
  };

  const handleAddItem = (dayId: string) => {
    setActiveDayId(dayId);
  };
  
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
  };
  
  const handleCustomizationChange = (custom: CustomizationType, price: number) => {
    setCustomization(custom);
    setFinalPrice(price);
  };
  
  const closeProductSelection = () => {
    setActiveDayId(null);
  };
  
  const closeProductCustomization = () => {
    setSelectedProduct(null);
    setCustomization(null);
  };

  const removeItemFromDay = (dayId: string, itemId: string) => {
    const updatedSchedule = schedule.map(day => {
      if (day._id === dayId) {
        return {
          ...day,
          items: day.items.filter(item => item._id !== itemId)
        };
      }
      return day;
    });
    
    setSchedule(updatedSchedule);
  };
  
  const addProductToDay = () => {
    if (!selectedProduct || !customization || !activeDayId) return;
    
    const updatedSchedule = schedule.map(day => {
      if (day._id === activeDayId) {
        const activeDay = schedule.find(d => d._id === activeDayId);
        const timeSlot = activeDay?.items[0]?.timeSlot || TIME_SLOTS[2].range;
        
        const newItem: PlanItem = {
          product: selectedProduct,
          customization: {
            ...customization,
            finalPrice: finalPrice
          },
          quantity: customization.orderQuantity || 1,
          timeSlot: timeSlot,
          _id: `temp-${Date.now()}`
        };
        
        return {
          ...day,
          items: [...day.items, newItem]
        };
      }
      return day;
    });
    
    setSchedule(updatedSchedule);
    closeProductCustomization();
  };

  const handleSavePlan = async () => {
    try {
      setSaving(true);
      
      // Ensure we have the original plan data to maintain days and startDate
      if (!plan) {
        throw new Error('No plan data available');
      }
      
      const updatedPlan = {
        days: plan.days,
        startDate: plan.startDate,
        schedule: schedule.map(day => ({
          _id: day._id,
          date: day.date,
          items: day.items.map(item => ({
            _id: item._id.startsWith('temp-') ? undefined : item._id,
            product: item.product._id,
            quantity: item.quantity,
            timeSlot: item.timeSlot,
            customization: item.customization
          }))
        }))
      };
      
      const response = await fetch('/api/freshPlan/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPlan)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update plan');
      }
      
      setSuccess('Plan updated successfully!');
      
      // Redirect after a short delay to show the success message
      setTimeout(() => {
        router.push('/current-plan');
      }, 1500);
      
    } catch (error) {
      console.error("Error updating plan:", error);
      setError(error instanceof Error ? error.message : 'Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  // Product Selection Modal
  const renderProductSelectionModal = () => {
    if (!activeDayId) return null;
    
    const activeDay = schedule.find(day => day._id === activeDayId);
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex flex-col">
        <div className="bg-white rounded-t-2xl p-5 flex items-center justify-between shadow-md">
          <div>
            <h3 className="font-bold text-xl text-black">Add Item</h3>
            <p className="text-sm text-black/70">
              {activeDay ? format(new Date(activeDay.date), 'EEEE, MMM d') : 'Select a product'}
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

  // Product Customization Modal
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
            {customization ? 'Add to Plan' : 'Select Options'}
          </button>
        </div>
      </div>
    );
  };

  // Time Slot Picker Modal
  const renderTimePickerModal = () => {
    if (!showTimePicker) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 z-40 flex items-end justify-center p-4">
        <div className="bg-white rounded-t-2xl w-full max-w-md animate-slide-up">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="font-semibold text-black">Select Delivery Time</h3>
            <button 
              onClick={() => setShowTimePicker(null)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5 text-black" />
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
                      onClick={() => handleTimeSlotChange(showTimePicker.dayId, slot.range)}
                      className={`p-3 rounded-lg text-left ${
                        showTimePicker.timeSlot === slot.range
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
                <h4 className="text-sm font-medium text-black mb-2">Evening Slots</h4>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_SLOTS.filter(slot => slot.type === 'evening').map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => handleTimeSlotChange(showTimePicker.dayId, slot.range)}
                      className={`p-3 rounded-lg text-left ${
                        showTimePicker.timeSlot === slot.range
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
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your plan...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-6 text-center max-w-sm">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Plan</h2>
          <p className="text-gray-600 mb-6">You don't have an active FreshPlan to edit.</p>
          <Link
            href="/create-plan"
            className="block w-full py-3 bg-orange-500 text-white font-semibold rounded-lg"
          >
            Create New Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 pb-16">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={() => router.push('/current-plan')}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center mr-3 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-black" />
              </button>
              <h1 className="text-xl font-bold text-black">Edit FreshPlan</h1>
            </div>
            <button
              onClick={handleSavePlan}
              disabled={saving}
              className={`flex items-center px-3 py-1.5 rounded-lg ${
                saving ? 'bg-gray-200 text-gray-500' : 'bg-orange-100 text-orange-600'
              }`}
            >
              <Save className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">{saving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Alerts */}
      {error && (
        <div className="max-w-md mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}
      
      {success && (
        <div className="max-w-md mx-auto px-4 mt-4">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        </div>
      )}

      {/* Plan Summary */}
      <div className="max-w-md mx-auto px-4 pt-4">
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">FreshPlan Summary</h2>
            <span className="text-sm font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
              {plan.days} Days
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Started on {format(new Date(plan.startDate), 'MMM d, yyyy')}
          </p>
        </div>
      </div>
      
      {/* Days List */}
      <div className="max-w-md mx-auto px-4">
        <div className="space-y-5">
          {schedule.map((day) => {
            const dayDate = new Date(day.date);
            const timeSlot = day.items[0]?.timeSlot || TIME_SLOTS[2].range;
            
            return (
              <div key={day._id} className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-orange-500 text-white py-3 px-4">
                  <p className="font-semibold">{format(dayDate, 'EEEE')}</p>
                  <p className="text-xs opacity-90">{format(dayDate, 'MMMM d')}</p>
                </div>
                
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-xs text-black mb-1">Delivery Time</p>
                    <button
                      onClick={() => setShowTimePicker({ dayId: day._id, timeSlot })}
                      className="flex items-center justify-between w-full p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-orange-500" />
                        <span className="text-sm text-black">{timeSlot}</span>
                      </span>
                      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                        Edit
                      </span>
                    </button>
                  </div>
                  
                  {/* Items List */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-black">Items ({day.items.length})</p>
                      <button
                        onClick={() => handleAddItem(day._id)}
                        className="text-xs text-orange-600 font-medium flex items-center"
                      >
                        <Plus className="w-3 h-3 mr-0.5" />
                        Add
                      </button>
                    </div>
                    
                    {day.items.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {day.items.map((item) => (
                          <div 
                            key={item._id}
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
                            
                            <button
                              onClick={() => removeItemFromDay(day._id, item._id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-all"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-20 flex flex-col items-center justify-center bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-400 mb-2">No items added yet</p>
                        <button
                          onClick={() => handleAddItem(day._id)}
                          className="text-xs bg-orange-100 text-orange-600 px-3 py-1 rounded-full font-medium flex items-center"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Item
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Save Button - Duplicate at bottom for convenience */}
        <div className="mt-8">
          <button
            onClick={handleSavePlan}
            disabled={saving}
            className={`w-full py-4 rounded-xl font-semibold ${
              saving 
                ? 'bg-gray-300 text-gray-500'
                : 'bg-orange-500 text-white shadow-md hover:bg-orange-600 transition-colors'
            }`}
          >
            {saving ? 'Saving Changes...' : 'Save Changes'}
          </button>
          
          <button
            onClick={() => router.push('/current-plan')}
            className="w-full py-3 mt-3 text-gray-600 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Modals */}
      {renderProductSelectionModal()}
      {renderProductCustomizationModal()}
      {renderTimePickerModal()}
    </div>
  );
}