"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDEXER_START_BLOCK = exports.LILNAD_NFT_ABI = exports.LILNAD_NFT_CONTRACT_ADDRESS = exports.monadTestnetChain = void 0;
var viem_1 = require("viem");
// Revert back to require for JSON import as 'with' is problematic with current TS/module setup
var LilnadNFTJson = require('../abi/LilnadNFT.json');
// 1. Define Chain
exports.monadTestnetChain = (0, viem_1.defineChain)({
    id: 10143,
    name: 'Monad Testnet',
    network: 'monad-testnet',
    nativeCurrency: { name: 'Monad', symbol: 'DMON', decimals: 18 },
    rpcUrls: {
        default: { http: [process.env.RPC_URL || 'https://testnet-rpc.monad.xyz'] },
        public: { http: [process.env.RPC_URL || 'https://testnet-rpc.monad.xyz'] }
    },
    blockExplorers: {
        default: { name: 'MonadScan', url: 'https://testnet.monadexplorer.com/' }
    },
    testnet: true
});
// Load .env variables specifically for this config if not already loaded by index.ts
// This is a fallback, ideally index.ts loads them first.
var dotenv_1 = __importDefault(require("dotenv"));
var path_1 = __importDefault(require("path"));
var envConfigPath = path_1.default.resolve(__dirname, '../.env.local');
dotenv_1.default.config({ path: envConfigPath });
// 2. Contract Address from ENV
console.log('[config.ts] Attempting to read LILNAD_NFT_ADDRESS from env. Current value:', process.env.LILNAD_NFT_ADDRESS);
exports.LILNAD_NFT_CONTRACT_ADDRESS = (process.env.LILNAD_NFT_ADDRESS || '');
if (!exports.LILNAD_NFT_CONTRACT_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(exports.LILNAD_NFT_CONTRACT_ADDRESS)) {
    console.warn("[config.ts] LILNAD_NFT_ADDRESS environment variable is missing or invalid! Value received:", process.env.LILNAD_NFT_ADDRESS);
    // Decide how to handle this - throw error or proceed with caution?
}
// 3. Contract ABI (Imported from artifacts - ensure path is correct relative to this file)
// Ensure you have copied the latest ABI JSON to a location accessible by the backend
// or adjust the path accordingly.
// For simplicity, assuming artifacts folder is accessible relative to backend src:
var contractAbi = []; // Keep simple Abi type
try {
    contractAbi = LilnadNFTJson.abi;
}
catch (e) {
    console.error("Failed to load LilnadNFT ABI JSON.", e);
}
exports.LILNAD_NFT_ABI = contractAbi;
// 4. Indexer Start Block from ENV
console.log('[config.ts] Attempting to read INDEXER_START_BLOCK from env. Current value:', process.env.INDEXER_START_BLOCK);
exports.INDEXER_START_BLOCK = BigInt(process.env.INDEXER_START_BLOCK || '0');
