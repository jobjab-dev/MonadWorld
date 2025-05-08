'use client';

import { useAccount, useReadContract, useWriteContract, useBlockNumber, useWaitForTransactionReceipt } from 'wagmi';
import { LILNAD_NFT_ADDRESS, LilnadNFTAbi } from '@/lib/contracts';
import { monadTestnet } from '@/lib/chains';
import { useEffect, useState, useMemo } from 'react';
import { formatEther } from 'viem';
import { ethers } from 'ethers'; // For BigNumber operations if needed, or use native BigInt

interface SbtCardProps {
  tokenId: string;
}

// Define type for the RankInfo struct returned by the contract
type RankInfoType = readonly [S: bigint, T: bigint]; // Assuming S and T are uint256
// Define type for the SBTInfo struct returned by the contract
type SBTInfoType = readonly [
  startTimestamp: bigint,
  lastCollect: bigint,
  collected: bigint,
  isDead: boolean,
  rank: number // Solidity uint8 maps to number
];

// Contract Constant (should match contract)
const ACCRUAL_WINDOW_SECS = 24 * 60 * 60;

// Helper to calculate collectable amount
function calculateCollectable(sbtInfo: SBTInfoType | undefined, rankInfo: RankInfoType | undefined, currentTimestamp: number): bigint {
  if (!sbtInfo || !rankInfo || sbtInfo[3] /* isDead */) return BigInt(0);

  const [_startTimestamp, _lastCollect, _collected, _isDead, _rank] = sbtInfo;
  const [sValue, tValue] = rankInfo;

  const startTimestamp = Number(_startTimestamp);
  const lastCollect = Number(_lastCollect);
  const collected = _collected;
  const S = sValue;
  const T = Number(tValue); // Use T from fetched rankInfo

  if (T === 0) return S - collected > BigInt(0) ? S - collected : BigInt(0);

  const elapsedSinceStart = currentTimestamp - startTimestamp;
  // Check if dead based on current time vs start + T
  if (elapsedSinceStart >= T) {
      return BigInt(0); // Already past lifetime
  }

  const timeSinceLast = currentTimestamp - lastCollect;
  const effectiveWindow = Math.min(timeSinceLast, ACCRUAL_WINDOW_SECS);
  if (effectiveWindow <= 0) return BigInt(0);

  // Use BigInt for calculation
  const potential = (S * BigInt(effectiveWindow)) / BigInt(T);
  const remaining = S - collected;
  const toCollect = potential > remaining ? remaining : potential;

  return toCollect > BigInt(0) ? toCollect : BigInt(0);
}

export default function SbtCard({ tokenId }: SbtCardProps) {
  const tokenIdBigInt = BigInt(tokenId);
  const [metadataUri, setMetadataUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [collectableAmount, setCollectableAmount] = useState<bigint>(BigInt(0));
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());

  // 1. Read SBT Info
  const { data: sbtInfoData, isLoading: isLoadingSbtInfo, error: sbtInfoError, refetch: refetchSbtInfo } = useReadContract({
    address: LILNAD_NFT_ADDRESS,
    abi: LilnadNFTAbi,
    functionName: 'sbtInfo',
    args: [tokenIdBigInt],
    chainId: monadTestnet.id,
  });

  // Extract rank safely after sbtInfoData is loaded
  const rank = useMemo(() => sbtInfoData ? (sbtInfoData as SBTInfoType)[4] : undefined, [sbtInfoData]);

  // 2. Read Rank Data (S and T) based on rank from sbtInfo
  const { data: rankInfoData, isLoading: isLoadingRankInfo, error: rankInfoError } = useReadContract({
    address: LILNAD_NFT_ADDRESS,
    abi: LilnadNFTAbi,
    functionName: 'rankData', // Public mapping generates getter
    args: rank !== undefined ? [rank] : undefined,
    chainId: monadTestnet.id,
  });

  // 3. Read Token URI
  const { data: tokenApiUri, isLoading: isLoadingUri, error: uriError } = useReadContract({
    address: LILNAD_NFT_ADDRESS,
    abi: LilnadNFTAbi,
    functionName: 'tokenURI',
    args: [tokenIdBigInt],
    chainId: monadTestnet.id,
  });

  // 4. Get current timestamp approximation
  const currentTimestamp = useMemo(() => Math.floor(Date.now() / 1000), [lastUpdateTime]);

  // 5. Fetch Metadata
  useEffect(() => {
    const apiUriString = typeof tokenApiUri === 'string' ? tokenApiUri : null;
    if (apiUriString && apiUriString !== metadataUri) {
      setMetadataUri(apiUriString);
      setImageUrl(null); // Reset image while fetching new metadata
      setMetadataError(null);
      console.log(`Fetching metadata for token ${tokenId} from: ${apiUriString}`);
      fetch(apiUriString)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
          console.error(`Failed to fetch metadata for token ${tokenId}:`, err);
          setMetadataError(`Failed to load metadata (${err.message})`);
        });
    }
  }, [tokenApiUri, tokenId, metadataUri]);

  // 6. Calculate collectable amount
  useEffect(() => {
    if (sbtInfoData && rankInfoData) {
      // Cast data to the defined types for type safety
      const collectable = calculateCollectable(sbtInfoData as SBTInfoType, rankInfoData as RankInfoType, currentTimestamp);
      setCollectableAmount(collectable);
    }
  }, [sbtInfoData, rankInfoData, currentTimestamp]);

  // 7. Update timestamp periodically
  useEffect(() => {
    const interval = setInterval(() => setLastUpdateTime(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  // 8. Handle Collect Transaction
  const { writeContractAsync: collectWrite, isPending: isCollecting, error: collectError } = useWriteContract();
  const [collectTxHash, setCollectTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isWaitingCollectTx, isSuccess: collectTxSuccess } = useWaitForTransactionReceipt({
      hash: collectTxHash,
      chainId: monadTestnet.id
  });

  const handleCollect = async () => {
      if (!rankInfoData || collectableAmount <= BigInt(0)) return; // Need rankInfo for checks
      const info = sbtInfoData as SBTInfoType | undefined;
      if (!info || info[3] /* isDead */) return; // Prevent collecting if dead

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

  // 9. Effect to refetch SBT info after successful collect
  useEffect(() => {
      if (collectTxSuccess) {
          refetchSbtInfo();
          setCollectTxHash(undefined); 
      }
  }, [collectTxSuccess, refetchSbtInfo]);


  // --- Rendering Logic ---
  if (isLoadingSbtInfo || isLoadingUri || (rank !== undefined && isLoadingRankInfo)) {
    return <div className="p-4 border rounded border-gray-700 bg-gray-800 text-center">Loading NFT #{tokenId}...</div>;
  }

  const combinedError = sbtInfoError || uriError || rankInfoError;
  if (combinedError) {
    return <div className="p-4 border rounded border-red-700 bg-red-900 text-center text-red-200">Error loading NFT #{tokenId}: {combinedError.message}</div>;
  }

  if (!sbtInfoData) {
     return <div className="p-4 border rounded border-gray-700 bg-gray-800 text-center">No data found for NFT #{tokenId}.</div>;
  }
  if (rank === undefined) {
     return <div className="p-4 border rounded border-gray-700 bg-gray-800 text-center">Could not determine rank for NFT #{tokenId}.</div>;
  }
   if (!rankInfoData) {
     return <div className="p-4 border rounded border-gray-700 bg-gray-800 text-center">Could not load rank details for NFT #{tokenId}.</div>;
   }

  // Reconstruct info using the correct types
  const info = sbtInfoData as SBTInfoType;
  const rankInfo = rankInfoData as RankInfoType;
  
  const isDead = info[3]; // Use the fetched isDead status
  const rankName = ['UR', 'SSR', 'SR', 'R', 'UC', 'C'][rank] ?? 'Unknown';
  const collectedDisplay = formatEther(info[2]); // collected
  const collectableDisplay = formatEther(collectableAmount);
  const lastCollectDate = new Date(Number(info[1]) * 1000).toLocaleString();
  const mintedDate = new Date(Number(info[0]) * 1000).toLocaleString();

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
        <p><span className="font-medium text-gray-400">Rank:</span> {rankName} ({rank})</p>
        <p><span className="font-medium text-gray-400">Status:</span> {isDead ? <span className="text-red-400">Dead</span> : <span className="text-green-400">Alive</span>}</p>
        <p><span className="font-medium text-gray-400">Score Collected:</span> {collectedDisplay}</p>
        <p><span className="font-medium text-gray-400">Collectable Now:</span> ≈ {collectableDisplay}</p>
        <p className="text-xs text-gray-500"><span className="font-medium">Last Collect:</span> {lastCollectDate}</p>
        <p className="text-xs text-gray-500"><span className="font-medium">Minted:</span> {mintedDate}</p>
        {metadataUri && <p className="text-xs text-gray-500 truncate"><span className="font-medium">Metadata:</span> <a href={metadataUri} target="_blank" className="text-blue-400">{metadataUri}</a></p>}
      </div>

      {!isDead && collectableAmount > BigInt(0) && (
        <button 
          onClick={handleCollect}
          disabled={isCollecting || isWaitingCollectTx}
          className="mt-4 w-full px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
        >
          {isCollecting ? 'Confirming...' : (isWaitingCollectTx ? 'Collecting...' : `Collect ${collectableDisplay} Score`)}
        </button>
      )}
      {collectTxHash && (
          <p className="text-xs text-gray-400 mt-1">Collect Tx: <a href={`${monadTestnet.blockExplorers.default.url}/tx/${collectTxHash}`} target="_blank" className="text-blue-400">{collectTxHash.slice(0,6)}...</a>{isWaitingCollectTx?" (Pending)":""}</p>
      )}
      {collectError && <p className="text-xs text-red-500 mt-1">Collect Error: {collectError.message}</p>}

    </div>
  );
} 