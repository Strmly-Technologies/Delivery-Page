'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, X } from 'lucide-react';

interface CartItem {
  product: {
    _id: string;
    name: string;
    image: string;
  };
  quantity: number;
  price: number;
}

interface ViewCartSliderProps {
  show: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  totalItems: number;
}

export default function ViewCartSlider({
  show,
  onClose,
  cartItems,
  totalItems
}: ViewCartSliderProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }
  }, [show]);

  if (!show) return null;

  // Show max 2 items
  const displayItems = cartItems.slice(0, 2);

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transform transition-all duration-500 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
    >
      <div className="relative">
        {/* Close Button */}
       

        {/* Compact Cart Preview - Orange Theme */}
        <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-full shadow-2xl px-5 py-3 flex items-center gap-3">
          {/* Product Images Circle */}
          <div className="flex items-center justify-center bg-white rounded-full p-2 shadow-lg">
            <div className="flex items-center -space-x-2">
              {displayItems.map((item, index) => (
                <div
                  key={`${item.product._id}-${index}`}
                  className="relative w-8 h-8 rounded-full bg-white border-2 border-white shadow-md overflow-hidden ring-2 ring-orange-300"
                  style={{ zIndex: displayItems.length - index }}
                >
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* View Cart Text & Arrow */}
          <Link
            href="/cart"
            className="flex items-center gap-2 group"
            onClick={onClose}
          >
            <div className="flex flex-col">
              <span className="text-white font-bold text-base leading-tight">
                View cart
              </span>
             
            </div>
            
            <div className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-all duration-200 group-hover:translate-x-1">
              <ChevronRight className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}