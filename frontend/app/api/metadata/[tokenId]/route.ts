import { NextResponse } from 'next/server';

// Rank information mapping
const RANK_INFO = {
  0: { name: "Ultra Rare", rarity: "UR", scorePerSecond: 4.0, lifetime: "72h", rarityPercent: "0.5%" },
  1: { name: "Super Super Rare", rarity: "SSR", scorePerSecond: 3.0, lifetime: "168h", rarityPercent: "4.5%" },
  2: { name: "Super Rare", rarity: "SR", scorePerSecond: 2.5, lifetime: "336h", rarityPercent: "8%" },
  3: { name: "Rare", rarity: "R", scorePerSecond: 2.0, lifetime: "336h", rarityPercent: "25%" },
  4: { name: "Uncommon", rarity: "UC", scorePerSecond: 1.5, lifetime: "672h", rarityPercent: "25%" },
  5: { name: "Common", rarity: "C", scorePerSecond: 1.0, lifetime: "672h", rarityPercent: "37.5%" },
  6: { name: "Failed", rarity: "F", scorePerSecond: 0.001, lifetime: "720h", rarityPercent: "0%" }
};

const BACKEND_URL = process.env.BACKEND_URL || process.env.BACKEND_PUBLIC_URL || 'https://api.monadworld.xyz';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params;
    
    if (!tokenId || isNaN(Number(tokenId))) {
      return NextResponse.json({ error: 'Invalid token ID' }, { status: 400 });
    }

    // Fetch NFT data from backend
    let nftData;
    try {
      const response = await fetch(`${BACKEND_URL}/api/nft/${tokenId}`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });
      
      if (response.ok) {
        nftData = await response.json();
      }
    } catch (error) {
      console.warn('Failed to fetch NFT data from backend:', error);
    }

    // Default metadata if backend fails
    const rank = nftData?.rank ?? 5; // Default to Common
    const rankInfo = RANK_INFO[rank as keyof typeof RANK_INFO] || RANK_INFO[5];
    
    // Generate different images based on rank
    const imageBaseUrl = "https://www.monadworld.xyz/image";
    const images = {
      0: `${imageBaseUrl}/UR.png`,       // Ultra Rare
      1: `${imageBaseUrl}/SSR.png`,      // Super Super Rare  
      2: `${imageBaseUrl}/SR.png`,       // Super Rare
      3: `${imageBaseUrl}/R.png`,        // Rare
      4: `${imageBaseUrl}/UC.png`,       // Uncommon
      5: `${imageBaseUrl}/C.png`,        // Common
      6: `${imageBaseUrl}/F.png`         // Failed
    };

    // OpenSea-compatible metadata
    const metadata = {
      name: `Lilnad #${tokenId}`,
      description: `A ${rankInfo.name} Lilnad from MonadWorld - Web3 Gaming NFT that accumulates ${rankInfo.scorePerSecond} points per second with a lifetime of ${rankInfo.lifetime}. This Soul-Bound Token represents your journey in the MonadWorld ecosystem.`,
      
      image: images[rank as keyof typeof images] || images[5],
      
      external_url: `https://www.monadworld.xyz/nft/${tokenId}`,
      
      attributes: [
        {
          trait_type: "Rank",
          value: rankInfo.rarity
        },
        {
          trait_type: "Rarity Tier", 
          value: rankInfo.name
        },
        {
          trait_type: "Score Per Second",
          value: rankInfo.scorePerSecond,
          display_type: "number"
        },
        {
          trait_type: "Lifetime",
          value: rankInfo.lifetime
        },
        {
          trait_type: "Rarity Percentage",
          value: rankInfo.rarityPercent
        },
        {
          trait_type: "Status",
          value: nftData?.isDead ? "Dead" : "Alive"
        }
      ],

      // Additional MonadWorld-specific data
      monadworld: {
        tokenId: parseInt(tokenId),
        rank: rank,
        startTimestamp: nftData?.startTimestamp,
        expirationTimestamp: nftData?.expirationTimestamp,
        scorePerSecond: nftData?.scorePerSecond,
        isDead: nftData?.isDead || false,
        contractAddress: process.env.NEXT_PUBLIC_SBT || "0x48689be5D36ae3B94f5f2Dc8FD372A0e46A20933"
      }
    };

    // Set proper headers for NFT metadata
    return NextResponse.json(metadata, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error generating metadata:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate metadata',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 