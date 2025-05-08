'use client';

import { useState } from 'react';
import { monadTestnet } from '@/lib/chains'; // Ensure this path is correct

// Re-use or import the helper function
async function addMonadTestnetToWallet(): Promise<boolean> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    alert('Wallet provider not found. Please install a wallet like MetaMask or OKX Wallet.');
    return false;
  }
  try {
    await (window as any).ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: `0x${monadTestnet.id.toString(16)}`,
          chainName: monadTestnet.name,
          nativeCurrency: {
            name: monadTestnet.nativeCurrency.name,
            symbol: monadTestnet.nativeCurrency.symbol,
            decimals: monadTestnet.nativeCurrency.decimals,
          },
          rpcUrls: monadTestnet.rpcUrls.default.http,
          blockExplorerUrls: [monadTestnet.blockExplorers.default.url],
        },
      ],
    });
    console.log('Monad Testnet added or already present.');
    return true; // Indicate success or that it likely exists now
  } catch (addError: any) {
    console.error('Failed to add Monad Testnet:', addError);
    if (addError.code === 4001) {
        alert('You rejected the request to add Monad Testnet.');
    } else {
        alert('Failed to add Monad Testnet. It might already be added or an error occurred.');
    }
    return false; // Failed to add
  }
}


export default function AddNetworkButton() {
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    setIsAdding(true);
    await addMonadTestnetToWallet();
    setIsAdding(false);
  };

  // Note: This button doesn't check if the network is ALREADY added
  // or if the user is currently connected to it. It simply triggers the add request.
  // The NetworkSwitcher component is responsible for showing the "Switch" button if needed.
  return (
    <button
      onClick={handleAdd}
      disabled={isAdding}
      className="px-3 py-1.5 text-xs rounded bg-gray-600 hover:bg-gray-500 text-white disabled:opacity-50"
      title="Add Monad Testnet configuration to your wallet"
    >
      {isAdding ? 'Adding...' : 'Add Monad'}
    </button>
  );
}
