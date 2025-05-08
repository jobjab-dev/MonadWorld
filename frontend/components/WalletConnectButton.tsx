'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useEffect, useState } from 'react'

function truncate(address?: string) {
  if (!address) return ''
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export default function WalletConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  if (isConnected)
    return (
      <button
        onClick={() => disconnect()}
        className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
      >
        {truncate(address)} (Disconnect)
      </button>
    )

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending}
      className="px-4 py-2 bg-white text-black rounded hover:bg-gray-100"
    >
      {isPending ? 'Connecting…' : 'Connect Wallet'}
    </button>
  )
} 