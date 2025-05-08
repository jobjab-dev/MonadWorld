'use client';

import { ethers } from 'ethers';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain, useReadContract, useBlockNumber } from 'wagmi'
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
    25: 3, // Pack 25 bonus (BONUS_25)
    50: 6, // Pack 50 bonus (BONUS_50)
    100: 12 // Pack 100 bonus (BONUS_100)
};

const REVEAL_BLOCK_LIMIT = 256; // <<<< ADDED CONSTANT

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
  const [stage, setStage] = useState<'commit' | 'waiting-commit-confirm' | 'reveal' | 'reveal-pack-10' | 'reveal-pack-25' | 'reveal-pack-50' | 'reveal-pack-100'>('commit')
  const [mounted, setMounted] = useState(false)
  const [userDeclinedSwitch, setUserDeclinedSwitch] = useState(false)
  const [chainNotFoundError, setChainNotFoundError] = useState(false)
  const [isAddingChain, setIsAddingChain] = useState(false)
  const [isSwitchingNetworkInternal, setIsSwitchingNetworkInternal] = useState(false);

  // --- State for commit status (includes pack size now) --- 
  const [userCommitment, setUserCommitment] = useState<`0x${string}` | null>(null);
  const [commitBlockNumber, setCommitBlockNumber] = useState<number | null>(null);
  const [isLoadingCommitStatus, setIsLoadingCommitStatus] = useState(true);
  const [committedPackSize, setCommittedPackSize] = useState<number | null>(null);
  const [revealExpectedCount, setRevealExpectedCount] = useState<number | null>(null);

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
  const [lastMintedTokenInfo, setLastMintedTokenInfo] = useState<{id: string; rank: number; image: string | null; metadata: string | null} | null>(null);
  const [mintedTokenMetadataUri, setMintedTokenMetadataUri] = useState<string | null>(null);
  const [mintedTokenImageUri, setMintedTokenImageUri] = useState<string | null>(null);
  const [isProcessingReveal, setIsProcessingReveal] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

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
    if (!isLoadingCommitInfoRead && isConnected && mounted) { 
      let stageToSet: typeof stage = 'commit'; // Default stage
      let packSizeFromStorage: number | null = null;

      if (commitInfo) {
        const [commitment, blockNum] = commitInfo as CommitInfoType;
        const emptyCommitment = '0x0000000000000000000000000000000000000000000000000000000000000000';
        
        if (commitment !== emptyCommitment && blockNum > 0) {
          // Existing commit found on chain
          setUserCommitment(commitment);
          setCommitBlockNumber(blockNum);
          packSizeFromStorage = getPackSizeFromStorage(); // Try reading pack size from storage
          setCommittedPackSize(packSizeFromStorage); // Store it in state
          console.log(`Existing commit found (Block: ${blockNum}). Pack size from storage: ${packSizeFromStorage}`);

          // Determine reveal stage based on pack size from storage
          if (packSizeFromStorage === 10) stageToSet = 'reveal-pack-10';
          else if (packSizeFromStorage === 25) stageToSet = 'reveal-pack-25';
          else if (packSizeFromStorage === 50) stageToSet = 'reveal-pack-50';
          else if (packSizeFromStorage === 100) stageToSet = 'reveal-pack-100';
          else stageToSet = 'reveal'; // Default to single if storage is null/invalid

        } else {
          // No commit found on chain
          setUserCommitment(null);
          setCommitBlockNumber(null);
          setCommittedPackSize(null);
          savePackSizeToStorage(null); // Clear storage if no commit on chain
          stageToSet = 'commit';
        }
      } else {
         // commitInfo read failed or returned null
         setUserCommitment(null);
         setCommitBlockNumber(null);
         setCommittedPackSize(null);
         savePackSizeToStorage(null);
         stageToSet = 'commit';
      }
      
      // Set the stage unless we are actively waiting for a reveal TX confirmation
      if (!revealTxHash && !isProcessingReveal) {
          setStage(stageToSet);
      }
    }
  }, [commitInfo, isLoadingCommitInfoRead, isConnected, mounted, revealTxHash, isProcessingReveal]); // Removed internal states like userCommitment from deps

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
  }, [accountAddress, isConnected, mounted, refetchCommitInfo]);

  // generate salt once on mount
  useEffect(() => {
    // WARNING: This salt generation on mount might cause issues if user committed in a previous session.
    // Consider implementing salt persistence (localStorage) or changing contract logic.
    const random = crypto.getRandomValues(new Uint8Array(32))
    const newSalt = toHex(random);
    console.log("Generated new salt on mount:", newSalt);
    setSalt(newSalt);
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

  // --- useEffect for commit receipt processing --- 
  useEffect(() => {
    if (!commitTxHash) return;

    if (commitTxSuccess && commitReceipt && stage === 'waiting-commit-confirm') {
      const packSizeCommitted = getPackSizeFromStorage(); 
      console.log("Commit Tx confirmed...");
      if (packSizeCommitted === 10) setStage('reveal-pack-10');
      else if (packSizeCommitted === 25) setStage('reveal-pack-25');
      else if (packSizeCommitted === 50) setStage('reveal-pack-50');
      else if (packSizeCommitted === 100) setStage('reveal-pack-100');
      else setStage('reveal'); 
      
      setCommitTxHash(undefined); 
      resetWriteContract();
      setMintedNfts([]); 
      setLastMintedTokenInfo(null);
    } else if (commitTxError && stage === 'waiting-commit-confirm') {
      console.error("Commit transaction failed:", writeContractError); 
      alert(`Commit transaction failed. Please check console.`);
      setCommitTxHash(undefined);
      savePackSizeToStorage(null); 
      setCommittedPackSize(null);
      setStage('commit'); 
      resetWriteContract();
    }
  }, [commitTxSuccess, commitReceipt, commitTxError, commitTxHash, stage, resetWriteContract]);

  // --- useEffect for reveal receipt processing - Use correct setters --- 
  useEffect(() => {
    if (!revealTxHash) return; 

    if (revealTxSuccess && revealReceipt && revealTxHash === revealReceipt.transactionHash) { 
      console.log("Reveal transaction successful, processing receipt:");
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
          const lastNft = revealedNftsFromLogs[revealedNftsFromLogs.length - 1];
          setLastMintedTokenInfo({ id: lastNft.tokenId, rank: lastNft.rank, image: null, metadata: null }); // Set basic info first
          const metadataApiBase = "https://api.yourdapp.com/sbt/metadata/"; 
          const metadataUri = `${metadataApiBase}${lastNft.tokenId}`;
          setMintedTokenMetadataUri(metadataUri);
          
          console.log("Fetching metadata from:", metadataUri);
          fetch(metadataUri)
            .then(res => {
              if (!res.ok) { throw new Error(`HTTP ${res.status}: ${res.statusText}`); }
              return res.json();
            })
            .then(metadata => {
              console.log("Fetched Metadata JSON:", metadata);
              if (metadata && metadata.image) {
                setLastMintedTokenInfo(prev => prev ? { ...prev, image: metadata.image } : null); // Update existing info with image
                setMintedTokenImageUri(metadata.image); // Keep separate state if needed elsewhere
              } else {
                 setMetadataError("Metadata OK, but missing 'image' field.");
              }
            })
            .catch(err => {
              console.error("Error fetching/parsing metadata:", err);
              setMetadataError(`Metadata fetch failed: ${err.message}`);
            })
            .finally(() => {
               setIsProcessingReveal(false);
               setStage('commit'); 
               setRevealTxHash(undefined); 
               savePackSizeToStorage(null);
               setCommittedPackSize(null);
               resetWriteContract(); 
            });
        } else {
          console.error("No RevealAndMint event logs found in the successful transaction.");
          setMetadataError("Reveal successful, but event data couldn't be processed.");
          setIsProcessingReveal(false);
          setStage('commit');
          setRevealTxHash(undefined);
          savePackSizeToStorage(null);
          setCommittedPackSize(null);
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
         resetWriteContract();
      }
    } else if (revealTxError && !waitingRevealReceipt && revealTxHash) {
         console.log("Reveal transaction failed on chain:", writeContractError); // Log the specific write error
         setStage('commit'); 
         setRevealTxHash(undefined); 
         savePackSizeToStorage(null);
         setCommittedPackSize(null);
    }
  }, [revealTxSuccess, revealReceipt, revealTxError, revealTxHash, stage, waitingRevealReceipt, LILNAD_NFT_ADDRESS, accountAddress, resetWriteContract]);

  // --- Generic Expired Reveal Function --- 
  const executeExpiredReveal = async (revealFunc: string) => {
      const packSizeToReveal = committedPackSize;
      if (packSizeToReveal === null) { alert("Cannot determine pack size..."); setStage('commit'); return; }
      const expectedCount = packSizeToReveal + (BONUS_MAP[packSizeToReveal] ?? 0);

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
        const emptyUris = Array(expectedCount).fill("");
        console.log(`Calling ${revealFunc} (Expired) expecting ${expectedCount} NFTs...`);
        const hash = await writeContractAsync({
          chainId: monadTestnet.id,
          abi: LilnadNFTAbi,
          address: LILNAD_NFT_ADDRESS,
          functionName: revealFunc,
          args: packSizeToReveal === 1 ? [emptyUris[0]] : [emptyUris],
        });
        setRevealTxHash(hash);
        console.log(`${revealFunc} (Expired) transaction sent:`, hash);
        // Stage will be reset by useEffect watching revealReceipt
      } catch (e: any) {
         console.error("Error processing expired reveal:", e);
         alert(`Expired Reveal failed: ${(e as Error).message}`);
      }
  }

  // --- Specific Expired Reveal Handlers - Use committedPackSize from state --- 
  const handleRevealExpired = () => committedPackSize === 1 && executeExpiredReveal('revealExpiredCommit');
  const handleRevealExpiredPack10 = () => committedPackSize === 10 && executeExpiredReveal('revealExpiredCommitPack10');
  const handleRevealExpiredPack25 = () => committedPackSize === 25 && executeExpiredReveal('revealExpiredCommitPack25');
  const handleRevealExpiredPack50 = () => committedPackSize === 50 && executeExpiredReveal('revealExpiredCommitPack50');
  const handleRevealExpiredPack100 = () => committedPackSize === 100 && executeExpiredReveal('revealExpiredCommitPack100');

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
    if (userCommitment) { alert("Reveal pending commit first."); setStage('reveal'); return; }
    if (!salt) { alert("Salt not generated."); return; }

    // Reset states before sending
    setCommitTxHash(undefined);
    setRevealTxHash(undefined);
    setMintedNfts([]); 
    setLastMintedTokenInfo(null);
    setMetadataError(null);
    resetWriteContract();
    savePackSizeToStorage(packSize);
    setCommittedPackSize(packSize); 
    setRevealExpectedCount(packSize + (BONUS_MAP[packSize] ?? 0));

    setIsSwitchingNetworkInternal(true);
    let chainForTransaction = connectedChainFromHook; 
    // ... (Inline chain switch logic) ...
     if (chainForTransaction?.id !== monadTestnet.id) { setIsSwitchingNetworkInternal(false); return; }
     setIsSwitchingNetworkInternal(false);

    try {
      const emptyUriString = "";
      if (!salt) throw new Error("Salt is missing for commit");
      const commitment = keccak256(encodePacked(['string', 'bytes32'], [emptyUriString, salt]));
      
      console.log(`Submitting ${commitFunc}...`);
      const h = await writeContractAsync({
        chainId: monadTestnet.id, 
        abi: LilnadNFTAbi,
        address: LILNAD_NFT_ADDRESS,
        functionName: commitFunc,
        args: [commitment],
        value: value,
      });
      setCommitTxHash(h);
      setStage('waiting-commit-confirm');
      console.log(`${commitFunc} tx sent:`, h);
    } catch (e: any) {
      console.error(`${commitFunc} Error:`, e);
      alert(`Commitment failed: ${(e as Error).message}`);
      savePackSizeToStorage(null);
      setCommittedPackSize(null);
      setStage('commit');
    }
  }

  // --- Specific Commit Handlers - Pass packSize=1 for single --- 
  const handleCommit = () => executeCommit('commitMint', MINT_FEE, 1);
  const handleCommitPack10 = () => executeCommit('commitMintPack10', MINT_FEE * BigInt(10), 10);
  const handleCommitPack25 = () => executeCommit('commitMintPack25', MINT_FEE * BigInt(25), 25);
  const handleCommitPack50 = () => executeCommit('commitMintPack50', MINT_FEE * BigInt(50), 50);
  const handleCommitPack100 = () => executeCommit('commitMintPack100', MINT_FEE * BigInt(100), 100);

  // --- Generic Reveal Function --- 
  const executeReveal = async (revealFunc: string) => {
    const packSizeToReveal = committedPackSize;
    if (packSizeToReveal === null) {
        alert("Cannot determine pack size to reveal. Commit might be missing or from another session.");
        setStage('commit'); 
        return;
    }
    const expectedCount = packSizeToReveal + (BONUS_MAP[packSizeToReveal] ?? 0);
    
    if (!salt) { alert("Error: Salt not available..."); return; }
    
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
  
  // --- Specific Reveal Handlers - Use committedPackSize from state --- 
  const handleReveal = () => committedPackSize === 1 && executeReveal('revealMint');
  const handleRevealPack10 = () => committedPackSize === 10 && executeReveal('revealMintPack10');
  const handleRevealPack25 = () => committedPackSize === 25 && executeReveal('revealMintPack25');
  const handleRevealPack50 = () => committedPackSize === 50 && executeReveal('revealMintPack50');
  const handleRevealPack100 = () => committedPackSize === 100 && executeReveal('revealMintPack100');

  return (
    <div className="p-10 flex flex-col gap-4 max-w-xl mx-auto items-center">
      {isConnected && actualChainId === monadTestnet.id && (
        <>
          {isLoadingCommitStatus ? (
            <p className="text-yellow-400">Loading status...</p>
          ) : (
            <> 
              <p className="text-sm text-gray-400">Current Stage: {stage}</p>
              
              {/* Commit Buttons (Show only in commit stage) */} 
              {stage === 'commit' && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  <button onClick={handleCommit} disabled={isWaitingCommitConfirm || txSending || isSwitchingNetworkInternal || isSwitchingChainGlobal} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 font-semibold">
                     {isWaitingCommitConfirm ? 'Confirming...' : (txSending ? 'Check Wallet...' : `Commit 1 (${ethers.formatEther(MINT_FEE)} MON)`)}
                  </button>
                  <button onClick={handleCommitPack10} disabled={isWaitingCommitConfirm || txSending || isSwitchingNetworkInternal || isSwitchingChainGlobal} className="px-4 py-2 rounded bg-blue-700 text-white disabled:opacity-50 font-semibold">
                     {isWaitingCommitConfirm ? 'Confirming...' : (txSending ? 'Check Wallet...' : `Commit 10+${BONUS_MAP[10]} (${ethers.formatEther(MINT_FEE * BigInt(10))} MON)`)}
                  </button>
                  <button onClick={handleCommitPack25} disabled={isWaitingCommitConfirm || txSending || isSwitchingNetworkInternal || isSwitchingChainGlobal} className="px-4 py-2 rounded bg-blue-700 text-white disabled:opacity-50 font-semibold">
                     {isWaitingCommitConfirm ? 'Confirming...' : (txSending ? 'Check Wallet...' : `Commit 25+${BONUS_MAP[25]} (${ethers.formatEther(MINT_FEE * BigInt(25))} MON)`)}
                  </button>
                  <button onClick={handleCommitPack50} disabled={isWaitingCommitConfirm || txSending || isSwitchingNetworkInternal || isSwitchingChainGlobal} className="px-4 py-2 rounded bg-blue-800 text-white disabled:opacity-50 font-semibold">
                     {isWaitingCommitConfirm ? 'Confirming...' : (txSending ? 'Check Wallet...' : `Commit 50+${BONUS_MAP[50]} (${ethers.formatEther(MINT_FEE * BigInt(50))} MON)`)}
                  </button>
                  <button onClick={handleCommitPack100} disabled={isWaitingCommitConfirm || txSending || isSwitchingNetworkInternal || isSwitchingChainGlobal} className="px-4 py-2 rounded bg-blue-800 text-white disabled:opacity-50 font-semibold">
                     {isWaitingCommitConfirm ? 'Confirming...' : (txSending ? 'Check Wallet...' : `Commit 100+${BONUS_MAP[100]} (${ethers.formatEther(MINT_FEE * BigInt(100))} MON)`)}
                  </button>
                </div>
              )}

              {/* Waiting for Commit Confirm */} 
              {stage === 'waiting-commit-confirm' && (
                  <p className="text-purple-400">Waiting for commit transaction confirmation...</p>
              )}

              {/* --- Reveal Section (Show immediately when stage starts with reveal) --- */}
              {stage.startsWith('reveal') && (
                <div className="flex flex-col items-center gap-4 mt-4">
                    {/* Countdown Timer (Conditional - Rendered first if available) */} 
                    {commitBlockNumber && currentBlockNumber && (
                        <div className="my-2 text-center text-yellow-400 text-sm">
                        {(() => {
                            const targetBlock = commitBlockNumber + REVEAL_BLOCK_LIMIT;
                            const blocksLeft = targetBlock - Number(currentBlockNumber);
                            if (blocksLeft > 0) {
                            const secondsLeft = blocksLeft * 0.5;
                            const minutesLeft = Math.floor(secondsLeft / 60);
                            const remainingSeconds = Math.round(secondsLeft % 60);
                            return `Reveal within ${blocksLeft} blocks (~${minutesLeft}m ${remainingSeconds}s)`;
                            } else {
                            return `Reveal window expired at block ${targetBlock}. You can reveal for Rank C.`;
                            }
                        })()}
                        </div>
                    )}

                    {/* Reveal Buttons */} 
                    {(() => {
                        // Default to assuming it's NOT expired unless proven otherwise
                        let isExpired = false;
                        let canCheckExpiry = false;

                        if (commitBlockNumber && currentBlockNumber !== undefined) {
                            canCheckExpiry = true;
                            const targetBlock = commitBlockNumber + REVEAL_BLOCK_LIMIT;
                            isExpired = Number(currentBlockNumber) > targetBlock;
                            // console.log(`Expiry Check: Current=${currentBlockNumber}, Commit=${commitBlockNumber}, Target=${targetBlock}, Expired=${isExpired}`);
                        }

                        if (!canCheckExpiry) {
                            console.log("Block numbers not ready for expiry check, defaulting to Normal Reveal button display.");
                        }

                        if (!isExpired) {
                            // ----- Reveal within time limit (or if check is not ready) -----
                            return (
                                <>
                                    {/* Render correct NORMAL reveal button based on stage/committedPackSize */} 
                                    {stage === 'reveal' && committedPackSize === 1 && (
                                        <button onClick={handleReveal} disabled={isWaitingRevealConfirm || txSending || isProcessingReveal || isSwitchingNetworkInternal || isSwitchingChainGlobal} className="px-6 py-3 rounded bg-green-600 text-white disabled:opacity-50 text-lg font-semibold">
                                            Reveal 1 NFT (Random Rank)
                                        </button>
                                    )}
                                    {stage === 'reveal-pack-10' && committedPackSize === 10 && (
                                        <button onClick={handleRevealPack10} disabled={isWaitingRevealConfirm || txSending || isProcessingReveal || isSwitchingNetworkInternal || isSwitchingChainGlobal} className="px-6 py-3 rounded bg-green-700 text-white disabled:opacity-50 text-lg font-semibold">
                                            Reveal {10 + BONUS_MAP[10]} NFTs (Random Rank)
                                        </button>
                                    )}
                                    {stage === 'reveal-pack-25' && committedPackSize === 25 && (
                                        <button onClick={handleRevealPack25} disabled={isWaitingRevealConfirm || txSending || isProcessingReveal || isSwitchingNetworkInternal || isSwitchingChainGlobal} className="px-6 py-3 rounded bg-green-700 text-white disabled:opacity-50 text-lg font-semibold">
                                            Reveal {25 + BONUS_MAP[25]} NFTs (Random Rank)
                                        </button>
                                    )}
                                    {stage === 'reveal-pack-50' && committedPackSize === 50 && (
                                        <button onClick={handleRevealPack50} disabled={isWaitingRevealConfirm || txSending || isProcessingReveal || isSwitchingNetworkInternal || isSwitchingChainGlobal} className="px-6 py-3 rounded bg-green-800 text-white disabled:opacity-50 text-lg font-semibold">
                                            Reveal {50 + BONUS_MAP[50]} NFTs (Random Rank)
                                        </button>
                                    )}
                                    {stage === 'reveal-pack-100' && committedPackSize === 100 && (
                                        <button onClick={handleRevealPack100} disabled={isWaitingRevealConfirm || txSending || isProcessingReveal || isSwitchingNetworkInternal || isSwitchingChainGlobal} className="px-6 py-3 rounded bg-green-800 text-white disabled:opacity-50 text-lg font-semibold">
                                            Reveal {100 + BONUS_MAP[100]} NFTs (Random Rank)
                                        </button>
                                    )}
                                    {/* Add a case if committedPackSize is somehow null here but stage is reveal? */} 
                                    {committedPackSize === null && stage !== 'commit' && !isLoadingCommitStatus && (
                                        <p className="text-red-500">Error: Cannot determine reveal type. Please refresh or commit again.</p>
                                    )}
                                </> 
                            );
                        } else {
                            // ----- Reveal expired ----- 
                            return (
                                <> 
                                    {/* Render correct EXPIRED reveal button based on stage/committedPackSize */} 
                                    {stage === 'reveal' && committedPackSize === 1 && (
                                        <button onClick={handleRevealExpired} disabled={isWaitingRevealConfirm || txSending || isProcessingReveal || isSwitchingNetworkInternal || isSwitchingChainGlobal} className="px-6 py-3 rounded bg-red-600 text-white disabled:opacity-50 text-lg font-semibold">
                                            Reveal 1 NFT (Get Rank C)
                                        </button>
                                    )}
                                    {stage === 'reveal-pack-10' && committedPackSize === 10 && (
                                         <button onClick={handleRevealExpiredPack10} disabled={isWaitingRevealConfirm || txSending || isProcessingReveal || isSwitchingNetworkInternal || isSwitchingChainGlobal} className="px-6 py-3 rounded bg-red-700 text-white disabled:opacity-50 text-lg font-semibold">
                                            Reveal {10 + BONUS_MAP[10]} NFTs (Get Rank C)
                                         </button>
                                    )}
                                    {stage === 'reveal-pack-25' && committedPackSize === 25 && (
                                         <button onClick={handleRevealExpiredPack25} disabled={isWaitingRevealConfirm || txSending || isProcessingReveal || isSwitchingNetworkInternal || isSwitchingChainGlobal} className="px-6 py-3 rounded bg-red-700 text-white disabled:opacity-50 text-lg font-semibold">
                                            Reveal {25 + BONUS_MAP[25]} NFTs (Get Rank C)
                                         </button>
                                    )}
                                    {stage === 'reveal-pack-50' && committedPackSize === 50 && (
                                         <button onClick={handleRevealExpiredPack50} disabled={isWaitingRevealConfirm || txSending || isProcessingReveal || isSwitchingNetworkInternal || isSwitchingChainGlobal} className="px-6 py-3 rounded bg-red-800 text-white disabled:opacity-50 text-lg font-semibold">
                                            Reveal {50 + BONUS_MAP[50]} NFTs (Get Rank C)
                                         </button>
                                    )}
                                    {stage === 'reveal-pack-100' && committedPackSize === 100 && (
                                         <button onClick={handleRevealExpiredPack100} disabled={isWaitingRevealConfirm || txSending || isProcessingReveal || isSwitchingNetworkInternal || isSwitchingChainGlobal} className="px-6 py-3 rounded bg-red-800 text-white disabled:opacity-50 text-lg font-semibold">
                                            Reveal {100 + BONUS_MAP[100]} NFTs (Get Rank C)
                                         </button>
                                    )}
                                    {committedPackSize === null && <p className="text-red-500">Error: Cannot determine original commit size for expired reveal.</p>}
                                </> 
                            );
                        }
                    })()}
                </div>
              )}
            </>
          )}
          {/* ... (Tx Hashes, Errors) ... */} 
        </>
      )}
      
      {/* --- MODIFIED: Display Minted NFT Info (Shows last one or list) --- */} 
      {isProcessingReveal && <p className="text-yellow-400 mt-4">Processing reveal results...</p>}
      {mintedNfts.length > 0 && !isProcessingReveal && (
        <div className="mt-6 p-4 border rounded border-gray-600 bg-gray-800 text-center w-full">
          <h3 className="text-xl font-semibold mb-2">Mint Result{mintedNfts.length > 1 ? `s (${mintedNfts.length} NFTs)` : ''}</h3>
          {/* Option 1: Show only the last one with image */} 
          {lastMintedTokenInfo && (
            <div className="mb-4">
              <p>Token ID: {lastMintedTokenInfo.id}</p>
              <p>Rank: {lastMintedTokenInfo.rank !== null ? ['UR', 'SSR', 'SR', 'R', 'UC', 'C'][lastMintedTokenInfo.rank] : 'N/A'} ({lastMintedTokenInfo.rank})</p>
              {lastMintedTokenInfo.image ? (
                  <img src={lastMintedTokenInfo.image} alt={`Lilnad NFT #${lastMintedTokenInfo.id}`} className="mx-auto mt-2 max-w-[150px] rounded shadow-lg" />
              ) : (
                  metadataError ? 
                      <p className="text-red-400 text-xs mt-1">({metadataError})</p> : 
                      <p className="text-yellow-400 text-xs mt-1">(Loading image...)</p> 
              )}
              {lastMintedTokenInfo.metadata && (
                <p className="text-xs mt-1 truncate">Metadata: <a href={lastMintedTokenInfo.metadata} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{lastMintedTokenInfo.metadata}</a></p>
              )}
            </div>
          )}
          {/* Option 2: List all minted IDs and Ranks (especially for bulk) */} 
          {mintedNfts.length > 1 && (
            <div className="mt-4 pt-2 border-t border-gray-700">
              <p className="text-sm font-medium">All Minted:</p>
              <ul className="text-xs list-disc list-inside">
                {mintedNfts.map(nft => (
                  <li key={nft.tokenId}>ID: {nft.tokenId}, Rank: {['UR', 'SSR', 'SR', 'R', 'UC', 'C'][nft.rank] ?? 'N/A'} ({nft.rank})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {/* ... (Show metadata error if it occurred even if no NFTs in state) ... */} 

    </div>
  )
} 