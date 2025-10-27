'use client';

import React, { useState, useEffect } from 'react';
import { Description, RadioGroup, Label, Radio } from '@headlessui/react';

interface SizeOption {
  name: string;
  quantity: string;
  priceAdjustment: number;
}

interface ProductCustomizationProps {
  category: string;
  smallPrice: number;
  mediumPrice: number;
  onCustomizationChange: (customization: ProductCustomization, finalPrice: number) => void;
}

export interface ProductCustomization {
  size: string;
  quantity: string;
  orderQuantity?: number;
  ice?: string;
  sugar?: string;
  dilution?: string;
  fibre?: boolean;
  finalPrice: number;
}

const ProductCustomization: React.FC<ProductCustomizationProps> = ({
  category,
  smallPrice,
  mediumPrice,
  onCustomizationChange
}) => {
  const isJuice = category.toLowerCase() === 'juices';
  const isShake = category.toLowerCase() === 'shakes';

  // Size options with corresponding quantities and price adjustments
  const sizeOptions: SizeOption[] = [
    { name: 'Regular', quantity: '300mL', priceAdjustment: smallPrice },
    { name: 'Large', quantity: '500mL', priceAdjustment: mediumPrice },
  ];

  const iceOptions = ['No Ice', 'Less Ice', 'Normal Ice', 'More Ice'];
  const sugarOptions = ['No Sugar', 'Less Sugar', 'Normal Sugar'];
  const dilutionOptions = ['Normal', 'Concentrated', 'Diluted'];
  const fibreOptionDetails=["Thicker juice with natural pulp; richer in nutrients and keeps you full longer.", "Smooth, light, and easy to drink."]
  const [fibreOption, setFibreOption] = useState(false);

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
      customization.fibre = fibreOption;
    }

    if (isShake) {
      customization.ice = selectedIce;
      customization.sugar = selectedSugar;
      customization.dilution = selectedDilution;
      customization.fibre = fibreOption;
    }


   onCustomizationChange(customization, calculateFinalPrice());
}, [selectedSize, selectedIce, selectedSugar, selectedDilution, orderQuantity,fibreOption]); 

  return (
    <div className="space-y-6 py-4">
      {/* Size Selection */}
     <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Size</h3>
        <div className="grid grid-cols-2 gap-3">
          {sizeOptions.map((option) => {
            const isChecked = selectedSize.name === option.name;
            return (
              <button
                key={option.name}
                type="button"
                onClick={() => setSelectedSize(option)}
                className={`${
                  isChecked
                    ? 'bg-orange-100 border-orange-500 text-orange-800 ring-2 ring-orange-500'
                    : 'border bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
                }
                relative flex cursor-pointer rounded-lg px-4 py-3 shadow-sm focus:outline-none transition-colors duration-200`}
              >
                <div className="flex flex-col w-full text-center">
                  <p className={`font-medium ${isChecked ? 'text-orange-800' : 'text-gray-900'}`}>
                    {option.name}
                  </p>
                  <span className={`text-sm ${isChecked ? 'text-orange-800' : 'text-gray-500'}`}>
                    {option.quantity}
                  </span>
                  <span className={`text-sm ${isChecked ? 'text-orange-800 font-medium' : 'text-gray-500'}`}>
                    ₹{option.priceAdjustment}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ice Options - Available for both Juices and Shakes */}
      {(isJuice || isShake) && (
        <>
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Ice Preference</h3>
          <RadioGroup value={selectedIce} onChange={setSelectedIce}>
            <div className="grid grid-cols-2 gap-2">
              {iceOptions.map((option) => (
                <Radio
                  key={option}
                  value={option}
                  className={({ focus, checked }) =>
                    `${
                      focus
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
                      <Label
                        as="p"
                        className={`font-medium text-sm ${
                          checked ? 'text-orange-800' : 'text-gray-700'
                        }`}
                      >
                        {option}
                      </Label>
                    </div>
                  )}
                </Radio>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Fibre Option - Available for both Juices and Shakes */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Fibre Preference</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFibreOption(true)}
              className={`${
                fibreOption
                  ? 'bg-orange-100 border-orange-500 text-orange-800 ring-2 ring-orange-500'
                  : 'border bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
              }
              relative flex flex-col cursor-pointer rounded-lg p-4 shadow-sm focus:outline-none transition-colors duration-200`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-semibold text-sm ${fibreOption ? 'text-orange-800' : 'text-gray-900'}`}>
                  With Fibre
                </span>
                {fibreOption && (
                  <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className={`text-xs text-left ${fibreOption ? 'text-orange-700' : 'text-gray-600'}`}>
                {fibreOptionDetails[0]}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFibreOption(false)}
              className={`${
                !fibreOption
                  ? 'bg-orange-100 border-orange-500 text-orange-800 ring-2 ring-orange-500'
                  : 'border bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
              }
              relative flex flex-col cursor-pointer rounded-lg p-4 shadow-sm focus:outline-none transition-colors duration-200`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-semibold text-sm ${!fibreOption ? 'text-orange-800' : 'text-gray-900'}`}>
                  Without Fibre
                </span>
                {!fibreOption && (
                  <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className={`text-xs text-left ${!fibreOption ? 'text-orange-700' : 'text-gray-600'}`}>
                {fibreOptionDetails[1]}
              </p>
            </button>
          </div>
        </div>
        </>
      )}

      {/* Sugar Options - Only for Shakes */}
      {isShake && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Sugar Level</h3>
          <RadioGroup value={selectedSugar} onChange={setSelectedSugar}>
            <div className="grid grid-cols-3 gap-2">
              {sugarOptions.map((option) => (
                <Radio
                  key={option}
                  value={option}
                  className={({ focus, checked }) =>
                    `${
                      focus
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
                      <Label
                        as="p"
                        className={`font-medium text-sm ${
                          checked ? 'text-orange-800' : 'text-gray-700'
                        }`}
                      >
                        {option}
                      </Label>
                    </div>
                  )}
                </Radio>
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
                <Radio
                  key={option}
                  value={option}
                  className={({ focus, checked }) =>
                    `${
                      focus
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
                      <Label
                        as="p"
                        className={`font-medium text-sm ${
                          checked ? 'text-orange-800' : 'text-gray-700'
                        }`}
                      >
                        {option}
                      </Label>
                    </div>
                  )}
                </Radio>
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
                (₹{selectedSize.priceAdjustment} × {orderQuantity})
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