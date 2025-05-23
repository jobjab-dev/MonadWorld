import { RankDataCacheEntry } from '../contractDataCache';

export interface NftDbDataForScore {
    mintTimestamp: Date;
    rank: number;
    expirationTimestamp: Date | null;
}

export function calculateNftScore( // Made it synchronous as no async operations inside
    nftDb: NftDbDataForScore,
    currentServerTimestampS: number,
    rankDataMap: Map<number, RankDataCacheEntry>
): number {
    const rankInfo = rankDataMap.get(nftDb.rank);
    let totalPoints = 0;
    let nftLifetimeSecs = 0;
    let calculatedExpirationTimestamp = nftDb.expirationTimestamp
        ? nftDb.expirationTimestamp.getTime() / 1000
        : null;

    if (rankInfo) {
        totalPoints = parseInt(rankInfo.S, 10);
        nftLifetimeSecs = parseInt(rankInfo.T, 10);
        if (nftLifetimeSecs > 0 && !calculatedExpirationTimestamp) {
            calculatedExpirationTimestamp =
                nftDb.mintTimestamp.getTime() / 1000 + nftLifetimeSecs;
        }
    } else {
        // console.warn(`[calculateNftScore] RankData not found for rank: ${nftDb.rank}. NFT might appear with 0 score generation.`);
    }

    let isActuallyDead = false;
    if (calculatedExpirationTimestamp) {
        isActuallyDead = currentServerTimestampS >= calculatedExpirationTimestamp;
    }

    let currentAccumulatedScore = 0;
    if (!isActuallyDead && nftLifetimeSecs > 0) {
        const nftStartTimeS = Math.floor(nftDb.mintTimestamp.getTime() / 1000);
        const effectiveEndTimeS = calculatedExpirationTimestamp
            ? Math.min(currentServerTimestampS, calculatedExpirationTimestamp)
            : currentServerTimestampS;
        const activeDurationS =
            effectiveEndTimeS > nftStartTimeS ? effectiveEndTimeS - nftStartTimeS : 0;
        const ratePerSecond = totalPoints / nftLifetimeSecs;
        currentAccumulatedScore = activeDurationS * ratePerSecond;
    }
    return currentAccumulatedScore;
}
