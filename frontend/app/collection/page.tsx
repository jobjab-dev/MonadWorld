'use client';

import { useState, useEffect } from 'react';
import type { EnhancedNftData } from '@/hooks/useOwnedNfts';
import { useOwnedNfts } from '@/hooks/useOwnedNfts';
import SbtCard from '../../components/SbtCard';
import { useAccount, useSwitchChain } from 'wagmi';
import { LILNAD_NFT_ADDRESS } from '@/lib/contracts';
import { monadTestnet } from '@/lib/chains';

export default function CollectionPage() {
  // ✅ 1. Define all useState hooks at the top
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // ✅ 2. All external hooks
  const account = useAccount();
  const { address, isConnected, chain } = account;
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  
  // ✅ 3. Fetch NFTs - will be null if no address (handled inside hook)
  const { nfts, totalPages, totalItems, isLoading, error } = useOwnedNfts(
    mounted && isConnected ? address : undefined, 
    currentPage
  );
  
  // ✅ 4. Effects
  useEffect(() => { setMounted(true); }, []);
  
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  if (!mounted) {
    // Initial fallback matches server render
    return (
      <div className="p-10 min-h-screen flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">⏳</div>
        <div className="text-xl text-pixel-text">Loading collection...</div>
      </div>
    );
  }
  
  if (!isConnected) {
    return (
      <div className="p-10 min-h-screen flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">👛</div>
        <div className="text-xl text-pixel-text mb-2">Please connect your wallet</div>
        <p className="text-pixel-purple-light">Connect your wallet to view your NFT collection</p>
      </div>
    );
  }

  if (chain?.id !== monadTestnet.id) {
    // Add switchNetwork functionality
    const switchToMonad = async () => {
      try {
        await switchChain({ chainId: monadTestnet.id });
      } catch (error) {
        console.error("Failed to switch network:", error);
      }
    };

    return (
      <div className="p-10 min-h-screen flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">⚠️</div>
        <div className="text-xl text-yellow-500 mb-2">Wrong Network</div>
        <p className="text-pixel-purple-light mb-6">Please switch to Monad Testnet to view your collection</p>
        <button
          onClick={switchToMonad}
          disabled={isSwitchingChain}
          className="px-5 py-2 bg-pixel-accent text-black hover:bg-yellow-400 border-2 border-yellow-600 rounded-pixel-md text-pixel-text font-pixel shadow-pixel transition-all duration-150 hover:shadow-pixel-lg hover:-translate-y-1 disabled:opacity-50"
        >
          {isSwitchingChain ? "Switching..." : "Switch to Monad Testnet"}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 w-full bg-pixel-bg min-h-screen">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center mb-8">
        <h1 className="text-4xl font-bold text-pixel-accent mb-4 shadow-pixel-text">My Collection ({totalItems})</h1>
        {/* Summary of Points per minute */}
        <div className="px-4 py-2 bg-pixel-purple-dark border-2 border-pixel-purple-medium rounded-pixel-md text-xl font-pixel text-pixel-text mb-4">
          {(() => {
            // Sum per-NFT rate (totalPoints / lifetimeSecs * 60)
            const totalPointsPerMinute = nfts.reduce((acc: number, nft: EnhancedNftData) => {
              const totalPoints = Number(nft.scorePerSecond);
              const lifetimeSecs = Number(nft.expirationTimestamp) - Number(nft.startTimestamp);
              const rate = lifetimeSecs > 0 ? (totalPoints / lifetimeSecs) * 60 : 0;
              return acc + rate;
            }, 0);
            return <><span className="font-bold text-pixel-accent">Total Points/min:</span> {totalPointsPerMinute.toFixed(2)}</>;
          })()}
        </div>
        {totalPages > 1 && (
          <div className="my-4 flex justify-center items-center space-x-4 text-pixel-text">
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage <= 1 || isLoading} 
              className="px-5 py-2 bg-pixel-purple-dark hover:bg-pixel-purple-medium border-2 border-pixel-purple-medium rounded-pixel-md disabled:opacity-50 text-pixel-text font-pixel shadow-pixel transition-all duration-150 hover:shadow-pixel-lg hover:-translate-y-1"
            >
              Previous
            </button>
            <span className="px-4 py-2 bg-pixel-purple-dark border-2 border-pixel-purple-medium rounded-pixel-md font-pixel">Page {currentPage} of {totalPages}</span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage >= totalPages || isLoading} 
              className="px-5 py-2 bg-pixel-purple-dark hover:bg-pixel-purple-medium border-2 border-pixel-purple-medium rounded-pixel-md disabled:opacity-50 text-pixel-text font-pixel shadow-pixel transition-all duration-150 hover:shadow-pixel-lg hover:-translate-y-1"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-64 bg-pixel-purple-dark animate-pulse rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-red-400 text-center p-8">{error}</div>
      ) : nfts.length > 0 ? (
        <div className="collection-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {nfts.map((nft: EnhancedNftData) => (
            <SbtCard
              key={nft.tokenId}
              tokenId={nft.tokenId}
              initialRank={nft.rank}
              initialStartTimestamp={nft.startTimestamp}
              initialExpirationTimestamp={nft.expirationTimestamp}
              scorePerSecond={nft.scorePerSecond}
              collectableNow={nft.collectableNow}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className="mb-4 text-6xl">🔍</div>
          <p className="text-pixel-accent text-xl font-bold mb-2">No NFTs Found</p>
          <p className="text-gray-300">You do not own any Lilnad NFTs on Monad Testnet.</p>
        </div>
      )}
    </div>
  );
} 