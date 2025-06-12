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
          <div className="w-full flex justify-between px-4 sm:px-8">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="w-3 h-3 sm:w-5 sm:h-5 bg-pixel-accent"></div>
            ))}
          </div>
        </div>
        
        <div className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-pixel-purple-dark to-[#1a1333] border-b-4 border-pixel-purple-medium">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Footer content in a responsive grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 md:gap-16 items-start">
              
              {/* Left section - Logo and tagline */}
              <div className="flex flex-col w-full items-center text-center md:items-start md:text-left">
                <h3 className="text-xl sm:text-2xl md:text-2xl font-vt323 text-pixel-accent mb-4 sm:mb-6 tracking-wide animated-title">
                  MONAD WORLD
                </h3>
                <p className="text-pixel-text text-base sm:text-lg md:text-lg mb-4 max-w-xs tagline-text leading-relaxed">
                  Earn, collect, and compete in our pixel universe!
                </p>
              </div>
              
              {/* Middle section - Network Tools */}
              <div className="flex flex-col w-full items-center">
                <h3 className="text-xl sm:text-2xl md:text-2xl font-vt323 text-pixel-accent mb-4 sm:mb-6 tracking-wide animated-title-center">
                  NETWORK TOOLS
                </h3>
                
                {/* Responsive Buttons Container */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-sm">
                  {/* Add Network Button */}
                  <div className="flex-1">
                    <AddNetworkButton />
                  </div>

                  {/* Faucet Button */}
                  <Link
                    href="https://faucet.monad.xyz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-3 sm:px-6 sm:py-3 bg-pixel-purple-medium border-2 border-pixel-purple-light text-pixel-accent text-sm sm:text-base md:text-lg font-vt323 font-bold hover:bg-pixel-accent hover:text-pixel-purple-dark transition-all duration-150 shadow-[3px_3px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] text-center whitespace-nowrap"
                  >
                    Faucet
                  </Link>
                </div>
              </div>
              
              {/* Right section - Social links */}
              <div className="flex flex-col w-full items-center md:items-end">
                <h3 className="text-xl sm:text-2xl md:text-2xl font-vt323 text-pixel-accent mb-4 sm:mb-6 tracking-wide animated-title text-center md:text-right">
                  JOIN OUR COMMUNITY
                </h3>
                
                {/* Social Media Links - Responsive layout */}
                <div className="flex flex-row justify-center md:justify-end gap-4 sm:gap-6 social-icons-container">
                  {/* X/Twitter */}
                  <Link
                    href="https://x.com/monadworld_xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon-link group"
                    aria-label="X/Twitter"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-pixel-purple-medium border-2 border-pixel-purple-light hover:border-pixel-accent text-pixel-accent hover:text-white transition-all duration-200 flex items-center justify-center shadow-pixel-sm hover:shadow-pixel-md hover:-translate-y-1 social-icon x-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 icon-svg">
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
                    className="social-icon-link group"
                    aria-label="GitHub"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-pixel-purple-medium border-2 border-pixel-purple-light hover:border-pixel-accent text-pixel-accent hover:text-white transition-all duration-200 flex items-center justify-center shadow-pixel-sm hover:shadow-pixel-md hover:-translate-y-1 social-icon github-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 icon-svg">
                        <path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"></path>
                      </svg>
                    </div>
                  </Link>
                  
                  {/* Discord */}
                  <Link
                    href="https://discord.gg/FSbhCEEJt6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon-link group"
                    aria-label="Discord"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-pixel-purple-medium border-2 border-pixel-purple-light hover:border-pixel-accent text-pixel-accent hover:text-white transition-all duration-200 flex items-center justify-center shadow-pixel-sm hover:shadow-pixel-md hover:-translate-y-1 social-icon discord-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 icon-svg">
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
            <div className="mt-12 sm:mt-16 md:mt-20 pt-6 sm:pt-8 md:pt-10 border-t border-pixel-purple-medium/50 text-center">
              <p className="text-pixel-text text-sm sm:text-base">
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
    </>
  );
} 