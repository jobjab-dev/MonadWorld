'use client';

import Link from 'next/link';
import AddNetworkButton from './AddNetworkButton'; // Reuse the existing component

export default function Footer() {
  return (
    <footer className="py-8 mt-auto font-pixel bg-pixel-purple-dark border-t-4 border-pixel-purple-medium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
          {/* Add Monad Network Button - Reusing existing component */}
          {/* We might need to adjust AddNetworkButton's internal styling if it doesn't fit well here */}
          <AddNetworkButton />

          {/* Monad Faucet Button */}
          <Link
            href="https://faucet.monad.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-pixel-accent text-pixel-bg font-semibold rounded-pixel-md hover:bg-yellow-400 transition-colors duration-150 shadow-pixel hover:shadow-pixel-lg transform hover:scale-105 border-2 border-black"
          >
            Monad Faucet
          </Link>
        </div>
        <div className="text-center text-pixel-text text-xs mt-8">
          © {new Date().getFullYear()} MonadWorld. All pixel rights reserved.
        </div>
      </div>
    </footer>
  );
} 