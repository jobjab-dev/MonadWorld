'use client';

import { useAccount, useSwitchChain } from 'wagmi'
import { monadTestnet } from '@/lib/chains'
import { useState } from 'react'

export default function NetworkSwitcher() {
  const { isConnected, chainId } = useAccount()
  const { switchChainAsync, error, isPending } = useSwitchChain()
  const [addPending, setAddPending] = useState(false)

  async function addMonad() {
    if (typeof window === 'undefined') return
    const provider = (window as any).ethereum
    if (!provider) return alert('No wallet provider')
    setAddPending(true)
    try {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${monadTestnet.id.toString(16)}`,
            chainName: monadTestnet.name,
            nativeCurrency: monadTestnet.nativeCurrency,
            rpcUrls: monadTestnet.rpcUrls.default.http,
            blockExplorerUrls: [monadTestnet.blockExplorers.default.url],
          },
        ],
      })
    } catch (e) {
      console.error(e)
    } finally {
      setAddPending(false)
    }
  }

  // Only show switcher when the user is connected but not on Monad Testnet
  if (!isConnected || chainId === monadTestnet.id) return null

  return (
    <div className="flex gap-3">
      <button
        onClick={() => switchChainAsync({ chainId: monadTestnet.id })}
        disabled={isPending}
        className="px-4 py-3 rounded-none bg-orange-500 text-white font-vt323 text-lg font-bold disabled:opacity-50 
                   border-2 border-t-orange-300 border-l-orange-300 border-r-orange-700 border-b-orange-700 
                   shadow-pixel-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all uppercase tracking-wide"
      >
        {isPending ? '⚡ Switching...' : '🌐 Switch to Monad'}
      </button>
      <button
        onClick={addMonad}
        disabled={addPending}
        className="px-4 py-3 rounded-none bg-pixel-purple-medium text-white font-vt323 text-lg font-bold disabled:opacity-50
                   border-2 border-t-purple-300 border-l-purple-300 border-r-purple-800 border-b-purple-800
                   shadow-pixel-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all uppercase tracking-wide"
      >
        {addPending ? '⏳ Adding...' : '➕ Add Testnet'}
      </button>
      {error && (
        <div className="absolute top-full left-0 mt-2 px-4 py-2 bg-red-900 text-white font-vt323 text-lg border-2 border-red-700 rounded-none shadow-pixel-sm">
          ⚠️ {error.message}
        </div>
      )}
    </div>
  )
} 