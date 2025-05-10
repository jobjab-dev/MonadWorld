'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { LILNAD_NFT_ADDRESS, LilnadNFTAbi } from '@/lib/contracts';
import { monadTestnet } from '@/lib/chains';
import { useEffect, useState, useMemo } from 'react';
import { formatEther, parseEther } from 'viem';

// Expected structure for sbtInfo from props
interface SbtInfoProp {
  startTimestamp: string;
  lastCollect: string;
  collected: string;
  isDead: boolean;
}

// Expected structure for rankData from props
interface RankDataProp {
  S: string;
  T: string;
}

interface SbtCardProps {
  tokenId: string;
  initialRank: number; // Rank from DB/indexer
  initialMetadataUri: string | null; // URI from indexer (RevealAndMint event or from setBaseURI)
  initialSbtInfo: SbtInfoProp | null; // Null if backend had an error fetching this
  initialRankData: RankDataProp | null; // Null if backend had an error fetching this
  onCollectSuccess: () => void; // Callback to refresh data in CollectPage
  hadBackendError?: boolean; // Optional: flag if backend failed to get sbtInfo/rankData
  backendErrorMessage?: string; // Optional: error message from backend
}

// Solidity constant (should match contract) - Keep for calculateCollectable
const ACCRUAL_WINDOW_SECS = 24 * 60 * 60;

// Helper to calculate collectable amount - Modified to take parsed sbtInfo and rankData
function calculateCollectable(
  sbtInfo: SbtInfoProp | undefined | null, 
  rankData: RankDataProp | undefined | null, 
  currentTimestamp: number
): bigint {
  if (!sbtInfo || !rankData || sbtInfo.isDead) return BigInt(0);

  const startTimestamp = Number(sbtInfo.startTimestamp);
  const lastCollect = Number(sbtInfo.lastCollect);
  const collected = BigInt(sbtInfo.collected);
  const S_val = BigInt(rankData.S);
  const T_val = Number(rankData.T);

  if (T_val === 0) { // If T is 0, it's a one-time collect of S (or remaining S)
      const remainingToCollect = S_val - collected;
      return remainingToCollect > BigInt(0) ? remainingToCollect : BigInt(0);
  }

  const elapsedSinceStart = currentTimestamp - startTimestamp;
  // Check if dead based on current time vs start + T (lifetime)
  if (elapsedSinceStart >= T_val) {
      return BigInt(0); // Already past lifetime based on contract logic (isDead should also be true from sbtInfo)
  }

  const timeSinceLast = currentTimestamp - lastCollect;
  // Accrual window applies from lastCollect time, up to ACCRUAL_WINDOW_SECS
  const effectiveWindow = Math.min(timeSinceLast, ACCRUAL_WINDOW_SECS);
  if (effectiveWindow <= 0) return BigInt(0);

  // Potential accrual based on S * (effectiveWindow / T)
  const potential = (S_val * BigInt(effectiveWindow)) / BigInt(T_val);
  const remainingOverall = S_val - collected;
  
  // Collect the minimum of what has accrued and what is remaining overall
  const toCollect = potential > remainingOverall ? remainingOverall : potential;

  return toCollect > BigInt(0) ? toCollect : BigInt(0);
}

export default function SbtCard({ 
  tokenId, 
  initialRank, 
  initialMetadataUri, 
  initialSbtInfo, 
  initialRankData, 
  onCollectSuccess,
  hadBackendError,
  backendErrorMessage
}: SbtCardProps) {
  const tokenIdBigInt = BigInt(tokenId);
  // State for metadata (image, etc.) - still fetched client-side from URI
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  
  // State for UI based on props and calculations
  const [collectableAmount, setCollectableAmount] = useState<bigint>(BigInt(0));
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now()); // For re-calculating collectable periodically

  // Get current timestamp approximation, updates periodically to refresh collectable amount
  const currentTimestamp = useMemo(() => Math.floor(Date.now() / 1000), [lastUpdateTime]);

  // 1. Fetch Metadata (Image, etc.) from initialMetadataUri
  useEffect(() => {
    setImageUrl(null); // Reset image
    setMetadataError(null);
    if (initialMetadataUri) {
      console.log(`Fetching metadata for token ${tokenId} from: ${initialMetadataUri}`);
      fetch(initialMetadataUri)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status} fetching metadata`);
          return res.json();
        })
        .then(data => {
          console.log(`Metadata for token ${tokenId}:`, data);
          if (data.image) {
            setImageUrl(data.image);
          } else {
            setMetadataError('Metadata missing image URL.');
          }
        })
        .catch(err => {
          console.error(`Failed to fetch metadata for token ${tokenId} from ${initialMetadataUri}:`, err);
          setMetadataError(`Failed to load metadata (${err.message})`);
        });
    } else if (!hadBackendError) { // Only set this error if backend didn't already report one
        setMetadataError('Metadata URI not provided.');
    }
  }, [initialMetadataUri, tokenId, hadBackendError]); // Re-fetch if URI or tokenId changes

  // 2. Calculate collectable amount (derived from props and current time)
  useEffect(() => {
    if (initialSbtInfo && initialRankData) {
      const collectable = calculateCollectable(initialSbtInfo, initialRankData, currentTimestamp);
      setCollectableAmount(collectable);
    }
  }, [initialSbtInfo, initialRankData, currentTimestamp]);

  // 3. Update currentTimestamp periodically to re-calculate collectable amount
  useEffect(() => {
    const interval = setInterval(() => setLastUpdateTime(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  // 4. Handle Collect Transaction (this part remains largely the same)
  const { writeContractAsync: collectWrite, isPending: isCollecting, error: collectError } = useWriteContract();
  const [collectTxHash, setCollectTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isWaitingCollectTx, isSuccess: collectTxSuccess } = useWaitForTransactionReceipt({
      hash: collectTxHash,
      chainId: monadTestnet.id
  });

  const handleCollect = async () => {
      // Use initialSbtInfo for dead check and initialRankData for existence check
      if (!initialSbtInfo || initialSbtInfo.isDead || !initialRankData || collectableAmount <= BigInt(0)) return;

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

  // 5. Effect to call onCollectSuccess (passed from CollectPage) after successful collect
  useEffect(() => {
      if (collectTxSuccess) {
          onCollectSuccess(); // Call the callback to refresh data in CollectPage
          setCollectTxHash(undefined); 
      }
  }, [collectTxSuccess, onCollectSuccess]);


  // --- Rendering Logic ---
  // Loading state is now primarily managed by CollectPage for the list.
  // SbtCard shows loading for its own metadata fetching or if critical data is missing.

  if (hadBackendError) {
    return (
      <div className="p-4 border rounded border-red-700 bg-red-900 text-center text-red-200">
        Error loading on-chain data for NFT #{tokenId} from backend: {backendErrorMessage || 'Unknown error'}
      </div>
    );
  }
  
  if (!initialSbtInfo || !initialRankData) {
    // This case might occur if backend successfully fetched the NFT list but failed for this specific one
    // or if data is just not available for some reason (should be covered by hadBackendError mostly)
    return <div className="p-4 border rounded border-gray-700 bg-gray-800 text-center">Loading on-chain details for NFT #{tokenId}...</div>;
  }

  // Use initialSbtInfo and initialRankData for display
  const rankName = ['UR', 'SSR', 'SR', 'R', 'UC', 'C'][initialRank] ?? 'Unknown'; // Use initialRank from props
  const collectedDisplay = formatEther(BigInt(initialSbtInfo.collected));
  const collectableDisplay = formatEther(collectableAmount);
  const lastCollectDate = new Date(Number(initialSbtInfo.lastCollect) * 1000).toLocaleString();
  const mintedDate = new Date(Number(initialSbtInfo.startTimestamp) * 1000).toLocaleString();
  const isDeadDisplay = initialSbtInfo.isDead;

  return (
    <div className="p-4 border rounded-lg border-gray-700 bg-gray-800 shadow-md w-full max-w-sm text-sm">
      <h2 className="text-lg font-semibold mb-2">Lilnad NFT #{tokenId}</h2>
      {imageUrl ? (
        <img src={imageUrl} alt={`NFT ${tokenId}`} className="w-full h-48 object-cover rounded mb-2" />
      ) : metadataError ? (
          <div className="w-full h-48 bg-red-900 flex items-center justify-center rounded mb-2 text-red-200 text-xs p-2">{metadataError}</div>
      ) : (
        <div className="w-full h-48 bg-gray-700 flex items-center justify-center rounded mb-2 text-gray-400">Loading Image...</div>
      )}
      <div className="space-y-1">
        <p><span className="font-medium text-gray-400">Rank:</span> {rankName} ({initialRank})</p>
        <p><span className="font-medium text-gray-400">Status:</span> {isDeadDisplay ? <span className="text-red-400">Dead</span> : <span className="text-green-400">Alive</span>}</p>
        <p><span className="font-medium text-gray-400">Score Collected:</span> {collectedDisplay}</p>
        <p><span className="font-medium text-gray-400">Collectable Now:</span> ≈ {collectableDisplay}</p>
        <p className="text-xs text-gray-500"><span className="font-medium">Last Collect:</span> {lastCollectDate}</p>
        <p className="text-xs text-gray-500"><span className="font-medium">Minted:</span> {mintedDate}</p>
        {initialMetadataUri && <p className="text-xs text-gray-500 truncate"><span className="font-medium">Metadata:</span> <a href={initialMetadataUri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{initialMetadataUri}</a></p>}
      </div>

      {!isDeadDisplay && collectableAmount > BigInt(0) && (
        <button 
          onClick={handleCollect}
          disabled={isCollecting || isWaitingCollectTx}
          className="mt-4 w-full px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 transition-colors duration-150"
        >
          {isCollecting ? 'Confirming...' : (isWaitingCollectTx ? 'Collecting...' : `Collect ${collectableDisplay} Score`)}
        </button>
      )}
      {collectTxHash && (
          <p className="text-xs text-gray-400 mt-1">Collect Tx: <a href={`${monadTestnet.blockExplorers.default.url}/tx/${collectTxHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{collectTxHash.slice(0,6)}...{collectTxHash.slice(-4)}</a>{isWaitingCollectTx?" (Pending)":" (Confirmed)"}</p>
      )}
      {collectError && <p className="text-xs text-red-500 mt-1">Collect Error: {collectError.message.length > 100 ? collectError.message.substring(0,100)+"...": collectError.message}</p>}
    </div>
  );
} 