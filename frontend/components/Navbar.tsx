'use client';

import Link from 'next/link'
import Image from 'next/image'
import WalletConnectButton from './WalletConnectButton'
import NetworkSwitcher from './NetworkSwitcher'
import dynamic from 'next/dynamic'
import { useAccount } from 'wagmi'
import { monadTestnet } from '@/lib/chains'
import { useState, useEffect } from 'react'

const ProfileRankDisplay = dynamic(() => import('./ProfileRankDisplay'), { ssr: false });

export default function Navbar() {
  const { isConnected, chainId } = useAccount()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <nav className="bg-pixel-purple-dark shadow-pixel-lg border-b-4 border-pixel-purple-medium sticky top-0 z-50 relative">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center h-20 md:h-24 w-full">
          {/* Left: Logo/Brand */}
          <div className="flex-shrink-0 flex items-center z-10">
            <Link href="/" className="flex items-center group">
              <div className="relative w-12 h-12 md:w-16 md:h-16 mr-2 md:mr-3 transform group-hover:scale-110 transition-transform duration-200">
                <Image 
                  src="/logo_no_bg.png" 
                  alt="MonadWorld Logo"
                  width={96}
                  height={96}
                  priority
                  className="drop-shadow-[0_0_8px_rgba(138,43,226,0.8)] animate-pulse-slow"
                />
              </div>
              <span className="font-press-start text-pixel-accent group-hover:text-white transition-colors duration-150 tracking-wider text-shadow-pixel font-bold text-2xl md:text-4xl lg:text-5xl">
                MonadWorld
              </span>
            </Link>
          </div>
          {/* Center: Menu (absolute center) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex space-x-1 md:space-x-3 lg:space-x-4">
            <Link href="/mint" className="px-2 py-1 md:px-3 md:py-2 lg:px-4 lg:py-2 rounded-none text-xl md:text-2xl lg:text-3xl font-bold text-pixel-accent hover:bg-pixel-purple-medium border-2 border-transparent hover:border-pixel-accent hover:text-white transition-all duration-150 transform hover:-translate-y-0.5 hover:shadow-pixel-md uppercase tracking-wide text-shadow-sm font-press-start">Mint</Link>
            <Link href="/collection" className="px-2 py-1 md:px-3 md:py-2 lg:px-4 lg:py-2 rounded-none text-xl md:text-2xl lg:text-3xl font-bold text-pixel-accent hover:bg-pixel-purple-medium border-2 border-transparent hover:border-pixel-accent hover:text-white transition-all duration-150 transform hover:-translate-y-0.5 hover:shadow-pixel-md uppercase tracking-wide text-shadow-sm font-press-start">Collection</Link>
            <Link href="/leaderboard" className="px-2 py-1 md:px-3 md:py-2 lg:px-4 lg:py-2 rounded-none text-xl md:text-2xl lg:text-3xl font-bold text-pixel-accent hover:bg-pixel-purple-medium border-2 border-transparent hover:border-pixel-accent hover:text-white transition-all duration-150 transform hover:-translate-y-0.5 hover:shadow-pixel-md uppercase tracking-wide text-shadow-sm font-press-start">Leaderboard</Link>
            <Link href="/docs" className="px-2 py-1 md:px-3 md:py-2 lg:px-4 lg:py-2 rounded-none text-xl md:text-2xl lg:text-3xl font-bold text-pixel-accent hover:bg-pixel-purple-medium border-2 border-transparent hover:border-pixel-accent hover:text-white transition-all duration-150 transform hover:-translate-y-0.5 hover:shadow-pixel-md uppercase tracking-wide text-shadow-sm font-press-start">Docs</Link>
          </div>
          {/* Right: Wallet/Network */}
          <div className="flex-shrink-0 flex items-center z-10 ml-auto space-x-2 md:space-x-3">
            {isMounted && isConnected && chainId !== monadTestnet.id && <NetworkSwitcher />}
            {isMounted && isConnected && chainId === monadTestnet.id && <ProfileRankDisplay />}
            <WalletConnectButton />
          </div>
        </div>
      </div>
      {/* Pixel bottom border effect */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-pixel-purple-light opacity-50"></div>
    </nav>
  )
} 