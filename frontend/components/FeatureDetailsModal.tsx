'use client';

import { useEffect } from 'react';
import type { Feature } from '../types/common';

interface FeatureDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: Feature | null;
}

export default function FeatureDetailsModal({ isOpen, onClose, feature }: FeatureDetailsModalProps) {
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !feature) return null;

  // Get feature icon based on title
  const getFeatureIcon = (title: string) => {
    if (title.includes('POINT')) return '⭐';
    if (title.includes('RARITY')) return '💎';
    if (title.includes('INTERACTIVE')) return '🌍';
    if (title.includes('ECOSYSTEM')) return '🎁';
    return '🎮';
  };

  // Get feature color based on title
  const getFeatureColor = (title: string) => {
    if (title.includes('POINT')) return 'from-yellow-600 to-orange-600';
    if (title.includes('RARITY')) return 'from-purple-600 to-pink-600';
    if (title.includes('INTERACTIVE')) return 'from-green-600 to-blue-600';
    if (title.includes('ECOSYSTEM')) return 'from-red-600 to-purple-600';
    return 'from-indigo-600 to-purple-600';
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Modal Container */}
      <div className="relative bg-pixel-purple-dark border-4 border-pixel-purple-light shadow-pixel-xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto animate-pixel-fade-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 sm:w-10 sm:h-10 bg-red-600 hover:bg-red-700 text-white border-2 border-red-800 flex items-center justify-center font-press-start text-sm sm:text-base transition-all duration-150 shadow-pixel-sm z-10"
          aria-label="Close modal"
        >
          ×
        </button>

        {/* Modal Header */}
        <div className={`bg-gradient-to-r ${getFeatureColor(feature.title)} border-b-4 border-pixel-purple-light p-4 sm:p-6 md:p-8`}>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* Feature Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white/20 border-4 border-white/40 flex items-center justify-center backdrop-blur-sm">
              <span className="text-3xl sm:text-4xl md:text-5xl">
                {getFeatureIcon(feature.title)}
              </span>
            </div>
            
            {/* Feature Title */}
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-press-start text-white text-shadow-pixel leading-tight whitespace-pre-line mb-2 sm:mb-4">
                {feature.title}
              </h2>
              <p className="text-white/90 font-vt323 text-lg sm:text-xl md:text-2xl">
                {feature.description}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 md:p-8 lg:p-10">
          {/* Feature Details */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-press-start text-pixel-accent mb-4 sm:mb-6">
              FEATURE DETAILS
            </h3>
            <div className="bg-pixel-purple-medium/30 border-2 border-pixel-purple-light p-4 sm:p-6 md:p-8">
              <p className="text-pixel-text font-vt323 text-base sm:text-lg md:text-xl leading-relaxed">
                {feature.details}
              </p>
            </div>
          </div>

          {/* Feature-specific content */}
          {feature.title.includes('POINT') && (
            <div className="mb-6 sm:mb-8">
              <h4 className="text-lg sm:text-xl md:text-2xl font-press-start text-pixel-accent mb-4">
                HOW POINTS WORK
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-pixel-purple-medium/50 border-2 border-pixel-purple-light p-4 sm:p-6">
                  <h5 className="font-press-start text-pixel-accent text-sm sm:text-base mb-2">
                    AUTOMATIC ACCRUAL
                  </h5>
                  <p className="text-pixel-text font-vt323 text-sm sm:text-base">
                    Points accumulate automatically based on your NFT's rarity level
                  </p>
                </div>
                <div className="bg-pixel-purple-medium/50 border-2 border-pixel-purple-light p-4 sm:p-6">
                  <h5 className="font-press-start text-pixel-accent text-sm sm:text-base mb-2">
                    LEADERBOARD RANKING
                  </h5>
                  <p className="text-pixel-text font-vt323 text-sm sm:text-base">
                    Compete with other collectors for the top spots
                  </p>
                </div>
              </div>
            </div>
          )}

          {feature.title.includes('RARITY') && (
            <div className="mb-6 sm:mb-8">
              <h4 className="text-lg sm:text-xl md:text-2xl font-press-start text-pixel-accent mb-4">
                RARITY LEVELS
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { name: 'Common (C)', color: 'text-gray-400', rate: '1x' },
                  { name: 'Uncommon (UC)', color: 'text-green-400', rate: '1.5x' },
                  { name: 'Rare (R)', color: 'text-blue-400', rate: '2x' },
                  { name: 'Super Rare (SR)', color: 'text-purple-400', rate: '3x' },
                  { name: 'Super Super Rare (SSR)', color: 'text-yellow-500', rate: '5x' },
                  { name: 'Ultra Rare (UR)', color: 'text-pink-500', rate: '10x' }
                ].map((rarity, index) => (
                  <div key={index} className="bg-pixel-purple-medium/50 border-2 border-pixel-purple-light p-3 sm:p-4">
                    <div className={`font-press-start text-xs sm:text-sm ${rarity.color} mb-1 sm:mb-2`}>
                      {rarity.name}
                    </div>
                    <div className="text-pixel-text font-vt323 text-xs sm:text-sm">
                      Point Rate: {rarity.rate}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {feature.title.includes('ECOSYSTEM') && (
            <div className="mb-6 sm:mb-8">
              <h4 className="text-lg sm:text-xl md:text-2xl font-press-start text-pixel-accent mb-4">
                REWARD TYPES
              </h4>
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-pixel-purple-medium/50 border-2 border-pixel-purple-light p-4 sm:p-6">
                  <h5 className="font-press-start text-pixel-accent text-sm sm:text-base mb-2">
                    $LOVE TOKENS
                  </h5>
                  <p className="text-pixel-text font-vt323 text-sm sm:text-base">
                    Main seasonal rewards distributed based on your accumulated points
                  </p>
                </div>
                <div className="bg-pixel-purple-medium/50 border-2 border-pixel-purple-light p-4 sm:p-6">
                  <h5 className="font-press-start text-pixel-accent text-sm sm:text-base mb-2">
                    SPECIAL SURPRISES
                  </h5>
                  <p className="text-pixel-text font-vt323 text-sm sm:text-base">
                    Exclusive rewards for outstanding collectors and active participants
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 sm:px-8 sm:py-4 bg-pixel-accent text-black text-base sm:text-lg font-press-start font-bold hover:bg-yellow-400 transition-all duration-150 shadow-[3px_3px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] border-b-2 border-r-2 border-amber-700"
            >
              START COLLECTING
            </button>
            
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-3 sm:px-8 sm:py-4 bg-transparent border-2 border-pixel-purple-light text-pixel-text text-base sm:text-lg font-vt323 hover:bg-pixel-purple-light hover:text-pixel-purple-dark transition-all duration-150"
            >
              Close
            </button>
          </div>

          {/* Additional Info */}
          <div className="text-center text-pixel-text font-vt323 text-xs sm:text-sm opacity-75 mt-4 sm:mt-6">
            <p>Join thousands of collectors already earning in MonadWorld</p>
          </div>
        </div>

        {/* Decorative Corners */}
        <div className="absolute top-1 left-1 w-4 h-4 bg-pixel-accent"></div>
        <div className="absolute top-1 right-1 w-4 h-4 bg-pixel-accent"></div>
        <div className="absolute bottom-1 left-1 w-4 h-4 bg-pixel-accent"></div>
        <div className="absolute bottom-1 right-1 w-4 h-4 bg-pixel-accent"></div>
      </div>
    </div>
  );
}