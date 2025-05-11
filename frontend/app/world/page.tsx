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
    // Placeholder: Simulate loading or set mock data if desired
    // For now, it will just show "Your Lilnads: 0" until contract integration is complete
    // Or, you can fetch from your existing API as a temporary measure:
    /*
    async function fetchSummaryFromApi() {
      if (!isConnected || !address) {
        setIsLoading(false);
        setNftSummary({ totalCount: 0, countByRank: {} });
        return;
      }
      setIsLoading(true);
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin;
        const response = await fetch(`${apiBaseUrl}/api/nfts/owner/${address}?page=1&limit=1000`); // Fetch all for summary
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
    */
  }, [address, isConnected]);

  const renderFrogs = (): React.ReactNode[] => {
    if (!isInitialized || isLoading) return []; // Don't render frogs if not initialized or still loading
    
    const frogs: React.ReactNode[] = [];
    
    Object.entries(nftSummary.countByRank).forEach(([rankStr, count]) => {
      const rank = parseInt(rankStr);
      for (let i = 0; i < count; i++) {
        const delay = Math.random() * 10;
        const duration = 10 + Math.random() * 15;
        const frogSize = Math.max(20, Math.min(28, 26 - Math.min(6, rank * 1.2)));
        
        frogs.push(
          <div
            key={`frog-${rank}-${i}`}
            className="frog-character absolute cursor-pointer"
            style={{
              top: `${Math.random() * 80 + 10}%`,
              left: `${Math.random() * 80 + 10}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              zIndex: Math.floor(Math.random() * 10)
            }}
            onClick={() => setSelectedRank(rank)}
          >
            <div 
              className={`relative ${getRankColor(rank)} rounded-pixel-sm shadow-[2px_2px_0_#000] p-2 border-2 border-t-gray-300 border-l-gray-300 border-r-gray-800 border-b-gray-800`}
              style={{ width: `${frogSize}px`, height: `${frogSize}px` }}
            >
              <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full"></div>
              <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full"></div>
              <div className="absolute bottom-1 left-1/4 right-1/4 h-1 bg-white rounded-full"></div>
            </div>
          </div>
        );
      }
    });
    
    // console.log(`Rendering ${frogs.length} frogs. NFT Summary:`, nftSummary); 
    return frogs;
  };

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

  if (chain?.id !== monadTestnet.id) {
    return (
      <div className="p-10 text-center bg-pixel-bg min-h-screen flex flex-col items-center justify-center">
        <div className="bg-pixel-purple-dark p-8 rounded-pixel-md border-4 border-pixel-purple-medium shadow-pixel max-w-lg">
          <h1 className="text-3xl font-bold text-pixel-accent mb-4">Switch Network</h1>
          <p className="text-pixel-text mb-6">Please switch to Monad Testnet to access MonadWorld.</p>
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
        <p className="text-pixel-text text-center mb-6">Click on a frog to view NFT details</p>
        
        <div className="world-container relative w-full max-w-4xl aspect-video bg-pixel-purple-dark rounded-pixel-md border-4 border-pixel-purple-medium shadow-[6px_6px_0_#000]">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(138, 43, 226, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(138, 43, 226, 0.2) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}></div>
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="bg-black bg-opacity-50 px-4 py-2 rounded-lg border border-pixel-purple-medium">
                <p className="text-pixel-accent">Loading your Lilnad NFTs...</p>
              </div>
            </div>
          )}
          
          {error && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="bg-red-900 p-4 rounded-lg border-2 border-red-700 text-center max-w-sm">
                <p className="text-red-200 font-bold mb-2">Error loading NFT data!</p>
                <p className="text-red-300 text-xs mb-3">{error}</p>
                <button 
                  onClick={() => { /* Placeholder for refetch logic if not using useReadContract */ }}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded-pixel-sm hover:bg-red-500"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
          
          {renderFrogs()}
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
            
            <div className="mb-6 flex items-center">
              <div className={`${getRankColor(selectedRank)} w-16 h-16 rounded-pixel-sm shadow-pixel flex items-center justify-center text-white font-bold text-xl border-2 border-t-gray-300 border-l-gray-300 border-r-gray-800 border-b-gray-800 mr-4`}>
                <div className="relative w-full h-full">
                  <div className="absolute top-2 left-2 w-3 h-3 bg-white rounded-full"></div>
                  <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full"></div>
                  <div className="absolute bottom-2 left-1/4 right-1/4 h-1 bg-white rounded-full"></div>
                </div>
              </div>
              <div>
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
        Explore MonadWorld with your Lilnad NFT frogs! Click on a frog to view details.
      </div>
      
      <style jsx global>{`
        .frog-character {
          animation: hop 10s infinite alternate ease-in-out;
        }
        
        @keyframes hop {
          0%, 20%, 40%, 60%, 80% {
            transform: translateY(0) scale(1);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateY(-10px) scale(1.05);
          }
          5%, 15%, 25%, 35%, 45%, 55%, 65%, 75%, 85%, 95% {
            transform: translateX(10px);
          }
          2%, 12%, 22%, 32%, 42%, 52%, 62%, 72%, 82%, 92% {
            transform: translateX(-10px);
          }
        }
      `}</style>
    </div>
  );
} 