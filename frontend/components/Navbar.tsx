'use client';

import Link from 'next/link'
import Image from 'next/image'
import WalletConnectButton from './WalletConnectButton'
import NetworkSwitcher from './NetworkSwitcher'

export default function Navbar() {
  return (
    <nav className="bg-pixel-purple-dark shadow-pixel-lg border-b-4 border-pixel-purple-medium sticky top-0 z-50 font-pixel">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-16 md:h-20">
          <div className="flex items-center space-x-3 md:space-x-4">
            <Link href="/" className="flex items-center">
              <div className="relative w-10 h-10 md:w-12 md:h-12 mr-2">
                <Image 
                  src="/logo_no_bg.png" 
                  alt="MonadWorld Logo"
                  width={64}
                  height={64}
                  priority
                  className="drop-shadow-[0_0_8px_rgba(138,43,226,0.8)]"
                />
              </div>
              <span className="text-2xl md:text-3xl font-bold text-pixel-accent hover:text-white transition-colors duration-150">
                MonadWorld
              </span>
            </Link>
            <div className="flex items-center space-x-1 md:space-x-2">
              <Link href="/" className="px-2 py-1 md:px-3 md:py-2 rounded-pixel-sm text-sm font-medium text-pixel-text hover:bg-pixel-purple-medium hover:text-white transition-colors">Home</Link>
              <Link href="/mint" className="px-2 py-1 md:px-3 md:py-2 rounded-pixel-sm text-sm font-medium text-pixel-text hover:bg-pixel-purple-medium hover:text-white transition-colors">Mint</Link>
              <Link href="/collect" className="px-2 py-1 md:px-3 md:py-2 rounded-pixel-sm text-sm font-medium text-pixel-text hover:bg-pixel-purple-medium hover:text-white transition-colors">Collect</Link>
              <Link href="/world" className="px-2 py-1 md:px-3 md:py-2 rounded-pixel-sm text-sm font-medium text-pixel-text hover:bg-pixel-purple-medium hover:text-white transition-colors">World</Link>
              <Link href="/leaderboard" className="px-2 py-1 md:px-3 md:py-2 rounded-pixel-sm text-sm font-medium text-pixel-text hover:bg-pixel-purple-medium hover:text-white transition-colors">Leaderboard</Link>
              <Link href="/docs" className="px-2 py-1 md:px-3 md:py-2 rounded-pixel-sm text-sm font-medium text-pixel-text hover:bg-pixel-purple-medium hover:text-white transition-colors">Docs</Link>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3">
            <NetworkSwitcher />
            <WalletConnectButton />
          </div>
        </div>
      </div>
    </nav>
  )
} 