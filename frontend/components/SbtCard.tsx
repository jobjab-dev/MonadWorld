'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { LILNAD_NFT_ADDRESS, LilnadNFTAbi } from '@/lib/contracts';
import { monadTestnet } from '@/lib/chains';
import { useEffect, useState } from 'react';
import { formatEther } from 'viem';

// Expected structure for sbtInfo from props (raw data from contract)
interface SbtInfoProp {
  startTimestamp: string;
  lastCollect: string;
  collected: string;
  isDead: boolean; // Raw isDead from contract
}

// Expected structure for rankData from props (cached S, T values)
interface RankDataProp {
  S: string;
  T: string;
}

// Expected structure for calculated values from backend
interface CalculatedValuesProp {
  isActuallyDead: boolean;       // Calculated by backend
  collectableNow: string;      // Calculated by backend (as string)
  totalAccrued: string;        // Calculated by backend (as string)
}

interface SbtCardProps {
  tokenId: string;
  initialRank: number;
  initialMetadataUri: string | null;
  initialSbtInfo: SbtInfoProp | null;
  initialRankData: RankDataProp | null;
  initialCalculated: CalculatedValuesProp | null; // << ADDED: Values calculated by backend
  onCollectSuccess: () => void;
  hadBackendError?: boolean;
  backendErrorMessage?: string;
}

// Solidity constant - ACCRUAL_WINDOW_SECS might still be useful for display or minor client-side logic if any remains
// const ACCRUAL_WINDOW_SECS = 24 * 60 * 60; 
// calculateCollectable function is now removed as backend handles this.

export default function SbtCard({ 
  tokenId, 
  initialRank, 
  initialMetadataUri, 
  initialSbtInfo, 
  // initialRankData, // No longer directly used if all calculations are from initialCalculated
  initialCalculated,
  onCollectSuccess,
  hadBackendError,
  backendErrorMessage
}: SbtCardProps) {
  // Safely convert tokenId string to BigInt (strip non-digits fallback)
  let tokenIdBigInt: bigint;
  try {
    tokenIdBigInt = BigInt(tokenId);
  } catch {
    // Remove any non-digit characters (e.g. accidental suffixes) then convert
    const numericPart = tokenId.replace(/\D/g, '');
    tokenIdBigInt = numericPart ? BigInt(numericPart) : BigInt(0);
  }
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Display values derived from props, especially initialCalculated
  const isDeadDisplay = initialCalculated?.isActuallyDead ?? initialSbtInfo?.isDead ?? true; // Fallback to true if no data
  const collectableNowBigInt = BigInt(initialCalculated?.collectableNow || '0');
  const scoreCollectedBigInt = BigInt(initialSbtInfo?.collected || '0'); // Actual collected in contract
  // const totalAccruedBigInt = BigInt(initialCalculated?.totalAccrued || '0'); // Total = collected in contract + what is available now

  // 1. Fetch Metadata (Image, etc.) from initialMetadataUri
  useEffect(() => {
    setImageUrl(null); 
    setMetadataError(null);
    if (initialMetadataUri) {
      // console.log(`SbtCard Token ${tokenId} received initialMetadataUri:`, initialMetadataUri); // Keep for debugging
      fetch(initialMetadataUri)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status} fetching metadata`);
          return res.json();
        })
        .then(data => {
          if (data.image) setImageUrl(data.image);
          else setMetadataError('Metadata missing image URL.');
        })
        .catch(err => {
          console.error(`Failed to fetch metadata for ${tokenId} from ${initialMetadataUri}:`, err);
          setMetadataError(`Failed to load metadata (${err.message})`);
        });
    } else if (!hadBackendError) { 
        setMetadataError('Metadata URI not provided.');
    }
  }, [initialMetadataUri, tokenId, hadBackendError]);

  // Calculate collectable amount related state is removed as it comes from props.initialCalculated
  // Periodic update (lastUpdateTime) is also removed.

  // 2. Handle Collect Transaction
  const { writeContractAsync: collectWrite, isPending: isCollecting, error: collectError } = useWriteContract();
  const [collectTxHash, setCollectTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isWaitingCollectTx, isSuccess: collectTxSuccess } = useWaitForTransactionReceipt({
      hash: collectTxHash,
      chainId: monadTestnet.id
  });

  const handleCollect = async () => {
      // Use calculated values for checks. Ensure collectableNow is positive.
      if (isDeadDisplay || collectableNowBigInt <= BigInt(0)) return;

      setCollectTxHash(undefined);
      try {
          const hash = await collectWrite({
              address: LILNAD_NFT_ADDRESS,
              abi: LilnadNFTAbi,
              functionName: 'collect',
              args: [tokenIdBigInt],
              chainId: monadTestnet.id,
          });
          setCollectTxHash(hash);
      } catch (err) {
          console.error("Collect error:", err);
          alert(`Collect failed: ${(err as Error).message}`);
      }
  };

  // 3. Effect to call onCollectSuccess
  useEffect(() => {
      if (collectTxSuccess) {
          onCollectSuccess(); 
          setCollectTxHash(undefined); 
      }
  }, [collectTxSuccess, onCollectSuccess]);

  // --- Rendering Logic ---
  if (hadBackendError) {
    return (
      <div className="p-4 border rounded border-red-700 bg-red-900 text-center text-red-200">
        Error loading on-chain data for NFT #{tokenId}: {backendErrorMessage || 'Unknown error'}
      </div>
    );
  }
  
  // If initialSbtInfo or initialCalculated is missing (and not a backend error reported for the whole list),
  // it implies an issue for this specific NFT that backend might not have caught for the sbtInfo call,
  // or the calculated values couldn't be determined.
  if (!initialSbtInfo || !initialCalculated) {
    return <div className="p-4 border rounded border-gray-700 bg-gray-800 text-center">Loading details for NFT #{tokenId}...</div>;
  }

  // Use initialSbtInfo and initialCalculated for display
  const rankName = ['UR', 'SSR', 'SR', 'R', 'UC', 'C'][initialRank] ?? 'Unknown';
  
  // Values from backend are already strings representing points or full numbers for timestamps
  const scoreCollectedDisplay = initialSbtInfo?.collected || '0'; // This is already string of points
  const collectableNowDisplay = initialCalculated?.collectableNow || '0'; // This is already string of points
  // const totalAccruedDisplay = initialCalculated?.totalAccrued || '0'; // Also string of points
  
  const lastCollectDate = initialSbtInfo ? new Date(Number(initialSbtInfo.lastCollect) * 1000).toLocaleString() : 'N/A';
  const mintedDate = initialSbtInfo ? new Date(Number(initialSbtInfo.startTimestamp) * 1000).toLocaleString() : 'N/A';

  return (
    // Make the card a flex column, adjust width/max-width as needed
    <div className="border-2 border-pixel-purple-medium rounded-pixel-md bg-pixel-bg shadow-pixel flex flex-col text-sm overflow-hidden w-full max-w-[200px] mx-auto m-2">
      {/* Card Header with title */}
      <h2 className="text-lg font-semibold py-2 text-center bg-pixel-purple-dark text-pixel-text border-b border-pixel-purple-medium">Lilnad NFT #{tokenId}</h2>
      
      {/* Image Section - aspect-square should make it a square */}
      {imageUrl ? (
        <div className="relative">
          <img 
              src={imageUrl} 
              alt={`NFT ${tokenId}`} 
              className="w-full aspect-square object-cover shadow-inner" 
          />
          <div className="absolute bottom-0 right-0 bg-pixel-purple-dark px-2 py-1 text-xs text-pixel-text">
            {rankName} ({initialRank})
          </div>
        </div>
      ) : metadataError ? (
          <div className="w-full aspect-square bg-red-900 flex items-center justify-center text-red-200 text-xs p-2">{metadataError}</div>
      ) : (
        <div className="w-full aspect-square bg-gray-700 flex items-center justify-center text-gray-400">Loading Image...</div>
      )}

      {/* Details Section - This will now be below the image */}
      <div className="p-3 space-y-1 flex-grow bg-gray-800">
        <p><span className="font-medium text-pixel-purple-light">Status:</span> {isDeadDisplay ? <span className="text-red-400">Dead</span> : <span className="text-green-400">Alive</span>}</p>
        <p><span className="font-medium text-pixel-purple-light">Score Claimed:</span> {scoreCollectedDisplay}</p>
        <p><span className="font-medium text-pixel-purple-light">Collectable Now:</span> ≈ {collectableNowDisplay}</p>
        <p className="text-xs text-gray-400"><span className="font-medium">Last Collect:</span> {lastCollectDate}</p>
        <p className="text-xs text-gray-400"><span className="font-medium">Minted:</span> {mintedDate}</p>
        {initialMetadataUri && 
          <p className="text-xs text-gray-500 truncate">
            <span className="font-medium">Metadata:</span> 
            <a href={initialMetadataUri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline"> {initialMetadataUri.substring(0, 15)}...</a>
          </p>}
      </div>

      {/* Action Button - Pushed to the bottom if card is flex-col and details has flex-grow */}
      {!isDeadDisplay && collectableNowBigInt > BigInt(0) && (
        <button 
          onClick={handleCollect}
          disabled={isCollecting || isWaitingCollectTx}
          className="w-full px-4 py-2 bg-pixel-accent hover:bg-pixel-purple-light text-black font-semibold disabled:opacity-50 transition-colors duration-150 border-t border-pixel-purple-dark"
        >
          {isCollecting ? 'Confirming...' : (isWaitingCollectTx ? 'Collecting...' : `Collect ${collectableNowDisplay} Score`)} 
        </button>
      )}
      {collectTxHash && (
          <p className="text-xs text-gray-400 mt-1 text-center p-2">Tx: <a href={`${monadTestnet.blockExplorers.default.url}/tx/${collectTxHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{collectTxHash.slice(0,6)}...{collectTxHash.slice(-4)}</a>{isWaitingCollectTx?" (Pending)":" (Confirmed)"}</p>
      )}
      {collectError && <p className="text-xs text-red-500 mt-1 text-center p-2">Error: {collectError.message.length > 100 ? collectError.message.substring(0,100)+"...": collectError.message}</p>}
    </div>
  );
} 