'use client';

import { useChainId, useSwitchChain } from 'wagmi'
import { monadTestnet } from '@/lib/chains'
import { useState } from 'react'

export default function NetworkSwitcher() {
  const chainId = useChainId()
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

  if (chainId === monadTestnet.id) return null

  return (
    <div className="flex gap-2">
      <button
        onClick={() => switchChainAsync({ chainId: monadTestnet.id })}
        disabled={isPending}
        className="px-4 py-2 rounded bg-orange-600 text-white disabled:opacity-50"
      >
        {isPending ? 'Switching…' : 'Switch to Monad'}
      </button>
      <button
        onClick={addMonad}
        disabled={addPending}
        className="px-4 py-2 rounded bg-gray-500 text-white disabled:opacity-50"
      >
        {addPending ? 'Adding…' : 'Add Monad Testnet'}
      </button>
      {error && <span className="text-red-500 text-sm">{error.message}</span>}
    </div>
  )
} 