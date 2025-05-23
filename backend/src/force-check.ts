import { createPublicClient, http } from 'viem';
import { PrismaClient } from '@prisma/client';
import { monadTestnetChain, LILNAD_NFT_CONTRACT_ADDRESS, LILNAD_NFT_ABI } from './config';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const prisma = new PrismaClient();
const publicClient = createPublicClient({
  chain: monadTestnetChain,
  transport: http(),
});

const walletToCheck = "0xa6a4ec0f671b37ac51ad6ce7972d1fd81f3cda75"; // Your wallet address
const contractAddressLower = LILNAD_NFT_CONTRACT_ADDRESS.toLowerCase() as `0x${string}`;

async function checkOwnershipAndUpdateDB() {
  console.log(`[Force Check] Starting for wallet: ${walletToCheck}`);
  console.log(`[Force Check] Using NFT Contract Address: ${LILNAD_NFT_CONTRACT_ADDRESS}`);
  // console.log(`[Force Check] RPC URL: ${publicClient.transport.url}`); // Can be too verbose

  try {
    // 1. Ensure user exists in the database
    await prisma.user.upsert({
      where: { address: walletToCheck.toLowerCase() },
      update: {},
      create: { address: walletToCheck.toLowerCase() },
    });
    console.log(`[Force Check] Ensured user ${walletToCheck} exists in DB.`);

    // 2. Get total supply of NFTs from the contract
    let totalSupplyBigInt: bigint;
    try {
      totalSupplyBigInt = await publicClient.readContract({
        address: LILNAD_NFT_CONTRACT_ADDRESS,
        abi: LILNAD_NFT_ABI,
        functionName: 'totalSupply',
      }) as bigint;
      console.log(`[Force Check] Contract totalSupply: ${totalSupplyBigInt.toString()}`);
    } catch (error: any) {
      console.error(`[Force Check] Error fetching totalSupply:`, error.message);
      console.error("[Force Check] Does your contract have a 'totalSupply' function? If not, this script needs adjustment for how to determine the range of token IDs to check.");
      return; // Exit if we can't get total supply
    }

    if (totalSupplyBigInt === 0n) {
      console.log('[Force Check] Total supply is 0. No tokens to check.');
      return;
    }

    let ownedTokenCount = 0;
    // 3. Iterate from tokenId 1 up to totalSupply (assuming tokenIds are sequential and start from 1)
    //    If your token IDs start from 0, change loop to `for (let i = 0n; i < totalSupplyBigInt; i++)`
    //    And ensure ownerOf(0) is valid if so.
    console.log('[Force Check] Iterating token IDs. This might take a while if totalSupply is large...');
    for (let i = 1n; i <= totalSupplyBigInt; i++) {
      const tokenIdStr = i.toString();
      try {
        const ownerAddress = await publicClient.readContract({
          address: LILNAD_NFT_CONTRACT_ADDRESS,
          abi: LILNAD_NFT_ABI,
          functionName: 'ownerOf',
          args: [i],
        }) as `0x${string}`;

        if (ownerAddress.toLowerCase() === walletToCheck.toLowerCase()) {
          ownedTokenCount++;
          console.log(`[Force Check] Token ID ${tokenIdStr} IS OWNED by ${walletToCheck}. Fetching sbtInfo...`);

          // Define a more complete type for sbtInfo based on typical SBT structures
          type SbtInfoFull = {
            startTimestamp: bigint;
            lastCollect: bigint;
            collected: bigint;
            isDead: boolean;
            rank: number; 
          };

          const sbtInfo = await publicClient.readContract({
            address: LILNAD_NFT_CONTRACT_ADDRESS,
            abi: LILNAD_NFT_ABI,
            functionName: 'sbtInfo',
            args: [i],
          }) as SbtInfoFull;

          console.log(`[Force Check] sbtInfo for Token ID ${tokenIdStr}: Rank ${sbtInfo.rank}, Dead: ${sbtInfo.isDead}, Start: ${sbtInfo.startTimestamp}`);

          // Assuming startTimestamp is in seconds, convert to Date
          // If it's already in milliseconds, remove * 1000
          const mintTimestamp = new Date(Number(sbtInfo.startTimestamp) * 1000); 

          await prisma.lilnadNft.upsert({
            where: {
              contractAddress_tokenId: {
                contractAddress: contractAddressLower,
                tokenId: tokenIdStr,
              },
            },
            update: {
              ownerAddress: walletToCheck.toLowerCase(),
              rank: sbtInfo.rank,
              mintTimestamp: mintTimestamp, 
              // Add other fields from sbtInfo if your schema supports them and you want to update them
              // e.g., lastCollectedScore: sbtInfo.collected, lastCollectedTimestamp: new Date(Number(sbtInfo.lastCollect) * 1000)
            },
            create: {
              tokenId: tokenIdStr,
              ownerAddress: walletToCheck.toLowerCase(),
              contractAddress: contractAddressLower,
              rank: sbtInfo.rank,
              mintTimestamp: mintTimestamp, 
              metadataUri: '', // metadataUri might be set by the main indexer or constructed if a pattern exists
              // Add other fields from sbtInfo if your schema supports them
              // e.g., lastCollectedScore: sbtInfo.collected, lastCollectedTimestamp: new Date(Number(sbtInfo.lastCollect) * 1000)
            },
          });
          console.log(`[Force Check] UPSERTED Token ID ${tokenIdStr} for owner ${walletToCheck} into DB.`);
        }
      } catch (error: any) {
        if (error.message.includes('ERC721NonexistentToken') || 
            error.message.includes('URI query for nonexistent token') || 
            error.message.includes('invalid token ID') ||
            error.message.includes('owner query for nonexistent token')) { // Added another common error message
          // This is an expected error if iterating up to totalSupply and some token IDs in between were burned or never existed.
          // console.log(`[Force Check] Token ID ${tokenIdStr} does not exist or query failed (expected for some IDs), skipping.`);
        } else {
          // Log other unexpected errors
          console.warn(`[Force Check] UNEXPECTED error processing Token ID ${tokenIdStr}:`, error.message);
        }
      }
      if (i % 50n === 0n || i === totalSupplyBigInt) { // Log progress every 50 tokens or on the last one
        console.log(`[Force Check] Progress: Checked up to Token ID ${tokenIdStr}/${totalSupplyBigInt}. NFTs found for wallet so far: ${ownedTokenCount}.`);
      }
    }

    console.log(`[Force Check] Finished iterating all potential token IDs up to totalSupply (${totalSupplyBigInt}).`);
    console.log(`[Force Check] Total NFTs found and processed for ${walletToCheck}: ${ownedTokenCount}`);

  } catch (error: any) {
    console.error(`[Force Check] A CRITICAL error occurred during the process: `, error);
  } finally {
    await prisma.$disconnect();
    console.log('[Force Check] Script finished and disconnected from DB.');
  }
}

checkOwnershipAndUpdateDB(); 