'use client';

import React, { useState, useEffect } from 'react';
import { RadioGroup } from '@headlessui/react';

interface SizeOption {
  name: string;
  quantity: string;
  priceAdjustment: number;
}

interface ProductCustomizationProps {
  category: string;
  smallPrice: number;
  mediumPrice: number;
  largePrice: number;
  onCustomizationChange: (customization: ProductCustomization, finalPrice: number) => void;
}

export interface ProductCustomization {
  size: string;
  quantity: string;
  orderQuantity?: number;
  ice?: string;
  sugar?: string;
  dilution?: string;
  finalPrice: number;
}

const ProductCustomization: React.FC<ProductCustomizationProps> = ({
  category,
  smallPrice,
  mediumPrice,
  largePrice,
  onCustomizationChange
}) => {
  const isJuice = category.toLowerCase() === 'juices';
  const isShake = category.toLowerCase() === 'shakes';

  // Size options with corresponding quantities and price adjustments
  const sizeOptions: SizeOption[] = [
    { name: 'Small', quantity: '250mL', priceAdjustment: smallPrice },
    { name: 'Medium', quantity: '350mL', priceAdjustment: mediumPrice },
    { name: 'Large', quantity: '500mL', priceAdjustment: largePrice },
  ];

  const iceOptions = ['No Ice', 'Less Ice', 'Normal Ice', 'More Ice'];
  const sugarOptions = ['No Sugar', 'Less Sugar', 'Normal Sugar'];
  const dilutionOptions = ['Normal', 'Concentrated', 'Diluted'];

  // Default selections
  const [selectedSize, setSelectedSize] = useState<SizeOption>(sizeOptions[1]); // Medium by default
  const [selectedIce, setSelectedIce] = useState(iceOptions[2]); // Normal Ice by default
  const [selectedSugar, setSelectedSugar] = useState(sugarOptions[2]); // Normal Sugar by default
  const [selectedDilution, setSelectedDilution] = useState(dilutionOptions[0]); // Normal by default
  const [orderQuantity, setOrderQuantity] = useState(1);


  // Calculate final price based on selections
 const calculateFinalPrice = () => {
  return (selectedSize.priceAdjustment) * orderQuantity;
};

  // Update parent component when selections change
 useEffect(() => {
  const customization: ProductCustomization = {
    size: selectedSize.name,
    quantity: selectedSize.quantity,
    orderQuantity: orderQuantity, 
    finalPrice: calculateFinalPrice()
  };

    if (isJuice) {
      customization.ice = selectedIce;
    }

    if (isShake) {
      customization.ice = selectedIce;
      customization.sugar = selectedSugar;
      customization.dilution = selectedDilution;
    }

   onCustomizationChange(customization, calculateFinalPrice());
}, [selectedSize, selectedIce, selectedSugar, selectedDilution, orderQuantity]); 

  return (
    <div className="space-y-6 py-4">
      {/* Size Selection */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Size</h3>
        <RadioGroup value={selectedSize} onChange={setSelectedSize}>
          <div className="grid grid-cols-3 gap-3">
            {sizeOptions.map((option) => (
              <RadioGroup.Option
                key={option.name}
                value={option}
                className={({ active, checked }) =>
                  `${
                    active
                      ? 'ring-2 ring-orange-500'
                      : ''
                  }
                  ${
                    checked
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }
                    relative flex cursor-pointer rounded-lg px-4 py-3 shadow-sm focus:outline-none`
                }
              >
                {({ checked }) => (
                  <div className="flex flex-col w-full text-center">
                    <RadioGroup.Label
                      as="p"
                      className={`font-medium ${
                        checked ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {option.name}
                    </RadioGroup.Label>
                    <RadioGroup.Description
                      as="span"
                      className={`text-sm ${
                        checked ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {option.quantity}
                    </RadioGroup.Description>
                    <RadioGroup.Description
                      as="span"
                      className={`text-sm ${
                        checked ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {option.priceAdjustment === 0 
                        ? `₹${smallPrice}`
                        : option.priceAdjustment > 0 
                          ? `₹${ option.priceAdjustment} `
                          : `₹${ option.priceAdjustment} `
                      }
                    </RadioGroup.Description>
                  </div>
                )}
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* Ice Options - Available for both Juices and Shakes */}
      {(isJuice || isShake) && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Ice Preference</h3>
          <RadioGroup value={selectedIce} onChange={setSelectedIce}>
            <div className="grid grid-cols-2 gap-2">
              {iceOptions.map((option) => (
                <RadioGroup.Option
                  key={option}
                  value={option}
                  className={({ active, checked }) =>
                    `${
                      active
                        ? 'ring-2 ring-orange-500'
                        : ''
                    }
                    ${
                      checked
                        ? 'bg-orange-100 border-orange-500 text-orange-800'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }
                      relative flex cursor-pointer rounded-lg px-3 py-2 border focus:outline-none`
                  }
                >
                  {({ checked }) => (
                    <div className="flex items-center justify-center w-full">
                      <RadioGroup.Label
                        as="p"
                        className={`font-medium text-sm ${
                          checked ? 'text-orange-800' : 'text-gray-700'
                        }`}
                      >
                        {option}
                      </RadioGroup.Label>
                    </div>
                  )}
                </RadioGroup.Option>
              ))}
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Sugar Options - Only for Shakes */}
      {isShake && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Sugar Level</h3>
          <RadioGroup value={selectedSugar} onChange={setSelectedSugar}>
            <div className="grid grid-cols-3 gap-2">
              {sugarOptions.map((option) => (
                <RadioGroup.Option
                  key={option}
                  value={option}
                  className={({ active, checked }) =>
                    `${
                      active
                        ? 'ring-2 ring-orange-500'
                        : ''
                    }
                    ${
                      checked
                        ? 'bg-orange-100 border-orange-500 text-orange-800'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }
                      relative flex cursor-pointer rounded-lg px-3 py-2 border focus:outline-none`
                  }
                >
                  {({ checked }) => (
                    <div className="flex items-center justify-center w-full">
                      <RadioGroup.Label
                        as="p"
                        className={`font-medium text-sm ${
                          checked ? 'text-orange-800' : 'text-gray-700'
                        }`}
                      >
                        {option}
                      </RadioGroup.Label>
                    </div>
                  )}
                </RadioGroup.Option>
              ))}
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Dilution Options - Only for Shakes */}
      {isShake && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Dilution</h3>
          <RadioGroup value={selectedDilution} onChange={setSelectedDilution}>
            <div className="grid grid-cols-3 gap-2">
              {dilutionOptions.map((option) => (
                <RadioGroup.Option
                  key={option}
                  value={option}
                  className={({ active, checked }) =>
                    `${
                      active
                        ? 'ring-2 ring-orange-500'
                        : ''
                    }
                    ${
                      checked
                        ? 'bg-orange-100 border-orange-500 text-orange-800'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }
                      relative flex cursor-pointer rounded-lg px-3 py-2 border focus:outline-none`
                  }
                >
                  {({ checked }) => (
                    <div className="flex items-center justify-center w-full">
                      <RadioGroup.Label
                        as="p"
                        className={`font-medium text-sm ${
                          checked ? 'text-orange-800' : 'text-gray-700'
                        }`}
                      >
                        {option}
                      </RadioGroup.Label>
                    </div>
                  )}
                </RadioGroup.Option>
              ))}
            </div>
          </RadioGroup>
        </div>
      )}
      {/* Quantity Selector */}
<div className="flex items-center space-x-4 py-4">
  <h3 className="text-sm font-medium text-gray-900">Quantity:</h3>
  <div className="flex items-center border border-gray-200 rounded">
    <button
      type="button"
      onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
      className="px-3 py-1 text-gray-600 hover:text-orange-500 focus:outline-none"
    >
      -
    </button>
    <span className="px-4 py-1 text-gray-900 border-x border-gray-200">
      {orderQuantity}
    </span>
    <button
      type="button"
      onClick={() => setOrderQuantity(orderQuantity + 1)}
      className="px-3 py-1 text-gray-600 hover:text-orange-500 focus:outline-none"
    >
      +
    </button>
  </div>
</div>



      {/* Final Price Display */}
      <div className="pt-4 border-t border-gray-200">
  <div className="flex justify-between items-center">
    <span className="text-base font-medium text-gray-900">Final Price:</span>
    <div className="text-right">
      <span className="text-xl font-bold text-orange-600">₹{calculateFinalPrice()}</span>
      {orderQuantity > 1 && (
        <span className="text-sm text-gray-500 block">
          (₹{ selectedSize.priceAdjustment} × {orderQuantity})
        </span>
      )}
    </div>
  </div>
  <p className="text-sm text-gray-500 mt-1">
    {selectedSize.name} ({selectedSize.quantity}) × {orderQuantity}
    {isJuice && `, ${selectedIce}`}
    {isShake && `, ${selectedIce}, ${selectedSugar}, ${selectedDilution}`}
  </p>
</div>
    </div>
  );
};

export default ProductCustomization;