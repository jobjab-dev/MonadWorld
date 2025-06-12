'use client';

import Link from 'next/link';
import AddNetworkButton from './AddNetworkButton';

export default function Footer() {
  return (
    <>
      <footer className="mt-auto font-pixel relative">
        {/* Enhanced decorative border at top */}
        <div className="h-2 md:h-4 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"></div>
        <div className="h-1 md:h-2 w-full bg-pixel-accent"></div>
        
        {/* Pixel art decorations with better spacing */}
        <div className="absolute top-3 md:top-6 left-0 w-full overflow-hidden h-6 md:h-8 opacity-70 pointer-events-none">
          <div className="w-full flex justify-between px-4 md:px-8">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="w-3 h-3 md:w-5 md:h-5 bg-pixel-accent"></div>
            ))}
          </div>
        </div>
        
        <div className="py-8 md:py-12 lg:py-20 bg-gradient-to-b from-pixel-purple-dark to-[#1a1333] border-b-4 border-pixel-purple-medium">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
            {/* Footer content in a responsive grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 lg:gap-16 items-start justify-items-center md:justify-items-stretch">
              
              {/* Left section - Logo and tagline */}
              <div className="flex flex-col w-full items-center md:items-start py-4 md:py-6">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-vt323 text-pixel-accent mb-4 md:mb-6 tracking-wide animated-title">MONAD WORLD</h3>
                <p className="text-pixel-text text-sm md:text-base lg:text-lg mb-4 text-center md:text-left max-w-xs tagline-text">Earn, collect, and compete in our pixel universe!</p>
              </div>
              
              {/* Middle section - Buttons */}
              <div className="flex flex-col w-full items-center space-y-4 md:space-y-6 lg:space-y-8 py-4 md:py-6 order-3 md:order-2">
                {/* Section Title */}
                <h3 className="text-lg md:text-xl lg:text-2xl font-vt323 text-pixel-accent tracking-wide animated-title-center">NETWORK TOOLS</h3>
                
                {/* Buttons Container */}
                <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4 buttons-container-compact w-full">
                  {/* Add Network Button */}
                  <div className="network-button-compact w-full sm:w-auto">
                    <AddNetworkButton />
                  </div>

                  {/* Faucet Button */}
                  <Link
                    href="https://faucet.monad.xyz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-4 py-2 md:px-6 md:py-3 bg-pixel-purple-medium text-pixel-accent text-sm md:text-base lg:text-lg font-vt323 font-bold rounded-none border-2 border-pixel-accent hover:bg-pixel-accent hover:text-black transition-all duration-150 transform hover:scale-105 text-center"
                  >
                    Faucet
                  </Link>
                </div>
              </div>
              
              {/* Right section - Social links */}
              <div className="flex flex-col w-full items-center md:items-end py-4 md:py-6 order-2 md:order-3">
                <h3 className="text-lg md:text-xl lg:text-2xl font-vt323 text-pixel-accent mb-4 md:mb-6 tracking-wide animated-title text-center md:text-right">JOIN OUR COMMUNITY</h3>
                
                {/* Social Media Links - Icons only */}
                <div className="flex justify-center md:justify-end social-icons-container space-x-4 md:space-x-6">
                  {/* X/Twitter */}
                  <Link
                    href="https://x.com/monadworld_xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon-link group"
                    aria-label="X/Twitter"
                  >
                    <div className="social-icon x-icon p-2 md:p-3 bg-pixel-purple-medium border-2 border-pixel-accent hover:bg-pixel-accent hover:border-pixel-purple-medium transition-all duration-150 transform hover:scale-110">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-svg text-pixel-accent group-hover:text-black transition-colors duration-150 w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7">
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
                    <div className="social-icon github-icon p-2 md:p-3 bg-pixel-purple-medium border-2 border-pixel-accent hover:bg-pixel-accent hover:border-pixel-purple-medium transition-all duration-150 transform hover:scale-110">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-svg text-pixel-accent group-hover:text-black transition-colors duration-150 w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7">
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
                    <div className="social-icon discord-icon p-2 md:p-3 bg-pixel-purple-medium border-2 border-pixel-accent hover:bg-pixel-accent hover:border-pixel-purple-medium transition-all duration-150 transform hover:scale-110">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-svg text-pixel-accent group-hover:text-black transition-colors duration-150 w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7">
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
            <div className="mt-8 md:mt-12 lg:mt-16 pt-6 md:pt-8 lg:pt-10 pb-6 md:pb-8 lg:pb-12 border-t border-pixel-purple-medium/50 text-center">
              <p className="text-pixel-text text-xs sm:text-sm md:text-base">
                © {new Date().getFullYear()} MonadWorld. All pixel rights reserved. 
                <span className="hidden sm:inline"> | </span>
                <br className="sm:hidden" />
                <span className="opacity-75">Built with 💙 for the Monad community</span>
              </p>
            </div>
          </div>
        </div>
        
        {/* Enhanced decorative border at bottom */}
        <div className="h-1 md:h-2 w-full bg-pixel-accent"></div>
        <div className="h-2 md:h-4 w-full bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600"></div>
      </footer>
    </>
  );
} 