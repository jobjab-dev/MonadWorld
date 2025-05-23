import { defineChain, Abi } from 'viem'
// Load ABI from backend/abi directory instead of artifacts (which is gitignored)
const LilnadNFTJson = require('../abi/LilnadNFT.json');

// 1. Define Chain
export const monadTestnetChain = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: { name: 'Monad', symbol: 'DMON', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RPC_URL || 'https://testnet-rpc.monad.xyz'] },
    public:  { http: [process.env.RPC_URL || 'https://testnet-rpc.monad.xyz'] }
  },
  blockExplorers: {
    default: { name: 'MonadScan', url: 'https://testnet.monadexplorer.com/' }
  },
  testnet: true
})

// Load .env variables specifically for this config if not already loaded by index.ts
// This is a fallback, ideally index.ts loads them first.
import dotenv from 'dotenv';
import path from 'path';
const envConfigPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envConfigPath });

// 2. Contract Address from ENV
console.log('[config.ts] Attempting to read LILNAD_NFT_ADDRESS from env. Current value:', process.env.LILNAD_NFT_ADDRESS);
export const LILNAD_NFT_CONTRACT_ADDRESS = (process.env.LILNAD_NFT_ADDRESS || '') as `0x${string}`
if (!LILNAD_NFT_CONTRACT_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(LILNAD_NFT_CONTRACT_ADDRESS)) {
    console.warn("[config.ts] LILNAD_NFT_ADDRESS environment variable is missing or invalid! Value received:", process.env.LILNAD_NFT_ADDRESS);
    // Decide how to handle this - throw error or proceed with caution?
}

// 3. Contract ABI (Imported from artifacts - ensure path is correct relative to this file)
// Ensure you have copied the latest ABI JSON to a location accessible by the backend
// or adjust the path accordingly.
// For simplicity, assuming artifacts folder is accessible relative to backend src:
let contractAbi: Abi = []; // Keep simple Abi type
try {
    contractAbi = LilnadNFTJson.abi as Abi; 
} catch (e) {
    console.error("Failed to load LilnadNFT ABI JSON.", e);
}
export const LILNAD_NFT_ABI = contractAbi;

// 4. Indexer Start Block from ENV
console.log('[config.ts] Attempting to read INDEXER_START_BLOCK from env. Current value:', process.env.INDEXER_START_BLOCK);
export const INDEXER_START_BLOCK = BigInt(process.env.INDEXER_START_BLOCK || '0'); 