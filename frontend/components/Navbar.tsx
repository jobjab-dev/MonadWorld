'use client';

import React from 'react'
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

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isMobileMenuOpen && !target.closest('.mobile-menu-container')) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMobileMenuOpen])

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isMobileMenuOpen])

  const navLinks = [
    { href: '/mint', label: 'Mint' },
    { href: '/collection', label: 'Collection' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/docs', label: 'Docs' }
  ]

  const NavLink = ({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) => (
    <Link 
      href={href} 
      onClick={onClick}
      className="px-2 py-1 md:px-3 md:py-2 lg:px-4 lg:py-2 rounded-none text-sm md:text-lg lg:text-xl xl:text-2xl font-bold text-pixel-accent hover:bg-pixel-purple-medium border-2 border-transparent hover:border-pixel-accent hover:text-white transition-all duration-150 transform hover:-translate-y-0.5 hover:shadow-pixel-md uppercase tracking-wide text-shadow-sm font-press-start whitespace-nowrap"
    >
      {label}
    </Link>
  )

  return (
    <nav className="bg-pixel-purple-dark shadow-pixel-lg border-b-4 border-pixel-purple-medium sticky top-0 z-50 relative">
      <div className="w-full mx-auto px-2 sm:px-4 lg:px-8">
        <div className="relative flex items-center justify-between h-16 md:h-20 lg:h-24 w-full">
          
          {/* Left: Logo/Brand */}
          <div className="flex-shrink-0 flex items-center z-10">
            <Link href="/" className="flex items-center group">
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 mr-2 transform group-hover:scale-110 transition-transform duration-200">
                <Image 
                  src="/logo_no_bg.png" 
                  alt="MonadWorld Logo"
                  width={96}
                  height={96}
                  priority
                  className="drop-shadow-[0_0_8px_rgba(138,43,226,0.8)] animate-pulse-slow"
                />
              </div>
              <span className="font-press-start text-pixel-accent group-hover:text-white transition-colors duration-150 tracking-wider text-shadow-pixel font-bold text-xs sm:text-sm md:text-lg lg:text-2xl xl:text-3xl">
                MonadWorld
              </span>
            </Link>
          </div>

          {/* Desktop Navigation - Hidden on mobile/tablet */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 space-x-2 xl:space-x-4">
            {navLinks.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} />
            ))}
          </div>

          {/* Right: Wallet/Network + Mobile Menu Button */}
          <div className="flex items-center space-x-2">
            {/* Wallet/Network Section - Responsive sizing */}
            <div className="hidden sm:flex items-center space-x-1 md:space-x-2">
              {isMounted && isConnected && chainId !== monadTestnet.id && <NetworkSwitcher />}
              {isMounted && isConnected && chainId === monadTestnet.id && <ProfileRankDisplay />}
              <WalletConnectButton />
            </div>

            {/* Mobile/Tablet Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden mobile-menu-container relative z-50 p-2 rounded-none text-pixel-accent hover:text-white hover:bg-pixel-purple-medium transition-colors duration-150"
              aria-label="Toggle mobile menu"
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span className={`block w-5 h-0.5 bg-current transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                <span className={`block w-5 h-0.5 bg-current mt-1 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block w-5 h-0.5 bg-current mt-1 transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 mobile-menu-container">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black bg-opacity-75"></div>
          
          {/* Menu Panel */}
          <div className="relative bg-pixel-purple-dark border-4 border-pixel-purple-medium w-full h-full flex flex-col">
            {/* Menu Header */}
            <div className="p-4 border-b border-pixel-purple-medium">
              <h2 className="text-xl font-press-start text-pixel-accent text-center">Menu</h2>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 flex flex-col justify-center space-y-6 px-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full p-4 text-center bg-pixel-purple-medium border-2 border-pixel-accent text-pixel-accent hover:bg-pixel-accent hover:text-black font-press-start text-lg uppercase tracking-wide transition-all duration-150 transform hover:scale-105"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Mobile Wallet Section */}
            <div className="sm:hidden p-6 border-t border-pixel-purple-medium space-y-4">
              {isMounted && isConnected && chainId !== monadTestnet.id && (
                <div className="flex justify-center">
                  <NetworkSwitcher />
                </div>
              )}
              {isMounted && isConnected && chainId === monadTestnet.id && (
                <div className="flex justify-center">
                  <ProfileRankDisplay />
                </div>
              )}
              <div className="flex justify-center">
                <WalletConnectButton />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pixel bottom border effect */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-pixel-purple-light opacity-50"></div>
    </nav>
  )
} 