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
import { initializeRankDataCache, isRankDataCacheInitialized, rankDataCache, RankDataCacheEntry } from './contractDataCache';
import { calculateNftScore, NftDbDataForScore } from './utils/scoreCalculator';

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
console.log('ADMIN_ADDRESSES (from .env.local via process.env):', process.env.ADMIN_ADDRESSES);
console.log('---------------------------------------------------');

// Admin authentication using Web3 signatures
const ADMIN_ADDRESSES = (process.env.ADMIN_ADDRESSES || '').toLowerCase().split(',').map(addr => addr.trim()).filter(addr => ethers.utils.isAddress(addr));
console.log('Loaded Admin Addresses:', ADMIN_ADDRESSES);

// เพิ่ม nonce tracking เพื่อป้องกัน replay attacks
const usedNonces = new Set<string>();
const NONCE_EXPIRY = 30 * 1000; // 30 วินาที

// ทำความสะอาด expired nonces ทุก 60 วินาที
setInterval(() => {
  const currentTime = Date.now();
  for (const nonce of usedNonces) {
    const [timestamp] = nonce.split('-');
    if (currentTime - parseInt(timestamp) > NONCE_EXPIRY) {
      usedNonces.delete(nonce);
    }
  }
}, 60000);

function adminAuth(req: any, res: any, next: any) {
  try {
    let signature, message, signerAddress, nonce;
    
    // สำหรับ GET request ใช้ query parameters
    if (req.method === 'GET') {
      signature = req.query.signature;
      message = req.query.message;
      signerAddress = req.query.adminAddress || req.query.address;
      nonce = req.query.nonce;
    } else {
      // สำหรับ POST/DELETE ใช้ body
      signature = req.body.signature;
      message = req.body.message;
      signerAddress = req.body.adminAddress || req.body.address;
      nonce = req.body.nonce;
    }
    
    console.log('🔐 Admin Auth Debug:');
    console.log('- Method:', req.method);
    console.log('- Signer address received:', signerAddress);
    console.log('- Message received:', message);
    console.log('- Nonce received:', nonce);
    console.log('- Signature received:', signature?.substring(0, 20) + '...');
    console.log('- Admin addresses configured:', ADMIN_ADDRESSES);
    
    if (!signature || !message || !signerAddress || !nonce) {
      console.log('❌ Missing required fields');
      return res.status(401).json({ error: 'Missing signature, message, address, or nonce' });
    }

    // ตรวจสอบ nonce เพื่อป้องกัน replay attack
    if (usedNonces.has(nonce)) {
      console.log('❌ Nonce already used');
      return res.status(403).json({ error: 'Nonce already used' });
    }

    // ตรวจสอบ signature และได้ recovered address
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    console.log('- Recovered address:', recoveredAddress);
    console.log('- Signer match?', recoveredAddress.toLowerCase() === signerAddress.toLowerCase());
    
    if (recoveredAddress.toLowerCase() !== signerAddress.toLowerCase()) {
      console.log('❌ Signature verification failed');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    // ตรวจสอบว่า recovered address (คนที่เซ็น) อยู่ในรายการ admin หรือไม่
    const isAdmin = ADMIN_ADDRESSES.includes(recoveredAddress.toLowerCase());
    console.log('- Is signer admin?', isAdmin);
    if (!isAdmin) {
      console.log('❌ Signer address not in admin list');
      return res.status(403).json({ error: 'Address not authorized as admin' });
    }

    // ตรวจสอบ timestamp ใน message (อายุไม่เกิน 30 วินาที)
    const timestampMatch = message.match(/MonadWorld Admin Access: (\d+)/);
    if (!timestampMatch) {
      console.log('❌ Invalid message format');
      return res.status(403).json({ error: 'Invalid message format' });
    }
    
    const messageTime = parseInt(timestampMatch[1]);
    const currentTime = Date.now();
    const ageMins = (currentTime - messageTime) / (1000 * 60);
    console.log('- Message age (minutes):', ageMins);
    
    if (currentTime - messageTime > 30 * 1000) { // เปลี่ยนเป็น 30 วินาที
      console.log('❌ Message expired');
      return res.status(403).json({ error: 'Message expired (max 30 seconds)' });
    }

    // เพิ่ม nonce ที่ใช้แล้วเข้าไปใน set
    usedNonces.add(nonce);

    console.log('✅ Admin auth successful');
    (req as any).adminAddress = recoveredAddress.toLowerCase();
    next();
  } catch (error) {
    console.error('💥 Admin auth error:', error);
    return res.status(403).json({ error: 'Authentication failed' });
  }
}

const app = express();

// ปรับปรุงการตั้งค่า CORS ให้ปลอดภัยกว่า
const allowedOrigins: string[] = process.env.NODE_ENV === 'production' 
  ? [
      'https://www.monadworld.xyz',
      process.env.FRONTEND_BASE_URL
    ].filter((origin): origin is string => typeof origin === 'string') // Type guard เพื่อกรองค่า undefined
  : [
      'https://www.monadworld.xyz',
      'http://localhost:3000',
      'http://localhost:5500', 
      'http://127.0.0.1:5500',
      'http://127.0.0.1:3000'
    ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200, // เพิ่มเพื่อรองรับ legacy browsers
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // จำกัด HTTP methods ที่อนุญาต
  allowedHeaders: ['Content-Type', 'Authorization'] // จำกัด headers ที่อนุญาต
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
    initializeRankDataCache(lilnadNftContract);
  } catch (e) {
    console.error('Error creating LilnadNFT contract instance (will also affect RankDataCache init):', e);
  }
} else {
  console.error('Failed to create LilnadNFT contract instance due to missing components:');
  if (!LILNAD_NFT_CONTRACT_ADDRESS) console.error('- Contract Address is missing or invalid.');
  if (!(Array.isArray(contractAbiForEthers) && contractAbiForEthers.length > 0)) console.error('- ABI is missing, not an array, or empty.');
  if (!provider) console.error('- Provider is not initialized.');
}

// The following interface and constants are no longer needed as sbtInfo is not directly called for score calculation
// and passive income logic is different.
// interface SbtInfoResultType { 
//     startTimestamp: ethers.BigNumber; 
//     isDead: boolean; 
//     rank: number; 
// }
// const gameInterface = new ethers.utils.Interface([
//   'function sbtInfo(uint256) view returns (uint256 startTimestamp,uint256 collected,bool isDead,uint8 rank)'
// ]);
// const ACCRUAL_WINDOW_SECS_CONTRACT = 72 * 60 * 60; 

// Score calculation is now done directly in API endpoints based on mintTimestamp, rank (for PPS), and lifetime from rankDataCache.

// เพิ่ม variable สำหรับเก็บ cache leaderboard
let leaderboardCache: any = null;
let leaderboardCacheTimestamp: number = 0;
const LEADERBOARD_CACHE_TTL = 300; // 5 minutes cache for more frequent updates

// Helper function to calculate score (MOVED TO ./utils/scoreCalculator.ts)
// async function calculateNftScore(nftDb: { mintTimestamp: Date, rank: number, expirationTimestamp: Date | null }, currentServerTimestampS: number, rankDataMap: Map<number, RankDataCacheEntry>): Promise<number> { ... }

// API: get leaderboard latest snapshot - optimized version
app.get('/leaderboard', async (req, res) => {
  try {
    const nowS = Math.floor(Date.now() / 1000);
    
    if (leaderboardCache && (nowS - leaderboardCacheTimestamp) < LEADERBOARD_CACHE_TTL) {
      console.log('Serving leaderboard from cache using contract:', LILNAD_NFT_CONTRACT_ADDRESS);
      // Apply pagination to cached data before sending
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const skip = (page - 1) * limit;
      
      const fullLeaderboardEntries = leaderboardCache.allEntries; 
      const paginatedEntries = fullLeaderboardEntries.slice(skip, skip + limit);
      
      return res.json({
        totalEntries: fullLeaderboardEntries.length,
        currentPage: page,
        totalPages: Math.ceil(fullLeaderboardEntries.length / limit),
        entries: paginatedEntries,
        dataSource: 'cache',
        cacheTimestamp: new Date(leaderboardCacheTimestamp * 1000).toISOString()
      });
    }
    
    console.log('Building new leaderboard data for contract:', LILNAD_NFT_CONTRACT_ADDRESS);
    
    if (!isRankDataCacheInitialized) {
        console.warn('[API /leaderboard] RankData cache not initialized. Attempting to initialize now...');
        if (!lilnadNftContract) {
            return res.status(500).json({ error: 'NFT Contract not initialized on backend, cannot initialize cache.'})
        }
        await initializeRankDataCache(lilnadNftContract);
        if (!isRankDataCacheInitialized) {
            console.error('[API /leaderboard] Failed to initialize RankData cache. Leaderboard might be empty or inaccurate.');
            // Allow to proceed but leaderboard might be empty if cache is crucial.
        }
    }

    const allActiveNfts = await prisma.lilnadNft.findMany({
      where: {
        contractAddress: LILNAD_NFT_CONTRACT_ADDRESS.toLowerCase(),
      },
      select: {
        ownerAddress: true,
        rank: true,
        mintTimestamp: true,
        expirationTimestamp: true,
      }
    });

    // New: fetch blacklisted addresses and filter them out
    const blacklistedRows = await prisma.blacklistedAddress.findMany({ select: { address: true } });
    const blacklistSet = new Set(blacklistedRows.map(b => b.address.toLowerCase()));
    const activeNfts = allActiveNfts.filter(nft => !blacklistSet.has(nft.ownerAddress.toLowerCase()));

    const userScores = new Map<string, { totalScore: number, nftCount: number, ranks: number[] }>();
    const currentServerTimestampS = Math.floor(Date.now() / 1000);

    for (const nft of activeNfts) {
      // Pass only necessary data to calculateNftScore
      const nftDataForScore: NftDbDataForScore = {
          mintTimestamp: nft.mintTimestamp,
          rank: nft.rank,
          expirationTimestamp: nft.expirationTimestamp
      };
      const score = calculateNftScore(nftDataForScore, currentServerTimestampS, rankDataCache); // No await needed now
      
      const owner = nft.ownerAddress.toLowerCase();
      if (userScores.has(owner)) {
        const currentData = userScores.get(owner)!;
        currentData.totalScore += score;
        currentData.nftCount += 1;
        currentData.ranks.push(nft.rank);
      } else {
        userScores.set(owner, { totalScore: score, nftCount: 1, ranks: [nft.rank] });
      }
    }

    const leaderboardEntriesPreSort: any[] = [];
    userScores.forEach((data, address) => {
      leaderboardEntriesPreSort.push({
        address: address,
        collectedScore: data.totalScore,
        nftCount: data.nftCount,
        _ranksForPotentialScore: data.ranks 
      });
    });

    leaderboardEntriesPreSort.sort((a, b) => b.collectedScore - a.collectedScore);
    
    const rankScoreEstimates: { [key: number]: number } = {
        0: 3200, 1: 2400, 2: 1500, 3: 1200, 4: 900, 5: 800
    };

    const finalLeaderboardEntries = leaderboardEntriesPreSort.map((entry, index) => {
        let totalPotentialScore = 0;
        if (entry._ranksForPotentialScore) {
            for (const rank of entry._ranksForPotentialScore) {
                totalPotentialScore += rankScoreEstimates[rank] || 500;
            }
        }
        return {
            rank: index + 1,
            address: entry.address,
            nftCount: entry.nftCount,
            collectedScore: Math.round(entry.collectedScore),
            totalScore: totalPotentialScore,
        };
    });
    
    leaderboardCache = { allEntries: finalLeaderboardEntries };
    leaderboardCacheTimestamp = nowS;
    
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const skip = (page - 1) * limit;
    
    const paginatedLeaderboard = finalLeaderboardEntries.slice(skip, skip + limit);
    
    const response = {
      totalEntries: finalLeaderboardEntries.length,
      currentPage: page,
      totalPages: Math.ceil(finalLeaderboardEntries.length / limit),
      entries: paginatedLeaderboard,
      dataSource: 'live_calculation',
      cacheTimestamp: new Date(leaderboardCacheTimestamp * 1000).toISOString()
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

// API Endpoint to get NFTs by Owner (Enhanced for Passive Scoring)
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
    return res.status(500).json({ error: 'NFT Contract not initialized on backend.' });
  }

  // Batch from DB with cached on-chain details
  try {
    const lowerOwnerAddress = ownerAddress.toLowerCase();
    const contractAddressLower = LILNAD_NFT_CONTRACT_ADDRESS.toLowerCase();
    // Count total items
    const totalItems = await prisma.lilnadNft.count({
      where: { ownerAddress: lowerOwnerAddress, contractAddress: contractAddressLower },
    });
    if (totalItems === 0) {
      return res.json({ data: [], currentPage: page, totalPages: 0, totalItems: 0 });
    }
    // Query page from DB
    const dbNfts = await prisma.lilnadNft.findMany({
      where: { ownerAddress: lowerOwnerAddress, contractAddress: contractAddressLower },
      select: {
        tokenId: true,
        rank: true,
        mintTimestamp: true,
        expirationTimestamp: true,
        scorePerSecond: true
      },
      orderBy: { tokenId: 'asc' },
      skip,
      take: limit,
    });
    // Map to API shape with dynamic accumulated score (collectableNow)
    const nowS = Math.floor(Date.now() / 1000);
    const enhanced = dbNfts.map(nft => {
      // Calculate current accumulated score based on mint, expiration, and rankDataCache
      const nftForScore = {
        mintTimestamp: nft.mintTimestamp,
        rank: nft.rank,
        expirationTimestamp: nft.expirationTimestamp,
      };
      const collectableNow = calculateNftScore(nftForScore, nowS, rankDataCache);
      return {
        tokenId: nft.tokenId,
        rank: nft.rank,
        startTimestamp: Math.floor(nft.mintTimestamp.getTime() / 1000).toString(),
        expirationTimestamp: nft.expirationTimestamp
          ? Math.floor(nft.expirationTimestamp.getTime() / 1000).toString()
          : '0',
        scorePerSecond: nft.scorePerSecond.toString(),
        collectableNow: collectableNow.toString(),
        isDead: nft.expirationTimestamp
          ? nowS >= Math.floor(nft.expirationTimestamp.getTime() / 1000)
          : false,
      };
    });
    return res.json({ data: enhanced, currentPage: page, totalPages: Math.ceil(totalItems / limit), totalItems });
  } catch (error: any) {
    console.error(`[API /api/nfts/owner] Error for owner ${ownerAddress}:`, error);
    return res.status(500).json({ error: 'Failed to fetch NFTs and details.', details: error.message });
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

// New: Blacklist management endpoints
app.post('/api/blacklist', adminAuth, async (req, res) => {
  const { targetAddress } = req.body;  // เปลี่ยนจาก address เป็น targetAddress
  if (!targetAddress || !/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
    return res.status(400).json({ error: 'Invalid target address format.' });
  }
  try {
    const normalized = targetAddress.toLowerCase();
    console.log('📝 Adding to blacklist:', normalized, 'by admin:', (req as any).adminAddress);
    const blacklisted = await prisma.blacklistedAddress.create({ data: { address: normalized } });
    return res.status(201).json(blacklisted);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Address already blacklisted.' });
    }
    console.error('[API /api/blacklist] Error adding blacklist:', error);
    return res.status(500).json({ error: 'Failed to add blacklist.' });
  }
});

app.get('/api/blacklist', adminAuth, async (req, res) => {
  try {
    const list = await prisma.blacklistedAddress.findMany({ select: { address: true, createdAt: true } });
    return res.json(list);
  } catch (error) {
    console.error('[API /api/blacklist] Error fetching blacklist:', error);
    return res.status(500).json({ error: 'Failed to fetch blacklist.' });
  }
});

app.delete('/api/blacklist/:address', adminAuth, async (req, res) => {
  const { address } = req.params;
  const normalized = address.toLowerCase();
  try {
    const removed = await prisma.blacklistedAddress.delete({ where: { address: normalized } });
    return res.json(removed);
  } catch (error) {
    console.error(`[API /api/blacklist/${normalized}] Error removing blacklist:`, error);
    return res.status(404).json({ error: 'Address not found in blacklist.' });
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

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    contractAddress: LILNAD_NFT_CONTRACT_ADDRESS
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Backend listening on ${port}`);
  console.log("Starting indexer (no RUN_INDEXER guard)");
  startIndexer(lilnadNftContract);
}); 
