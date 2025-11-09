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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl shadow-2xl max-w-md w-full border border-zinc-700">
        {/* Header */}
        <div className="p-6 border-b border-zinc-700">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Delivery Charges</h3>
              <p className="text-sm text-zinc-400">Distance-based pricing</p>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-zinc-700/50 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Remove the Free Delivery Badge */}
        </div>
        
        <div className="p-6 space-y-4">
          {settings?.CHARGES?.map((charge, index) => {
            const prevRange = index > 0 ? settings.CHARGES[index - 1].range : 0;
            return (
              <div 
                key={charge._id}
                className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 hover:border-orange-500/30 transition-all duration-200"
              >
                <span className="text-zinc-300 font-medium">
                  {prevRange === 0 ? 
                    `Up to ${charge.range}km` : 
                    `${prevRange}-${charge.range}km`}
                </span>
                <span className="text-xl font-bold text-orange-400">₹{charge.charge}</span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 bg-zinc-800/30 border-t border-zinc-700 rounded-b-2xl">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-zinc-400">
              Delivery charges are calculated based on the distance from our shop to your delivery location.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}