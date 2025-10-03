'use client';

import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import ProductCustomization, { ProductCustomization as CustomizationType } from './ProductCustomization';

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
    largePrice?: number;
}

interface ProductCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAddToCart: (productId: string, customization: CustomizationType, finalPrice: number) => Promise<void>;
}

export default function ProductCustomizationModal({
  isOpen,
  onClose,
  product,
  onAddToCart
}: ProductCustomizationModalProps) {
  const [customization, setCustomization] = React.useState<CustomizationType | null>(null);
  const [finalPrice, setFinalPrice] = React.useState(0);
  const [isAdding, setIsAdding] = React.useState(false);

  const handleCustomizationChange = (custom: CustomizationType, price: number) => {
    setCustomization(custom);
    setFinalPrice(price);
  };

  const handleAddToCart = async () => {
    if (!product || !customization) return;
    
    setIsAdding(true);
    try {
      await onAddToCart(product._id, customization, finalPrice);
      onClose();
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  if (!product) return null;

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
          <div className="fixed inset-0 bg-black bg-opacity-40" />
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
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold text-gray-900"
                    >
                      Customize Your Order
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 mt-1">{product.name}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 transition"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Customization Options */}
                <div className="px-6 max-h-[60vh] overflow-y-auto">
                  <ProductCustomization
                    category={product.category}
                    smallPrice={product.smallPrice ?? 0}
                    mediumPrice={product.mediumPrice ?? 0}
                    largePrice={product.largePrice ?? 0}
                    onCustomizationChange={handleCustomizationChange}
                  />
                </div>

                {/* Footer with Add to Cart Button */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={handleAddToCart}
                    disabled={isAdding || !customization}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition shadow-md hover:shadow-lg"
                  >
                    {isAdding ? 'Adding to Cart...' : 'Add to Cart'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}