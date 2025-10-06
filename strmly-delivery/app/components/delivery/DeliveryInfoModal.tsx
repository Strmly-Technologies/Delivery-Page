import { X } from 'lucide-react';

interface DeliveryCharge {
  range: number;
  charge: number;
  _id: string;
}

interface DeliverySettings {
  _id: string;
  maxRange: number;
  charges: DeliveryCharge[];
  updatedAt: string;
}

interface DeliveryInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DeliverySettings | null;
}

export default function DeliveryInfoModal({ isOpen, onClose, settings }: DeliveryInfoModalProps) {
  if (!isOpen || !settings) return null;

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
        
        <div className="space-y-4">
          {settings.charges.map((charge, index) => {
            const prevRange = index > 0 ? settings.charges[index - 1].range : 0;
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
                <span className="font-semibold text-orange-500">
                  ₹{charge.charge}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-sm text-zinc-400 text-center">
          Maximum delivery range: {settings.maxRange}km
        </p>
      </div>
    </div>
  );
}