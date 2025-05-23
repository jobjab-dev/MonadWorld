import { ethers, Contract, BigNumber } from 'ethers';
import { LILNAD_NFT_CONTRACT_ADDRESS, LILNAD_NFT_ABI } from './config'; // Assuming config exports these for direct use if needed

// Interface for the structure of rank data stored in the cache
export interface RankDataCacheEntry {
    S: string; // ScorePointsPerSecond, stored as string as it comes from BigNumber.toString()
    T: string; // LifetimeInSeconds, stored as string
}

// Cache storage
export const rankDataCache = new Map<number, RankDataCacheEntry>();
export let isRankDataCacheInitialized = false;

// Define the expected result type from the contract's rankData function call
interface RankDataResultType { 
    S: ethers.BigNumber; 
    T: ethers.BigNumber; 
}

/**
 * Initializes or re-initializes the RankData cache by fetching data from the LilnadNFT contract.
 * @param nftContractInstance An initialized ethers.Contract instance for LilnadNFT.
 */
export async function initializeRankDataCache(nftContractInstance: Contract | null) {
    if (!nftContractInstance) {
        console.error("[CacheInit] LilnadNFT contract instance is null. Cannot initialize RankData cache.");
        isRankDataCacheInitialized = false;
        return;
    }

    console.log('[CacheInit] Initializing/Re-initializing RankData cache...');
    isRankDataCacheInitialized = false; // Mark as not initialized during the process
    rankDataCache.clear(); // Clear previous cache entries

    try {
        const rankPromises = [];
        const MAX_RANK_ID_TO_FETCH = 6; // Includes Ranks 0-5 and Rank F (ID 6)

        for (let i = 0; i <= MAX_RANK_ID_TO_FETCH; i++) {
            rankPromises.push(
                nftContractInstance.rankData(i)
                    .then((rd: RankDataResultType) => {
                        if (rd && typeof rd.S !== 'undefined' && typeof rd.T !== 'undefined') {
                            console.log(`[CacheInit] Fetched Rank ${i}: S=${rd.S.toString()}, T=${rd.T.toString()}`);
                            return { rankId: i, S: rd.S.toString(), T: rd.T.toString(), error: false };
                        } else {
                            console.error(`[CacheInit] Received undefined S or T for Rank ${i}.`);
                            return { rankId: i, S: '0', T: '0', error: true, errorMessage: `Undefined S or T for Rank ${i}` };
                        }
                    })
                    .catch((err: Error) => { 
                        console.error(`[CacheInit] Error fetching rankData for rank ${i}:`, err.message);
                        return { rankId: i, S: '0', T: '0', error: true, errorMessage: err.message }; 
                    })
            );
        }

        const results = await Promise.all(rankPromises);
        let successfulRanks = 0;
        results.forEach(r => {
            if (!r.error) {
                rankDataCache.set(r.rankId, { S: r.S, T: r.T });
                successfulRanks++;
            }
        });

        if (successfulRanks > 0) {
            isRankDataCacheInitialized = true;
            console.log('[CacheInit] RankData cache (re)initialized successfully with', successfulRanks, 'valid ranks:');
            // console.log(rankDataCache); // Optionally log the full cache map
        } else {
            console.error('[CacheInit] Failed to initialize any ranks in RankData cache.');
            isRankDataCacheInitialized = false; 
        }
        
    } catch (error) {
        console.error('[CacheInit] Critical error during RankData cache initialization process:', error);
        isRankDataCacheInitialized = false; 
    }
} 