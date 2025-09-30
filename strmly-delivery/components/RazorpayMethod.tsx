import { useState } from 'react';

interface PaymentMethodProps {
  value: string;
  onChange: (method: string) => void;
}

export default function PaymentMethod({ value, onChange }: PaymentMethodProps) {
  return (
    <div className="mt-6">
      <h4 className="font-medium text-gray-900 mb-3">Payment Method</h4>
      <div className="space-y-3">
        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition duration-200">
          <input 
            type="radio" 
            name="payment" 
            value="COD" 
            checked={value === 'COD'} 
            onChange={() => onChange('COD')}
            className="h-4 w-4 text-orange-500 focus:ring-orange-500"
          />
          <div>
            <p className="font-medium text-gray-900">Cash on Delivery</p>
            <p className="text-sm text-gray-500">Pay when your order arrives</p>
          </div>
        </label>
        
        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition duration-200">
          <input 
            type="radio" 
            name="payment" 
            value="online" 
            checked={value === 'online'} 
            onChange={() => onChange('online')}
            className="h-4 w-4 text-orange-500 focus:ring-orange-500"
          />
          <div className="flex items-center justify-between flex-1">
            <div>
              <p className="font-medium text-gray-900">Pay Online</p>
              <p className="text-sm text-gray-500">Secure payment via Razorpay</p>
            </div>
            <img src="/images/razorpay-logo.png" alt="Razorpay" className="h-8" />
          </div>
        </label>
      </div>
    </div>
  );
}