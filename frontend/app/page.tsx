'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useNftCount } from '../hooks/useNftCount';
import MintModal from '../components/MintModal';
import FeatureDetailsModal from '../components/FeatureDetailsModal';
import GamePreviewSlider from '../components/GamePreviewSlider';
import FeaturesSection from '../components/FeaturesSection';
import type { Feature } from '../types/common';
import '../styles/animations.css';

export default function HomePage() {
  const { isConnected } = useAccount();
  const { nftCount, isMounted } = useNftCount();
  const [showMintModal, setShowMintModal] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const router = useRouter();

  const previewImages = ['1.png', '2.png', '3.png', '4.png', '5.png'];

  // Features data
  const features: Feature[] = [
    {
      title: "POINT\nACCRUAL",
      description: "Earn point over time and compete for rewards in the MonadWorld ecosystem.",
      details: "Your Lilnad NFTs automatically accrue points over time based on their rarity and age. The higher the rarity, the faster points accumulate. These points determine your rank on the leaderboard and your eligibility for seasonal rewards."
    },
    {
      title: "RARITY\nSYSTEM",
      description: "6 rarity levels from Common to Ultra Rare, each with unique properties.",
      details: "Our rarity system includes Common (C), Uncommon (UC), Rare (R), Super Rare (SR), Super Super Rare (SSR), and Ultra Rare (UR). Higher rarity NFTs have better visual features, faster point accrual rates, and special access to exclusive events and rewards."
    },
    {
      title: "INTERACTIVE\nWORLD",
      description: "Join other collectors in an interactive pixel world built on Monad.",
      details: "Coming soon - The MonadWorld metaverse will allow you to interact with other NFT owners, participate in community events, mini-games, and unlock special rewards through exploration."
    },
    {
      title: "ECOSYSTEM\nREWARDS",
      description: "Get exclusive benefits based on your point.",
      details: "The main reward is $LOVE tokens distributed at the end of each season. The more points you accumulate, the higher chance you'll have to win bigger rewards. Those with outstanding collection, accumulation, and participation will receive special unexpected surprises."
    }
  ];

  // Handle feature modal
  const handleFeatureClick = (index: number) => {
    if (index === 2) return; // Interactive World is coming soon
    setSelectedFeature(features[index]);
    setShowFeatureModal(true);
  };

  const closeFeatureModal = () => {
    setShowFeatureModal(false);
    setSelectedFeature(null);
  };

  // Navigation handlers
  const handleViewCollection = () => {
    router.push('/collection');
  };

  const handleEnterWorld = () => {
    router.push('/world');
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)] font-vt323 text-pixel-purple-light text-lg md:text-2xl px-4">
        <p className="text-center">⏳ Initializing MonadWorld...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] relative overflow-hidden bg-pixel-purple-dark">
      {/* Hero Section */}
      <div className="py-6 md:py-12 border-b border-white">
        <div className="container mx-auto px-3 md:px-4 flex flex-col items-center gap-6 md:gap-12">
          {/* Title */}
          <div className="w-full text-center">
            <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-pixel-accent mb-4 md:mb-6 font-press-start text-shadow-pixel leading-tight px-2">
              WELCOME TO MONADWORLD
            </h1>
          </div>
          
          {/* Game Preview */}
          <div className="w-full flex justify-center">
            <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl">
              <GamePreviewSlider previewImages={previewImages} />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-3 w-full max-w-md px-4">
            <button 
              onClick={() => setShowMintModal(true)}
              className="w-full px-4 py-3 bg-pixel-accent text-black text-sm md:text-lg font-press-start font-bold rounded-none hover:bg-yellow-400 transition-all duration-150 shadow-[3px_3px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] border-b-2 border-r-2 border-amber-700 active:transform-none active:shadow-[1px_1px_0_#000]"
            >
              MINT YOUR FIRST NFT →
            </button>
            
            {isConnected && nftCount > 0 && (
              <button 
                onClick={handleViewCollection}
                className="w-full px-4 py-3 bg-pixel-purple-medium text-pixel-accent text-sm md:text-lg font-vt323 font-bold rounded-none hover:bg-purple-700 transition-all duration-150 shadow-[3px_3px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] border-b-2 border-r-2 border-purple-900 active:transform-none active:shadow-[1px_1px_0_#000]"
              >
                VIEW YOUR COLLECTION →
              </button>
            )}
          </div>
        </div>
      </div>
      
      <FeaturesSection features={features} onFeatureClick={handleFeatureClick} />
      
      {/* Modals */}
      <MintModal isOpen={showMintModal} onClose={() => setShowMintModal(false)} />
      <FeatureDetailsModal 
        isOpen={showFeatureModal} 
        onClose={closeFeatureModal} 
        feature={selectedFeature}
      />
    </div>
  );
}