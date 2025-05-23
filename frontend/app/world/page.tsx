'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { monadTestnet } from '@/lib/chains';
import Link from 'next/link';
// import { LILNAD_NFT_ABI, LILNAD_NFT_ADDRESS } from '@/lib/contracts'; // Commented out ABI/Address import

// ข้อมูลสรุป NFT แยกตาม rank
interface NftSummary {
  totalCount: number;
  countByRank: {
    [key: number]: number; // rank -> count
  };
}

// Get color based on rank
const getRankColor = (rank: number): string => {
  switch (rank) {
    case 0: return 'bg-gray-500'; // Common
    case 1: return 'bg-green-500'; // Uncommon
    case 2: return 'bg-blue-500'; // Rare
    case 3: return 'bg-purple-500'; // Super Rare
    case 4: return 'bg-amber-500'; // Super Super Rare
    case 5: return 'bg-red-500'; // Ultra Rare
    default: return 'bg-gray-500';
  }
};

// Get rank name
const getRankName = (rank: number): string => {
  switch (rank) {
    case 0: return 'Common';
    case 1: return 'Uncommon';
    case 2: return 'Rare';
    case 3: return 'Super Rare';
    case 4: return 'Super Super Rare';
    case 5: return 'Ultra Rare';
    default: return 'Unknown';
  }
};

// Get rank abbreviation
const getRankAbbreviation = (rank: number): string => {
  switch (rank) {
    case 0: return 'C';
    case 1: return 'UC';
    case 2: return 'R';
    case 3: return 'SR';
    case 4: return 'SSR';
    case 5: return 'UR';
    default: return 'C';
  }
};

export default function WorldPage() {
  const { address, isConnected, chain } = useAccount();
  
  const [nftSummary, setNftSummary] = useState<NftSummary>({
    totalCount: 0,
    countByRank: {}
  });
  
  const [isLoading, setIsLoading] = useState(false); // Set to false initially as we are not loading from contract yet
  const [error, setError] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Commented out useReadContract and related useEffects
  /*
  const { data: contractData, error: contractError, isLoading: isContractLoading, refetch } = useReadContract({
    abi: LILNAD_NFT_ABI, // This would cause an error if ABI is not defined
    address: LILNAD_NFT_ADDRESS,
    functionName: 'getNftsSummary',
    args: [address!],
    chainId: monadTestnet.id,
    query: {
      enabled: !!address && isConnected && chain?.id === monadTestnet.id,
    },
  });

  useEffect(() => {
    setIsLoading(isContractLoading);
    if (contractError) {
      console.error("Error fetching NFT summary from contract:", contractError);
      setError(contractError.message || "Failed to load NFT data from contract");
      setNftSummary({ totalCount: 0, countByRank: {} });
    } else if (contractData) {
      console.log("Contract data received:", contractData);
      const [total, counts] = contractData as [bigint, bigint[]];
      const summary: NftSummary = {
        totalCount: Number(total),
        countByRank: {}
      };
      counts.forEach((count, rank) => {
        if (Number(count) > 0) {
          summary.countByRank[rank] = Number(count);
        }
      });
      console.log("Processed NFT Summary from contract:", summary);
      setNftSummary(summary);
      setError(null);
    }
  }, [contractData, contractError, isContractLoading]);

  useEffect(() => {
    if (isConnected && address && chain?.id === monadTestnet.id) {
      refetch();
    }
  }, [address, isConnected, chain, refetch]);
  */

  useEffect(() => {
    setIsInitialized(true);
    async function fetchSummaryFromApi() {
      if (!isConnected || !address) {
        setIsLoading(false);
        setNftSummary({ totalCount: 0, countByRank: {} });
        return;
      }
      setIsLoading(true);
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin;
        const response = await fetch(`${apiBaseUrl}/api/nfts/owner/${address}?page=1&limit=1000`);
        if (!response.ok) throw new Error('Failed to fetch from API');
        const data = await response.json();
        if (data && Array.isArray(data.data)) {
          const liveNfts = data.data.filter((nft: any) => !nft.sbtInfo?.isDead && !nft.calculated?.isActuallyDead);
          const summary: NftSummary = { totalCount: liveNfts.length, countByRank: {} };
          liveNfts.forEach((nft: any) => {
            const rank = nft.rank || 0;
            summary.countByRank[rank] = (summary.countByRank[rank] || 0) + 1;
          });
          setNftSummary(summary);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSummaryFromApi();
  }, [address, isConnected]);

  const renderCharacters = (): React.ReactNode[] => {
    if (!isInitialized || isLoading) return []; // Don't render characters if not initialized or still loading
    
    const characters: React.ReactNode[] = [];
    
    // Create some characters even if the user doesn't have any NFTs for demonstration
    const defaultCharacters = nftSummary.totalCount > 0 ? 
      nftSummary.countByRank : 
      { 0: 2, 1: 1, 2: 1, 3: 1 }; // Default to some characters if user has none
    
    Object.entries(defaultCharacters).forEach(([rankStr, count]) => {
      const rank = parseInt(rankStr);
      const rankAbbr = getRankAbbreviation(rank);
      
      for (let i = 0; i < count; i++) {
        const delay = Math.random() * 10;
        const duration = 20 + Math.random() * 30;
        const characterSize = Math.max(50, Math.min(80, 80 - (rank * 5))); // Size based on rarity
        const speed = 0.5 + (rank * 0.15); // Higher rank characters move faster
        
        characters.push(
          <div
            key={`character-${rank}-${i}`}
            className="character absolute cursor-pointer"
            style={{
              top: `${Math.random() * 70 + 15}%`,
              left: `${Math.random() * 70 + 15}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              zIndex: Math.floor(Math.random() * 10) + 10,
              '--character-speed': `${speed}`, // Custom property for speed
            } as React.CSSProperties}
            onClick={() => setSelectedRank(rank)}
          >
            <div className="character-wrapper relative">
              <img 
                src={`/character/${rankAbbr}.png`} 
                alt={`${getRankName(rank)} Character`}
                className="pixelated"
                style={{ 
                  width: `${characterSize}px`, 
                  height: `${characterSize}px`,
                  objectFit: 'contain'
                }}
              />
              <div className={`character-rank absolute -top-2 -right-2 ${getRankColor(rank)} text-white text-xs font-bold px-1 rounded-full border border-white`}>
                {rankAbbr}
              </div>
            </div>
          </div>
        );
      }
    });

    // Add some NPC characters
    for (let i = 0; i < 4; i++) {
      const delay = Math.random() * 10;
      const duration = 20 + Math.random() * 30;
      const characterSize = 60;
      
      characters.push(
        <div
          key={`npc-${i}`}
          className="character absolute cursor-pointer"
          style={{
            top: `${Math.random() * 70 + 15}%`,
            left: `${Math.random() * 70 + 15}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            zIndex: 5,
          }}
        >
          <div className="character-wrapper relative">
            <img 
              src="/character/F.png" 
              alt="NPC Character"
              className="pixelated"
              style={{ 
                width: `${characterSize}px`, 
                height: `${characterSize}px`,
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
      );
    }
    
    return characters;
  };

  // Require wallet connection to view the world
  if (!isConnected) {
    return (
      <div className="p-10 text-center bg-pixel-bg min-h-screen flex flex-col items-center justify-center">
        <div className="bg-pixel-purple-dark p-8 rounded-pixel-md border-4 border-pixel-purple-medium shadow-pixel max-w-lg">
          <h1 className="text-3xl font-bold text-pixel-accent mb-4">Connect Your Wallet</h1>
          <p className="text-pixel-text mb-6">Please connect your wallet to enter MonadWorld and see your Lilnad NFTs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-pixel-bg min-h-screen flex flex-col">
      <div className="p-4 bg-pixel-purple-dark border-b-4 border-pixel-purple-medium">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-pixel-accent">MonadWorld</h1>
          <div className="text-pixel-text font-pixel">
            Your Lilnads: <span className="text-pixel-accent">{nftSummary.totalCount}</span>
          </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col items-center p-4">
        <h2 className="text-2xl text-pixel-accent font-pixel mb-4 uppercase text-center">YOUR LILNAD NFT COLLECTION</h2>
        <p className="text-pixel-text text-center mb-6">Click on a character to view NFT details</p>
        
        <div className="world-container relative w-full max-w-5xl aspect-video bg-pixel-purple-dark rounded-pixel-md border-4 border-pixel-purple-medium overflow-hidden shadow-[6px_6px_0_#000]">
          {/* World background with grid */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(138, 43, 226, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(138, 43, 226, 0.1) 1px, transparent 1px)',
            backgroundSize: '32px 32px, 32px 32px',
            backgroundPosition: '0 0, 0 0'
          }}></div>
          
          {/* World terrain */}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-purple-900 opacity-30"></div>
          <div className="absolute bottom-[20px] left-[10%] w-[20%] h-4 bg-purple-900 opacity-30 rounded-t-md"></div>
          <div className="absolute bottom-[20px] right-[20%] w-[15%] h-3 bg-purple-900 opacity-30 rounded-t-md"></div>
          
          {/* Decorative elements */}
          <div className="absolute left-[10%] top-[20%] w-16 h-16 bg-purple-800 rounded-full opacity-20"></div>
          <div className="absolute right-[15%] bottom-[25%] w-12 h-12 bg-purple-600 rounded-full opacity-15"></div>
          <div className="absolute left-[30%] bottom-[10%] w-20 h-6 bg-purple-900 rounded-sm opacity-30"></div>
          <div className="absolute right-[25%] top-[15%] w-24 h-8 bg-purple-700 rounded-sm opacity-25"></div>
          
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black bg-opacity-50">
              <div className="bg-pixel-purple-dark px-6 py-4 rounded-lg border-2 border-pixel-purple-medium">
                <p className="text-pixel-accent text-lg animate-pulse">Loading MonadWorld...</p>
              </div>
            </div>
          )}
          
          {/* Error message */}
          {error && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black bg-opacity-50">
              <div className="bg-red-900 p-4 rounded-lg border-2 border-red-700 text-center max-w-sm">
                <p className="text-red-200 font-bold mb-2">Error loading NFT data!</p>
                <p className="text-red-300 text-xs mb-3">{error}</p>
                <button 
                  onClick={() => { /* Placeholder for refetch logic */ }}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded-pixel-sm hover:bg-red-500"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
          
          {/* Render NFT characters */}
          {renderCharacters()}
        </div>
        
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 max-w-4xl">
          {Object.entries(nftSummary.countByRank).map(([rankStr, count]) => {
            const rank = parseInt(rankStr);
            if (count === 0) return null;
            return (
              <div 
                key={`stat-${rank}`}
                className={`${getRankColor(rank)} p-2 rounded-pixel-sm border-2 border-t-gray-300 border-l-gray-300 border-r-gray-800 border-b-gray-800 text-center cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => setSelectedRank(rank)}
              >
                <div className="text-white font-pixel">
                  <div className="text-sm">{getRankName(rank)}</div>
                  <div className="text-xl font-bold">{count}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Character details modal */}
      {selectedRank !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 p-4">
          <div className="bg-pixel-purple-dark rounded-pixel-md border-4 border-pixel-purple-medium p-6 shadow-pixel max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-pixel-accent">{getRankName(selectedRank)} Lilnads</h3>
              <button 
                onClick={() => setSelectedRank(null)}
                className="text-pixel-text hover:text-pixel-accent text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-6 flex items-center justify-center">
              <div className="relative">
                <img 
                  src={`/character/${getRankAbbreviation(selectedRank)}.png`} 
                  alt={`${getRankName(selectedRank)} Character`}
                  className="pixelated w-32 h-32 object-contain"
                />
                <div className={`absolute -top-2 -right-2 ${getRankColor(selectedRank)} text-white font-bold px-2 py-1 rounded-full border border-white`}>
                  {getRankAbbreviation(selectedRank)}
                </div>
              </div>
              <div className="ml-6">
                <div className="text-pixel-text">Rank</div>
                <div className="text-xl text-pixel-accent">{getRankName(selectedRank)}</div>
                <div className="text-pixel-text mt-1">Count</div>
                <div className="text-lg text-pixel-accent">{nftSummary.countByRank[selectedRank] || 0}</div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Link 
                href="/collect"
                className="flex-1 px-4 py-3 bg-pixel-accent text-black text-center font-bold rounded-pixel-sm shadow-[3px_3px_0_#000] hover:shadow-[1px_1px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                View Collection
              </Link>
              <Link 
                href="/mint"
                className="flex-1 px-4 py-3 bg-pixel-purple-medium text-pixel-accent text-center font-bold rounded-pixel-sm shadow-[3px_3px_0_#000] hover:shadow-[1px_1px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Mint Another
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 bg-pixel-purple-dark border-t-4 border-pixel-purple-medium text-center text-pixel-text text-sm">
        Explore MonadWorld with your Lilnad NFT characters! Click on a character to view details.
      </div>
      
      <style jsx global>{`
        .character {
          animation-name: walk;
          animation-iteration-count: infinite;
          animation-direction: alternate;
          animation-timing-function: ease-in-out;
        }
        
        .character-wrapper {
          animation: bounce 0.5s infinite alternate ease-in-out;
        }
        
        .pixelated {
          image-rendering: pixelated;
        }
        
        @keyframes walk {
          0%, 100% {
            transform: translateX(0) scaleX(1);
          }
          25% {
            transform: translateX(calc(var(--character-speed, 1) * 100px)) scaleX(1);
          }
          26% {
            transform: translateX(calc(var(--character-speed, 1) * 100px)) scaleX(-1);
          }
          50% {
            transform: translateX(0) scaleX(-1);
          }
          51% {
            transform: translateX(0) scaleX(-1);
          }
          75% {
            transform: translateX(calc(var(--character-speed, 1) * -100px)) scaleX(-1);
          }
          76% {
            transform: translateX(calc(var(--character-speed, 1) * -100px)) scaleX(1);
          }
        }
        
        @keyframes bounce {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-3px);
          }
        }
      `}</style>
    </div>
  );
} 