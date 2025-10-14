import { X } from 'lucide-react';

interface DeliveryCharge {
  range: number;
  charge: number;
  _id: string;
}

interface DeliverySettings {
  _id: string;
  maxRange: number;
  CHARGES: DeliveryCharge[];
  updatedAt: string;
}

interface DeliveryInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DeliverySettings | null;
  totalPrice?: number; // Make optional to maintain backward compatibility
}

export default function DeliveryInfoModal({ isOpen, onClose, settings, totalPrice = 0 }: DeliveryInfoModalProps) {
  if (!isOpen || !settings) return null;
  
  const amountToFreeDelivery = Math.max(0, 150 - totalPrice);
  const isEligibleForFreeDelivery = totalPrice >= 150;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-zinc-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-zinc-800">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl"></div>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <h3 className="text-xl font-bold text-white mb-6">Delivery Charges</h3>
        
        {/* Free Delivery Banner */}
        <div className={`mb-4 p-3 rounded-lg border ${
          isEligibleForFreeDelivery 
            ? 'bg-green-900/30 border-green-700 text-green-400' 
            : 'bg-orange-900/30 border-orange-800 text-orange-300'
        }`}>
          {isEligibleForFreeDelivery ? (
            <p className="text-center font-medium">
              You qualify for FREE delivery!
            </p>
          ) : (
            <div className="text-center">
              <p className="font-medium">Add ₹{amountToFreeDelivery.toFixed(0)} more to get FREE delivery</p>
              <p className="text-xs mt-1 opacity-80">Orders above ₹150 qualify for free delivery</p>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {settings?.CHARGES?.map((charge, index) => {
            const prevRange = index > 0 ? settings.CHARGES[index - 1].range : 0;
            return (
              <div 
                key={charge._id}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
              >
                <span className="text-zinc-300">
                  {prevRange === 0 ? 
                    `Up to ${charge.range}km` : 
                    `${prevRange}-${charge.range}km`}
                </span>
                <span className={`font-semibold ${isEligibleForFreeDelivery ? 'line-through text-zinc-500' : 'text-orange-500'}`}>
                  ₹{charge.charge}
                </span>
                {isEligibleForFreeDelivery && (
                  <span className="font-semibold text-green-400 absolute right-10">FREE</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800">
          <p className="text-sm text-zinc-400 text-center">
            Maximum delivery range: {settings.maxRange}km
          </p>
          {isEligibleForFreeDelivery && (
            <p className="text-sm text-green-400 text-center mt-2">
              Free delivery applied to your order
            </p>
          )}
        </div>
      </div>
    </div>
  );
}