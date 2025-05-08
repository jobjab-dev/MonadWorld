// lib/wagmiConfig.ts
import { createConfig, type Config, injected, http } from 'wagmi'
import { monadTestnet } from './chains'

// ดึง RPC URL จาก .env หรือ fallback เป็น RPC ที่ประกาศใน chain
const rpcUrl = process.env.NEXT_PUBLIC_RPC ?? monadTestnet.rpcUrls.default.http[0]

// สร้าง Wagmi config สำหรับ Monad Testnet
export const wagmiConfig: Config = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(rpcUrl),
  },
  connectors: [injected()],
})