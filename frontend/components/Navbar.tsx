'use client';

import Link from 'next/link'
import WalletConnectButton from './WalletConnectButton'
import NetworkSwitcher from './NetworkSwitcher'
import AddNetworkButton from './AddNetworkButton'

export default function Navbar() {
  return (
    <header className="w-full flex items-center justify-between py-4 px-6 border-b border-gray-700 bg-gray-900 text-gray-200">
      <nav className="flex gap-6 text-sm font-medium items-center">
        <span className="font-bold text-lg mr-4">MonadWorld</span>
        <Link href="/" className="hover:text-gray-300">Home</Link>
        <Link href="/mint" className="hover:text-gray-300">Mint</Link>
        <Link href="/collect" className="hover:text-gray-300">Collect</Link>
        <Link href="/leaderboard" className="hover:text-gray-300">Leaderboard</Link>
        <Link href="/claim" className="hover:text-gray-300">Claim</Link>
      </nav>
      <div className="flex gap-2 items-center">
        <AddNetworkButton />
        <NetworkSwitcher />
        <WalletConnectButton />
      </div>
    </header>
  )
} 