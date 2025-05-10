import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { ethers, Contract, utils as ethersUtils } from 'ethers';
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
console.log('---------------------------------------------------');

const app = express();
app.use(cors());
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

// ABI helper for sbtInfo view (returns startTimestamp, collected, isDead, rank)
const gameInterface = new ethers.utils.Interface([
  'function sbtInfo(uint256) view returns (uint256 startTimestamp,uint256 collected,bool isDead,uint8 rank)'
]);

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
  if (!ownerAddress || !/^0x[a-fA-F0-9]{40}$/.test(ownerAddress)) {
    return res.status(400).json({ error: 'Invalid owner address format.' });
  }

  if (!lilnadNftContract) {
    console.warn('/api/nfts/owner/:ownerAddress called but lilnadNftContract is not initialized.');
    return res.status(500).json({ error: 'NFT Contract not initialized on backend. Check server logs.' });
  }

  try {
    const nftsFromDb = await prisma.lilnadNft.findMany({
      where: { ownerAddress: ownerAddress },
      select: { tokenId: true, rank: true, metadataUri: true },
      orderBy: { tokenId: 'asc' },
    });

    if (nftsFromDb.length === 0) {
      return res.json([]);
    }

    const enhancedNfts = [];
    for (const nftDb of nftsFromDb) {
      try {
        const tokenIdBigNumber = ethers.BigNumber.from(nftDb.tokenId);
        // Assuming nftDb.rank is always a number (Int from Prisma schema)
        // Contract expects uint8, which JS numbers can represent directly if within range 0-255
        const rankUint8: number = nftDb.rank;
        if (typeof rankUint8 !== 'number' || rankUint8 < 0 || rankUint8 > 255) {
            console.error(`Invalid rank for tokenId ${nftDb.tokenId}: ${rankUint8}. Skipping on-chain fetch for this NFT.`);
            throw new Error(`Invalid rank value: ${rankUint8}`);
        }

        const sbtInfoResult = await lilnadNftContract.sbtInfo(tokenIdBigNumber);
        const rankDataResult = await lilnadNftContract.rankData(rankUint8);

        enhancedNfts.push({
          tokenId: nftDb.tokenId,
          rank: nftDb.rank,
          metadataUriFromIndexer: nftDb.metadataUri,
          sbtInfo: {
            startTimestamp: sbtInfoResult.startTimestamp.toString(),
            lastCollect: sbtInfoResult.lastCollect.toString(),
            collected: sbtInfoResult.collected.toString(),
            isDead: sbtInfoResult.isDead,
          },
          rankData: {
            S: rankDataResult.S.toString(),
            T: rankDataResult.T.toString(),
          },
        });
      } catch (contractError: any) {
        console.error(`Error fetching on-chain data for tokenId ${nftDb.tokenId} (rank ${nftDb.rank}):`, contractError.message);
        enhancedNfts.push({
          tokenId: nftDb.tokenId,
          rank: nftDb.rank,
          metadataUriFromIndexer: nftDb.metadataUri,
          sbtInfo: null,
          rankData: null,
          errorFetchingOnChainData: true,
          errorMessage: contractError.message || 'Unknown contract error',
          // errorStack: contractError.stack, // Can be very verbose
        });
      }
    }
    console.log(`Found and enhanced ${enhancedNfts.length} NFTs for owner ${ownerAddress}`);
    res.json(enhancedNfts);
  } catch (error: any) {
    console.error(`Error in /api/nfts/owner/${ownerAddress} handler:`, error);
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
    const nft = await prisma.lilnadNft.findUnique({
      where: { tokenId: tokenId },
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