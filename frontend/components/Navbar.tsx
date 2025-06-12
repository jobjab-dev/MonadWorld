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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Close mobile menu when clicking outside or on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.mobile-menu') && !target.closest('.mobile-menu-toggle')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('click', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-pixel-purple-dark shadow-pixel-lg border-b-4 border-pixel-purple-medium sticky top-0 z-50 relative">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16 sm:h-20 md:h-24 w-full">
          {/* Left: Logo/Brand */}
          <div className="flex-shrink-0 flex items-center z-20">
            <Link href="/" className="flex items-center group" onClick={closeMobileMenu}>
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 mr-2 md:mr-3 transform group-hover:scale-110 transition-transform duration-200">
                <Image 
                  src="/logo_no_bg.png" 
                  alt="MonadWorld Logo"
                  width={96}
                  height={96}
                  priority
                  className="drop-shadow-[0_0_8px_rgba(138,43,226,0.8)] animate-pulse-slow"
                />
              </div>
              <span className="font-press-start text-pixel-accent group-hover:text-white transition-colors duration-150 tracking-wider text-shadow-pixel font-bold text-lg sm:text-2xl md:text-3xl lg:text-4xl">
                MonadWorld
              </span>
            </Link>
          </div>

          {/* Center: Desktop Menu - Hidden on mobile/tablet */}
          <div className="hidden lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:flex lg:space-x-2 xl:space-x-4">
            <Link href="/mint" className="px-2 py-1 md:px-3 md:py-2 lg:px-4 lg:py-2 rounded-none text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-pixel-accent hover:bg-pixel-purple-medium border-2 border-transparent hover:border-pixel-accent hover:text-white transition-all duration-150 transform hover:-translate-y-0.5 hover:shadow-pixel-md uppercase tracking-wide text-shadow-sm font-press-start">
              Mint
            </Link>
            <Link href="/collection" className="px-2 py-1 md:px-3 md:py-2 lg:px-4 lg:py-2 rounded-none text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-pixel-accent hover:bg-pixel-purple-medium border-2 border-transparent hover:border-pixel-accent hover:text-white transition-all duration-150 transform hover:-translate-y-0.5 hover:shadow-pixel-md uppercase tracking-wide text-shadow-sm font-press-start">
              Collection
            </Link>
            <Link href="/leaderboard" className="px-2 py-1 md:px-3 md:py-2 lg:px-4 lg:py-2 rounded-none text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-pixel-accent hover:bg-pixel-purple-medium border-2 border-transparent hover:border-pixel-accent hover:text-white transition-all duration-150 transform hover:-translate-y-0.5 hover:shadow-pixel-md uppercase tracking-wide text-shadow-sm font-press-start">
              Leaderboard
            </Link>
            <Link href="/docs" className="px-2 py-1 md:px-3 md:py-2 lg:px-4 lg:py-2 rounded-none text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-pixel-accent hover:bg-pixel-purple-medium border-2 border-transparent hover:border-pixel-accent hover:text-white transition-all duration-150 transform hover:-translate-y-0.5 hover:shadow-pixel-md uppercase tracking-wide text-shadow-sm font-press-start">
              Docs
            </Link>
          </div>

          {/* Right: Wallet/Network + Mobile Menu Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3 z-20">
            {/* Desktop Wallet Controls - Hidden on mobile */}
            <div className="hidden sm:flex items-center space-x-2 md:space-x-3">
              {isMounted && isConnected && chainId !== monadTestnet.id && <NetworkSwitcher />}
              {isMounted && isConnected && chainId === monadTestnet.id && <ProfileRankDisplay />}
              <WalletConnectButton />
            </div>

            {/* Mobile Menu Toggle Button - Only visible on mobile/tablet */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden mobile-menu-toggle w-10 h-10 sm:w-12 sm:h-12 bg-pixel-purple-medium border-2 border-pixel-purple-light text-pixel-accent hover:bg-pixel-purple-light hover:text-pixel-purple-dark transition-all duration-200 flex items-center justify-center shadow-pixel-sm"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                /* X Icon when menu is open */
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                /* Hamburger Icon when menu is closed */
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={closeMobileMenu}></div>
      )}

      {/* Mobile Menu Panel */}
      <div className={`
        fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-pixel-purple-dark border-l-4 border-pixel-purple-medium shadow-pixel-xl z-50 lg:hidden mobile-menu
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Mobile Menu Header */}
        <div className="bg-pixel-purple-medium border-b-4 border-pixel-purple-light p-4 flex items-center justify-between">
          <h3 className="text-pixel-accent font-press-start text-lg">MENU</h3>
          <button
            onClick={closeMobileMenu}
            className="w-8 h-8 bg-red-600 hover:bg-red-700 text-white border-2 border-red-800 flex items-center justify-center font-press-start text-sm transition-all duration-150"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        {/* Mobile Navigation Links */}
        <div className="p-4 space-y-3">
          <Link 
            href="/mint" 
            onClick={closeMobileMenu}
            className="block w-full px-4 py-3 bg-pixel-purple-medium border-2 border-pixel-purple-light text-pixel-accent font-press-start text-base hover:bg-pixel-accent hover:text-pixel-purple-dark transition-all duration-200 text-center shadow-pixel-sm"
          >
            MINT
          </Link>
          <Link 
            href="/collection" 
            onClick={closeMobileMenu}
            className="block w-full px-4 py-3 bg-pixel-purple-medium border-2 border-pixel-purple-light text-pixel-accent font-press-start text-base hover:bg-pixel-accent hover:text-pixel-purple-dark transition-all duration-200 text-center shadow-pixel-sm"
          >
            COLLECTION
          </Link>
          <Link 
            href="/leaderboard" 
            onClick={closeMobileMenu}
            className="block w-full px-4 py-3 bg-pixel-purple-medium border-2 border-pixel-purple-light text-pixel-accent font-press-start text-base hover:bg-pixel-accent hover:text-pixel-purple-dark transition-all duration-200 text-center shadow-pixel-sm"
          >
            LEADERBOARD
          </Link>
          <Link 
            href="/docs" 
            onClick={closeMobileMenu}
            className="block w-full px-4 py-3 bg-pixel-purple-medium border-2 border-pixel-purple-light text-pixel-accent font-press-start text-base hover:bg-pixel-accent hover:text-pixel-purple-dark transition-all duration-200 text-center shadow-pixel-sm"
          >
            DOCS
          </Link>
        </div>

        {/* Mobile Wallet Controls */}
        <div className="p-4 border-t-2 border-pixel-purple-light mt-4">
          <h4 className="text-pixel-accent font-press-start text-sm mb-4">WALLET</h4>
          <div className="space-y-3">
            {isMounted && isConnected && chainId !== monadTestnet.id && (
              <div className="w-full">
                <NetworkSwitcher />
              </div>
            )}
            {isMounted && isConnected && chainId === monadTestnet.id && (
              <div className="w-full">
                <ProfileRankDisplay />
              </div>
            )}
            <div className="w-full">
              <WalletConnectButton />
            </div>
          </div>
        </div>

        {/* Mobile Menu Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t-2 border-pixel-purple-light bg-pixel-purple-medium/50">
          <p className="text-pixel-text font-vt323 text-sm text-center opacity-75">
            MonadWorld - Pixel Universe
          </p>
        </div>
      </div>

      {/* Pixel bottom border effect */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-pixel-purple-light opacity-50"></div>
    </nav>
  )
} 