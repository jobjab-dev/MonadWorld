export interface Feature {
  title: string;
  description: string;
  details: string;
}

export interface NFT {
  tokenId: string;
  name: string;
  image: string;
  rarity: string;
  points: number;
}

export interface User {
  address: string;
  rank: number;
  points: number;
  nftCount: number;
}