'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useEffect, useState, useRef } from 'react'

function truncate(address?: string) {
  if (!address) return ''
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export default function WalletConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [mounted, setMounted] = useState(false)
  
  // 1. Setup effect to set mounted state
  useEffect(() => setMounted(true), [])
  
  // 2. Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
  // Handle early return for SSR
  if (!mounted) return null

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setDropdownOpen(false)
    }
  }

  const handleOpenEtherscan = () => {
    if (address) {
      // Open Etherscan in a new tab
      // For Monad Testnet, this should use the Monad block explorer
      const explorerUrl = `https://testnet.monadexplorer.com/address/${address}`
      window.open(explorerUrl, '_blank')
      setDropdownOpen(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setDropdownOpen(false)
  }

  if (isConnected)
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="bg-pixel-purple-medium border border-white px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-10 w-28 sm:w-32 md:w-36 lg:w-40 text-white font-vt323 rounded-none flex items-center justify-between text-sm sm:text-base md:text-lg"
        >
          <span className="truncate">{truncate(address)}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 ml-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        {dropdownOpen && (
          <div className="absolute right-0 mt-1 w-48 sm:w-52 md:w-56 z-50">
            <div className="bg-pixel-purple-medium border border-white">
              <button 
                onClick={handleCopyAddress}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-white font-vt323 hover:bg-pixel-purple-light flex items-center justify-start border-b border-white/30 text-sm sm:text-base"
              >
                <div className="bg-pixel-purple-light p-1 mr-2 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="white">
                    <path d="M8 3a1 1 0 00-1 1v3.586l-1.707 1.707A1 1 0 005 10v4a1 1 0 001 1h8a1 1 0 001-1v-4a1 1 0 00-.293-.707L13 7.586V4a1 1 0 00-1-1H8z" />
                  </svg>
                </div>
                <span className="uppercase text-left">Copy Address</span>
              </button>
              
              <button 
                onClick={handleOpenEtherscan}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-white font-vt323 hover:bg-pixel-purple-light flex items-center justify-start border-b border-white/30 text-sm sm:text-base"
              >
                <div className="bg-pixel-purple-light p-1 mr-2 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="white">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                </div>
                <span className="uppercase text-left">Open in Monad Explorer</span>
              </button>
              
              <button 
                onClick={handleDisconnect}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-white font-vt323 hover:bg-pixel-purple-light flex items-center justify-start text-sm sm:text-base"
              >
                <div className="bg-pixel-purple-light p-1 mr-2 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="white">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V9.5a1 1 0 10-2 0V15H4V5h9.5a1 1 0 100-2H3z" clipRule="evenodd" />
                    <path d="M16 3a1 1 0 011 1v4.5a1 1 0 01-2 0V5.7l-4.6 4.6a1 1 0 01-1.4-1.4L13.3 4H11a1 1 0 110-2h4a1 1 0 011 1z" />
                  </svg>
                </div>
                <span className="uppercase text-left">Disconnect</span>
              </button>
            </div>
          </div>
        )}
      </div>
    )

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending}
      className="px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-10 w-28 sm:w-32 md:w-36 lg:w-40 bg-pixel-accent text-black font-vt323 font-bold rounded-none border-2 border-t-yellow-300 border-l-yellow-300 border-r-amber-700 border-b-amber-700 shadow-pixel-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all uppercase tracking-wide disabled:opacity-70 text-xs sm:text-sm md:text-base lg:text-lg"
    >
      <span className="hidden sm:inline">{isPending ? '⌛ Connecting...' : '🔗 Connect Wallet'}</span>
      <span className="sm:hidden">{isPending ? 'Connecting...' : 'Connect'}</span>
    </button>
  )
} 