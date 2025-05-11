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
  
  if (!isOpen) return null;
  
  const handleMintClick = () => {
    router.push('/mint');
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-70" onClick={onClose}></div>
      <div className="relative bg-pixel-purple-dark border-4 border-pixel-purple-medium rounded-pixel-md p-6 w-full max-w-lg z-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-pixel text-pixel-accent">Mint Your Lilnad NFT</h2>
          <button onClick={onClose} className="text-white text-2xl hover:text-pixel-accent">&times;</button>
        </div>
        
        <div className="mb-6">
          <p className="text-pixel-text mb-4">Mint your first Lilnad NFT to join the MonadWorld!</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-pixel-purple-medium p-3 rounded-pixel-sm text-center">
              <p className="text-pixel-text font-bold">SBT Collection</p>
              <p className="text-sm text-pixel-text opacity-80">Earn Score Over Time</p>
            </div>
            <div className="bg-pixel-purple-medium p-3 rounded-pixel-sm text-center">
              <p className="text-pixel-text font-bold">Rarity System</p>
              <p className="text-sm text-pixel-text opacity-80">6 Rarity Levels</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center">
          <button 
            onClick={handleMintClick}
            className="px-8 py-3 bg-pixel-accent text-black text-2xl font-pixel font-bold rounded-none hover:bg-yellow-400 transition-colors duration-150 shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] border-b-4 border-r-4 border-amber-700"
          >
            GO TO MINT PAGE <span className="ml-3 inline-block">→</span>
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
    }, 400); // Movement update interval
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
      className={`${character.size} ${character.color} rounded-pixel-sm absolute shadow-md transition-all duration-300 overflow-hidden border-2 border-t-purple-300 border-l-purple-300 border-r-purple-800 border-b-purple-800 flex items-center justify-center`}
      style={{ 
        left: `${position.left}px`, 
        top: `${position.top}px`
      }}
    >
      <div 
        className="text-lg md:text-2xl" 
        style={getSpriteStyles()}
      >
        {character.icon}
      </div>
      {/* Shadow beneath character */}
      <div className="absolute bottom-0 w-4/5 h-1 bg-black rounded-full opacity-30"></div>
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
  const router = useRouter();

  const mapRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setMapDimensions({ width: node.offsetWidth, height: node.offsetHeight });
    }
  }, []);
  
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });

  // ข้อมูลคุณสมบัติของ NFT แบบตัวอย่าง
  const features = [
    {
      title: "Score Accrual",
      description: "Your Lilnad NFT continuously accrues score over time that you can collect and compete for rewards."
    },
    {
      title: "Rarity System",
      description: "Discover NFTs with different rarity levels: Common, Uncommon, Rare, Super Rare, Super Super Rare, and Ultra Rare."
    },
    {
      title: "Interactive World",
      description: "Explore the MonadWorld with your Lilnad NFTs and interact with other collectors in the ecosystem."
    },
    {
      title: "Ecosystem Rewards",
      description: "Earn rewards and exclusive benefits in the MonadWorld ecosystem based on your NFT collection and score."
    }
  ];

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
    return <div className="flex items-center justify-center min-h-[calc(100vh-5rem)] font-pixel text-pixel-purple-light"><p>Initializing MonadWorld...</p></div>;
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] font-pixel relative overflow-hidden">
      {/* Hero Section */}
      <div className="bg-pixel-purple-dark py-16 border-b-4 border-pixel-purple-medium">
        <div className="container mx-auto px-4 flex flex-col items-center justify-between gap-8">
          <div className="w-full text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-pixel-accent mb-4">Welcome to MonadWorld</h1>
            <p className="text-xl text-pixel-text mb-6">Collect, earn, and compete with Lilnad NFTs on the Monad blockchain!</p>
          </div>
          
          {/* Square Game Preview Box */}
          <div className="w-full mb-8">
            <div className="text-center mb-1">
              <span className="text-sm font-pixel text-pixel-accent bg-pixel-purple-dark px-3 py-0.5 border border-pixel-purple-medium inline-block shadow-[1px_1px_0_#000]" style={{ textShadow: '0 0 5px rgba(240,230,140,0.6)' }}>
                GAME PREVIEW
              </span>
            </div>
            <div className="relative w-[560px] h-[560px] mx-auto">
              {/* Game screen container */}
              <div 
                className="absolute inset-0 bg-pixel-purple-dark border-2 border-pixel-purple-medium rounded overflow-hidden shadow-[0_0_8px_rgba(138,43,226,0.5)]"
                style={{
                  boxShadow: '0 0 8px rgba(138,43,226,0.4), inset 0 0 4px rgba(138,43,226,0.4)',
                  backgroundImage: 'radial-gradient(circle at center, rgba(138,43,226,0.1) 0%, rgba(40,20,60,0.5) 100%)'
                }}
              >
                {/* Pixel grid background */}
                <div 
                  className="absolute inset-0" 
                  style={{
                    backgroundImage: 'linear-gradient(rgba(138,43,226,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(138,43,226,0.2) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                    backgroundPosition: '-0.5px -0.5px'
                  }}
                ></div>
                
                {/* Scan lines effect */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-40" 
                  style={{
                    backgroundImage: 'linear-gradient(transparent 0px, rgba(0,0,0,0.05) 1px)',
                    backgroundSize: '2px 2px'
                  }}
                ></div>
              
                {/* Game characters */}
                <div ref={mapRef} className="absolute inset-0">
                  {mapDimensions.width > 0 && (
                    <>
                      {/* Animated pixel characters */}
                      {Array.from({ length: 5 }).map((_, i) => (
                        <PixelCharacter
                          key={i}
                          characterType={i % 4}
                          mapWidth={mapDimensions.width}
                          mapHeight={mapDimensions.height}
                        />
                      ))}
                      
                      {/* Floating particles */}
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={`particle-${i}`}
                          className={`absolute w-1 h-1 ${i % 2 === 0 ? 'bg-pixel-accent' : 'bg-purple-300'} rounded-full`}
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            opacity: 0.6 + Math.random() * 0.4,
                            animation: `float ${2 + Math.random() * 3}s ease-in-out infinite alternate`,
                            animationDelay: `${Math.random() * 2}s`,
                            boxShadow: '0 0 3px currentColor'
                          }}
                        ></div>
                      ))}
                    </>
                  )}
                </div>
                
                {/* Game UI Elements */}
                <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 px-1 py-0.5 rounded">
                  <span className="text-pixel-accent text-xs font-pixel">
                    MONADWORLD
                  </span>
                </div>
              </div>
              
              {/* Decorative corners */}
              <div className="absolute top-0 left-0 w-2 h-2 bg-white opacity-70"></div>
              <div className="absolute top-0 right-0 w-2 h-2 bg-white opacity-70"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 bg-white opacity-70"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-white opacity-70"></div>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="flex gap-4 flex-wrap justify-center">
            <button 
              onClick={() => setShowMintModal(true)}
              className="px-8 py-3 bg-pixel-accent text-black text-2xl font-pixel font-bold rounded-none hover:bg-yellow-400 transition-colors duration-150 shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] border-b-4 border-r-4 border-amber-700"
            >
              MINT YOUR FIRST NFT <span className="ml-3 inline-block">→</span>
            </button>
            
            {isConnected && nftCount > 0 && (
              <button 
                onClick={handleViewCollection}
                className="px-8 py-3 bg-pixel-purple-medium text-pixel-accent text-2xl font-pixel font-bold rounded-none hover:bg-purple-700 transition-colors duration-150 shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] border-b-4 border-r-4 border-purple-900"
              >
                VIEW YOUR COLLECTION
                <span className="ml-3 inline-block">→</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="py-16 bg-pixel-bg">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-pixel-accent mb-12">Lilnad NFT Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`p-6 border-4 rounded-pixel-md shadow-pixel transition-all duration-300 ${
                  index === activeFeature 
                    ? 'border-pixel-accent bg-pixel-purple-dark scale-105' 
                    : 'border-pixel-purple-medium bg-pixel-purple-dark/60'
                }`}
              >
                <h3 className="text-xl font-bold text-pixel-accent mb-3">{feature.title}</h3>
                <p className="text-pixel-text">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* World Preview Section - Updated */}
      <div className="py-16 bg-pixel-purple-dark border-t-4 border-pixel-purple-medium">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-pixel-accent mb-6">EXPLORE MONADWORLD</h2>
          <p className="text-center text-pixel-text mb-8 max-w-2xl mx-auto">Join a vibrant community of collectors and explorers in the Monad ecosystem.</p>
          
          {/* Enter World Button */}
          <div className="flex justify-center">
            {isConnected && nftCount > 0 ? (
              <button 
                onClick={handleEnterWorld}
                className="px-10 py-4 bg-pixel-accent text-black text-2xl font-pixel font-bold rounded-none hover:bg-yellow-400 transition-colors duration-150 shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] border-b-4 border-r-4 border-amber-700"
              >
                ENTER WORLD <span className="ml-3 inline-block">→</span>
              </button>
            ) : isConnected && nftCount === 0 ? (
              <button 
                onClick={() => setShowMintModal(true)}
                className="px-10 py-4 bg-pixel-accent text-black text-2xl font-pixel font-bold rounded-none hover:bg-yellow-400 transition-colors duration-150 shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] border-b-4 border-r-4 border-amber-700"
              >
                MINT TO ENTER WORLD <span className="ml-3 inline-block">→</span>
              </button>
            ) : (
              <button 
                className="relative inline-flex items-center justify-between px-10 py-4 bg-gray-700 text-gray-400 text-xl font-bold rounded-pixel-sm border-4 border-t-gray-600 border-l-gray-600 border-r-gray-800 border-b-gray-800 shadow-[4px_4px_0_#000] cursor-not-allowed opacity-80"
              >
                CONNECT WALLET TO ENTER <span className="ml-3 inline-block">→</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Call to Action */}
      <div className="py-12 bg-pixel-bg">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-pixel-accent mb-6">READY TO JOIN MONADWORLD?</h2>
          <p className="text-pixel-text mb-8 max-w-2xl mx-auto">Mint your first Lilnad NFT and start your journey in the Monad ecosystem today!</p>
          
          <button 
            onClick={() => setShowMintModal(true)}
            className="px-10 py-4 bg-pixel-accent text-black text-2xl font-pixel font-bold rounded-none hover:bg-yellow-400 transition-colors duration-150 shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] border-b-4 border-r-4 border-amber-700"
          >
            MINT NOW <span className="ml-3 inline-block">→</span>
          </button>
        </div>
      </div>
      
      {/* Mint Modal */}
      <MintModal isOpen={showMintModal} onClose={() => setShowMintModal(false)} />
      
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
        
        @keyframes bounce {
          from {
            transform: translateY(-50%) translateX(0);
          }
          to {
            transform: translateY(-30%) translateX(5px);
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
      `}</style>
    </div>
  );
}