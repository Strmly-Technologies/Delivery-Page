'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Apple } from 'lucide-react';

interface NutrientInfo {
  name: string;
  amount: string;
  unit: string;
}

interface NutrientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  regularNutrients: NutrientInfo[];
  largeNutrients: NutrientInfo[];
}

export default function NutrientsModal({
  isOpen,
  onClose,
  productName,
  regularNutrients,
  largeNutrients
}: NutrientsModalProps) {
  const [selectedSize, setSelectedSize] = useState<'regular' | 'large'>('regular');
  
  const currentNutrients = selectedSize === 'regular' ? regularNutrients : largeNutrients;
  const hasNutrients = currentNutrients && currentNutrients.length > 0;

  return (
    <Transition appear show={isOpen} as={Fragment}>
  <Dialog as="div" className="relative z-50" onClose={onClose}>
    <Transition.Child
      as={Fragment}
      enter="ease-out duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="ease-in duration-200"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
    </Transition.Child>

    <div className="fixed inset-0 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center sm:items-center p-4">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enterTo="opacity-100 translate-y-0 sm:scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 translate-y-0 sm:scale-100"
          leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-t-3xl sm:rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                      <Apple className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-lg font-bold text-gray-900">
                        Nutritional Information
                      </Dialog.Title>
                      <p className="text-sm text-gray-600">{productName}</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition rounded-full p-2 hover:bg-white/50"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Size Toggle */}
                <div className="px-6 pt-4">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setSelectedSize('regular')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                        selectedSize === 'regular'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Regular (300mL)
                    </button>
                    <button
                      onClick={() => setSelectedSize('large')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                        selectedSize === 'large'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Large (500mL)
                    </button>
                  </div>
                </div>

                {/* Nutrients Table */}
                <div className="px-6 py-4">
                  {hasNutrients ? (
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-black text-xs font-semibold text-blackuppercase tracking-wider">
                              Nutrient
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-black uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentNutrients.map((nutrient, index) => (
                            <tr key={index} className="hover:bg-orange-50 transition-colors">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {nutrient.name}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-right font-semibold">
                                {nutrient.amount} {nutrient.unit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Apple className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">
                        No nutritional information available for this size
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Note */}
                <div className="px-6 pb-4">
                  <p className="text-xs text-gray-500 text-center">
                    * Values are approximate and may vary based on preparation
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}