import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import cron from 'cron';
import { startIndexer } from './indexer';

// --- CONFIG DOTENV TO LOAD .env.local FROM BACKEND ROOT ---
const envPath = path.resolve(__dirname, '../.env.local');
const dotenvResult = dotenv.config({ path: envPath });

if (dotenvResult.error) {
  console.error("Error loading .env.local file:", dotenvResult.error);
} else {
  console.log(".env.local file loaded successfully.");
}

// ---- ADD THIS FOR DEBUGGING ENVIRONMENT VARIABLES ----
console.log('--- Environment Variables after explicit load ---');
console.log('LILNAD_NFT_ADDRESS (from index.ts):', process.env.LILNAD_NFT_ADDRESS);
console.log('RUN_INDEXER (from index.ts):', process.env.RUN_INDEXER);
console.log('PORT (from index.ts):', process.env.PORT);
console.log('RPC_URL (from index.ts):', process.env.RPC_URL);
console.log('INDEXER_START_BLOCK (from index.ts):', process.env.INDEXER_START_BLOCK);
console.log('---------------------------------------------');
// ----------------------------------------------------

const app = express();
app.use(cors());
app.use(bodyParser.json());

const prisma = new PrismaClient();

// Initialize ethers provider (fallback to RPC_URL for consistency with viem client)
const provider = new ethers.providers.JsonRpcProvider(
  process.env.MONAD_RPC_URL || process.env.RPC_URL || 'https://testnet-rpc.monad.xyz'
);
const gameAddress = process.env.GAME_CONTRACT_ADDRESS || '';

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

// API Endpoint to get NFTs by Owner
app.get('/api/nfts/owner/:ownerAddress', async (req, res) => {
  const { ownerAddress } = req.params;
  if (!ownerAddress || !/^0x[a-fA-F0-9]{40}$/.test(ownerAddress)) {
    return res.status(400).json({ error: 'Invalid owner address format.' });
  }
  try {
    const nfts = await prisma.lilnadNft.findMany({
      where: { ownerAddress: ownerAddress },
      select: { tokenId: true, rank: true },
      orderBy: { tokenId: 'asc' },
    });
    console.log(`Found ${nfts.length} NFTs for owner ${ownerAddress}`);
    res.json(nfts);
  } catch (error) {
    console.error(`Error fetching NFTs for ${ownerAddress}:`, error);
    res.status(500).json({ error: 'Failed to fetch NFTs.' });
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