'use client';

import { useState, useEffect, useCallback } from 'react';
import SbtCard from '../../components/SbtCard';
import { useAccount } from 'wagmi';
import { LILNAD_NFT_ADDRESS } from '@/lib/contracts';
import { monadTestnet } from '@/lib/chains';

// Define a type for the enhanced NFT data we expect from the backend
interface EnhancedNftData {
  tokenId: string;
  rank: number;
  metadataUri: string | null; // Changed from metadataUriFromIndexer to match backend key
  sbtInfo: {
    startTimestamp: string;
    lastCollect: string;
    collected: string;
    isDead: boolean;
  } | null;
  rankData: {
    S: string;
    T: string;
  } | null;
  calculated?: { // Make calculated optional as it might not always be there if sbtInfo failed
    isActuallyDead: boolean;
    collectableNow: string;
    totalAccrued: string;
  } | null;
  errorFetchingOnChainData?: boolean;
  errorMessage?: string;
}

// Interface for the API response structure (including pagination)
interface NftApiResponse {
  data: EnhancedNftData[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  message?: string; // Optional message (e.g., "Page out of bounds")
}

export default function CollectPage() {
  const { address, isConnected, chain } = useAccount();

  const [userNfts, setUserNfts] = useState<EnhancedNftData[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchOwnedNfts = useCallback(async (pageToFetch = 1) => {
    if (!isConnected || !address || chain?.id !== monadTestnet.id) {
      setUserNfts([]);
      setIsLoadingTokens(false);
      setLoadingError(null);
      setCurrentPage(1);
      setTotalPages(0);
      setTotalItems(0);
      return;
    }

    setIsLoadingTokens(true);
    setLoadingError(null);
    console.log(`Fetching NFTs for ${address}, page ${pageToFetch}...`);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      if (!apiBaseUrl) {
        throw new Error("API Base URL not configured");
      }

      const response = await fetch(`${apiBaseUrl}/api/nfts/owner/${address}?page=${pageToFetch}&limit=20`);

      if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); } catch (e) { /* ignore */ }
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }

      const responseData: NftApiResponse = await response.json();

      if (responseData && Array.isArray(responseData.data)) {
        setUserNfts(responseData.data);
        setCurrentPage(responseData.currentPage);
        setTotalPages(responseData.totalPages);
        setTotalItems(responseData.totalItems);
        // console.log('Fetched NFTs:', responseData.data); // For debugging individual nft objects
      } else {
        throw new Error("Unexpected API response structure.");
      }
    } catch (error: any) {
      console.error("Error fetching NFTs:", error);
      setLoadingError(error.message);
      setUserNfts([]);
      setCurrentPage(1);
      setTotalPages(0);
      setTotalItems(0);
    } finally {
      setIsLoadingTokens(false);
    }
  }, [isConnected, address, chain?.id]);

  useEffect(() => {
    if (isConnected && address && chain?.id === monadTestnet.id && isMounted) {
      fetchOwnedNfts(1);
    }
  }, [isConnected, address, chain?.id, fetchOwnedNfts, isMounted]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      fetchOwnedNfts(newPage);
    }
  };

  if (!isMounted) { // Avoid rendering dynamic parts until client has mounted
    return <div className="p-10 text-center text-gray-400">Initializing Page...</div>; // Or null, or a basic skeleton
  }

  if (!isConnected) {
    return <div className="p-10 text-center">Please connect your wallet.</div>;
  }

  if (chain?.id !== monadTestnet.id) {
    return <div className="p-10 text-center text-yellow-500">Switch to Monad Testnet.</div>;
  }

  // Decide what to display. For now show ALL NFTs, not only alive.
  const displayNfts = userNfts;

  return (
    <div className="p-4 md:p-10 w-full bg-pixel-bg min-h-screen">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center mb-8">
        <h1 className="text-4xl font-bold text-pixel-accent mb-4 shadow-pixel-text">My Lilnad NFTs ({totalItems})</h1>
        {totalPages > 1 && (
          <div className="my-4 flex justify-center items-center space-x-4 text-pixel-text">
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage <= 1 || isLoadingTokens} 
              className="px-5 py-2 bg-pixel-purple-dark hover:bg-pixel-purple-medium border-2 border-pixel-purple-medium rounded-pixel-md disabled:opacity-50 text-pixel-text font-pixel shadow-pixel transition-all duration-150 hover:shadow-pixel-lg hover:-translate-y-1"
            >
              Previous
            </button>
            <span className="px-4 py-2 bg-pixel-purple-dark border-2 border-pixel-purple-medium rounded-pixel-md font-pixel">Page {currentPage} of {totalPages}</span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage >= totalPages || isLoadingTokens} 
              className="px-5 py-2 bg-pixel-purple-dark hover:bg-pixel-purple-medium border-2 border-pixel-purple-medium rounded-pixel-md disabled:opacity-50 text-pixel-text font-pixel shadow-pixel transition-all duration-150 hover:shadow-pixel-lg hover:-translate-y-1"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {isLoadingTokens && userNfts.length === 0 ? (
        <div className="flex justify-center items-center p-20">
          <div className="text-pixel-text text-xl bg-pixel-purple-dark p-8 rounded-pixel-md border-2 border-pixel-purple-medium shadow-pixel">
            Loading your NFTs...
          </div>
        </div>
      ) : loadingError ? (
        <div className="flex justify-center items-center p-20">
          <div className="text-red-400 text-xl bg-red-900 p-8 rounded-pixel-md border-2 border-red-700 shadow-pixel">
            {loadingError}
          </div>
        </div>
      ) : userNfts.length > 0 ? (
        <div className="flex justify-center w-full">
          <div className="grid grid-cols-4 gap-4 max-w-5xl">
            {displayNfts.map(nft => (
              <SbtCard
                key={nft.tokenId}
                tokenId={nft.tokenId}
                initialRank={nft.rank}
                initialMetadataUri={nft.metadataUri}
                initialSbtInfo={nft.sbtInfo}
                initialRankData={nft.rankData}
                initialCalculated={nft.calculated !== undefined ? nft.calculated : null}
                onCollectSuccess={() => fetchOwnedNfts(currentPage)}
                hadBackendError={nft.errorFetchingOnChainData}
                backendErrorMessage={nft.errorMessage}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-300 text-center">You do not own any Lilnad NFTs on Monad Testnet.</p>
      )}
    </div>
  );
} 