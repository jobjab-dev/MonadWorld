'use client';

import { useState, useEffect } from 'react';
import SbtCard from '../../components/SbtCard';
import { useAccount, usePublicClient } from 'wagmi';
import { LILNAD_NFT_ADDRESS, LilnadNFTAbi } from '@/lib/contracts';
import { monadTestnet } from '@/lib/chains';
import { parseAbiItem } from 'viem';

export default function CollectPage() {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient({ chainId: monadTestnet.id });

  const [userTokenIds, setUserTokenIds] = useState<string[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOwnedNfts = async () => {
      if (!isConnected || !address || !publicClient || chain?.id !== monadTestnet.id) {
        setUserTokenIds([]);
        setIsLoadingTokens(false);
        setLoadingError(null);
        return;
      }

      setIsLoadingTokens(true);
      setLoadingError(null);
      console.log(`Fetching transfer events to ${address} for contract ${LILNAD_NFT_ADDRESS}`);

      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        if (!apiBaseUrl) {
          throw new Error("API Base URL is not configured and window origin unavailable.");
        }
        const response = await fetch(`${apiBaseUrl}/api/nfts/owner/${address}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setUserTokenIds(data.map((nft: any) => nft.tokenId));
      } catch (error: any) {
        console.error("Error fetching NFT Transfer logs:", error);
        setLoadingError(`Failed to load your NFTs. Error: ${error.message}`);
        setUserTokenIds([]);
      } finally {
        setIsLoadingTokens(false);
      }
    };

    fetchOwnedNfts();
  }, [isConnected, address, publicClient, chain?.id]);

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
      ) : userTokenIds.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
          {userTokenIds.map(id => (
            <SbtCard key={id} tokenId={id} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">You do not own any Lilnad NFTs on Monad Testnet.</p>
      )}
    </div>
  );
} 