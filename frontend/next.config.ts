import type { NextConfig } from "next";
// import * as path from 'path' // No longer needed if not using path.join
// import * as dotenv from 'dotenv' // Removed, Next.js handles .env loading

// Explicitly load .env.local (helps on some Windows setups with BOM/encoding)
// dotenv.config({ path: path.join(__dirname, '.env.local') }) // Removed

// You can still console.log to debug env values loaded by Next.js.
// This value will be resolved at build time on Vercel from the variables you set on the Dashboard,
// and during local dev, it will come from .env.local.
console.log('[next.config] NEXT_PUBLIC_SBT (loaded by Next.js) =', process.env.NEXT_PUBLIC_SBT);

const nextConfig: NextConfig = {
  /* config options here */
  // If you need to use Environment Variables in Next.js's runtime config,
  // you can access process.env directly here.
  // For example:
  // publicRuntimeConfig: {
  //   myVariable: process.env.NEXT_PUBLIC_MY_VARIABLE,
  // },
};

export default nextConfig;
