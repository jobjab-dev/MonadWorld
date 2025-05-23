import { createPublicClient, http, parseAbiItem, decodeEventLog, Log, Hex, PublicClient, AbiEvent } from 'viem';
import { PrismaClient } from '@prisma/client';
import { monadTestnetChain, LILNAD_NFT_CONTRACT_ADDRESS, LILNAD_NFT_ABI, INDEXER_START_BLOCK } from './config';
import { rankDataCache, initializeRankDataCache } from './contractDataCache';
import type { Contract } from 'ethers';
import Bottleneck from 'bottleneck';

const prisma = new PrismaClient();
const publicClient = createPublicClient({
  chain: monadTestnetChain,
  transport: http(),
});

// Rate limiter to prevent hitting RPC rate limits
const limiter = new Bottleneck({
  reservoir: 25,
  reservoirRefreshAmount: 25,
  reservoirRefreshInterval: 1000,
  maxConcurrent: 1,
});

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Add Transfer event definition to track ownership changes
const EVENT_REVEAL_AND_MINT = 'RevealAndMint';
const EVENT_TRANSFER = 'Transfer';
const EVENT_COLLECTED = 'Collected';

const REVEAL_EVENT_ABI_ITEM = parseAbiItem('event RevealAndMint(address indexed user, uint256 indexed tokenId, uint8 rank, string uri)') as AbiEvent;
const TRANSFER_EVENT_ABI_ITEM = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)') as AbiEvent;
const COLLECTED_EVENT_ABI_ITEM = parseAbiItem('event Collected(address indexed user, uint256 indexed tokenId, uint256 amount)') as AbiEvent;

// Calculate the event signatures (topics[0]) hash for comparison
const REVEAL_EVENT_SIGNATURE = '0x0fe979440580532b621e6c051114b9fb70153abf461fb807b9812ae5b7c86cc2';
const TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'; // ERC721 Transfer event signature
const COLLECTED_EVENT_SIGNATURE = '0xb4228e78dcdc5f8ba5a633070b6bfe900e416549d3d7c65b0a495f0d028426bf';

// Simpler Log type for broader compatibility (use unknown[] for ABI)
type GenericLog = Log<bigint, number, false, undefined, true, unknown[]>;
// Type for args (still useful for structure)
type RevealEventArgs = {
    user: Hex;
    tokenId: bigint;
    rank: number;
    uri: string;
};
type TransferEventArgs = {
    from: Hex;
    to: Hex;
    tokenId: bigint;
};
type CollectedEventArgs = { user: Hex; tokenId: bigint; amount: bigint; };

let isCatchingUp = false;
// Keep track of the last processed block to avoid gaps in event processing
let lastProcessedBlock: bigint | null = null;
// Polling interval in milliseconds (5 seconds)
const POLLING_INTERVAL = 5000;
// Batch size for fetching logs (adjusted to meet RPC limit of 100)
const BATCH_SIZE = BigInt(90); // Use 90 to be safe

// Helper function to ensure user exists
async function ensureUserExists(userAddress: Hex) {
  try {
    const lowerUserAddress = userAddress.toLowerCase() as Hex;
    await prisma.user.upsert({
      where: { address: lowerUserAddress },
      update: { address: lowerUserAddress }, // No specific fields to update if user already exists, just ensure it's there
      create: { address: lowerUserAddress },
    });
  } catch (error) {
    console.error(`Error ensuring user ${userAddress.toLowerCase()} exists:`, error);
    // Decide if we should throw or handle. For now, log and continue, 
    // but this could lead to issues if user creation is critical for subsequent ops.
  }
}

async function processRevealAndMintLog(log: GenericLog) {
  try {
    // Decode explicitly here as the generic Log type doesn't guarantee decoded args
    const decoded = decodeEventLog({ 
        abi: [REVEAL_EVENT_ABI_ITEM], // Use the specific parsed ABI item
        data: log.data,
        topics: log.topics
    });

    const args = decoded.args as RevealEventArgs;
    const tokenIdStr = args.tokenId.toString();
    const lowerContractAddress = LILNAD_NFT_CONTRACT_ADDRESS.toLowerCase() as Hex;
    const lowerUserAddress = args.user.toLowerCase() as Hex;

    if (!log.blockHash) { return; }
    const block = await publicClient.getBlock({ blockHash: log.blockHash });
    const timestamp = new Date(Number(block.timestamp) * 1000);

    console.log(`Processing ${decoded.eventName}: User=${lowerUserAddress}, TokenID=${tokenIdStr}, Rank=${args.rank}, Contract=${lowerContractAddress}, Block=${log.blockNumber}`);

    // Ensure the user exists before creating/updating the NFT
    await ensureUserExists(lowerUserAddress);

    // Compute NFT expiration based on contract's rankData T from cache
    const rankInfo = rankDataCache.get(args.rank);
    const lifetimeSeconds = rankInfo ? Number(rankInfo.T) : 0;
    const expirationDate = new Date((Number(block.timestamp) + lifetimeSeconds) * 1000);
    console.log(`Computed expirationDate for token ${tokenIdStr} with lifetimeSeconds=${lifetimeSeconds}: ${expirationDate.toISOString()}`);

    // ดึง PPS จาก cache (map ของ rankDataCache อาจเก็บ S เป็น score/sec)
    const ppsEntry = rankDataCache.get(args.rank);
    // Convert S (string) from cache to number for Prisma
    const pps = ppsEntry ? Number(ppsEntry.S) : 0;

    await prisma.lilnadNft.upsert({
      where: { 
        // Use the composite unique key defined in schema.prisma
        contractAddress_tokenId: {
          contractAddress: lowerContractAddress,
          tokenId: tokenIdStr
        }
      },
      update: { 
          ownerAddress: lowerUserAddress,
          rank: args.rank,
          mintTimestamp: timestamp,
          metadataUri: args.uri,
          expirationTimestamp: expirationDate,
          scorePerSecond: pps,
          contractAddress: lowerContractAddress, // Ensure contractAddress is also in update
       },
      create: { 
          // id will be auto-generated by cuid()
          tokenId: tokenIdStr,
          ownerAddress: lowerUserAddress,
          contractAddress: lowerContractAddress, // Add contractAddress here
          rank: args.rank,
          mintTimestamp: timestamp,
          metadataUri: args.uri,
          expirationTimestamp: expirationDate,
          scorePerSecond: pps,
       },
    });
  } catch (error) {
    console.error(`Error processing RevealAndMint log (tx: ${log.transactionHash}, index: ${log.logIndex}):`, error);
  }
}

// Add function to process Transfer events
async function processTransferLog(log: GenericLog) {
  try {
    // Decode explicitly here
    const decoded = decodeEventLog({ 
        abi: [TRANSFER_EVENT_ABI_ITEM],
        data: log.data,
        topics: log.topics
    });

    const args = decoded.args as TransferEventArgs;
    const tokenIdStr = args.tokenId.toString();
    const lowerContractAddress = LILNAD_NFT_CONTRACT_ADDRESS.toLowerCase() as Hex;
    const lowerToAddress = args.to.toLowerCase() as Hex;
    // const lowerFromAddress = args.from.toLowerCase() as Hex; // Not strictly needed for this update logic

    console.log(`Processing ${decoded.eventName}: From=${args.from}, To=${lowerToAddress}, TokenID=${tokenIdStr}, Contract=${lowerContractAddress}, Block=${log.blockNumber}`);

    // Ensure the new owner (to_address) exists before updating the NFT's owner
    await ensureUserExists(lowerToAddress);

    await prisma.lilnadNft.updateMany({
      where: { 
        contractAddress: lowerContractAddress,
        tokenId: tokenIdStr
      },
      data: { 
        ownerAddress: lowerToAddress
      }
    });
  } catch (error) {
    console.error(`Error processing Transfer log (tx: ${log.transactionHash}, index: ${log.logIndex}):`, error);
  }
}

async function processCollectedLog(log: GenericLog) {
  try {
    const decoded = decodeEventLog({ 
        abi: [COLLECTED_EVENT_ABI_ITEM],
        data: log.data,
        topics: log.topics
    });

    const args = decoded.args as CollectedEventArgs;
    const tokenIdStr = args.tokenId.toString();
    const lowerContractAddress = LILNAD_NFT_CONTRACT_ADDRESS.toLowerCase() as Hex;
    const lowerUserAddress = args.user.toLowerCase() as Hex;
    const block = await publicClient.getBlock({ blockHash: log.blockHash! });
    const timestamp = new Date(Number(block.timestamp) * 1000);

    console.log(`Processing ${decoded.eventName}: User=${lowerUserAddress}, TokenID=${tokenIdStr}, Amount=${args.amount}, Contract=${lowerContractAddress}, Block=${log.blockNumber}`);

    // Ensure the user who collected exists (though they should if they own the NFT being collected from)
    await ensureUserExists(lowerUserAddress);

    await prisma.lilnadNft.updateMany({
      where: { 
        contractAddress: lowerContractAddress,
        tokenId: tokenIdStr,
        ownerAddress: lowerUserAddress // Optional: ensure only the owner's collect updates their NFT record
      },
      data: { 
        lastCollectedScore: Number(args.amount), // Convert bigint to number for database
        lastCollectedTimestamp: timestamp
      }
    });

  } catch (error) {
    console.error(`Error processing Collected log (tx: ${log.transactionHash}, index: ${log.logIndex}):`, error);
  }
}

async function processLog(log: GenericLog) {
  try {
    // First, try to determine the event type from the first topic (event signature)
    const eventSignature = log.topics[0];
    
    // Check if it's a RevealAndMint event
    if (eventSignature === REVEAL_EVENT_SIGNATURE) {
      await processRevealAndMintLog(log);
    }
    // Check if it's a Transfer event
    else if (eventSignature === TRANSFER_EVENT_SIGNATURE) {
      await processTransferLog(log);
    }
    // Check if it's a Collected event
    else if (eventSignature === COLLECTED_EVENT_SIGNATURE) {
      await processCollectedLog(log);
    }
    // If we can't determine the event type, skip it
    else {
      // console.log(`Unknown event signature: ${eventSignature}`); // Reduce noise
    }
  } catch (error) {
    console.error(`Error processing log (tx: ${log.transactionHash}, index: ${log.logIndex}):`, error);
  }
}

async function getLogsBatch(fromBlock: bigint, toBlock: bigint, eventAbiItem: AbiEvent): Promise<GenericLog[]> {
    // Rate-limited fetch with retry on 429
    const params = {
      address: LILNAD_NFT_CONTRACT_ADDRESS,
      event: eventAbiItem,
      fromBlock,
      toBlock,
    };
    let attempt = 0;
    while (attempt < 3) {
      try {
        // Schedule via limiter
        const logs = await limiter.schedule(() => publicClient.getLogs(params));
        return logs as GenericLog[];
      } catch (err: any) {
        // Detect rate limit error
        const reset = err.headers?.get?.('x-ratelimit-reset');
        if ((err.status === 429 || err.headers?.get?.('x-ratelimit-remaining') === '0') && reset) {
          const waitMs = parseInt(reset) * 1000;
          console.warn(`Rate limit hit fetching ${eventAbiItem.name}, retrying in ${waitMs}ms`);
          await sleep(waitMs);
          attempt++;
          continue;
        }
        console.error(`Error fetching ${eventAbiItem.name} logs in range ${fromBlock}-${toBlock}:`, err);
        break;
      }
    }
    return [];
}

async function catchUpOnLogs() {
  if (isCatchingUp) {
    console.log("Catch-up process already running.");
    return;
  }
  isCatchingUp = true;
  console.log("Starting historical log catch-up...");

  try {
    let fromBlock = INDEXER_START_BLOCK; 
    let currentBlock = await publicClient.getBlockNumber();
    console.log(`Catch-up range: ${fromBlock} to ${currentBlock}`);

    while (fromBlock <= currentBlock) {
      const toBlock = (fromBlock + BATCH_SIZE - BigInt(1)) > currentBlock ? currentBlock : (fromBlock + BATCH_SIZE - BigInt(1));
      
      const eventsToFetch = [
        {event: REVEAL_EVENT_ABI_ITEM, processor: processRevealAndMintLog, name: EVENT_REVEAL_AND_MINT},
        {event: TRANSFER_EVENT_ABI_ITEM, processor: processTransferLog, name: EVENT_TRANSFER},
        {event: COLLECTED_EVENT_ABI_ITEM, processor: processCollectedLog, name: EVENT_COLLECTED}
      ];

      for (const {event, processor, name} of eventsToFetch) {
        const logs = await getLogsBatch(fromBlock, toBlock, event);
      if (logs.length > 0) {
          console.log(`Processing ${logs.length} ${name} logs from block ${fromBlock} to ${toBlock}`);
        for (const log of logs) {
            await processor(log);
          }
        }
      }
            
    // console.log(`Finished batch up to block ${toBlock}.`); // Reduce noise
      fromBlock = toBlock + BigInt(1);
    }
    
    // Update the last processed block
    lastProcessedBlock = currentBlock;
    
    console.log("Historical log catch-up finished.");
  } catch (error) {
    console.error("Error during historical log catch-up:", error);
  } finally {
    isCatchingUp = false;
  }
}

// New function to poll for new events
async function pollForNewEvents() {
  try {
    if (isCatchingUp) {
      console.log("Skipping poll because catch-up is running");
      return;
    }
    
    const currentBlock = await publicClient.getBlockNumber();
    
    // If we haven't processed any blocks yet, initialize with current block
    if (lastProcessedBlock === null) {
      lastProcessedBlock = currentBlock;
      console.log(`Initialized last processed block to ${lastProcessedBlock}`);
      return;
    }
    
    // If there are new blocks to process
    if (currentBlock > lastProcessedBlock) {
      console.log(`Polling for new events from block ${lastProcessedBlock + BigInt(1)} to ${currentBlock}`);
      
      let fromBlock = lastProcessedBlock + BigInt(1);
      
      while (fromBlock <= currentBlock) {
        const toBlock = (fromBlock + BATCH_SIZE - BigInt(1)) > currentBlock ? currentBlock : (fromBlock + BATCH_SIZE - BigInt(1));
        
        const eventsToFetch = [
          {event: REVEAL_EVENT_ABI_ITEM, processor: processRevealAndMintLog, name: EVENT_REVEAL_AND_MINT},
          {event: TRANSFER_EVENT_ABI_ITEM, processor: processTransferLog, name: EVENT_TRANSFER},
          {event: COLLECTED_EVENT_ABI_ITEM, processor: processCollectedLog, name: EVENT_COLLECTED}
        ];

        for (const {event, processor, name} of eventsToFetch) {
          const logs = await getLogsBatch(fromBlock, toBlock, event);
          if (logs.length > 0) {
            console.log(`Processing ${logs.length} new ${name} logs`);
            for (const log of logs) {
              await processor(log);
            }
          }
        }
        
        fromBlock = toBlock + BigInt(1);
      }
      
      // Update the last processed block
      lastProcessedBlock = currentBlock;
      console.log(`Updated last processed block to ${lastProcessedBlock}`);
    } else {
      // console.log(`No new blocks since ${lastProcessedBlock}`); // Comment out for less noise
    }
  } catch (error) {
    console.error("Error during event polling:", error);
  }
}

/**
 * Start the indexer: initialize rankData cache, process historical logs, then poll for new events.
 * @param nftContract An ethers.Contract instance of LilnadNFT (or null)
 */
export async function startIndexer(nftContract: Contract | null) {
  console.log("Initializing rankDataCache via ethers.Contract...");
  await initializeRankDataCache(nftContract);
  console.log("RankDataCache initialization complete.");

  console.log("Starting historical log catch-up...");
  await catchUpOnLogs();

  console.log("Starting real-time event polling...");
  setInterval(pollForNewEvents, POLLING_INTERVAL);
  console.log(`Indexer polling for ${EVENT_REVEAL_AND_MINT}, ${EVENT_TRANSFER}, and ${EVENT_COLLECTED} events every ${POLLING_INTERVAL/1000} seconds`);
}
