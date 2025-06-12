'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface MintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MintModal({ isOpen, onClose }: MintModalProps) {
  const { isConnected } = useAccount();
  const [mintAmount, setMintAmount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [mintPrice] = useState(0.01); // MON per NFT

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

  const handleMint = async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      // TODO: Implement actual minting logic
      console.log(`Minting ${mintAmount} NFTs`);
      
      // Simulate minting delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success message or redirect
      onClose();
    } catch (error) {
      console.error('Minting failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalCost = mintAmount * mintPrice;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Modal Container */}
      <div className="relative bg-pixel-purple-dark border-4 border-pixel-purple-light shadow-pixel-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-red-600 hover:bg-red-700 text-white border-2 border-red-800 flex items-center justify-center font-press-start text-sm transition-all duration-150 shadow-pixel-sm z-10"
          aria-label="Close modal"
        >
          ×
        </button>

        {/* Modal Header */}
        <div className="bg-pixel-purple-medium border-b-4 border-pixel-purple-light p-4 sm:p-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-press-start text-pixel-accent text-center text-shadow-pixel">
            MINT LILNAD NFT
          </h2>
          <p className="text-pixel-text font-vt323 text-base sm:text-lg md:text-xl text-center mt-2 sm:mt-4">
            Join the MonadWorld ecosystem and start earning rewards!
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 md:p-8">
          {!isConnected ? (
            /* Not Connected State */
            <div className="text-center">
              <div className="mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-pixel-accent border-4 border-pixel-purple-dark mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl sm:text-3xl">🔒</span>
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-press-start text-pixel-accent mb-4">
                  WALLET NOT CONNECTED
                </h3>
                <p className="text-pixel-text font-vt323 text-base sm:text-lg">
                  Please connect your wallet to start minting NFTs
                </p>
              </div>
              
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-pixel-accent text-black text-base sm:text-lg font-press-start font-bold hover:bg-yellow-400 transition-all duration-150 shadow-[3px_3px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] border-b-2 border-r-2 border-amber-700"
              >
                CONNECT WALLET FIRST
              </button>
            </div>
          ) : (
            /* Connected State - Minting Interface */
            <div className="space-y-6 sm:space-y-8">
              {/* Mint Amount Selector */}
              <div>
                <label className="block text-pixel-accent font-press-start text-sm sm:text-base mb-4">
                  SELECT AMOUNT
                </label>
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
                  {[1, 2, 3, 5, 10].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setMintAmount(amount)}
                      className={`px-3 py-2 sm:px-4 sm:py-3 border-2 font-vt323 text-sm sm:text-base transition-all duration-150 ${
                        mintAmount === amount
                          ? 'bg-pixel-accent text-pixel-purple-dark border-pixel-accent shadow-pixel-sm'
                          : 'bg-transparent text-pixel-accent border-pixel-purple-light hover:bg-pixel-accent hover:text-pixel-purple-dark'
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
                
                {/* Custom Amount Input */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-pixel-text font-vt323 text-sm sm:text-base whitespace-nowrap">
                    Custom Amount:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    className="w-full sm:w-24 px-3 py-2 bg-pixel-purple-medium border-2 border-pixel-purple-light text-pixel-accent font-vt323 text-base focus:outline-none focus:border-pixel-accent"
                  />
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-pixel-purple-medium/50 border-2 border-pixel-purple-light p-4 sm:p-6">
                <h4 className="text-pixel-accent font-press-start text-sm sm:text-base mb-3 sm:mb-4">
                  COST BREAKDOWN
                </h4>
                <div className="space-y-2 font-vt323 text-sm sm:text-base">
                  <div className="flex justify-between items-center">
                    <span className="text-pixel-text">Price per NFT:</span>
                    <span className="text-pixel-accent">{mintPrice} MON</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-pixel-text">Quantity:</span>
                    <span className="text-pixel-accent">{mintAmount}</span>
                  </div>
                  <div className="border-t border-pixel-purple-light pt-2 mt-2">
                    <div className="flex justify-between items-center text-base sm:text-lg">
                      <span className="text-pixel-accent font-bold">Total:</span>
                      <span className="text-pixel-accent font-bold">{totalCost.toFixed(3)} MON</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* NFT Preview */}
              <div className="text-center">
                <h4 className="text-pixel-accent font-press-start text-sm sm:text-base mb-4">
                  PREVIEW
                </h4>
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-pixel-purple-medium border-4 border-pixel-purple-light mx-auto flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl">🎮</span>
                </div>
                <p className="text-pixel-text font-vt323 text-xs sm:text-sm mt-2 opacity-75">
                  * Actual NFT will be randomly generated
                </p>
              </div>

              {/* Mint Button */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={handleMint}
                  disabled={isLoading}
                  className={`flex-1 px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-press-start font-bold transition-all duration-150 border-b-2 border-r-2 ${
                    isLoading
                      ? 'bg-gray-600 text-gray-300 border-gray-800 cursor-not-allowed'
                      : 'bg-pixel-accent text-black border-amber-700 hover:bg-yellow-400 shadow-[3px_3px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px]'
                  }`}
                >
                  {isLoading ? 'MINTING...' : 'MINT NOW'}
                </button>
                
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-6 py-3 sm:px-8 sm:py-4 bg-transparent border-2 border-pixel-purple-light text-pixel-text text-base sm:text-lg font-vt323 hover:bg-pixel-purple-light hover:text-pixel-purple-dark transition-all duration-150"
                >
                  Cancel
                </button>
              </div>

              {/* Additional Info */}
              <div className="text-center text-pixel-text font-vt323 text-xs sm:text-sm opacity-75">
                <p>Each NFT earns points automatically in the MonadWorld ecosystem</p>
                <p className="mt-1">Higher rarity = faster point accumulation</p>
              </div>
            </div>
          )}
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