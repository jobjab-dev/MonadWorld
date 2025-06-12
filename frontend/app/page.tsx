'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface NftApiResponse {
  data: any[]; 
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

// โมดาล Component สำหรับ Mint popup
function MintModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);
  
  const handleClose = () => {
    document.body.style.overflow = 'auto';
    onClose();
  };
  
  if (!isOpen) return null;
  
  const handleMintClick = () => {
    document.body.style.overflow = 'auto';
    router.push('/mint');
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn p-4" onClick={handleClose}>
      <div className="relative z-10 w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl bg-pixel-purple-dark border-4 border-pixel-purple-medium rounded-none p-4 sm:p-5 md:p-6 overflow-hidden shadow-xl animate-scaleIn mx-auto my-0" onClick={e => e.stopPropagation()}>
        {/* Pixel dots in corners */}
        <div className="absolute top-2 left-2 w-2 h-2 md:w-3 md:h-3 bg-pixel-accent"></div>
        <div className="absolute top-2 right-2 w-2 h-2 md:w-3 md:h-3 bg-pixel-accent"></div>
        <div className="absolute bottom-2 left-2 w-2 h-2 md:w-3 md:h-3 bg-pixel-accent"></div>
        <div className="absolute bottom-2 right-2 w-2 h-2 md:w-3 md:h-3 bg-pixel-accent"></div>
        
        {/* Modal Header */}
        <div className="flex justify-center items-center mb-4 md:mb-6">
          <h2 className="text-lg sm:text-xl md:text-2xl font-press-start text-pixel-accent text-center">
            Mint Your Lilnad NFT
          </h2>
        </div>
        
        {/* Divider */}
        <div className="border-b-2 border-pixel-purple-medium mb-4 md:mb-6 w-1/2 mx-auto"></div>
        
        <div className="mb-4 md:mb-6">
          <p className="text-pixel-text mb-3 text-center text-sm sm:text-base">Mint your first Lilnad NFT to join the MonadWorld!</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-0 mb-3">
            <div className="bg-pixel-purple-medium p-2 md:p-3 text-center">
              <p className="text-pixel-text font-bold text-sm md:text-base">SBT Collection</p>
              <p className="text-xs md:text-sm text-pixel-text opacity-80">Earn Points Over Time</p>
            </div>
            <div className="bg-pixel-purple-medium p-2 md:p-3 text-center">
              <p className="text-pixel-text font-bold text-sm md:text-base">Rarity System</p>
              <p className="text-xs md:text-sm text-pixel-text opacity-80">6 Rarity Levels</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 md:px-6 md:py-2 bg-gray-600 text-white text-base md:text-lg font-vt323 font-bold rounded-none hover:bg-gray-700 transition-colors duration-150 shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] border-b-4 border-r-4 border-gray-800"
          >
            CLOSE
          </button>
          <button 
            onClick={handleMintClick}
            className="px-4 py-2 md:px-6 md:py-2 bg-pixel-accent text-black text-base md:text-lg font-vt323 font-bold rounded-none hover:bg-yellow-400 transition-colors duration-150 shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] border-b-4 border-r-4 border-amber-700"
          >
            MINT NOW <span className="ml-2 inline-block">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PixelCharacter({ characterType, mapWidth, mapHeight }: { characterType: number, mapWidth: number, mapHeight: number }) {
  // Character sprite configurations
  const characterTypes = [
    { 
      color: 'bg-pixel-purple-medium',
      size: 'w-6 h-8',
      speed: 1,
      animSpeed: '0.4s',
      icon: '👾' // Purple monster
    },
    { 
      color: 'bg-purple-600',
      size: 'w-5 h-7',
      speed: 1.2,
      animSpeed: '0.3s',
      icon: '🧙' // Wizard
    },
    { 
      color: 'bg-indigo-500',
      size: 'w-6 h-8',
      speed: 0.9,
      animSpeed: '0.35s',
      icon: '🤖' // Robot
    },
    { 
      color: 'bg-purple-400',
      size: 'w-5 h-5',
      speed: 1.3,
      animSpeed: '0.3s',
      icon: '🎮' // Game
    }
  ];

  const character = characterTypes[characterType % characterTypes.length];
  const charSizeW = parseInt(character.size.split(' ')[0].replace('w-', '')) * 4;
  const charSizeH = parseInt(character.size.split(' ')[1].replace('h-', '')) * 4;

  const [position, setPosition] = useState({
    left: Math.random() * Math.max(0, mapWidth - charSizeW),
    top: Math.random() * Math.max(0, mapHeight - charSizeH),
    direction: Math.random() > 0.5 ? 'right' : 'left',
    isMoving: true,
    frame: 0
  });

  useEffect(() => {
    // Movement animation
    const moveInterval = setInterval(() => {
      setPosition(prevPos => {
        const isChangingDirection = Math.random() < 0.1;
        const newDirection = isChangingDirection ? 
          (prevPos.direction === 'right' ? 'left' : 'right') : 
          prevPos.direction;
        
        const isPausing = Math.random() < 0.05;
        const isMoving = isPausing ? false : true;
        
        const moveX = isMoving ? (newDirection === 'right' ? character.speed : -character.speed) : 0;
        
        // Occasional small vertical movement
        const moveY = isMoving && Math.random() < 0.3 ? 
          (Math.random() > 0.5 ? 1 : -1) * character.speed / 2 : 0;
        
        return {
          left: Math.max(0, Math.min(prevPos.left + moveX, mapWidth - charSizeW)),
          top: Math.max(0, Math.min(prevPos.top + moveY, mapHeight - charSizeH)),
          direction: newDirection,
          isMoving,
          frame: (prevPos.frame + (isMoving ? 1 : 0)) % 4  // 4-frame animation cycle
        };
      });
    }, 200); // Movement update interval - เร็วขึ้น
    return () => clearInterval(moveInterval);
  }, [mapWidth, mapHeight, character.speed, charSizeW, charSizeH]);

  // Sprite animation styles - creating a basic walking animation
  const getSpriteStyles = () => {
    // Different sprite poses based on frame
    const frameOffset = position.frame * 2;
    
    return {
      transform: `scale(${position.direction === 'left' ? -1 : 1}, 1) translateY(${position.isMoving ? (position.frame % 2) * -2 : 0}px)`,
      transition: `transform ${character.animSpeed} ease`
    };
  };

  return (
    <div 
      className={`absolute shadow-md transition-all duration-300 overflow-hidden border-2 border-t-purple-300 border-l-purple-300 border-r-purple-800 border-b-purple-800 flex items-center justify-center ${character.color} rounded-pixel-sm`}
      style={{ 
        left: `${position.left}px`, 
        top: `${position.top}px`,
        width: `${charSizeW}px`,
        height: `${charSizeH}px`,
      }}
    >
      <div 
        className="text-2xl md:text-3xl" 
        style={getSpriteStyles()}
      >
        {character.icon}
      </div>
      {/* Shadow beneath character */}
      <div className="absolute bottom-0 w-4/5 h-1 bg-black rounded-full opacity-30"></div>
    </div>
  );
}

// เพิ่ม Pixel Item component
function PixelItem({ itemType, mapWidth, mapHeight }: { itemType: number, mapWidth: number, mapHeight: number }) {
  const items = [
    { icon: '💎', color: 'text-blue-400', size: 'text-lg', glow: 'blue' },
    { icon: '⭐', color: 'text-yellow-400', size: 'text-xl', glow: 'yellow' },
    { icon: '🍄', color: 'text-red-400', size: 'text-lg', glow: 'red' },
    { icon: '🔮', color: 'text-purple-400', size: 'text-lg', glow: 'purple' }
  ];

  const item = items[itemType % items.length];
  
  const [position] = useState({
    left: Math.random() * (mapWidth - 30),
    top: Math.random() * (mapHeight - 30)
  });

  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setHovering(prev => !prev);
    }, 1000 + Math.random() * 500);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className={`absolute ${item.size} ${item.color}`}
      style={{ 
        left: `${position.left}px`, 
        top: `${position.top}px`,
        filter: `drop-shadow(0 0 3px ${item.glow})`,
        transform: `translateY(${hovering ? -3 : 0}px)`,
        transition: 'transform 1s ease-in-out'
      }}
    >
      {item.icon}
    </div>
  );
}

// เพิ่ม Mini Map component
function MiniMap() {
  return (
    <div className="absolute top-2 right-2 w-20 h-20 bg-black bg-opacity-40 border border-pixel-purple-medium rounded-sm overflow-hidden p-1">
      <div className="w-full h-full relative">
        {/* Map dots */}
        <div className="absolute w-2 h-2 bg-pixel-accent rounded-full" style={{ top: '30%', left: '20%' }}></div>
        <div className="absolute w-1 h-1 bg-pixel-accent rounded-full" style={{ top: '50%', left: '40%' }}></div>
        <div className="absolute w-1 h-1 bg-pixel-accent rounded-full" style={{ top: '70%', left: '60%' }}></div>
        <div className="absolute w-2 h-2 bg-purple-400 rounded-full" style={{ top: '40%', left: '80%' }}></div>
        
        {/* Player position */}
        <div className="absolute w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ top: '50%', left: '50%' }}></div>
      </div>
    </div>
  );
}

// เพิ่ม Game Menu component
function GameMenu() {
  return (
    <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 border border-pixel-purple-medium rounded-sm p-1 text-xs text-pixel-accent font-vt323">
      <div className="flex space-x-2">
        <span className="px-1 border border-pixel-purple-medium hover:bg-pixel-purple-medium cursor-pointer">MENU</span>
        <span className="px-1 border border-pixel-purple-medium hover:bg-pixel-purple-medium cursor-pointer">INV</span>
        <span className="px-1 border border-pixel-purple-medium hover:bg-pixel-purple-medium cursor-pointer">MAP</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const [nftCount, setNftCount] = useState(0);
  const [isLoadingNftCount, setIsLoadingNftCount] = useState(true);
  const [errorLoadingNftCount, setErrorLoadingNftCount] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const previewImages = ['1.png','2.png','3.png','4.png','5.png'];
  const [currentPreview, setCurrentPreview] = useState(0);
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null);
  const prevPreview = () => setCurrentPreview((prev) => (prev + previewImages.length - 1) % previewImages.length);
  const nextPreview = () => setCurrentPreview((prev) => (prev + 1) % previewImages.length);
  const router = useRouter();
  
  // ข้อมูลคุณสมบัติของ NFT แบบตัวอย่าง - ทำให้กระชับขึ้น
  const features = [
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
  
  // คำอธิบายฟีเจอร์แบบสั้น
  const shortDescriptions = [
    "Earn point over time and compete for rewards in the MonadWorld ecosystem.",
    "6 rarity levels from Common to Ultra Rare, each with unique properties.",
    "Join other collectors in an interactive pixel world built on Monad.",
    "Get exclusive benefits based on your NFT collection and point."
  ];

  // Toggle feature expansion
  const toggleFeatureDetails = (index: number) => {
    if (index === 2) return; // ไม่ให้คลิกได้สำหรับ INTERACTIVE WORLD
    setSelectedFeature(index);
    setShowFeatureModal(true);
    // ควบคุม scroll ของ body
    document.body.style.overflow = 'hidden';
  };
  
  // ฟังก์ชันปิด modal
  const closeFeatureModal = () => {
    setShowFeatureModal(false);
    // คืนค่า scroll ของ body
    document.body.style.overflow = 'auto';
  };

  // Feature rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [features.length]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchUserNftCount = useCallback(async () => {
    if (!isConnected || !address) {
      setNftCount(0); setIsLoadingNftCount(false); return;
    }
    setIsLoadingNftCount(true); setErrorLoadingNftCount(null);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      if (!apiBaseUrl) throw new Error("API Base URL not configured");
      const response = await fetch(`${apiBaseUrl}/api/nfts/owner/${address}?page=1&limit=1`); 
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const responseData: NftApiResponse = await response.json();
      if (responseData && typeof responseData.totalItems === 'number') {
        setNftCount(responseData.totalItems);
      } else { throw new Error("Unexpected API response for NFT count."); }
    } catch (error: any) {
      console.error("Error fetching NFT count:", error); setErrorLoadingNftCount(error.message); setNftCount(0);
    } finally { setIsLoadingNftCount(false); }
  }, [isConnected, address]);

  useEffect(() => {
    if (isMounted && isConnected && address) fetchUserNftCount();
    else if (!isConnected && isMounted) {setNftCount(0); setIsLoadingNftCount(false);}
  }, [isMounted, isConnected, address, fetchUserNftCount]);

  const handleViewCollection = () => {
    router.push('/collect');
  };

  const handleEnterWorld = () => {
    router.push('/world');
  };

  if (!isMounted) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-5rem)] font-vt323 text-pixel-purple-light text-2xl"><p>⏳ Initializing MonadWorld...</p></div>;
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] relative overflow-hidden">
      {/* Hero Section */}
      <div className="bg-pixel-purple-dark py-6 md:py-8 lg:py-12 border-b border-white" style={{ paddingBottom: '10px' }}>
        <div className="container mx-auto px-4 flex flex-col items-center justify-between gap-8 md:gap-12 lg:gap-16">
          <div className="w-full text-center mb-2">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-pixel-accent mb-3 font-press-start text-shadow-pixel">WELCOME TO MONADWORLD</h1>
          </div>
          
          {/* Game Preview Slider */}
          <div className="w-full flex items-center justify-center mb-4 md:mb-6 lg:mb-8" style={{ paddingBottom: '10px' }}>
            <button 
              onClick={prevPreview} 
              className="text-2xl md:text-3xl lg:text-4xl text-pixel-accent hover:text-yellow-300 transition-colors duration-150 mr-2 md:mr-4 focus:outline-none z-10"
              aria-label="Previous preview"
            >
              ‹
            </button>
            
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[420px] lg:h-[420px] xl:w-[520px] xl:h-[520px]">
              {/* Pixel art frame - Black outer border */}
              <div className="absolute inset-0 border-2 md:border-4 border-black z-5"></div>
              
              {/* Black corner blocks */}
              <div className="absolute top-0 left-0 w-2 h-2 md:w-3 md:h-3 bg-black z-10"></div>
              <div className="absolute top-0 right-0 w-2 h-2 md:w-3 md:h-3 bg-black z-10"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 md:w-3 md:h-3 bg-black z-10"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 md:w-3 md:h-3 bg-black z-10"></div>
              
              {/* White pixels at inner corners with pulse animation */}
              <div className="absolute top-2 left-2 md:top-3 md:left-3 w-1 h-1 md:w-2 md:h-2 bg-white z-15 animate-pulse-slow"></div>
              <div className="absolute top-2 right-2 md:top-3 md:right-3 w-1 h-1 md:w-2 md:h-2 bg-white z-15 animate-pulse-slow" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3 w-1 h-1 md:w-2 md:h-2 bg-white z-15 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
              <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 w-1 h-1 md:w-2 md:h-2 bg-white z-15 animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
              
              {/* Image container with proper spacing */}
              <div className="absolute top-3 left-3 right-3 bottom-3 md:top-5 md:left-5 md:right-5 md:bottom-5 bg-black overflow-hidden z-1">
                <img 
                  src={`/NEW LILNAD MINTED/${previewImages[currentPreview]}`}
                  alt={`Game preview ${currentPreview + 1}`}
                  className="w-full h-full object-cover block transition-opacity duration-300 ease-in-out"
                  key={currentPreview}
                />
              </div>
            </div>
            
            <button 
              onClick={nextPreview} 
              className="text-2xl md:text-3xl lg:text-4xl text-pixel-accent hover:text-yellow-300 transition-colors duration-150 ml-2 md:ml-4 focus:outline-none z-10"
              aria-label="Next preview"
            >
              ›
            </button>
          </div>
          
          {/* Slide indicator dots */}
          <div className="flex justify-center space-x-2 mb-8 md:mb-12 lg:mb-20">
            {previewImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPreview(index)}
                className={`w-2 h-2 md:w-3 md:h-3 rounded-full focus:outline-none transition-colors duration-200 ${
                  currentPreview === index 
                    ? 'bg-pixel-accent' 
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-5 flex-wrap justify-center mt-8 md:mt-12 lg:mt-20" style={{ marginTop: '15px' }}>
            <button 
              onClick={() => setShowMintModal(true)}
              className="px-3 py-2 sm:px-4 sm:py-3 md:px-5 md:py-3 bg-pixel-accent text-black text-sm sm:text-base md:text-lg font-press-start font-bold rounded-none hover:bg-yellow-400 transition-all duration-150 shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] border-b-2 border-r-2 border-amber-700"
            >
              <span className="hidden sm:inline">MINT YOUR FIRST NFT</span>
              <span className="sm:hidden">MINT NFT</span>
              <span className="ml-2 inline-block">→</span>
            </button>
            
            {isConnected && nftCount > 0 && (
              <button 
                onClick={handleViewCollection}
                className="px-3 py-2 sm:px-4 sm:py-3 md:px-5 md:py-3 bg-pixel-purple-medium text-pixel-accent text-sm sm:text-base md:text-lg font-vt323 font-bold rounded-none hover:bg-purple-700 transition-all duration-150 shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] border-b-2 border-r-2 border-purple-900"
              >
                <span className="hidden sm:inline">VIEW YOUR COLLECTION</span>
                <span className="sm:hidden">VIEW COLLECTION</span>
                <span className="ml-2 inline-block">→</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="page-features-section py-6 md:py-8 lg:py-12 bg-pixel-purple-dark border-t-4 border-b-4 border-pixel-purple-medium">
        <div className="container mx-auto px-4" style={{ marginTop: '10px' }}>
          <div className="text-center mb-6 md:mb-8 lg:mb-10">
            <h2 className="inline-block px-4 py-2 md:px-6 md:py-2 text-lg sm:text-xl md:text-2xl lg:text-3xl font-press-start text-white">
              LILNAD NFT FEATURES
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="relative overflow-hidden flex flex-col w-full mx-auto min-h-[280px] sm:min-h-[300px] md:min-h-[320px]"
                style={{ marginBottom: "15px" }}
              >
                {/* Pixel dot in top-left corner - Adjusted for border */}
                <div className="absolute top-[4px] left-[4px] w-2 h-2 bg-white z-10"></div>
                {/* Pixel dot in top-right corner - Adjusted for border */}
                <div className="absolute top-[4px] right-[4px] w-2 h-2 bg-white z-10"></div>
                
                {/* Header - Purple background with yellow text */}
                <div className="bg-pixel-purple-medium py-4 md:py-5 px-3 flex justify-center items-center border-b-2 border-black">
                  <h3 className="text-center text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-press-start text-pixel-accent whitespace-pre-line leading-tight">
                    {feature.title}
                  </h3>
                </div>
                
                {/* Content - Black background with centered text */}
                <div className="bg-black p-3 md:p-4 lg:p-6 flex-grow flex flex-col justify-between items-center text-center">
                  <div className="w-full flex-grow flex items-center justify-center">
                    <p className="text-pixel-accent font-vt323 text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl leading-relaxed text-center px-2 md:px-3 lg:px-6">
                      {feature.description}
                    </p>
                  </div>
                  
                  {/* Learn More button */}
                  <div className="mt-3 md:mt-4 w-full">
                    <button 
                      onClick={() => toggleFeatureDetails(index)} 
                      className={`w-full font-pixel text-sm sm:text-base md:text-lg py-2 text-center shadow-pixel border-b-4 border-r-4 border-black transition-colors duration-150 ${
                        index === 2 
                          ? "bg-purple-400 text-white hover:bg-purple-500 soon-button" 
                          : "bg-pixel-accent text-black hover:bg-yellow-400"
                      }`}
                    >
                      {index === 2 ? "SOON!" : "LEARN MORE →"}
                    </button>
                  </div>
                </div>
                
                {/* Pixel dot in bottom-right corner - Adjusted for border */}
                <div className="absolute bottom-[4px] right-[4px] w-2 h-2 bg-white z-10"></div>
                {/* Pixel dot in bottom-left corner - Adjusted for border */}
                <div className="absolute bottom-[4px] left-[4px] w-2 h-2 bg-white z-10"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Mint Modal */}
      <MintModal isOpen={showMintModal} onClose={() => setShowMintModal(false)} />
      
      {/* Feature Details Modal */}
      {showFeatureModal && selectedFeature !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto animate-fadeIn" onClick={closeFeatureModal}>
          <div className="relative z-10 w-[480px] bg-pixel-purple-dark border-4 border-pixel-purple-medium rounded-none p-6 overflow-hidden shadow-xl animate-scaleIn mx-auto my-0" onClick={e => e.stopPropagation()}>
            {/* Pixel dots in corners */}
            <div className="absolute top-2 left-2 w-3 h-3 bg-pixel-accent"></div>
            <div className="absolute top-2 right-2 w-3 h-3 bg-pixel-accent"></div>
            <div className="absolute bottom-2 left-2 w-3 h-3 bg-pixel-accent"></div>
            <div className="absolute bottom-2 right-2 w-3 h-3 bg-pixel-accent"></div>
            
            {/* Modal Header */}
            <div className="flex justify-center items-center mb-6">
              <h2 className="text-2xl font-press-start text-pixel-accent whitespace-pre-line leading-tight text-center">
                {features[selectedFeature].title}
              </h2>
            </div>
            
            {/* Divider */}
            <div className="border-b-2 border-pixel-purple-medium mb-6 w-1/2 mx-auto"></div>
            
            {/* Modal Content */}
            <div className="mb-6 px-2">
              <p className="text-white font-vt323 text-xl leading-relaxed">
                {features[selectedFeature].details}
              </p>
            </div>
            
            {/* Button Section */}
            <div className="pt-6 flex justify-center">
              <button
                onClick={closeFeatureModal}
                className="px-8 py-3 bg-pixel-accent text-black font-vt323 text-lg font-bold rounded-none hover:bg-yellow-400 transition-all duration-150 shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] border-b-4 border-r-4 border-amber-700"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Animation Styles - Updated to include new effects */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(20px);
          }
          75% {
            transform: translateY(-5px) translateX(-10px);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(240, 230, 140, 0.7);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(240, 230, 140, 0.4);
          }
        }
        
        @keyframes screenGlow {
          0%, 100% {
            box-shadow: 0 0 5px 2px rgba(138, 43, 226, 0.4), inset 0 0 5px 1px rgba(138, 43, 226, 0.4);
          }
          50% {
            box-shadow: 0 0 8px 3px rgba(138, 43, 226, 0.6), inset 0 0 8px 2px rgba(138, 43, 226, 0.6);
          }
        }
        
        @keyframes textGlow {
          0%, 100% {
            text-shadow: 0 0 4px rgba(240, 230, 140, 0.8);
          }
          50% {
            text-shadow: 0 0 8px rgba(240, 230, 140, 1);
          }
        }
        
        @keyframes flicker {
          0%, 100% {
            opacity: 1;
          }
          96% {
            opacity: 1;
          }
          97% {
            opacity: 0.8;
          }
          98% {
            opacity: 0.9;
          }
          99% {
            opacity: 0.4;
          }
        }
        
        @keyframes featureGlow {
          0%, 100% {
            box-shadow: 0 4px 0 #000;
          }
          50% {
            box-shadow: 0 4px 0 #000, 0 0 8px 2px rgba(138, 43, 226, 0.4);
          }
        }
        
        @keyframes pixelWalk {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
          100% {
            transform: translateY(0);
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        @keyframes flashing {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .soon-button {
          animation: flashing 1.5s ease-in-out infinite;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out forwards;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }
        
        @keyframes bounce {
          from {
            transform: translateY(-50%) translateX(0);
          }
          to {
            transform: translateY(-30%) translateX(5px);
          }
        }
      `}</style>
    </div>
  );
}