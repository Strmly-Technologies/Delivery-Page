'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Zap, Calendar } from 'lucide-react';
import OtpModal from './components/login/otpModal';

export default function Home() {
  const [selectedOption, setSelectedOption] = useState<'quick' | 'scheduled' | null>(null);
   const [isAuthenticated, setIsAuthenticated] = useState(false);
   const [showOtpModal, setShowOtpModal] = useState(false);
  const router = useRouter();

  const handleSelection = (option: 'quick' | 'scheduled') => {
    setSelectedOption(option);
    localStorage.setItem('service', option);
    if(option==='quick'){
      router.push('/dashboard');
    } else {
      router.push('/freshplan');
    }
  };

    useEffect(() => {
      const currentUser=localStorage.getItem('user');
      if(currentUser){
        setIsAuthenticated(true);
      }
    }, []);

  const handleFreshPlanClick = (e: React.MouseEvent) => {
  e.preventDefault();

  if (!isAuthenticated) {
    setShowOtpModal(true);
  } else {
    router.push('/freshplan');
  }
};

    const handleVerificationComplete = () => {
      setIsAuthenticated(true);
      setShowOtpModal(false);
      router.push('/freshplan');
    };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Header Section */}
      <div className="w-full pt-16 pb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">JUICE RANI</h1>
        <p className="text-gray-600">Choose your delivery preference</p>
      </div>

      {/* Cards Container */}
      <div className="max-w-md mx-auto px-4 space-y-4">
        {/* QuickSip Card */}
        <button
          onClick={() => handleSelection('quick')}
          className={`w-full p-6 rounded-2xl transition-all duration-300 ${
            selectedOption === 'quick'
              ? 'bg-orange-500 text-white scale-105 shadow-xl'
              : 'bg-white text-gray-900 shadow-md hover:shadow-lg'
          }`}
        >
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-xl ${
              selectedOption === 'quick' ? 'bg-orange-400' : 'bg-orange-100'
            }`}>
              <Zap className={`w-6 h-6 ${
                selectedOption === 'quick' ? 'text-white' : 'text-orange-500'
              }`} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-xl font-bold mb-2">QuickSip</h3>
              <p className={`text-sm ${
                selectedOption === 'quick' ? 'text-orange-100' : 'text-gray-600'
              }`}>
                Get your fresh juices delivered instantly within 10 minutes
              </p>
            </div>
            <ArrowRight className={`w-5 h-5 ${
              selectedOption === 'quick' ? 'text-orange-200' : 'text-orange-500'
            }`} />
          </div>
        </button>

        {/* FreshPlan Card */}
        <button
          onClick={handleFreshPlanClick}
          className={`w-full p-6 rounded-2xl transition-all duration-300 ${
            selectedOption === 'scheduled'
              ? 'bg-orange-500 text-white scale-105 shadow-xl'
              : 'bg-white text-gray-900 shadow-md hover:shadow-lg'
          }`}
        >
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-xl ${
              selectedOption === 'scheduled' ? 'bg-orange-400' : 'bg-orange-100'
            }`}>
              <Calendar className={`w-6 h-6 ${
                selectedOption === 'scheduled' ? 'text-white' : 'text-orange-500'
              }`} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-xl font-bold mb-2">FreshPlan</h3>
              <p className={`text-sm ${
                selectedOption === 'scheduled' ? 'text-orange-100' : 'text-gray-600'
              }`}>
                Schedule your deliveries in advance for daily freshness
              </p>
            </div>
            <ArrowRight className={`w-5 h-5 ${
              selectedOption === 'scheduled' ? 'text-orange-200' : 'text-orange-500'
            }`} />
          </div>
        </button>
      </div>
              <OtpModal
                    isOpen={showOtpModal}
                    onClose={() => setShowOtpModal(false)}
                    onVerificationComplete={handleVerificationComplete}
                  />
      {/* Bottom Text */}
      <div className="text-center mt-8 text-gray-500 text-sm px-4">
        Select your preferred delivery option to continue
      </div>
    </div>
  );
}