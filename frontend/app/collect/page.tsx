'use client';

import { useState, useEffect, useCallback } from 'react';
import SbtCard from '../../components/SbtCard';
import { useAccount, usePublicClient } from 'wagmi';
import { LILNAD_NFT_ADDRESS } from '@/lib/contracts';
import { monadTestnet } from '@/lib/chains';

// Define a type for the enhanced NFT data we expect from the backend
interface EnhancedNftData {
  tokenId: string;
  rank: number;
  metadataUriFromIndexer: string | null; // URI from indexer (RevealAndMint event)
  sbtInfo: {
    startTimestamp: string;
    lastCollect: string;
    collected: string;
    isDead: boolean;
  } | null; // Null if backend had an error fetching this
  rankData: {
    S: string;
    T: string;
  } | null; // Null if backend had an error fetching this
  errorFetchingOnChainData?: boolean;
  errorMessage?: string;
}

export default function CollectPage() {
  const { address, isConnected, chain } = useAccount();
  // publicClient is not directly used anymore for fetching NFT list, but keep if other uses exist or for future
  // const publicClient = usePublicClient({ chainId: monadTestnet.id }); 

  // Changed state to hold the full EnhancedNftData objects
  const [userNfts, setUserNfts] = useState<EnhancedNftData[]>([]); 
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // useCallback to memoize fetchOwnedNfts to prevent re-creation on every render
  // unless its dependencies change. This is good practice for functions passed down as props.
  const fetchOwnedNfts = useCallback(async () => {
    if (!isConnected || !address || chain?.id !== monadTestnet.id) {
      setUserNfts([]);
      setIsLoadingTokens(false);
      setLoadingError(null);
      return;
    }

    setIsLoadingTokens(true);
    setLoadingError(null);
    console.log(`Fetching enhanced NFT data for owner ${address} from backend API...`);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      if (!apiBaseUrl) {
        throw new Error("API Base URL is not configured and window origin unavailable.");
      }
      // The endpoint now returns enhanced data including sbtInfo and rankData
      const response = await fetch(`${apiBaseUrl}/api/nfts/owner/${address}`); 
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) { /* ignore if response is not json */ }
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }
      const data: EnhancedNftData[] = await response.json();
      setUserNfts(data);
      if (data.some(nft => nft.errorFetchingOnChainData)) {
        console.warn("Some NFTs had errors fetching on-chain data from the backend. Check SbtCard props.");
      }
    } catch (error: any) {
      console.error("Error fetching enhanced NFT data from backend:", error);
      setLoadingError(`Failed to load your NFTs. Error: ${error.message}`);
      setUserNfts([]);
    } finally {
      setIsLoadingTokens(false);
    }
  }, [isConnected, address, chain?.id]); // Dependencies for useCallback

  useEffect(() => {
    fetchOwnedNfts();
  }, [fetchOwnedNfts]); // useEffect will re-run if fetchOwnedNfts identity changes (due to its own deps changing)

  if (!isConnected) {
    return <div className="p-10 text-center">Please connect your wallet to view your NFTs.</div>;
  }

  if (chain?.id !== monadTestnet.id) {
    return <div className="p-10 text-center text-yellow-500">Please switch to Monad Testnet to view your Lilnad NFTs.</div>;
  }

  return (
    <div className="p-4 md:p-10 flex flex-col items-center gap-6">
      <h1 className="text-3xl font-bold mb-4">My Lilnad NFTs</h1>

      {isLoadingTokens ? (
        <p className="text-gray-400">Loading your NFTs...</p>
      ) : loadingError ? (
        <p className="text-red-500">{loadingError}</p>
      ) : userNfts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
          {userNfts.map(nft => (
            <SbtCard 
              key={nft.tokenId} 
              tokenId={nft.tokenId} 
              initialRank={nft.rank} 
              initialMetadataUri={nft.metadataUriFromIndexer}
              initialSbtInfo={nft.sbtInfo}
              initialRankData={nft.rankData}
              onCollectSuccess={fetchOwnedNfts} // Pass the memoized fetchOwnedNfts as callback
              // Add a prop to indicate if there was a backend error for this specific NFT
              hadBackendError={nft.errorFetchingOnChainData}
              backendErrorMessage={nft.errorMessage}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">You do not own any Lilnad NFTs on Monad Testnet.</p>
      )}
    </div>
  );
} 