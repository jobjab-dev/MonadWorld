import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { ethers, Contract, utils as ethersUtils, BigNumber } from 'ethers';
import cron from 'cron';
import { startIndexer } from './indexer';
import { LILNAD_NFT_CONTRACT_ADDRESS, LILNAD_NFT_ABI } from './config';

// --- CONFIG DOTENV TO LOAD .env.local FROM BACKEND ROOT ---
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });
// No need to log dotenvResult.error here as config.ts might also load it

console.log('--- Environment Variables relevant to index.ts ---');
console.log('LILNAD_NFT_CONTRACT_ADDRESS (from config.ts for contract):', LILNAD_NFT_CONTRACT_ADDRESS);
console.log('RUN_INDEXER (from .env.local via process.env):', process.env.RUN_INDEXER);
console.log('PORT (from .env.local via process.env):', process.env.PORT);
console.log('RPC_URL (from .env.local via process.env for provider):', process.env.RPC_URL);
console.log('INDEXER_START_BLOCK (from .env.local via process.env):', process.env.INDEXER_START_BLOCK);
console.log('FRONTEND_BASE_URL (from .env.local via process.env):', process.env.FRONTEND_BASE_URL);
console.log('BACKEND_PUBLIC_URL (from .env.local via process.env for constructing metadata URIs):', process.env.BACKEND_PUBLIC_URL);
console.log('---------------------------------------------------');

const app = express();
app.use(cors({
  origin: ['https://www.monadworld.xyz', 'http://localhost:3000'],
  credentials: true,
}));
app.use(bodyParser.json());

const prisma = new PrismaClient();

const rpcToUse = process.env.RPC_URL || 'https://testnet-rpc.monad.xyz';
console.log('Ethers provider attempting to connect to RPC:', rpcToUse);
const provider = new ethers.providers.JsonRpcProvider(rpcToUse);

let lilnadNftContract: Contract | null = null;
const contractAbiForEthers = Array.isArray(LILNAD_NFT_ABI) ? LILNAD_NFT_ABI : [];

if (LILNAD_NFT_CONTRACT_ADDRESS && contractAbiForEthers.length > 0 && provider) {
  try {
    lilnadNftContract = new ethers.Contract(LILNAD_NFT_CONTRACT_ADDRESS, contractAbiForEthers as ethersUtils.Fragment[], provider);
    console.log('LilnadNFT contract instance created successfully.');
  } catch (e) {
    console.error('Error creating LilnadNFT contract instance:', e);
  }
} else {
  console.error('Failed to create LilnadNFT contract instance due to missing components:');
  if (!LILNAD_NFT_CONTRACT_ADDRESS) console.error('- Contract Address is missing or invalid.');
  if (!(Array.isArray(contractAbiForEthers) && contractAbiForEthers.length > 0)) console.error('- ABI is missing, not an array, or empty.');
  if (!provider) console.error('- Provider is not initialized.');
}

// --- RankData Cache ---
interface RankDataCacheEntry {
    S: string;
    T: string;
}
const rankDataCache = new Map<number, RankDataCacheEntry>();
let isRankDataCacheInitialized = false;

// Define types for contract call results based on ABI
interface RankDataResultType { S: BigNumber; T: BigNumber; }
interface SbtInfoResultType { startTimestamp: BigNumber; lastCollect: BigNumber; collected: BigNumber; isDead: boolean; rank: number; }

async function initializeRankDataCache() {
    if (isRankDataCacheInitialized || !lilnadNftContract) return;
    console.log('Initializing RankData cache...');
    try {
        const rankPromises = [];
        for (let i = 0; i <= 5; i++) { // Assuming ranks 0-5
            rankPromises.push(
                lilnadNftContract.rankData(i)
                    .then((rd: RankDataResultType) => ({rankId: i, S: rd.S.toString(), T: rd.T.toString(), error: false }))
                    .catch((err: Error) => { 
                        console.error(`Error fetching rankData for rank ${i}:`, err.message);
                        return {rankId: i, S: '0', T: '0', error: true }; // Provide default/error state
                    })
            );
        }
        const results = await Promise.all(rankPromises);
        results.forEach(r => {
            if (!r.error) { // Only cache if no error
                rankDataCache.set(r.rankId, {S: r.S, T: r.T});
            }
        });
        isRankDataCacheInitialized = true;
        console.log('RankData cache initialized successfully:', rankDataCache);
        if (results.some(r => r.error)) {
            console.warn('Some ranks failed to initialize in RankData cache.');
        }
    } catch (error) {
        console.error('Failed to initialize RankData cache (overall error):', error);
        isRankDataCacheInitialized = false; 
    }
}
// Attempt to initialize cache at startup, but it's okay if it fails (e.g. RPC not ready)
// It will be retried on first API call that needs it.
if (lilnadNftContract) {
    initializeRankDataCache();
}
// --- End RankData Cache ---

// ABI helper for sbtInfo view (returns startTimestamp, collected, isDead, rank)
const gameInterface = new ethers.utils.Interface([
  'function sbtInfo(uint256) view returns (uint256 startTimestamp,uint256 collected,bool isDead,uint8 rank)'
]);

// Solidity constant from contract (for backend calculation)
const ACCRUAL_WINDOW_SECS_CONTRACT = 72 * 60 * 60; // 72 hours in seconds

function calculateCollectableForBackend(
  sbtInfoRaw: SbtInfoResultType, 
  rankDataEntry: RankDataCacheEntry, 
  currentTimestamp: number,
  isActuallyDead: boolean // Pass the pre-calculated isActuallyDead
): BigNumber { // Return ethers.BigNumber for consistency with other contract values initially
  if (isActuallyDead) return ethers.BigNumber.from(0); // If already determined dead, nothing to collect

  // Convert string values from cache/sbtInfoRaw to BigNumber/Number for calculation
  const startTimestamp = sbtInfoRaw.startTimestamp.toNumber(); // Assuming BigNumber from ethers
  const lastCollect = sbtInfoRaw.lastCollect.toNumber();
  const collected = sbtInfoRaw.collected; // This is already ethers.BigNumber
  const S_val = ethers.BigNumber.from(rankDataEntry.S); // S from cache is string
  const T_val = parseInt(rankDataEntry.T, 10); // T from cache is string, parse to number

  if (T_val === 0) { 
      const remainingToCollect = S_val.sub(collected);
      return remainingToCollect.gt(0) ? remainingToCollect : ethers.BigNumber.from(0);
  }
  
  // Note: isActuallyDead check above should cover this, but keeping for robustness
  const elapsedSinceStart = currentTimestamp - startTimestamp;
  if (elapsedSinceStart >= T_val) {
      return ethers.BigNumber.from(0);
  }

  const timeSinceLast = currentTimestamp - lastCollect;
  const effectiveWindow = Math.min(timeSinceLast, ACCRUAL_WINDOW_SECS_CONTRACT);
  if (effectiveWindow <= 0) return ethers.BigNumber.from(0);

  // Perform calculations using ethers.BigNumber methods for precision
  // potential = (S * effectiveWindow) / T
  const potential = S_val.mul(effectiveWindow).div(T_val);
  const remainingOverall = S_val.sub(collected);
  
  const toCollect = potential.gt(remainingOverall) ? remainingOverall : potential;
  return toCollect.gt(0) ? toCollect : ethers.BigNumber.from(0);
}

// API: get leaderboard latest snapshot
app.get('/leaderboard', async (req, res) => {
  const snaps = await prisma.snapshot.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json(snaps);
});

// API Endpoint to get NFTs by Owner (Enhanced)
app.get('/api/nfts/owner/:ownerAddress', async (req, res) => {
  const { ownerAddress } = req.params;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const skip = (page - 1) * limit;

  if (!ownerAddress || !/^0x[a-fA-F0-9]{40}$/.test(ownerAddress)) {
    return res.status(400).json({ error: 'Invalid owner address format.' });
  }

  if (!lilnadNftContract) {
    console.warn('/api/nfts/owner/:ownerAddress called but lilnadNftContract is not initialized.');
    return res.status(500).json({ error: 'NFT Contract not initialized on backend. Check server logs.' });
  }

  if (!isRankDataCacheInitialized) {
    await initializeRankDataCache();
    if (!isRankDataCacheInitialized) {
        console.warn('RankData cache still not initialized after attempt for request.');
    }
  }

  try {
    // Use the current contract address from config
    const currentContractAddress = LILNAD_NFT_CONTRACT_ADDRESS;

    const totalNfts = await prisma.lilnadNft.count({ 
      where: { 
        ownerAddress: ownerAddress,
        contractAddress: currentContractAddress // Filter by current contract address
      } 
    });

    if (totalNfts === 0) {
      return res.json({ data: [], currentPage: page, totalPages: 0, totalItems: 0 });
    }

    const nftsFromDb = await prisma.lilnadNft.findMany({
      where: { 
        ownerAddress: ownerAddress,
        contractAddress: currentContractAddress // Filter by current contract address
      },
      select: { tokenId: true, rank: true }, // Keep select minimal, other data comes from contract/cache
      orderBy: [
        { rank: 'asc' },      // Primary sort: Rank 0 (UR) comes first
        { tokenId: 'asc' }   // Secondary sort: Lower token IDs first if ranks are same
      ],
      skip: skip,
      take: limit,
    });

    if (nftsFromDb.length === 0 && page > 1) {
        return res.json({ data: [], currentPage: page, totalPages: Math.ceil(totalNfts / limit), totalItems: totalNfts, message: "Page out of bounds" });
    }
    
    const currentServerTimestamp = Math.floor(Date.now() / 1000);

    const sbtInfoPromises = nftsFromDb.map(nftDb =>
      lilnadNftContract!.sbtInfo(ethers.BigNumber.from(nftDb.tokenId))
        .then((sbtInfoRaw: SbtInfoResultType) => ({ tokenId: nftDb.tokenId, sbtInfoRaw, error: null }))
        .catch((err: Error) => ({ tokenId: nftDb.tokenId, sbtInfoRaw: null, error: err }))
    );
    const sbtInfoResults = await Promise.all(sbtInfoPromises);
    const sbtInfoMap = new Map(sbtInfoResults.map(r => [r.tokenId, {raw: r.sbtInfoRaw, error: r.error}]));

    const backendBaseUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`;
    const enhancedNfts = [];

    for (const nftDb of nftsFromDb) {
      const sbtInfoFetchResult = sbtInfoMap.get(nftDb.tokenId);
      const sbtInfoResultRaw = sbtInfoFetchResult?.raw;
      const fetchError = sbtInfoFetchResult?.error;
      
      let sbtInfoDataForClient = null;
      const cachedRankDataEntry = rankDataCache.get(nftDb.rank);
      let rankDataForClient: RankDataCacheEntry | null = cachedRankDataEntry !== undefined ? cachedRankDataEntry : null;
      
      let calculatedDataForClient = {
          isActuallyDead: true, 
          collectableNow: "0",
          totalAccrued: "0"
      };
      let errorFetchingOnChain = !!fetchError;
      let specificErrorMessage = fetchError ? (fetchError.message || 'Error fetching sbtInfo') : undefined;

      if (sbtInfoResultRaw) {
        let isActuallyDeadCalc = sbtInfoResultRaw.isDead;
        if (rankDataForClient && rankDataForClient.T && Number(rankDataForClient.T) > 0) {
            const lifetime = Number(rankDataForClient.T);
            const startTime = sbtInfoResultRaw.startTimestamp.toNumber();
            if (currentServerTimestamp >= startTime + lifetime) {
                isActuallyDeadCalc = true;
            }
        }
        
        let collectableNowBigNum = ethers.BigNumber.from(0);
        if (rankDataForClient) { 
            collectableNowBigNum = calculateCollectableForBackend(sbtInfoResultRaw, rankDataForClient, currentServerTimestamp, isActuallyDeadCalc);
        }
        
        const totalAccruedBigNum = sbtInfoResultRaw.collected.add(collectableNowBigNum);

        sbtInfoDataForClient = {
            startTimestamp: sbtInfoResultRaw.startTimestamp.toString(),
            lastCollect: sbtInfoResultRaw.lastCollect.toString(),
            collected: sbtInfoResultRaw.collected.toString(),
            isDead: sbtInfoResultRaw.isDead, 
        };
        calculatedDataForClient = {
            isActuallyDead: isActuallyDeadCalc,
            collectableNow: collectableNowBigNum.toString(),
            totalAccrued: totalAccruedBigNum.toString()
        };
      } else if(fetchError && !rankDataForClient) { 
        const fallbackRankData = rankDataCache.get(nftDb.rank);
        rankDataForClient = fallbackRankData !== undefined ? fallbackRankData : null;
      }

      const constructedMetadataUri = `${backendBaseUrl}/api/metadata/lilnad/${nftDb.tokenId}`;
      enhancedNfts.push({
        tokenId: nftDb.tokenId,
        rank: nftDb.rank,
        metadataUri: constructedMetadataUri,
        sbtInfo: sbtInfoDataForClient,
        rankData: rankDataForClient,  
        calculated: calculatedDataForClient,
        errorFetchingOnChainData: errorFetchingOnChain,
        errorMessage: specificErrorMessage,
      });
    }

    res.json({
      data: enhancedNfts,
      currentPage: page,
      totalPages: Math.ceil(totalNfts / limit),
      totalItems: totalNfts,
    });

  } catch (error: any) {
    console.error(`Error in /api/nfts/owner/${ownerAddress} (page ${page}, limit ${limit}):`, error);
    res.status(500).json({ error: 'Failed to fetch and enhance NFTs.', details: error.message });
  }
});

// Re-add RANK_NAMES and getRankName for the metadata endpoint
const RANK_NAMES: { [key: number]: string } = {
  0: 'UR', 1: 'SSR', 2: 'SR', 3: 'R', 4: 'UC', 5: 'C'
  // Add F or other ranks if needed based on your frontend/public/image files
};

const getRankName = (rankId: number): string => {
  return RANK_NAMES[rankId] || 'F'; // Default to 'F' or another suitable default
};

// API Endpoint to get metadata
app.get('/api/metadata/lilnad/:tokenId', async (req, res) => {
  const { tokenId } = req.params;
  const numericTokenId = parseInt(tokenId, 10);

  if (isNaN(numericTokenId)) {
    return res.status(400).json({ error: 'Token ID must be a number.' });
  }

  try {
    // Use the current contract address from config
    const currentContractAddress = LILNAD_NFT_CONTRACT_ADDRESS;

    const nft = await prisma.lilnadNft.findUnique({
      where: {
        // Query using the composite key defined in schema.prisma
        contractAddress_tokenId: {
          contractAddress: currentContractAddress,
          tokenId: tokenId 
        }
      },
    });

    if (!nft) {
      return res.status(404).json({ error: 'NFT not found.' });
    }

    const rankId = nft.rank; // Assuming nft.rank is the numeric rank (0-5)
    const rankName = getRankName(rankId); // Get 'UR', 'SSR', etc.
    const imageName = `${rankName}.png`; // e.g., "UR.png"

    // Use environment variable for frontend base URL, fallback if not set
    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'https://monadworld.xyz'; // Fallback to your main domain

    // Construct the metadata
    const metadata = {
      name: `Lilnad SBT #${tokenId}`,
      description: `A unique Soul-Bound Token for the MonadWorld game, Rank ${rankName}.`,
      image: `${frontendBaseUrl}/image/${imageName}`, // Dynamic image URL
      attributes: [
        {
          trait_type: 'Rank',
          value: rankName,
        },
        // You can add more attributes here if needed, e.g., mint date
        // {
        //   "trait_type": "Mint Date",
        //   "value": nft.mintTimestamp ? nft.mintTimestamp.toISOString() : "Unknown"
        // }
      ],
    };

    res.json(metadata);
  } catch (error) {
    console.error(`Error fetching metadata for tokenId ${tokenId}:`, error);
    res.status(500).json({ error: 'Failed to fetch metadata.' });
  }
});

// Job: snapshot every 7 days
const job = new cron.CronJob('0 0 */7 * *', async () => {
  console.log('Running weekly snapshot job...');
  // Your existing snapshot logic here (reading from prisma.lilnadNft maybe?)
  // NOTE: The previous logic used provider.call - this needs updating
  // if you want to snapshot scores based on the new `collect` logic.
  // For now, commenting out the problematic part.
  /*
  const tokens = await prisma.token.findMany({ where: { isDead: false } });
  for (const t of tokens) {
    // Need a way to get score - perhaps read `sbtInfo(tokenId).collected`?
    // const collected = await provider.call({ to: gameAddress, data: ... });
    // await prisma.snapshot.create({ data: { tokenIdDB: t.id, score: parseFloat(ethers.utils.formatEther(collected)) } });
  }
  */
});
// job.start(); // Keep disabled until snapshot logic is updated

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Backend listening on ${port}`);
  // Start the Indexer after server starts
  if (process.env.RUN_INDEXER === 'true') {
    console.log("Attempting to start indexer as RUN_INDEXER is 'true'");
    startIndexer();
  } else {
    console.log("Indexer is disabled.");
    console.log(`Reason: RUN_INDEXER value is '${process.env.RUN_INDEXER}' (expected 'true')`);
  }
}); 
