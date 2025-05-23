'use client';

import Link from 'next/link';
import AddNetworkButton from './AddNetworkButton';

export default function Footer() {
  return (
    <>
      <footer className="mt-auto font-pixel relative">
        {/* Enhanced decorative border at top */}
        <div className="h-4 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"></div>
        <div className="h-2 w-full bg-pixel-accent"></div>
        
        {/* Pixel art decorations with better spacing */}
        <div className="absolute top-6 left-0 w-full overflow-hidden h-8 opacity-70 pointer-events-none">
          <div className="w-full flex justify-between px-8">
            <div className="w-5 h-5 bg-pixel-accent"></div>
            <div className="w-5 h-5 bg-pixel-accent"></div>
            <div className="w-5 h-5 bg-pixel-accent"></div>
            <div className="w-5 h-5 bg-pixel-accent"></div>
            <div className="w-5 h-5 bg-pixel-accent"></div>
            <div className="w-5 h-5 bg-pixel-accent"></div>
            <div className="w-5 h-5 bg-pixel-accent"></div>
            <div className="w-5 h-5 bg-pixel-accent"></div>
            <div className="w-5 h-5 bg-pixel-accent"></div>
            <div className="w-5 h-5 bg-pixel-accent"></div>
          </div>
        </div>
        
        <div className="py-20 bg-gradient-to-b from-pixel-purple-dark to-[#1a1333] border-b-4 border-pixel-purple-medium">
          <div className="max-w-7xl mx-auto px-8 sm:px-10 lg:px-12">
            {/* Footer content in a grid layout with improved spacing */}
            <div className="grid footer-grid grid-cols-1 md:grid-cols-3 gap-16 items-start justify-items-stretch auto-cols-fr">
              {/* Left section - Logo and tagline with enhanced styling */}
              <div className="flex flex-col w-full items-center py-6">
                <h3 className="text-2xl font-vt323 text-pixel-accent mb-6 tracking-wide animated-title">MONAD WORLD</h3>
                <p className="text-pixel-text text-lg mb-4 text-center md:text-left max-w-xs tagline-text">Earn, collect, and compete in our pixel universe!</p>
              </div>
              
              {/* Middle section - Buttons with enhanced styling */}
              <div className="flex flex-col w-full items-center space-y-8 justify-self-center py-6">
                {/* Section Title */}
                <h3 className="text-2xl font-vt323 text-pixel-accent tracking-wide animated-title-center">NETWORK TOOLS</h3>
                
                {/* Compact Buttons Container */}
                <div className="flex flex-row justify-center items-center space-x-4 buttons-container-compact">
                  {/* Add Network Button */}
                  <div className="network-button-compact">
                    <AddNetworkButton />
                  </div>

                  {/* Faucet Button */}
                  <Link
                    href="https://faucet.monad.xyz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="compact-button"
                  >
                    Faucet
                  </Link>
                </div>
              </div>
              
              {/* Right section - Social links with improved styling */}
              <div className="flex flex-col w-full items-center justify-self-center md:justify-self-end py-6">
                <h3 className="text-2xl font-vt323 text-pixel-accent mb-6 tracking-wide animated-title">JOIN OUR COMMUNITY</h3>
                
                {/* Social Media Links - Icons only */}
                <div className="flex justify-center social-icons-container">
                  {/* X/Twitter */}
                  <Link
                    href="https://x.com/monadworld_xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon-link mx-5"
                    aria-label="X/Twitter"
                  >
                    <div className="social-icon x-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-svg">
                        <path d="M4 4l11.733 16h4.267l-11.733 -16z"></path>
                        <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path>
                      </svg>
                    </div>
                  </Link>
                  
                  {/* GitHub */}
                  <Link
                    href="https://github.com/jobjab-dev/MonadWorld"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon-link mx-5"
                    aria-label="GitHub"
                  >
                    <div className="social-icon github-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-svg">
                        <path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"></path>
                      </svg>
                    </div>
                  </Link>
                  
                  {/* Discord */}
                  <Link
                    href="https://discord.gg/monadworld"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon-link mx-5"
                    aria-label="Discord"
                  >
                    <div className="social-icon discord-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-svg">
                        <path d="M8 12a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"></path>
                        <path d="M14 12a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"></path>
                        <path d="M15.5 17c0 1 1.5 3 2 3c1.5 0 2.833 -1.667 3.5 -3c.667 -1.667 .5 -5.833 -1.5 -11.5c-1.457 -1.015 -3 -1.34 -4.5 -1.5l-.972 1.923a11.913 11.913 0 0 0 -4.053 0l-.975 -1.923c-1.5 .16 -3.043 .485 -4.5 1.5c-2 5.667 -2.167 9.833 -1.5 11.5c.667 1.333 2 3 3.5 3c.5 0 2 -2 2 -3"></path>
                        <path d="M7 16.5c3.5 1 6.5 1 10 0"></path>
                      </svg>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Copyright bar with refined styling */}
            <div className="mt-16 pt-10 pb-12 border-t border-pixel-purple-medium/50 text-center">
              <p className="text-pixel-text text-sm">
                © {new Date().getFullYear()} MonadWorld. All pixel rights reserved. 
                <span className="hidden sm:inline"> | </span>
                <br className="sm:hidden" />
                <span className="opacity-75">Built with 💙 for the Monad community</span>
              </p>
            </div>
          </div>
        </div>
        
        {/* Enhanced decorative border at bottom */}
        <div className="h-2 w-full bg-pixel-accent"></div>
        <div className="h-4 w-full bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600"></div>
      </footer>
      <style jsx>{` 
        .footer-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
      `}</style>
    </>
  );
} 