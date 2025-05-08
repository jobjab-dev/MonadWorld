import type { NextConfig } from "next";
import * as path from 'path'
import * as dotenv from 'dotenv'

// Explicitly load .env.local (helps on some Windows setups with BOM/encoding)
dotenv.config({ path: path.join(__dirname, '.env.local') })

console.log('[next.config] NEXT_PUBLIC_SBT =', process.env.NEXT_PUBLIC_SBT)

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
