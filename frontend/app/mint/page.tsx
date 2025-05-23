'use client';

import { ethers } from 'ethers';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain, useReadContract, useBlockNumber } from 'wagmi'
import { readContract as readContractAsync } from 'wagmi/actions'
import { LILNAD_NFT_ADDRESS, LilnadNFTAbi, MINT_FEE } from '@/lib/contracts'
import { keccak256, toBytes, toHex, parseAbiItem, decodeEventLog, encodePacked } from 'viem'
import { useEffect, useState, useCallback } from 'react'
import { monadTestnet } from '@/lib/chains'

// Assuming CommitInfo struct in Solidity is: struct CommitInfo { bytes32 commitment; uint32 blockNumber; }
// Define a corresponding type in TypeScript
type CommitInfoType = readonly [`0x${string}`, number]; // Tuple matching the struct

// Define Bonus constants matching the contract
const BONUS_MAP: Record<number, number> = {
    1: 0,  // Single mint bonus (BONUS_1)
    10: 1, // Pack 10 bonus (BONUS_10)
    25: 3, // Pack 25 bonus (BONUS_25),
};

const REVEAL_BLOCK_LIMIT = 32; // Match contract's revealBlockLimit of 32 blocks (approximately 16 seconds)

// --- Helper to save/get salt from localStorage ---
const STORAGE_KEY_SALT = 'lilnad_salt';

function saveSaltToStorage(salt: `0x${string}` | undefined) {
  if (typeof window !== 'undefined') {
    if (!salt) {
      localStorage.removeItem(STORAGE_KEY_SALT);
    } else {
      localStorage.setItem(STORAGE_KEY_SALT, salt);
    }
  }
}

function getSaltFromStorage(): `0x${string}` | undefined {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_SALT);
    return stored ? stored as `0x${string}` : undefined;
  }
  return undefined;
}

// --- Helper to get/set pack size from localStorage --- 
const STORAGE_KEY_PACK_SIZE = 'lilnad_revealPackSize';

function savePackSizeToStorage(packSize: number | null) {
  if (typeof window !== 'undefined') {
    if (packSize === null) {
      localStorage.removeItem(STORAGE_KEY_PACK_SIZE);
    } else {
      localStorage.setItem(STORAGE_KEY_PACK_SIZE, packSize.toString());
    }
  }
}

function getPackSizeFromStorage(): number | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_PACK_SIZE);
    if (stored) {
      const num = parseInt(stored, 10);
      return !isNaN(num) ? num : null;
    }
  }
  return null;
}

// Helper function to add Monad Testnet to wallet
async function addMonadTestnetToWallet(): Promise<boolean> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    alert('Wallet provider not found. Please install a wallet like MetaMask or OKX Wallet.');
    return false;
  }
  try {
    await (window as any).ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: `0x${monadTestnet.id.toString(16)}`, // '0x279f'
          chainName: monadTestnet.name,
          nativeCurrency: {
            name: monadTestnet.nativeCurrency.name,
            symbol: monadTestnet.nativeCurrency.symbol, // Correctly use DMON via monadTestnet object
            decimals: monadTestnet.nativeCurrency.decimals,
          },
          rpcUrls: monadTestnet.rpcUrls.default.http,
          blockExplorerUrls: [monadTestnet.blockExplorers.default.url],
        },
      ],
    });
    return true; // Added successfully
  } catch (addError: any) {
    console.error('Failed to add Monad Testnet:', addError);
    // Distinguish user rejection from other errors if possible, though addError structure varies.
    if (addError.code === 4001) { // Standard EIP-1193 user rejection
        alert('You rejected the request to add Monad Testnet.');
    } else {
        alert('Failed to add Monad Testnet. Please try adding it manually in your wallet settings or check console for details.');
    }
    return false; // Failed to add
  }
}

export default function MintPage() {
  const { address: accountAddress, isConnected, chain: connectedChainFromHook } = useAccount()
  const chainIdFromUseChainId = useChainId()

  // Prioritize connectedChain.id, then useChainId's value
  const actualChainId = connectedChainFromHook?.id ?? chainIdFromUseChainId

  useEffect(() => {
    console.log('[MintPage Render] connectedChainFromHook?.id:', connectedChainFromHook?.id, '| chainIdFromUseChainId:', chainIdFromUseChainId, '| Derived actualChainId:', actualChainId);
  }, [connectedChainFromHook, chainIdFromUseChainId, actualChainId]);

  const { switchChainAsync, isPending: isSwitchingChainGlobal, error: switchChainError, reset: resetSwitchChain } = useSwitchChain()

  const [salt, setSalt] = useState<`0x${string}`>()
  const [stage, setStage] = useState<'commit' | 'waiting-commit-confirm' | 'reveal' | 'reveal-pack-10' | 'reveal-pack-25'>('commit')
  const [mounted, setMounted] = useState(false)
  const [userDeclinedSwitch, setUserDeclinedSwitch] = useState(false)
  const [chainNotFoundError, setChainNotFoundError] = useState(false)
  const [isAddingChain, setIsAddingChain] = useState(false)
  const [isSwitchingNetworkInternal, setIsSwitchingNetworkInternal] = useState(false);
  const [showRevealWarningModal, setShowRevealWarningModal] = useState(false);
  const [pendingCommitAction, setPendingCommitAction] = useState<{ func: string; value: bigint; packSize: number } | null>(null);

  // --- State for commit status (includes pack size now) --- 
  const [userCommitment, setUserCommitment] = useState<`0x${string}` | null>(null);
  const [commitBlockNumber, setCommitBlockNumber] = useState<number | null>(null);
  const [isLoadingCommitStatus, setIsLoadingCommitStatus] = useState(true);
  const [committedPackSize, setCommittedPackSize] = useState<number | null>(null);
  const [revealExpectedCount, setRevealExpectedCount] = useState<number | null>(null);
  const [pendingCommitPackSize, setPendingCommitPackSize] = useState<number | null>(null);
  const [justRevealed, setJustRevealed] = useState(false); // Flag to skip commitInfo sync right after reveal

  const {
    writeContractAsync,
    data: writeContractResultHash,
    isPending: txSending,
    error: writeContractError,
    reset: resetWriteContract,
  } = useWriteContract()

  const [commitTxHash, setCommitTxHash] = useState<`0x${string}` | undefined>();
  const [revealTxHash, setRevealTxHash] = useState<`0x${string}` | undefined>();
  
  // MODIFIED: State for potentially multiple minted results from packs
  // We can start simple by just showing the last one, or collect all in an array
  const [mintedNfts, setMintedNfts] = useState<Array<{tokenId: string; rank: number}>>([]);
  const [lastMintedTokenInfo, setLastMintedTokenInfo] = useState<{
    id: string; 
    rank: number; 
    image: string | null; 
    metadata: string | null;
    scorePerSecond?: number;
    lifetimeHours?: number;
  } | null>(null);
  const [mintedTokenMetadataUri, setMintedTokenMetadataUri] = useState<string | null>(null);
  const [mintedTokenImageUri, setMintedTokenImageUri] = useState<string | null>(null);
  const [isProcessingReveal, setIsProcessingReveal] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const [showRankInfo, setShowRankInfo] = useState(false); // Add state for toggling rank info

  const { data: commitReceipt, isLoading: waitingCommitReceipt, isSuccess: commitTxSuccess, isError: commitTxError } = useWaitForTransactionReceipt({
    hash: commitTxHash,
    chainId: monadTestnet.id,
    query: { enabled: !!commitTxHash }
  });
  const { data: revealReceipt, isLoading: waitingRevealReceipt, isSuccess: revealTxSuccess, isError: revealTxError } = useWaitForTransactionReceipt({
    hash: revealTxHash,
    chainId: monadTestnet.id,
    query: { enabled: !!revealTxHash }
  });

  // Combine internal loading with txPending from writeContractAsync
  const isWaitingCommitConfirm = waitingCommitReceipt || (txSending && !!commitTxHash && stage === 'waiting-commit-confirm');
  const isWaitingRevealConfirm = waitingRevealReceipt || (txSending && !!revealTxHash && stage.startsWith('reveal'));

  // --- ADDED: Read User's Commit Status --- 
  const { data: commitInfo, isLoading: isLoadingCommitInfoRead, refetch: refetchCommitInfo } = useReadContract({
    abi: LilnadNFTAbi, 
    address: LILNAD_NFT_ADDRESS, 
    functionName: 'commitData',
    args: accountAddress && isConnected && mounted ? [accountAddress] : undefined, 
    chainId: monadTestnet.id,
  });

  // --- ADDED: Get current block number ---
  const { data: currentBlockNumber } = useBlockNumber({
    watch: true, // Keep watching for new blocks
    chainId: monadTestnet.id,
  });

  // --- useEffect for commitInfo (Reads from contract AND localStorage) --- 
  useEffect(() => {
    setIsLoadingCommitStatus(isLoadingCommitInfoRead);
    // Skip syncing commitInfo immediately after a successful reveal
    if (justRevealed) {
      console.log("[commitInfo Effect] Skipping due to justRevealed flag");
      setJustRevealed(false);
      return;
    }
    // Skip syncing commitInfo when a new commit is in progress or after commitReceipt has set committedPackSize
    if (pendingCommitPackSize) {
      console.log(`[commitInfo Effect] Skipped because pendingCommitPackSize: ${pendingCommitPackSize}`);
      return;
    }
    if (committedPackSize) {
      console.log(`[commitInfo Effect] Skipped because committedPackSize already set: ${committedPackSize}`);
      return;
    }
    if (!isLoadingCommitInfoRead && isConnected && mounted) { 
        let newStage = stage; // Start with current stage
        let currentPackSizeInEffect = committedPackSize; // Start with current committedPackSize

      if (commitInfo) {
        const [commitment, blockNum] = commitInfo as CommitInfoType;
        const emptyCommitment = '0x0000000000000000000000000000000000000000000000000000000000000000';
        
        if (commitment !== emptyCommitment && blockNum > 0) {
                // Active commit found on chain
                console.log(`[commitInfo Effect] Active commit found on chain. Block: ${blockNum}, Current Stage: ${stage}, Current committedPackSize: ${committedPackSize}`);
          setUserCommitment(commitment);
          setCommitBlockNumber(blockNum);

                // If committedPackSize is null, this is likely an initial load or recovery.
                // If it's already set (e.g., by commitReceipt effect), we respect that.
                if (currentPackSizeInEffect === null) {
                    const packSizeFromStorage = getPackSizeFromStorage();
                    console.log(`[commitInfo Effect] currentPackSizeInEffect is null. packSizeFromStorage: ${packSizeFromStorage}`);
                    if (packSizeFromStorage !== null) {
                        setCommittedPackSize(packSizeFromStorage);
                        currentPackSizeInEffect = packSizeFromStorage; // Update for stage setting below
                        // Determine stage based on this loaded packSize
                        if (packSizeFromStorage === 10) newStage = 'reveal-pack-10';
                        else if (packSizeFromStorage === 25) newStage = 'reveal-pack-25';
                        else newStage = 'reveal';
                        console.log(`[commitInfo Effect] Loaded packSize from storage (${packSizeFromStorage}), setting newStage: ${newStage}`);
        } else {
                        // On-chain commit exists, but no packSize in storage. Skipping pack size/ stage setting in this effect.
                        console.warn("[commitInfo Effect] WARN: Active commit on chain, but no packSize in localStorage. Skipping UI pack size determination. Please use commitReceipt logic.");
                    }
                } else {
                    // committedPackSize is already set. Ensure stage is consistent if we are not already in a reveal type stage.
                    // This handles cases where the page might have been reloaded into 'commit' stage with a valid commitment.
                     if (stage === 'commit' || stage === 'waiting-commit-confirm') {
                        if (currentPackSizeInEffect === 10) newStage = 'reveal-pack-10';
                        else if (currentPackSizeInEffect === 25) newStage = 'reveal-pack-25';
                        else if (currentPackSizeInEffect === 1) newStage = 'reveal';
                        else newStage = 'reveal'; // Fallback if currentPackSizeInEffect is somehow unexpected
                        console.log(`[commitInfo Effect] Active commit, committedPackSize (${currentPackSizeInEffect}) exists. Stage was ${stage}, ensuring reveal stage: ${newStage}`);
                     } else {
                        // Already in a reveal stage, or waiting for reveal TX. Keep current newStage (which is current stage).
                        console.log(`[commitInfo Effect] Active commit, committedPackSize (${currentPackSizeInEffect}) exists. Stage is already ${stage}. No stage change needed by this path.`);
                     }
                }
            } else {
                // No active commit found on chain (or it's an old/cleared one)
                console.log("[commitInfo Effect] No active commit on chain. Resetting to commit stage.");
          setUserCommitment(null);
          setCommitBlockNumber(null);
          setCommittedPackSize(null);
                savePackSizeToStorage(null); // Clear storage
                newStage = 'commit';
        }
      } else {
            // commitInfo read failed or returned null (e.g., wallet disconnected during load, or initial load before connection)
            // Only reset if truly disconnected, otherwise might be a flicker.
            // For now, if commitInfo is null and we are connected, assume no commit. If not connected, state might be indeterminate.
            if (isConnected) {
                console.log("[commitInfo Effect] commitInfo is null/undefined but connected. Assuming no commit, resetting.");
         setUserCommitment(null);
         setCommitBlockNumber(null);
         setCommittedPackSize(null);
         savePackSizeToStorage(null);
                newStage = 'commit';
            } else {
                 console.log("[commitInfo Effect] commitInfo is null/undefined and not connected. No state change.");
                 // No change, might be initial load or user disconnected.
            }
        }

        // Only set the stage if it has actually changed and we are not in middle of reveal tx/processing
        // AND we are not currently waiting for a commit to confirm (that's commitReceipt's job to change stage from waiting-commit-confirm)
        if (!revealTxHash && !isProcessingReveal && stage !== newStage) {
            console.log(`[commitInfo Effect] Stage changing from ${stage} to ${newStage}.`);
            setStage(newStage);
        } else if (stage === newStage) {
            console.log(`[commitInfo Effect] Stage evaluated to ${newStage}, which is current stage. No change.`);
        }
    }
  }, [commitInfo, isLoadingCommitInfoRead, isConnected, mounted, revealTxHash, isProcessingReveal, stage, committedPackSize, setCommittedPackSize, setStage, setUserCommitment, setCommitBlockNumber, justRevealed]); // Added committedPackSize and setters to deps for completeness

  // Fallback: if loading commit status hangs >5s, default to commit stage
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (isLoadingCommitStatus) {
      timeoutId = setTimeout(() => {
        console.warn('Commit status load timeout, defaulting to commit stage');
        setIsLoadingCommitStatus(false);
        setStage('commit');
      }, 5000);
    }
    return () => timeoutId && clearTimeout(timeoutId);
  }, [isLoadingCommitStatus]);

  // ... (useEffect to refetch on account change - Ensure it resets committedPackSize) ...
  useEffect(() => {
    if (isConnected && accountAddress && mounted) {
      setIsLoadingCommitStatus(true);
      refetchCommitInfo(); // This will trigger the above useEffect
    } else if (!isConnected && mounted) {
      // ... (reset other states) ...
      setCommittedPackSize(null);
      savePackSizeToStorage(null);
    }
    
    console.log("[DEBUG] committedPackSize state:", committedPackSize);
    console.log("[DEBUG] localStorage packSize:", getPackSizeFromStorage());
  }, [accountAddress, isConnected, mounted, refetchCommitInfo]);

  // generate salt once on mount
  useEffect(() => {
    // Try to get salt from localStorage first
    const storedSalt = getSaltFromStorage();
    if (storedSalt) {
      console.log("Using salt from localStorage:", storedSalt);
      setSalt(storedSalt);
    } else {
      // Generate new salt only if not found in storage
    const random = crypto.getRandomValues(new Uint8Array(32))
    const newSalt = toHex(random);
    console.log("Generated new salt on mount:", newSalt);
    setSalt(newSalt);
      saveSaltToStorage(newSalt);
    }
    setMounted(true);
  }, [])
  
  // Function to handle chain switch, memoized with useCallback
  const handleSwitchChain = useCallback(async () => {
    console.log(`handleSwitchChain (generic): Called. actualChainId at call time: ${actualChainId}, Target: ${monadTestnet.id}`);
    setUserDeclinedSwitch(false)
    resetSwitchChain()
    setChainNotFoundError(false)

    if (actualChainId === monadTestnet.id) {
        console.log("handleSwitchChain (generic): Already on correct chain.");
        return true;
    }
    console.log(`handleSwitchChain (generic): Attempting to switch from chain ${actualChainId} to Monad Testnet (${monadTestnet.id})`)
    try {
      await switchChainAsync({ chainId: monadTestnet.id })
      console.log('handleSwitchChain (generic): switchChainAsync call successful.');
      return true;
    } catch (e: any) {
      console.error("handleSwitchChain (generic): Failed to switch chain:", e);
      if (e.name === 'UserRejectedRequestError' || e.code === 4001) {
        setUserDeclinedSwitch(true);
      } else if (e.code === 4902 || (e.cause && (e.cause as any).code === 4902) || (e.data && (e.data as any).originalError && (e.data as any).originalError.code === 4902) ) {
        setChainNotFoundError(true);
      }
      return false;
    }
  }, [actualChainId, switchChainAsync, resetSwitchChain, monadTestnet.id]);

  // New function to handle adding the chain and then attempting to switch
  const handleAddAndSwitch = async () => {
    setIsAddingChain(true);
    setChainNotFoundError(false); // Clear pre-existing not found error
    const addedSuccessfully = await addMonadTestnetToWallet();
    if (addedSuccessfully) {
      // If chain was added, attempt to switch to it
      await handleSwitchChain(); // This will handle its own errors/user rejections
    }
    // If addMonadTestnetToWallet returned false, an alert was already shown.
    setIsAddingChain(false);
  };

  // Effect to attempt switching chain if connected but on wrong chain when component mounts or chainId/isConnected changes
  useEffect(() => {
    // Only attempt auto-switch if connected, on wrong chain, user hasn't declined, AND we haven't already flagged chain as not found
    if (mounted && isConnected && actualChainId && actualChainId !== monadTestnet.id && !userDeclinedSwitch && !chainNotFoundError) {
      console.log(`useEffect detected wrong chain: ${actualChainId}, attempting switch. UserDeclined: ${userDeclinedSwitch}, ChainNotFound: ${chainNotFoundError}`)
      handleSwitchChain()
    }
  }, [mounted, isConnected, actualChainId, userDeclinedSwitch, chainNotFoundError, handleSwitchChain])

  // --- Regular useEffect for commit receipt processing
  useEffect(() => {
    if (!commitTxHash) return;

    if (commitTxSuccess && commitReceipt && stage === 'waiting-commit-confirm') {
      let packSizeForThisCommit: number | null = pendingCommitPackSize;
      console.log("[Commit Receipt] Using pendingCommitPackSize as the SOLE source for this commit:", packSizeForThisCommit);

      if (packSizeForThisCommit === null) {
        console.error("[Commit Receipt] CRITICAL ERROR: pendingCommitPackSize is NULL at commit confirmation. This should not happen. Defaulting to pack size 1 for UI safety, but this indicates a deeper issue in state flow.");
        packSizeForThisCommit = 1; // Default to 1 for UI safety, but this is an error state.
      }
      // At this point, packSizeForThisCommit holds the intended pack size for the just-confirmed transaction.

      console.log("Commit Tx confirmed...");
      setCommitTxHash(undefined); 
      resetWriteContract();

      if (packSizeForThisCommit !== null) {
          setCommittedPackSize(packSizeForThisCommit); // <<< SET STATE DIRECTLY
          console.log(`[Commit Receipt] Set committedPackSize state to: ${packSizeForThisCommit}`);
      } else {
          console.error("[Commit Receipt] CRITICAL ERROR: Could not determine packSize for this commit. Defaulting to 1 for UI.");
          setCommittedPackSize(1); // Fallback to 1
          packSizeForThisCommit = 1; // Ensure newStage calculation uses this fallback for safety
      }
      
      // Determine the new stage based *only* on packSizeForThisCommit
      let newStageAfterCommit: 'commit' | 'waiting-commit-confirm' | 'reveal' | 'reveal-pack-10' | 'reveal-pack-25' = 'reveal';
      if (packSizeForThisCommit === 10) {
        console.log("[Commit Receipt] Determined new stage: reveal-pack-10");
        newStageAfterCommit = 'reveal-pack-10';
      } else if (packSizeForThisCommit === 25) {
        console.log("[Commit Receipt] Determined new stage: reveal-pack-25");
        newStageAfterCommit = 'reveal-pack-25';
      } else if (packSizeForThisCommit === 1) { 
        console.log("[Commit Receipt] Determined new stage: reveal (single)");
        newStageAfterCommit = 'reveal';
      } else {
        // This case should ideally not be reached if packSizeForThisCommit is handled correctly above
        console.warn(`[Commit Receipt] Unknown or truly null packSizeForThisCommit (${packSizeForThisCommit}) for stage decision, defaulting stage to 'reveal'.`);
        newStageAfterCommit = 'reveal'; 
      }
      setStage(newStageAfterCommit); // <<< SET STAGE DIRECTLY
      console.log(`[Commit Receipt] Set stage state to: ${newStageAfterCommit}`);
      
      console.log("[Commit Receipt] Calling refetchCommitInfo() to get latest commit block number.");
      refetchCommitInfo();

      setPendingCommitPackSize(null); // Clear pending pack size after it has been used

      // Delay auto-reveal slightly to allow state updates and refetch to potentially complete
      setTimeout(() => {
        console.log(`[Commit Receipt] Triggering autoReveal. Current stage: ${newStageAfterCommit}, current committedPackSize: ${packSizeForThisCommit}`);
        triggerAutoReveal(); 
      }, 5000); 
    } else if (commitTxError && stage === 'waiting-commit-confirm') {
      console.error("Commit transaction failed:", writeContractError); 
      alert(`Commit transaction failed. Please check console.`);
      setCommitTxHash(undefined);
      savePackSizeToStorage(null); 
      setCommittedPackSize(null);
      setStage('commit'); 
      resetWriteContract();
    }
  }, [commitTxSuccess, commitReceipt, commitTxError, commitTxHash, stage, resetWriteContract, pendingCommitPackSize]);

  // Fallback: auto-confirm commit via on-chain commitData if receipt is delayed
  useEffect(() => {
    if (!commitTxHash) return;
    const timer = setTimeout(() => {
      if (commitInfo && isConnected && mounted) {
        const [commitment, blockNum] = commitInfo as CommitInfoType;
        const emptyCommitment = '0x0000000000000000000000000000000000000000000000000000000000000000';
        if (commitment !== emptyCommitment && blockNum > 0) {
          console.log('[Fallback] commitData detected on-chain, treating as confirmed');
          setCommitTxHash(undefined);
          resetWriteContract();
          const packSizeForThisCommit = pendingCommitPackSize ?? 1;
          setCommittedPackSize(packSizeForThisCommit);
          // Determine reveal stage
          const newStageAfterCommit = packSizeForThisCommit === 10 ? 'reveal-pack-10' :
                                       packSizeForThisCommit === 25 ? 'reveal-pack-25' : 'reveal';
          setStage(newStageAfterCommit);
          console.log(`[Fallback] Advancing to stage: ${newStageAfterCommit}`);
          refetchCommitInfo();
          setPendingCommitPackSize(null);
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [commitTxHash, commitInfo, pendingCommitPackSize, isConnected, mounted, refetchCommitInfo, resetWriteContract]);

  // --- useEffect for reveal receipt processing - Use correct setters --- 
  useEffect(() => {
    if (!revealTxHash) return; 

    if (revealTxSuccess && revealReceipt && revealTxHash === revealReceipt.transactionHash) { 
      console.log("Reveal transaction successful, processing receipt:");
      // Clear on-chain commit status now that reveal is complete
      setUserCommitment(null);
      setCommitBlockNumber(null);
      // Refresh on-chain commitInfo to sync state
      refetchCommitInfo();
      setIsProcessingReveal(true);
      setMintedNfts([]); 
      setLastMintedTokenInfo(null);
      setMetadataError(null);
      setMintedTokenMetadataUri(null);
      setMintedTokenImageUri(null);

      try {
        const eventAbi = parseAbiItem('event RevealAndMint(address indexed user, uint256 indexed tokenId, uint8 rank, string uri)');
        const revealedNftsFromLogs: Array<{tokenId: string; rank: number}> = [];
        
        // Log all logs for debugging
        console.log("All logs in receipt:", revealReceipt.logs);

        for (const log of revealReceipt.logs) {
          // Filter by address first
          if (log.address.toLowerCase() === LILNAD_NFT_ADDRESS.toLowerCase()) {
            // Check if topics[0] matches the event signature hash
            const eventSignatureHash = keccak256(toBytes('RevealAndMint(address,uint256,uint8,string)'));
            console.log("Comparing log topic vs calculated signature:", log.topics[0], eventSignatureHash);
            if (log.topics[0] === eventSignatureHash) {
                try {
                  const decodedLog = decodeEventLog({ 
                    abi: [eventAbi], 
                    data: log.data,
                    topics: log.topics 
                  });
                  // Ensure eventName is correct (might not be strictly necessary if topics[0] matched)
                  if (decodedLog.eventName === 'RevealAndMint') {
                      const { tokenId, rank } = decodedLog.args as { tokenId: bigint; rank: number; uri: string };
                      const tokenIdStr = tokenId.toString();
                      console.log(`Successfully Decoded RevealAndMint Event: tokenId=${tokenIdStr}, rank=${rank}`);
                      revealedNftsFromLogs.push({ tokenId: tokenIdStr, rank });
                  }
                } catch (decodeError) {
                  console.error("Error decoding log:", decodeError, "Log:", log);
                }
            }
          }
        }
        console.log("Finished processing logs. Found NFTs:", revealedNftsFromLogs);
        setMintedNfts(revealedNftsFromLogs);

        if (revealedNftsFromLogs.length > 0) {
          // Sort NFTs by rank (low number = higher rank)
          const sortedNfts = [...revealedNftsFromLogs].sort((a, b) => a.rank - b.rank);
          const bestNft = sortedNfts[0]; // Get the best ranked NFT (lowest rank number)
          
          setLastMintedTokenInfo({ 
            id: bestNft.tokenId, 
            rank: bestNft.rank, 
            image: null, 
            metadata: null 
          });
          
          // Try to construct local image path based on rank names
          // Our public/image folder contains: UR.png, SSR.png, SR.png, R.png, UC.png, C.png, F.png
          const rankNames = ['UR', 'SSR', 'SR', 'R', 'UC', 'C'];
          const rankName = rankNames[bestNft.rank] || 'F';
          const localImageUrl = `/image/${rankName}.png`;
          
          // Define score per second and lifetime values based on rank
          const scorePerSecondMap: Record<number, number> = {
            0: 320000, // UR
            1: 240000, // SSR
            2: 150000, // SR
            3: 120000, // R
            4: 100000, // UC
            5: 80000,  // C
            6: 1000    // F (RANK_F_ID = 6)
          };
          
          const lifetimeHoursMap: Record<number, number> = {
            0: 72,   // UR: 72 hours
            1: 168,  // SSR: 168 hours
            2: 336,  // SR: 336 hours
            3: 336,  // R: 336 hours
            4: 672,  // UC: 672 hours
            5: 672,  // C: 672 hours
            6: 720   // F: 720 hours
          };
          
          console.log(`Setting best NFT image to local path: ${localImageUrl}`);
          setLastMintedTokenInfo(prev => prev ? { 
            ...prev, 
            image: localImageUrl,
            scorePerSecond: scorePerSecondMap[bestNft.rank] || 0,
            lifetimeHours: lifetimeHoursMap[bestNft.rank] || 0
          } : null);
          setMintedTokenImageUri(localImageUrl);
          
          // Set a timeout to auto-clear reveal processing state to show the results
          setTimeout(() => {
               setIsProcessingReveal(false);
               setStage('commit'); 
               savePackSizeToStorage(null);
               setCommittedPackSize(null);
               // Clear salt from storage after successful reveal
               saveSaltToStorage(undefined);
               // Generate a new salt for the next commit cycle
               const random = crypto.getRandomValues(new Uint8Array(32));
               const newSaltForNextCycle = toHex(random);
               setSalt(newSaltForNextCycle);
               saveSaltToStorage(newSaltForNextCycle);
               console.log("Generated new salt for next commit cycle after successful reveal:", newSaltForNextCycle);

               resetWriteContract(); 
          }, 1000); // 1 second delay for smoother transition
        } else {
          console.error("No RevealAndMint event logs found in the successful transaction.");
          setMetadataError("Reveal successful, but event data couldn't be processed.");
          setIsProcessingReveal(false);
          setStage('commit');
          setRevealTxHash(undefined);
          savePackSizeToStorage(null);
          setCommittedPackSize(null);
          saveSaltToStorage(undefined);
          // Generate a new salt for the next commit cycle
          const random = crypto.getRandomValues(new Uint8Array(32));
          const newSaltForNextCycle = toHex(random);
          setSalt(newSaltForNextCycle);
          saveSaltToStorage(newSaltForNextCycle);
          console.log("Generated new salt for next commit cycle after no event logs:", newSaltForNextCycle);
          resetWriteContract();
        }
      } catch (error) {
         console.error("Error processing receipt:", error);
         setMetadataError("An error occurred processing mint results.");
         setIsProcessingReveal(false);
         setStage('commit');
         setRevealTxHash(undefined);
         savePackSizeToStorage(null);
         setCommittedPackSize(null);
         saveSaltToStorage(undefined);
         // Generate a new salt for the next commit cycle
         const random = crypto.getRandomValues(new Uint8Array(32));
         const newSaltForNextCycle = toHex(random);
         setSalt(newSaltForNextCycle);
         saveSaltToStorage(newSaltForNextCycle);
         console.log("Generated new salt for next commit cycle after error in processing:", newSaltForNextCycle);
         resetWriteContract();
      }
    } else if (revealTxError && !waitingRevealReceipt && revealTxHash) {
         console.log("Reveal transaction failed on chain:", writeContractError); // Log the specific write error
         alert(`Reveal transaction failed on chain. ${writeContractError?.message || 'Please check console.'}`);
         // Do NOT change stage here, allow user to retry or clear commitment
         // setStage('commit'); 
         setRevealTxHash(undefined); 
         // Do NOT clear pack size or salt on FAILED reveal, so they can retry with same params
         // savePackSizeToStorage(null);
         // setCommittedPackSize(null);
         // saveSaltToStorage(undefined); 
    }
  }, [revealTxSuccess, revealReceipt, revealTxError, revealTxHash, stage, waitingRevealReceipt, LILNAD_NFT_ADDRESS, accountAddress, resetWriteContract]);

    // --- Generic Expired Reveal Function (ใช้ฟังก์ชันเดียวกับ normal reveal) --- 
  const executeExpiredReveal = async (revealFunc: string) => {
    // Determine pack size for expired reveal based solely on function name
    let packSizeToReveal: number;
    if (revealFunc.includes('Pack25')) packSizeToReveal = 25;
    else if (revealFunc.includes('Pack10')) packSizeToReveal = 10;
    else packSizeToReveal = 1;
      const expectedCount = packSizeToReveal + (BONUS_MAP[packSizeToReveal] ?? 0);
    console.log(`Expired reveal: ${revealFunc}, packSize=${packSizeToReveal}, expectedCount=${expectedCount}`);

    // Verify NFT address is available
    if (!LILNAD_NFT_ADDRESS) {
      console.error("ERROR: NFT contract address is not set");
      alert("NFT contract address is not set. Please check your environment variables.");
      return;
    }
    console.log("Using NFT contract address:", LILNAD_NFT_ADDRESS);

    // สำคัญ: สัญญาใช้ฟังก์ชันเดียวกันแต่จะตรวจสอบ expired เอง
    console.log(`Note: Using regular reveal function (${revealFunc}) for expired reveal`);

    // Debug information about salt, commitment, etc.
    console.log("DEBUG - Current salt (SHOULD BE THE ORIGINAL COMMIT SALT):", salt);  
    console.log("DEBUG - Stored salt (from localStorage, should match above):", getSaltFromStorage());
    console.log("DEBUG - Commitment (from contract read):", userCommitment);
    console.log("DEBUG - Commit block number:", commitBlockNumber);
    console.log("DEBUG - Current block number:", currentBlockNumber ? Number(currentBlockNumber) : "Unknown");
    console.log("DEBUG - REVEAL_BLOCK_LIMIT:", REVEAL_BLOCK_LIMIT);

      // ... (Reset states before sending new reveal tx) ...
      setRevealTxHash(undefined);
      setMintedNfts([]);
      setLastMintedTokenInfo(null);
      setMetadataError(null);
      resetWriteContract();

      setIsSwitchingNetworkInternal(true);
      let chainForTransaction = connectedChainFromHook;
      // ... (Inline chain switch logic - IMPORTANT: ensure this is also robust) ...
      if (chainForTransaction?.id !== monadTestnet.id) {
          console.log(`executeExpiredReveal: Chain wrong (${chainForTransaction?.id}), attempting switch.`);
          const switched = await handleSwitchChain();
          if (!switched) {
              alert("Please switch to Monad Testnet to reveal (expired).");
              setIsSwitchingNetworkInternal(false);
              return;
          }
          // Re-check chain state after switch attempt if needed, or rely on re-render
      }
      setIsSwitchingNetworkInternal(false);

      try {
      // ====== For EXPIRED REVEAL, it's CRUCIAL to use the ORIGINAL salt ======
      // The contract will check if keccak256(abi.encode(uri, salt)) matches the stored commitment.
      
      if (!salt) {
        alert("Error: Salt not available for expired reveal. This indicates an issue with loading the original commit salt. Please refresh and try again, or if the problem persists, you might need to clear commitment data and start over.");
        console.error("Expired Reveal Error: Salt is undefined. Original commit salt might not have been persisted or loaded correctly.");
        return;
      }
      console.log("Using persisted salt for expired reveal:", salt);
      
      // Create empty URIs, as these were used during commit.
      // The actual content of URI doesn't determine rank for F, but it must match what was committed.
      const emptyUriSingle = "";
      const emptyUrisArray = Array(expectedCount).fill("");
      
      // Prepare args for sending to contract
      // Use the persisted 'salt' state variable.
      const args = packSizeToReveal === 1 
        ? [emptyUriSingle, salt]  
        : [emptyUrisArray, salt];
      
      console.log(`Calling ${revealFunc} (Expired) expecting ${expectedCount} NFTs with persisted salt: ${salt}`);
        const hash = await writeContractAsync({
          chainId: monadTestnet.id,
          abi: LilnadNFTAbi,
          address: LILNAD_NFT_ADDRESS,
          functionName: revealFunc,
        args: args,
        });
        setRevealTxHash(hash);
    console.log(`${revealFunc} (Expired) transaction sent: ${hash}`);
        // Stage will be reset by useEffect watching revealReceipt
      } catch (e: any) {
         console.error("Error processing expired reveal:", e);
         alert(`Expired Reveal failed: ${(e as Error).message}`);
      }
  }

  // --- Specific Expired Reveal Handlers - แก้ไขชื่อฟังก์ชันให้ตรงกับสัญญา --- 
  const handleRevealExpired = () => executeExpiredReveal('revealMint');
  const handleRevealExpiredPack10 = () => executeExpiredReveal('revealMintPack10');
  const handleRevealExpiredPack25 = () => executeExpiredReveal('revealMintPack25');

  // --- Generic Reveal Function first ---
  const executeReveal = async (revealFunc: string) => {
    const packSizeToReveal = committedPackSize;
    if (packSizeToReveal === null) {
        alert("Cannot determine pack size to reveal. Commit might be missing or from another session.");
        setStage('commit'); 
        return;
    }
    
    // Verify NFT address is available and valid
    if (!LILNAD_NFT_ADDRESS) {
      console.error("ERROR: NFT contract address is not set");
      alert("NFT contract address is not set. Please check your environment variables.");
      return;
    }
    console.log("Using NFT contract address:", LILNAD_NFT_ADDRESS);
    
    const expectedCount = packSizeToReveal + (BONUS_MAP[packSizeToReveal] ?? 0);
    
    if (!salt) { alert("Error: Salt not available..."); return; }
    
    // Debug information about salt, commitment, etc.
    console.log("DEBUG REVEAL - Current salt:", salt);  
    console.log("DEBUG REVEAL - Stored salt:", getSaltFromStorage());
    console.log("DEBUG REVEAL - Commitment:", userCommitment);
    console.log("DEBUG REVEAL - Commit block number:", commitBlockNumber);
    console.log("DEBUG REVEAL - Current block number:", currentBlockNumber ? Number(currentBlockNumber) : "Unknown");
    console.log("DEBUG REVEAL - REVEAL_BLOCK_LIMIT:", REVEAL_BLOCK_LIMIT);
    
    // ... (Reset states before sending) ...
    setRevealTxHash(undefined); 
    setMintedNfts([]); 
    setLastMintedTokenInfo(null);
    setMetadataError(null);
    resetWriteContract();

    setIsSwitchingNetworkInternal(true);
    let chainForTransaction = connectedChainFromHook;
    // ... (Inline chain switch logic) ...
    if (chainForTransaction?.id !== monadTestnet.id) { setIsSwitchingNetworkInternal(false); return; }
    setIsSwitchingNetworkInternal(false);

    try {
      const emptyUris = Array(expectedCount).fill("");
      const args = packSizeToReveal === 1 ? [emptyUris[0], salt] : [emptyUris, salt];
      console.log(`Calling ${revealFunc} expecting ${expectedCount} NFTs...`);
      const hash = await writeContractAsync({
        chainId: monadTestnet.id, 
        abi: LilnadNFTAbi,
        address: LILNAD_NFT_ADDRESS,
        functionName: revealFunc,
        args: args,
      });
      setRevealTxHash(hash);
      console.log(`${revealFunc} transaction sent:`, hash);
    } catch (e: any) {
       console.error(`${revealFunc} Error:`, e);
       alert(`Reveal failed: ${(e as Error).message}`);
    }
  }

  // --- Helper: Auto-reveal chosen pack size after cooldown ---
  function triggerAutoReveal() {
    if (isWaitingRevealConfirm || revealTxHash || isProcessingReveal) return; // guard

    // ปรับปรุงเงื่อนไขให้ดูจาก stage name เป็นหลัก ไม่ได้เช็ค committedPackSize เป็นค่าตายตัว
    console.log("Auto reveal triggered, stage:", stage, "committedPackSize:", committedPackSize);
    
    if (stage === 'reveal-pack-10') {
      // สำหรับ pack 10+1 ใช้ฟังก์ชัน revealMintPack10
      executeReveal('revealMintPack10');
    } else if (stage === 'reveal-pack-25') {
      // สำหรับ pack 25+3 ใช้ฟังก์ชัน revealMintPack25
      executeReveal('revealMintPack25');
    } else if (stage === 'reveal') {
      // สำหรับ mint เดี่ยว ใช้ฟังก์ชัน revealMint
      executeReveal('revealMint');
    } else {
      console.log("Auto-reveal skipped - unknown stage:", stage);
    }
  }

  // --- Helper: Clear all commitment data and return to commit stage ---
  function clearCommitment() {
    try {
      // ล้างข้อมูล commitment ทั้งหมด
      savePackSizeToStorage(null); 
      setCommittedPackSize(null);
      saveSaltToStorage(undefined);
      setStage('commit');
      setUserCommitment(null);
      setCommitBlockNumber(null);
      
      // เคลียร์ localStorage
      localStorage.removeItem(STORAGE_KEY_PACK_SIZE);
      localStorage.removeItem(STORAGE_KEY_SALT);
      
      // สร้าง salt ใหม่
      const random = crypto.getRandomValues(new Uint8Array(32));
      const newSalt = toHex(random);
      setSalt(newSalt);
      
      alert("Cleared commitment data successfully. You can now commit again.");
      
      // Refresh the page to clear any UI inconsistencies
      window.location.reload();
    } catch (error) {
      console.error("Error clearing commitment:", error);
      alert("Error clearing commitment data.");
    }
  };

  // --- Helper function for debugging contract state ---
  function debugContractState() {
    if (!LILNAD_NFT_ADDRESS) {
      console.error("Cannot debug: NFT contract address not set");
      alert("Cannot debug: NFT contract address not set");
      return;
    }

    // Debug output
    console.log("==== CONTRACT DEBUG INFO ====");
    console.log("Contract address:", LILNAD_NFT_ADDRESS);
    console.log("Frontend REVEAL_BLOCK_LIMIT:", REVEAL_BLOCK_LIMIT);
    console.log("Current block:", currentBlockNumber ? Number(currentBlockNumber) : "Unknown");
    console.log("Commit block:", commitBlockNumber);
    console.log("Delta blocks:", commitBlockNumber && currentBlockNumber ? 
                Number(currentBlockNumber) - commitBlockNumber : "Cannot calculate");
    console.log("Commitment data:", userCommitment);
    console.log("CommittedPackSize:", committedPackSize);
    console.log("Salt:", salt);
    console.log("Stored Salt:", getSaltFromStorage());
    console.log("==== END DEBUG INFO ====");
    
    // แสดงตัวเลือกให้ผู้ใช้
    if (confirm("Debug information written to console.\n\nDo you want to clear commitment data and reset to commit stage?")) {
      clearCommitment();
    }
  };

  if (!mounted) return <div className="p-10 text-center">Loading...</div>

  // 1. Not Connected: Prompt to connect
  if (!isConnected) {
    return <div className="p-10 text-center">Please connect your wallet to mint.</div>;
  }

  // 2. Connected but on Wrong Chain: Prompt to switch
  if (actualChainId !== monadTestnet.id) {
    return (
      <div className="p-10 flex flex-col items-center gap-4">
        <p className="text-yellow-400 text-lg">
          You are on the wrong network (Chain ID: {actualChainId || 'Unknown'}).
          Please switch to Monad Testnet (Chain ID: {monadTestnet.id}).
        </p>
        <button
          onClick={handleSwitchChain}
          disabled={isSwitchingChainGlobal || isAddingChain}
          className="px-6 py-3 rounded bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 font-semibold"
        >
          {isSwitchingChainGlobal ? 'Switching Network...' : 'Switch to Monad Testnet'}
        </button>

        {chainNotFoundError && (
          <button
            onClick={handleAddAndSwitch}
            disabled={isAddingChain || isSwitchingChainGlobal}
            className="px-6 py-3 rounded bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 font-semibold mt-3"
          >
            {isAddingChain ? 'Adding Network...' : 'Add Monad Testnet to Wallet'}
          </button>
        )}

        {userDeclinedSwitch && <p className="text-sm text-gray-400 mt-2">You cancelled the network switch. Please try again or switch manually in your wallet.</p>}
        
        {/* Display general switch error if not specifically a chain-not-found error and not a user decline */}
        {switchChainError && !userDeclinedSwitch && !chainNotFoundError && (
          <p className="text-red-400 text-sm mt-2">
            Error switching chain: {switchChainError.message}.
            Please ensure Monad Testnet is added to your wallet or try adding it if the option appears.
          </p>
        )}
        {/* Specific message when chain is not found, prompting to use the add button */}
        {chainNotFoundError && !isAddingChain && (
             <p className="text-yellow-500 text-sm mt-2">
                Monad Testnet doesn't seem to be added to your wallet. Please use the button above to add it.
             </p>
        )}
      </div>
    )
  }

  // 3. Connected and on Correct Chain: Proceed to minting logic
  if (!LILNAD_NFT_ADDRESS) {
    return <div className="p-10 text-red-500 text-center">NFT contract address not set. Please check configuration.</div>;
  }

  console.log('NFT addr', LILNAD_NFT_ADDRESS)

  // --- Generic Commit Function - Saves pack size --- 
  const executeCommit = async (commitFunc: string, value: bigint, packSize: number) => {
    if (isLoadingCommitStatus) { alert("Checking status..."); return; }
    if (userCommitment) { alert("Reveal pending commit first."); /* setStage('reveal'); */ return; } // อาจจะไม่ควร setStage ที่นี่ถ้า user มี commitment อยู่แล้ว ให้ UI จัดการ
    if (!salt) { alert("Salt not generated."); return; }

    // Show warning modal and store the commit action
    setPendingCommitAction({ func: commitFunc, value, packSize });
    setShowRevealWarningModal(true);
    return; // Stop here, actual commit will happen after user confirms

    // Reset states before sending
    setCommitTxHash(undefined);
    setRevealTxHash(undefined);
    setMintedNfts([]); 
    setLastMintedTokenInfo(null);
    setMetadataError(null);
    resetWriteContract();

    // --- CRITICAL POINT for packSize ---
    console.log(`[executeCommit] Attempting to save packSize: ${packSize} for func: ${commitFunc}`); 
    savePackSizeToStorage(packSize); // Save to localStorage for persistence across sessions/reloads
    setPendingCommitPackSize(packSize); // <<< SET PENDING PACK SIZE
    // --- END CRITICAL POINT ---
    
    setRevealExpectedCount(packSize + (BONUS_MAP[packSize] ?? 0));

    setIsSwitchingNetworkInternal(true);
    let chainForTransaction = connectedChainFromHook; 
    // ... (Inline chain switch logic) ...
     if (chainForTransaction?.id !== monadTestnet.id) { setIsSwitchingNetworkInternal(false); return; }
     setIsSwitchingNetworkInternal(false);

    try {
      const emptyUriString = "";
      if (!salt) throw new Error("Salt is missing for commit");
      
      console.log(`Submitting ${commitFunc}...`);
      
      // Adjust parameter format based on function type
      let args;
      if (commitFunc === 'commitMint') {
        // Single mint expects (string uri, bytes32 salt)
        args = [emptyUriString, salt];
      } else if (commitFunc === 'commitMintPack10') {
        // Pack10 expects (string[] uris, bytes32 salt)
        const emptyUris = Array(10 + BONUS_MAP[10]).fill(emptyUriString);
        args = [emptyUris, salt];
      } else if (commitFunc === 'commitMintPack25') {
        // Pack25 expects (string[] uris, bytes32 salt)
        const emptyUris = Array(25 + BONUS_MAP[25]).fill(emptyUriString);
        args = [emptyUris, salt];
      } else {
        throw new Error(`Unknown commit function: ${commitFunc}`);
      }
      
      console.log(`[executeCommit] Calling ${commitFunc} with packSize (for storage): ${packSize}`); 
      const h = await writeContractAsync({
        chainId: monadTestnet.id, 
        abi: LilnadNFTAbi,
        address: LILNAD_NFT_ADDRESS,
        functionName: commitFunc,
        args: args,
        value: value,
      });
      setCommitTxHash(h);
      setStage('waiting-commit-confirm');
      console.log(`${commitFunc} tx sent:`, h);
    } catch (e: any) {
      console.error(`${commitFunc} Error:`, e);
      alert(`Commitment failed: ${(e as Error).message}`);
      // --- If commit fails, clear the potentially wrongly saved packSize ---
      savePackSizeToStorage(null);
      setCommittedPackSize(null);
      setPendingCommitPackSize(null); // <<< CLEAR PENDING PACK SIZE ON FAILURE TOO
      // --- END ---
      setStage('commit');
    }
  };

  // Function to confirm and execute the pending commit
  const confirmAndExecuteCommit = async () => {
    // Hide modal first
    setShowRevealWarningModal(false);
    
    if (!pendingCommitAction) return;
    
    const { func: commitFunc, value, packSize } = pendingCommitAction;
    
    // Reset pending action
    setPendingCommitAction(null);
    
    // Reset states before sending
    setCommitTxHash(undefined);
    setRevealTxHash(undefined);
    setMintedNfts([]); 
    setLastMintedTokenInfo(null);
    setMetadataError(null);
    resetWriteContract();

    // --- CRITICAL POINT for packSize ---
    console.log(`[executeCommit] Attempting to save packSize: ${packSize} for func: ${commitFunc}`); 
    savePackSizeToStorage(packSize); // Save to localStorage for persistence across sessions/reloads
    setPendingCommitPackSize(packSize); // <<< SET PENDING PACK SIZE
    // --- END CRITICAL POINT ---
    
    setRevealExpectedCount(packSize + (BONUS_MAP[packSize] ?? 0));

    setIsSwitchingNetworkInternal(true);
    let chainForTransaction = connectedChainFromHook; 
    // ... (Inline chain switch logic) ...
     if (chainForTransaction?.id !== monadTestnet.id) { setIsSwitchingNetworkInternal(false); return; }
     setIsSwitchingNetworkInternal(false);

    try {
      const emptyUriString = "";
      if (!salt) throw new Error("Salt is missing for commit");
      
      console.log(`Submitting ${commitFunc}...`);
      
      // Adjust parameter format based on function type
      let args;
      if (commitFunc === 'commitMint') {
        // Single mint expects (string uri, bytes32 salt)
        args = [emptyUriString, salt];
      } else if (commitFunc === 'commitMintPack10') {
        // Pack10 expects (string[] uris, bytes32 salt)
        const emptyUris = Array(10 + BONUS_MAP[10]).fill(emptyUriString);
        args = [emptyUris, salt];
      } else if (commitFunc === 'commitMintPack25') {
        // Pack25 expects (string[] uris, bytes32 salt)
        const emptyUris = Array(25 + BONUS_MAP[25]).fill(emptyUriString);
        args = [emptyUris, salt];
      } else {
        throw new Error(`Unknown commit function: ${commitFunc}`);
      }
      
      console.log(`[executeCommit] Calling ${commitFunc} with packSize (for storage): ${packSize}`); 
      const h = await writeContractAsync({
        chainId: monadTestnet.id, 
        abi: LilnadNFTAbi,
        address: LILNAD_NFT_ADDRESS,
        functionName: commitFunc,
        args: args,
        value: value,
      });
      setCommitTxHash(h);
      setStage('waiting-commit-confirm');
      console.log(`${commitFunc} tx sent:`, h);
    } catch (e: any) {
      console.error(`${commitFunc} Error:`, e);
      alert(`Commitment failed: ${(e as Error).message}`);
      // --- If commit fails, clear the potentially wrongly saved packSize ---
      savePackSizeToStorage(null);
      setCommittedPackSize(null);
      setPendingCommitPackSize(null); // <<< CLEAR PENDING PACK SIZE ON FAILURE TOO
      // --- END ---
      setStage('commit');
    }
  };

  // Function to cancel the pending commit
  const cancelCommit = () => {
    setShowRevealWarningModal(false);
    setPendingCommitAction(null);
  };

  // Handle Commits for different pack sizes
  const handleCommit = () => executeCommit('commitMint', MINT_FEE, 1);
  const handleCommitPack10 = () => executeCommit('commitMintPack10', MINT_FEE * BigInt(10), 10);
  const handleCommitPack25 = () => executeCommit('commitMintPack25', MINT_FEE * BigInt(25), 25);
  
  // Handle Reveals for different pack sizes
  const handleReveal = () => committedPackSize === 1 && executeReveal('revealMint');
  const handleRevealPack10 = () => committedPackSize === 10 && executeReveal('revealMintPack10');
  const handleRevealPack25 = () => committedPackSize === 25 && executeReveal('revealMintPack25');

  // If currently processing reveal, render a separate Reveal-only page
  if (isProcessingReveal) {
  return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6">
        <div id="reveal-section" className="bg-gray-800 border-4 border-indigo-500 p-8 w-full max-w-md text-center shadow-lg">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Revealing your NFTs</h2>
          <div className="w-full bg-gray-700 h-2 rounded-full mb-6 overflow-hidden">
            <div className="animate-pulse h-full bg-green-500"></div>
          </div>
          <p className="text-gray-300 mb-1">Processing transaction data...</p>
          <p className="text-gray-400">Please wait while we gather your NFT results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="box-border p-10 flex flex-col gap-4 w-full max-w-screen-lg mx-auto items-center">
      {isConnected && actualChainId === monadTestnet.id && (
        <>
          {isLoadingCommitStatus ? (
            <div className="flex flex-col items-center space-y-2 py-4">
              <p className="text-yellow-400">Loading status...</p>
              <button
                onClick={() => refetchCommitInfo()}
                className="px-4 py-2 bg-pixel-accent text-black font-pixel rounded-pixel-sm shadow-pixel transition-transform hover:-translate-y-1"
              >
                Retry
              </button>
            </div>
          ) : (
            <> 
              <h2 className="text-2xl font-bold text-left mb-4 inline-block">
                Current Stage: {stage}
                <span className="tooltip-container ml-2 cursor-pointer">
                  <span className="question-mark relative -top-2 inline-block text-yellow-400 font-extrabold text-4xl animate-pulse hover:scale-110 transition-transform duration-200">?</span>
                  <div className="tooltip-box">
                    <div className="tooltip-item rarity-UR !text-pink-500">UR: 0.5%</div>
                    <div className="tooltip-item rarity-SSR !text-yellow-500">SSR: 3%</div>
                    <div className="tooltip-item rarity-SR !text-purple-400">SR: 10%</div>
                    <div className="tooltip-item rarity-R !text-blue-400">R: 20%</div>
                    <div className="tooltip-item rarity-UC !text-green-400">UC: 30%</div>
                    <div className="tooltip-item rarity-C !text-gray-400">C: 36.5%</div>
                  </div>
                </span>
              </h2>
              
              {/* NFT Ranks & Benefits button - ปรับปรุงสไตล์ให้เข้ากับธีม pixel art */}
              <button
                onClick={() => setShowRankInfo(!showRankInfo)}
                className={`ranks-toggle-btn mb-6 px-8 py-3 bg-gradient-to-b from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-200 rounded-none shadow-pixel-md transition-all flex items-center justify-center gap-2 mx-auto border-4 ${showRankInfo ? 'border-t-yellow-400 border-l-yellow-400 border-r-indigo-900 border-b-indigo-900' : 'border-t-indigo-400 border-l-indigo-400 border-r-indigo-900 border-b-indigo-900 animate-pulse-border'} ${showRankInfo ? 'translate-y-1 shadow-pixel-sm' : 'hover:translate-y-[-2px] hover:shadow-pixel-lg'}`}
              >
                <span className="text-lg font-bold tracking-wider font-press-start relative">
                  <span className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-400 opacity-90 blur-[0.5px]"></span>
                  <span className="relative">{showRankInfo ? 'HIDE NFT RANKS' : 'SHOW NFT RANKS'}</span>
                </span>
                <span className={`text-2xl font-bold text-yellow-300 transition-transform duration-300 ${showRankInfo ? 'rotate-180' : 'rotate-0'}`}>▼</span>
              </button>
              
              {/* Collapsible NFT Ranks & Benefits Section - ปรับปรุงสไตล์ให้เข้ากับธีม pixel art */}
              {showRankInfo && (
                <div className="nft-ranks-section box-border mb-8 p-6 bg-gradient-to-b from-indigo-900/90 to-gray-900/95 rounded-none border-4 border-t-indigo-400 border-l-indigo-400 border-r-indigo-800 border-b-indigo-800 w-full mx-auto overflow-x-auto shadow-pixel-lg animate-fadeIn relative">
                  <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 via-purple-500 to-indigo-600"></div>
                  
                  <h3 className="text-center w-full relative mb-10">
                    <span className="nft-ranks-title">
                      NFT RANKS & BENEFITS
                    </span>
                    <div className="mt-4 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent w-3/4 mx-auto"></div>
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-left relative z-10">
                    <div className="rank-card ur-card p-4 bg-gradient-to-b from-pink-900/30 to-pink-950/40 border-4 border-t-pink-400 border-l-pink-400 border-r-pink-900 border-b-pink-900 rounded-none shadow-pixel-md hover:translate-y-[-4px] hover:shadow-pixel-lg transition-all duration-300">
                      <h4 className="text-pink-500 font-bold text-xl mb-3 text-shadow-pixel font-press-start tracking-wide">UR (Ultra Rare)</h4>
                      <div className="flex items-center mb-3 font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-pink-400 to-pink-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Lifetime: <span className="font-bold text-pink-200">3 days</span></p>
                      </div>
                      <div className="flex items-center mb-3 font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-pink-400 to-pink-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Rate: <span className="font-bold text-yellow-300">{(320000 / (72) ).toFixed(2)}</span> pts/hour</p>
                      </div>
                      <div className="flex items-center font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-pink-400 to-pink-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Special: <span className="font-bold text-pink-200">Highest point rate</span></p>
                      </div>
                    </div>
                    
                    <div className="rank-card ssr-card p-4 bg-gradient-to-b from-yellow-900/30 to-yellow-950/40 border-4 border-t-yellow-400 border-l-yellow-400 border-r-yellow-900 border-b-yellow-900 rounded-none shadow-pixel-md hover:translate-y-[-4px] hover:shadow-pixel-lg transition-all duration-300">
                      <h4 className="text-yellow-500 font-bold text-xl mb-3 text-shadow-pixel font-press-start tracking-wide">SSR (Super Rare)</h4>
                      <div className="flex items-center mb-3 font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Lifetime: <span className="font-bold text-yellow-200">7 days</span></p>
                      </div>
                      <div className="flex items-center mb-3 font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Rate: <span className="font-bold text-yellow-300">{(240000 / (168) ).toFixed(2)}</span> pts/hour</p>
                      </div>
                      <div className="flex items-center font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Special: <span className="font-bold text-yellow-200">High point rate</span></p>
                      </div>
                    </div>
                    
                    <div className="rank-card sr-card p-4 bg-gradient-to-b from-purple-900/30 to-purple-950/40 border-4 border-t-purple-400 border-l-purple-400 border-r-purple-900 border-b-purple-900 rounded-none shadow-pixel-md hover:translate-y-[-4px] hover:shadow-pixel-lg transition-all duration-300">
                      <h4 className="text-purple-400 font-bold text-xl mb-3 text-shadow-pixel font-press-start tracking-wide">SR (Super Rare)</h4>
                      <div className="flex items-center mb-3 font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-purple-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Lifetime: <span className="font-bold text-purple-200">14 days</span></p>
                      </div>
                      <div className="flex items-center mb-3 font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-purple-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Rate: <span className="font-bold text-yellow-300">{(150000 / (336) ).toFixed(2)}</span> pts/hour</p>
                      </div>
                      <div className="flex items-center font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-purple-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Special: <span className="font-bold text-purple-200">Long-lasting rewards</span></p>
                      </div>
                    </div>
                    
                    <div className="rank-card r-card p-4 bg-gradient-to-b from-blue-900/30 to-blue-950/40 border-4 border-t-blue-400 border-l-blue-400 border-r-blue-900 border-b-blue-900 rounded-none shadow-pixel-md hover:translate-y-[-4px] hover:shadow-pixel-lg transition-all duration-300">
                      <h4 className="text-blue-400 font-bold text-xl mb-3 text-shadow-pixel font-press-start tracking-wide">R (Rare)</h4>
                      <div className="flex items-center mb-3 font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-blue-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Lifetime: <span className="font-bold text-blue-200">14 days</span></p>
                      </div>
                      <div className="flex items-center mb-3 font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-blue-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Rate: <span className="font-bold text-yellow-300">{(120000 / (336) ).toFixed(2)}</span> pts/hour</p>
                      </div>
                      <div className="flex items-center font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-blue-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Special: <span className="font-bold text-blue-200">Good balance</span></p>
                      </div>
                    </div>
                    
                    <div className="rank-card uc-card p-4 bg-gradient-to-b from-green-900/30 to-green-950/40 border-4 border-t-green-400 border-l-green-400 border-r-green-900 border-b-green-900 rounded-none shadow-pixel-md hover:translate-y-[-4px] hover:shadow-pixel-lg transition-all duration-300">
                      <h4 className="text-green-400 font-bold text-xl mb-3 text-shadow-pixel font-press-start tracking-wide">UC (Uncommon)</h4>
                      <div className="flex items-center mb-3 font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Lifetime: <span className="font-bold text-green-200">28 days</span></p>
                      </div>
                      <div className="flex items-center mb-3 font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Rate: <span className="font-bold text-yellow-300">{(100000 / (672) ).toFixed(2)}</span> pts/hour</p>
                      </div>
                      <div className="flex items-center font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Special: <span className="font-bold text-green-200">Extended lifetime</span></p>
                      </div>
                    </div>
                    
                    <div className="rank-card c-card p-4 bg-gradient-to-b from-gray-800/50 to-gray-900/60 border-4 border-t-gray-400 border-l-gray-400 border-r-gray-700 border-b-gray-700 rounded-none shadow-pixel-md hover:translate-y-[-4px] hover:shadow-pixel-lg transition-all duration-300">
                      <h4 className="text-gray-400 font-bold text-xl mb-3 text-shadow-pixel font-press-start tracking-wide">C (Common)</h4>
                      <div className="flex items-center mb-3 font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-gray-400 to-gray-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Lifetime: <span className="font-bold text-gray-300">28 days</span></p>
                      </div>
                      <div className="flex items-center mb-3 font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-gray-400 to-gray-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Rate: <span className="font-bold text-yellow-300">{(80000 / (672) ).toFixed(2)}</span> pts/hour</p>
                      </div>
                      <div className="flex items-center font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-gray-400 to-gray-600 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Special: <span className="font-bold text-gray-300">Long-term yield</span></p>
                      </div>
                    </div>
                    
                    <div className="rank-card f-card p-4 bg-gradient-to-b from-gray-700/60 to-gray-800/70 border-4 border-t-gray-500 border-l-gray-500 border-r-gray-800 border-b-gray-800 rounded-none shadow-pixel-md hover:translate-y-[-4px] hover:shadow-pixel-lg transition-all duration-300">
                      <h4 className="text-gray-500 font-bold text-xl mb-3 text-shadow-pixel font-press-start tracking-wide">F (Penalty)</h4>
                      <div className="flex items-center mb-3 font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-gray-500 to-gray-700 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Lifetime: <span className="font-bold text-gray-400">30 days</span></p>
                      </div>
                      <div className="flex items-center mb-3 font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-gray-500 to-gray-700 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Rate: <span className="font-bold text-yellow-300">{(1000 / (720) ).toFixed(2)}</span> pts/hour</p>
                      </div>
                      <div className="flex items-center font-vt323">
                        <div className="w-5 h-5 bg-gradient-to-br from-gray-500 to-gray-700 mr-2 shadow-inner"></div>
                        <p className="text-white text-lg">Special: <span className="font-bold text-gray-400">Late reveal penalty</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Commit Buttons (Show only in commit stage) */} 
              {stage === 'commit' && (
                <div className="flex flex-wrap justify-center gap-8 mt-4 w-full">
                  <div className="w-72 bg-gray-800 border-4 border-purple-600 rounded-xl overflow-hidden shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:-translate-y-2">
                    <div className="p-5 bg-purple-900/60 border-b-2 border-purple-500 text-center">
                      <h3 className="text-xl font-bold text-white mb-1">SINGLE NFT</h3>
                      <p className="text-md text-purple-200 font-bold">1.0 MON</p>
                    </div>
                    <div className="p-5 text-center">
                      <p className="mb-4 text-gray-300">Mint a single Lilnad NFT</p>
                      <button 
                        onClick={handleCommit} 
                        disabled={isWaitingCommitConfirm || txSending || isSwitchingNetworkInternal || isSwitchingChainGlobal} 
                        className="w-full px-4 py-3 rounded-none bg-purple-600 hover:bg-purple-500 text-yellow-300 disabled:opacity-50 font-bold shadow-pixel-md hover:translate-y-[-2px] hover:shadow-pixel-lg border-4 border-t-purple-400 border-l-purple-400 border-r-purple-900 border-b-purple-900 transition-all"
                      >
                        {isWaitingCommitConfirm ? 'Confirming...' : (txSending ? 'Check Wallet...' : 'COMMIT 1 NFT')}
                  </button>
                    </div>
                  </div>
                  
                  <div className="w-72 bg-gray-800 border-4 border-indigo-600 rounded-xl overflow-hidden shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 hover:-translate-y-2">
                    <div className="p-5 bg-indigo-900/60 border-b-2 border-indigo-500 text-center">
                      <h3 className="text-xl font-bold text-white mb-1">PACK 10+1</h3>
                      <p className="text-md text-indigo-200 font-bold">10.0 MON</p>
                    </div>
                    <div className="p-5 text-center">
                      <p className="mb-4 text-gray-300">Mint 10 NFTs + 1 bonus</p>
                      <button 
                        onClick={handleCommitPack10} 
                        disabled={isWaitingCommitConfirm || txSending || isSwitchingNetworkInternal || isSwitchingChainGlobal} 
                        className="w-full px-4 py-3 rounded-none bg-indigo-600 hover:bg-indigo-500 text-yellow-300 disabled:opacity-50 font-bold shadow-pixel-md hover:translate-y-[-2px] hover:shadow-pixel-lg border-4 border-t-indigo-400 border-l-indigo-400 border-r-indigo-900 border-b-indigo-900 transition-all"
                      >
                        {isWaitingCommitConfirm ? 'Confirming...' : (txSending ? 'Check Wallet...' : 'COMMIT PACK')}
                  </button>
                    </div>
                  </div>
                  
                  <div className="w-72 bg-gray-800 border-4 border-blue-600 rounded-xl overflow-hidden shadow-lg hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-2">
                    <div className="p-5 bg-blue-900/60 border-b-2 border-blue-500 text-center">
                      <h3 className="text-xl font-bold text-white mb-1">PACK 25+3</h3>
                      <p className="text-md text-blue-200 font-bold">25.0 MON</p>
                    </div>
                    <div className="p-5 text-center">
                      <p className="mb-4 text-gray-300">Mint 25 NFTs + 3 bonus</p>
                      <button 
                        onClick={handleCommitPack25} 
                        disabled={isWaitingCommitConfirm || txSending || isSwitchingNetworkInternal || isSwitchingChainGlobal} 
                        className="w-full px-4 py-3 rounded-none bg-blue-600 hover:bg-blue-500 text-yellow-300 disabled:opacity-50 font-bold shadow-pixel-md hover:translate-y-[-2px] hover:shadow-pixel-lg border-4 border-t-blue-400 border-l-blue-400 border-r-blue-900 border-b-blue-900 transition-all"
                      >
                        {isWaitingCommitConfirm ? 'Confirming...' : (txSending ? 'Check Wallet...' : 'COMMIT PACK')}
                  </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Waiting for Commit Confirm */} 
              {stage === 'waiting-commit-confirm' && (
                <div className="mt-6 p-8 bg-gray-800 rounded-xl border border-purple-500 text-center w-full">
                  <h3 className="text-xl font-bold mb-4">Committing your mint...</h3>
                  <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden mb-4">
                    <div className="bg-purple-500 h-full animate-pulse"></div>
                  </div>
                  <p className="text-gray-300">Please wait while your transaction is being confirmed</p>
                  {commitTxHash && (
                    <a 
                      href={`${monadTestnet.blockExplorers.default.url}/tx/${commitTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="text-xs text-blue-400 hover:underline mt-2 inline-block"
                    >
                      View transaction on explorer
                    </a>
                  )}
                </div>
              )}

              {/* --- Reveal Section (Show immediately when stage starts with reveal) --- */}
              {stage.startsWith('reveal') && (
                <div id="reveal-section" className="flex flex-col items-center gap-4 mt-4 w-full max-w-md mx-auto">
                    <div className="mb-4 px-4 py-3 bg-yellow-500 text-black font-bold rounded-none border-4 border-t-yellow-300 border-l-yellow-300 border-r-yellow-700 border-b-yellow-700 w-full text-center shadow-pixel-sm">
                        Please reveal within {REVEAL_BLOCK_LIMIT} blocks (~16 seconds) after commit to avoid penalty and receive rank F.
                    </div>
                    <div className="bg-gray-800 border-4 border-t-indigo-400 border-l-indigo-400 border-r-indigo-800 border-b-indigo-800 rounded-none p-6 w-full text-center shadow-pixel-md">
                    {/* Countdown Timer (Conditional - Rendered first if available) */} 
                    {commitBlockNumber && currentBlockNumber && (
                          <div className="mb-4 text-center">
                        {(() => {
                            const targetBlock = commitBlockNumber + REVEAL_BLOCK_LIMIT;
                            const blocksLeft = targetBlock - Number(currentBlockNumber);
                              const checkIsExpired = blocksLeft <= 0;
                              
                              if (!checkIsExpired) {
                                // ยังไม่หมดเวลา
                            const secondsLeft = blocksLeft * 0.5;
                            const minutesLeft = Math.floor(secondsLeft / 60);
                            const remainingSeconds = Math.round(secondsLeft % 60);
                                
                                return (
                                  <div className="bg-indigo-900/30 p-3 rounded-lg border border-indigo-500/50 mb-3">
                                    <p className="text-yellow-400 text-lg font-semibold">Reveal Window</p>
                                    <p className="text-yellow-300 text-2xl font-bold mb-2">
                                      {blocksLeft} blocks left
                                    </p>
                                    <p className="text-indigo-300 text-sm">~{minutesLeft}m {remainingSeconds}s remaining</p>
                                  </div>
                                );
                            } else {
                                // หมดเวลาแล้ว
                                return (
                                  <div className="bg-red-900/30 p-3 rounded-lg border border-red-500/50 mb-3">
                                    <p className="text-red-400 text-lg font-semibold">Reveal Window Expired</p>
                                    <p className="text-red-300">Your NFTs will be Rank F</p>
                                    <p className="text-red-300">Expired by {Math.abs(blocksLeft)} blocks</p>
                                  </div>
                                );
                            }
                        })()}
                        </div>
                    )}

                    {/* Reveal Buttons */} 
                    {(() => {
                          // ตรวจสอบว่า expired หรือไม่ (จะใช้ตัวแปรในฟังก์ชันข้างล่างโดยตรง)
                          const canCheckExpiry = !!(commitBlockNumber && currentBlockNumber);
                          let checkIsExpired = false;
                          let blocksLeftForDisplay = 0;
                          
                          if (canCheckExpiry) {
                            const targetBlock = commitBlockNumber + REVEAL_BLOCK_LIMIT;
                            blocksLeftForDisplay = targetBlock - Number(currentBlockNumber);
                            checkIsExpired = blocksLeftForDisplay <= 0;
                          }

                          // --- CRITICAL DEBUG FOR UI --- 
                          console.log("[UI Reveal Section] Rendering. CommittedPackSize:", committedPackSize, "Stage:", stage, "IsExpired:", checkIsExpired, "CanCheckExpiry:", canCheckExpiry, "CommitBlock:", commitBlockNumber, "CurrentBlock:", currentBlockNumber ? Number(currentBlockNumber) : undefined);
                          
                          if (!checkIsExpired) {
                            // ----- Reveal within time limit (or if check is not ready due to missing block numbers) -----
                            // We will base the button display *directly* on committedPackSize state here.
                            if (committedPackSize === 1) {
                            return (
                                    <div className="bg-gray-800 border-2 border-green-600 rounded-lg overflow-hidden shadow-lg hover:shadow-green-500/30 transition-all">
                                        <div className="p-4 bg-green-900/60 border-b border-green-500 text-center">
                                            <h3 className="text-lg font-bold text-white">Reveal Single NFT</h3>
                                            <p className="text-sm text-green-200">Ready to reveal!</p>
                                        </div>
                                        <div className="p-4 text-center">
                                            <p className="mb-2 text-sm text-gray-300">Chance for rare ranks!</p>
                                            <button 
                                                onClick={handleReveal} 
                                                disabled={isWaitingRevealConfirm || txSending || isProcessingReveal || isSwitchingNetworkInternal || isSwitchingChainGlobal} 
                                                className="w-full px-4 py-2 rounded-none bg-green-600 hover:bg-green-500 text-yellow-300 disabled:opacity-50 font-bold shadow-pixel-md hover:translate-y-[-2px] hover:shadow-pixel-lg border-4 border-t-green-400 border-l-green-400 border-r-green-700 border-b-green-700 transition-all"
                                            >
                                                REVEAL 1 NFT
                                        </button>
                                        </div>
                                    </div>
                                );
                            } else if (committedPackSize === 10) {
                                return (
                                    <div className="bg-gray-800 border-2 border-indigo-600 rounded-lg overflow-hidden shadow-lg hover:shadow-indigo-500/30 transition-all">
                                        <div className="p-4 bg-indigo-900/60 border-b border-indigo-500 text-center">
                                            <h3 className="text-lg font-bold text-white">Reveal Pack 10+1</h3>
                                            <p className="text-sm text-indigo-200">Ready to reveal!</p>
                                        </div>
                                        <div className="p-4 text-center">
                                            <p className="mb-2 text-sm text-gray-300">Good chance for rare ranks!</p>
                                            <button 
                                                onClick={handleRevealPack10} 
                                                disabled={isWaitingRevealConfirm || txSending || isProcessingReveal || isSwitchingNetworkInternal || isSwitchingChainGlobal} 
                                                className="w-full px-4 py-2 rounded-none bg-indigo-600 hover:bg-indigo-500 text-yellow-300 disabled:opacity-50 font-bold shadow-pixel-md hover:translate-y-[-2px] hover:shadow-pixel-lg border-4 border-t-indigo-400 border-l-indigo-400 border-r-indigo-900 border-b-indigo-900 transition-all"
                                            >
                                                REVEAL {10 + BONUS_MAP[10]} NFTs
                                        </button>
                                        </div>
                                    </div>
                                );
                            } else if (committedPackSize === 25) {
                                return (
                                    <div className="bg-gray-800 border-2 border-blue-600 rounded-lg overflow-hidden shadow-lg hover:shadow-blue-500/30 transition-all">
                                        <div className="p-4 bg-blue-900/60 border-b border-blue-500 text-center">
                                            <h3 className="text-lg font-bold text-white">Reveal Pack 25+3</h3>
                                            <p className="text-sm text-blue-200">Ready to reveal!</p>
                                        </div>
                                        <div className="p-4 text-center">
                                            <p className="mb-2 text-sm text-gray-300">High chance for rare ranks!</p>
                                            <button 
                                                onClick={handleRevealPack25} 
                                                disabled={isWaitingRevealConfirm || txSending || isProcessingReveal || isSwitchingNetworkInternal || isSwitchingChainGlobal} 
                                                className="w-full px-4 py-2 rounded-none bg-blue-600 hover:bg-blue-500 text-yellow-300 disabled:opacity-50 font-bold shadow-pixel-md hover:translate-y-[-2px] hover:shadow-pixel-lg border-4 border-t-blue-400 border-l-blue-400 border-r-blue-900 border-b-blue-900 transition-all"
                                            >
                                                REVEAL {25 + BONUS_MAP[25]} NFTs
                                        </button>
                                        </div>
                                    </div>
                            );
                        } else {
                                // Fallback or if committedPackSize is null/unexpected during non-expired reveal
                                console.log("[UI Reveal Section] Non-expired. committedPackSize is:", committedPackSize, "- showing default/error message.");
                                return <p className="text-yellow-500">Preparing reveal options... If this persists, try refreshing. Committed pack size: {String(committedPackSize)}</p>;
                            }
                        } else {
                              // ----- Reveal expired: show EXPIRED reveal options ----- 
                              // We will base the button display *directly* on committedPackSize state here.
                              let title, buttonHandler, packSizeForExpiredButton;
                              const bonus = committedPackSize ? (BONUS_MAP[committedPackSize] ?? 0) : 0;
                              let totalNFTs = committedPackSize ? committedPackSize + bonus : 1; // Default to 1 if committedPackSize is null

                              if (committedPackSize === 25) {
                                title = "Expired Pack 25+3";
                                buttonHandler = handleRevealExpiredPack25;
                                packSizeForExpiredButton = 25;
                              } else if (committedPackSize === 10) {
                                title = "Expired Pack 10+1";
                                buttonHandler = handleRevealExpiredPack10;
                                packSizeForExpiredButton = 10;
                              } else { // Handles committedPackSize === 1 or null/undefined
                                title = "Expired Single NFT";
                                buttonHandler = handleRevealExpired;
                                packSizeForExpiredButton = 1;
                                if (committedPackSize === null || committedPackSize === undefined) {
                                    console.warn("[UI Reveal Section] Expired. committedPackSize is null/undefined, defaulting to single expired NFT reveal.");
                                    totalNFTs = 1; // Ensure total NFTs is 1 for this case
                                }
                              }
                                  
                              console.log("[UI Reveal Section] Expired. Rendering for committedPackSize:", committedPackSize, "Derived packSizeForExpiredButton:", packSizeForExpiredButton);
                            return (
                                <div className="w-full max-w-md mx-auto">
                                    <div className="bg-gray-800 border-4 border-t-red-400 border-l-red-400 border-r-red-800 border-b-red-800 rounded-none overflow-hidden shadow-pixel-md hover:shadow-pixel-lg transition-all">
                                      <div className="p-4 bg-red-900/60 border-b-2 border-red-500 text-center">
                                        <h3 className="text-lg font-bold text-white">{title}</h3>
                                        <p className="text-sm text-red-200">Time limit passed</p>
                                      </div>
                                      <div className="p-6 text-center">
                                        <p className="mb-4 text-red-400 font-medium">Reveal window has expired</p>
                                        <p className="mb-4 text-gray-300">All NFTs will be Rank F</p>
                                        <button
                                          onClick={buttonHandler}
                                          disabled={isWaitingRevealConfirm || txSending || isProcessingReveal || isSwitchingNetworkInternal || isSwitchingChainGlobal}
                                          className="w-full px-4 py-3 rounded-none bg-red-600 hover:bg-red-500 text-yellow-300 disabled:opacity-50 font-bold shadow-pixel-md hover:translate-y-[-2px] hover:shadow-pixel-lg border-4 border-t-red-400 border-l-red-400 border-r-red-800 border-b-red-800 transition-all"
                                        >
                                          REVEAL {totalNFTs} NFT{totalNFTs !== 1 ? 's' : ''} (RANK F)
                                        </button>
                                      </div>
                                    </div>
                                </div>
                            );
                        }
                    })()}
                      
                      <button 
                        onClick={() => setStage('commit')} 
                        className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-none hover:bg-yellow-500 font-bold shadow-pixel-sm hover:shadow-pixel-md hover:translate-y-[-2px] transition-all border-2 border-t-yellow-400 border-l-yellow-400 border-r-yellow-700 border-b-yellow-700"
                      >
                        CANCEL AND RETURN TO COMMIT
                      </button>

                      <button 
                        onClick={clearCommitment} 
                        className="mt-4 ml-2 px-4 py-2 bg-red-700 text-white rounded-none hover:bg-red-600 font-bold shadow-pixel-sm hover:shadow-pixel-md hover:translate-y-[-2px] transition-all border-2 border-t-red-500 border-l-red-500 border-r-red-900 border-b-red-900"
                      >
                        CLEAR COMMITMENT DATA
                      </button>
                    </div>
                </div>
              )}
            </>
          )}
          
          {/* Show Reveal Processing State */}
          {isProcessingReveal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-gray-900 border-4 border-t-indigo-400 border-l-indigo-400 border-r-indigo-800 border-b-indigo-800 rounded-none p-8 max-w-md w-full mx-4 text-center shadow-pixel-lg">
                <h2 className="text-2xl font-bold text-yellow-300 mb-4 text-shadow-pixel animate-pulse-slow">Revealing your NFTs</h2>
                <div className="w-full h-2 bg-gray-700 rounded-none mb-6 overflow-hidden border-2 border-t-gray-600 border-l-gray-600 border-r-gray-900 border-b-gray-900">
                  <div className="animate-pulse h-full bg-green-500"></div>
                </div>
                <p className="text-lg text-gray-300 mb-2 font-vt323">Processing transaction data...</p>
                <p className="text-sm text-gray-400 font-vt323">Please wait while we gather your NFT results</p>
              </div>
            </div>
          )}
          
          {/* Reveal Warning Modal */}
          {showRevealWarningModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn">
              <div className="w-[550px] bg-indigo-900 p-6 border-4 border-t-indigo-400 border-l-indigo-400 border-r-indigo-800 border-b-indigo-800 text-center shadow-pixel-xl transform transition-all animate-scaleIn rounded-none">
                <h2 className="text-4xl text-yellow-300 mb-4 font-bold font-vt323 text-shadow-pixel animate-pulse-slow">⚠️ IMPORTANT WARNING ⚠️</h2>
                
                <div className="bg-indigo-800/40 p-6 mb-6 border-2 border-indigo-600 text-left rounded-none">
                  <p className="text-2xl text-white font-bold mb-4 font-vt323">After you commit:</p>
                  <ul className="text-white text-xl px-6 space-y-4 list-disc font-vt323">
                    <li className="font-semibold">
                      You <span className="underline decoration-red-500 decoration-2">MUST reveal within {REVEAL_BLOCK_LIMIT} blocks</span> (approximately 16 seconds)
                    </li>
                    <li className="font-semibold">
                      Failing to reveal in time will result in <span className="text-red-400 font-bold">Rank F NFTs</span> as a penalty
                    </li>
                    <li>
                      Make sure you'll be able to complete both transactions
                    </li>
                  </ul>
                </div>
                
                <div className="flex gap-8 justify-center">
                  <button 
                    onClick={confirmAndExecuteCommit}
                    className="px-5 py-4 bg-green-700 hover:bg-green-600 text-yellow-300 font-bold text-xl rounded-none border-4 border-t-green-500 border-l-green-500 border-r-green-900 border-b-green-900 shadow-pixel-md hover:translate-y-[-4px] hover:shadow-pixel-lg transition-all"
                  >
                    I UNDERSTAND, CONTINUE
                  </button>
                  <button 
                    onClick={cancelCommit}
                    className="px-5 py-4 bg-red-700 hover:bg-red-600 text-yellow-300 font-bold text-xl rounded-none border-4 border-t-red-500 border-l-red-500 border-r-red-900 border-b-red-900 shadow-pixel-md hover:translate-y-[-4px] hover:shadow-pixel-lg transition-all"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </div>
          )}
          
                        {/* Display Minted NFT Results in a compact card format */}
      {mintedNfts.length > 0 && !isProcessingReveal && (
            <div className="box-border w-full max-w-full mx-auto mt-8 bg-gradient-to-b from-gray-900 to-indigo-950 border-4 border-t-indigo-400 border-l-indigo-400 border-r-indigo-800 border-b-indigo-800 rounded-none p-8 text-center shadow-pixel-lg relative overflow-hidden mint-results">
              <h2 className="text-3xl font-bold text-pink-500 uppercase mb-8 text-shadow-pixel animate-pulse-slow">
                Mint Results <span className="text-yellow-300">({mintedNfts.length} NFTs)</span>
              </h2>
              
              {/* All Minted NFTs List in Grid */}
              <div className="mt-6">
                <h3 className="text-xl font-bold text-indigo-300 mb-4 text-shadow-sm">Your Minted NFTs</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 justify-items-center overflow-x-hidden">
                  {mintedNfts.map(nft => {
                    const rankNames = ['UR', 'SSR', 'SR', 'R', 'UC', 'C'];
                    const rankName = rankNames[nft.rank] || 'F';
                    const rankColors = {
                      'UR': 'border-pink-500 bg-gradient-to-b from-pink-900/40 to-pink-900/10',
                      'SSR': 'border-yellow-500 bg-gradient-to-b from-yellow-900/40 to-yellow-900/10',
                      'SR': 'border-purple-400 bg-gradient-to-b from-purple-900/40 to-purple-900/10',
                      'R': 'border-blue-400 bg-gradient-to-b from-blue-900/40 to-blue-900/10',
                      'UC': 'border-green-400 bg-gradient-to-b from-green-900/40 to-green-900/10',
                      'C': 'border-gray-400 bg-gradient-to-b from-gray-800/50 to-gray-900/30',
                      'F': 'border-gray-500 bg-gradient-to-b from-gray-900/50 to-gray-900/20'
                    };
                    const textColors = {
                      'UR': 'text-pink-500',
                      'SSR': 'text-yellow-500',
                      'SR': 'text-purple-400',
                      'R': 'text-blue-400',
                      'UC': 'text-green-400',
                      'C': 'text-gray-400',
                      'F': 'text-gray-500'
                    };
                    const shadowColors = {
                      'UR': 'shadow-pink-500/20',
                      'SSR': 'shadow-yellow-500/20',
                      'SR': 'shadow-purple-400/20',
                      'R': 'shadow-blue-400/20',
                      'UC': 'shadow-green-400/20',
                      'C': 'shadow-gray-400/10',
                      'F': 'shadow-gray-500/10'
                    };
                    
                    // สร้างคลาสสำหรับขอบแบบ pixel art
                    const borderTopClass = {
                      'UR': 'border-t-pink-400 border-l-pink-400 border-r-pink-900 border-b-pink-900',
                      'SSR': 'border-t-yellow-400 border-l-yellow-400 border-r-yellow-900 border-b-yellow-900',
                      'SR': 'border-t-purple-400 border-l-purple-400 border-r-purple-900 border-b-purple-900',
                      'R': 'border-t-blue-400 border-l-blue-400 border-r-blue-900 border-b-blue-900',
                      'UC': 'border-t-green-400 border-l-green-400 border-r-green-900 border-b-green-900',
                      'C': 'border-t-gray-400 border-l-gray-400 border-r-gray-700 border-b-gray-700',
                      'F': 'border-t-gray-500 border-l-gray-500 border-r-gray-800 border-b-gray-800'
                    };
                    
                    const borderClass = rankColors[rankName as keyof typeof rankColors] || 'border-gray-700';
                    const textClass = textColors[rankName as keyof typeof textColors] || 'text-gray-500';
                    const shadowClass = shadowColors[rankName as keyof typeof shadowColors] || '';
                    const pixelBorderClass = borderTopClass[rankName as keyof typeof borderTopClass] || '';
                    
                    // Define points map with explicit numeric keys - points per hour
                    const pointsPerHourMap: {[key: number]: number} = {
                      0: 4444.44, // UR: 320K / 72 hours
                      1: 1428.57, // SSR: 240K / 168 hours
                      2: 446.43,  // SR: 150K / 336 hours
                      3: 357.14,  // R: 120K / 336 hours
                      4: 148.81,  // UC: 100K / 672 hours
                      5: 119.05,  // C: 80K / 672 hours
                      6: 1.39     // F: 1K / 720 hours
                    };
                    
                    // Get lifetime hours for the rank
                    const lifetimeHoursMap: {[key: number]: number} = {
                      0: 72,   // UR: 72 hours (3 days)
                      1: 168,  // SSR: 168 hours (7 days)
                      2: 336,  // SR: 336 hours (14 days)
                      3: 336,  // R: 336 hours (14 days)
                      4: 672,  // UC: 672 hours (28 days)
                      5: 672,  // C: 672 hours (28 days)
                      6: 720   // F: 720 hours (30 days)
                    };
                    
                    // Convert hours to days for readability
                    const days = Math.round((lifetimeHoursMap[nft.rank] || 0) / 24 * 10) / 10;
                    
                    // Get points per hour and calculate rate
                    const ratePerHour = pointsPerHourMap[nft.rank] || 0;
                    
                    // Check if this is the best NFT
                    const sortedNfts = [...mintedNfts].sort((a, b) => a.rank - b.rank);
                    const isBestNft = sortedNfts[0]?.tokenId === nft.tokenId;
                    
                    return (
                        <div 
                          key={nft.tokenId} 
                          className={`nft-card rounded-none p-3 border-4 ${pixelBorderClass} ${isBestNft ? 'ring-4 ring-yellow-400 shadow-pixel-md' : 'shadow-pixel-sm'} w-full max-w-32 mx-auto transition-all hover:-translate-y-2 hover:shadow-pixel-lg`}
                        >
                          <div className={`text-center font-bold ${textClass} text-lg mb-1 tracking-wide text-shadow-sm`}>{rankName}</div>
                           
                          {/* Mini Image Thumbnail - ปรับปรุงให้เป็นแบบ pixel art */}
                          <div className="relative h-16 w-16 mx-auto my-2">
                            <div className={`absolute inset-0 rounded-none ${borderClass.replace('border-', 'bg-').replace('bg-gradient-to-b from-', '').replace(' to-gray-900/10', '')} opacity-20 ${isBestNft ? 'animate-pulse' : ''}`}></div>
                            <img 
                              src={`/image/${rankName}.png`} 
                              alt={rankName} 
                              className={`relative h-full w-full object-contain ${isBestNft ? 'animate-pulse' : ''}`}
                              style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '100%' }}
                            />
                          </div>
                           
                          <div className="text-sm font-semibold text-white mb-2 font-vt323">#{nft.tokenId}</div>
                          
                          <div className="text-sm text-indigo-300 font-medium font-vt323">
                            Expires: {days} days
                          </div>
                          
                          <div className={`text-xs mt-1 font-medium bg-gray-800/50 p-1 text-yellow-300 font-vt323 border ${textClass.replace('text-', 'border-')}`}>
                            Rate: <span className="font-bold">{ratePerHour.toFixed(2)}</span> pts/hr
                          </div>
                          
                          {isBestNft && (
                            <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 rotate-12">
                              <div className="bg-yellow-500 text-black text-xs px-2 py-1 font-bold shadow-pixel-sm">BEST</div>
                            </div>
                          )}
                        </div>
                      );
                  })}
                </div>
              </div>
              
              <button
                onClick={() => {
                  setMintedNfts([]);
                  setLastMintedTokenInfo(null);
                }}
                className="mt-8 px-8 py-3 bg-indigo-700 hover:bg-indigo-600 border-4 border-t-indigo-400 border-l-indigo-400 border-r-indigo-800 border-b-indigo-800 rounded-none text-yellow-300 font-medium text-lg transition-all shadow-pixel-md hover:translate-y-[-4px] hover:shadow-pixel-lg"
              >
                CLEAR RESULTS
              </button>
            </div>
          )}
          
          {/* Tx Hashes & Errors */}
          {(commitTxHash || revealTxHash) && (isWaitingCommitConfirm || isWaitingRevealConfirm) && (
            <div className="mt-4 text-sm text-gray-400 text-center">
              <p>Transaction pending. Please wait for confirmation.</p>
        </div>
      )}
        </>
      )}

      <div className="mt-8 text-sm text-gray-400 text-center">
        <p>Connected to {monadTestnet.name} (Chain ID: {monadTestnet.id})</p>
        <p>NFT Contract: {LILNAD_NFT_ADDRESS}</p>
      </div>
    </div>
  )
} 