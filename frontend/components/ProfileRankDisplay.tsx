'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { truncateAddress } from '../lib/utils';
import type { EnhancedNftData } from '../hooks/useOwnedNfts';

// Define the leaderboard entry type matching what's used in the leaderboard
type LeaderboardEntry = {
  rank: number;
  address: string;
  totalScore: number;
  collectedScore: number;
  nftCount: number;
  dailyPoints: number; // Added daily points
};

export default function ProfileRankDisplay() {
  const { address, isConnected } = useAccount();
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.floor(num));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle ESC key to close dropdown
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  // Adjust dropdown position when it opens to keep it within viewport
  useEffect(() => {
    if (dropdownOpen && dropdownRef.current && buttonRef.current) {
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Get button and dropdown dimensions/positions
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      
      // Calculate horizontal position to center dropdown under button
      const buttonCenter = buttonRect.left + (buttonRect.width / 2);
      const idealLeft = buttonCenter - (dropdownRect.width / 2);
      
      // Check if dropdown would go off screen to the right
      const rightOverflow = idealLeft + dropdownRect.width - viewportWidth;
      if (rightOverflow > 0) {
        dropdownRef.current.style.left = `${idealLeft - rightOverflow - 10}px`;
      } 
      // Check if dropdown would go off screen to the left
      else if (idealLeft < 10) {
        dropdownRef.current.style.left = '10px';
      } 
      else {
        dropdownRef.current.style.left = `${idealLeft}px`;
      }
      
      // Check if dropdown would extend below the viewport
      const bottomSpace = viewportHeight - buttonRect.bottom;
      if (dropdownRect.height > bottomSpace) {
        // Position dropdown above button if there's not enough space below
        if (buttonRect.top > dropdownRect.height) {
          dropdownRef.current.style.top = 'auto';
          dropdownRef.current.style.bottom = `${buttonRect.height + 10}px`;
        }
      }
    }
  }, [dropdownOpen]);

  // Fetch the user's rank data when wallet is connected
  useEffect(() => {
    if (!isConnected || !address) {
      setUserRank(null);
      return;
    }

    const fetchUserRank = async () => {
      setIsLoading(true);
      try {
        // Fetch ALL NFTs owned by the user via backend API
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin;
        const nftUrl = `${apiBaseUrl}/api/nfts/owner/${address}?page=1&limit=1000`;
        console.log('Fetching NFT data from:', nftUrl);
        let allUserNfts: EnhancedNftData[] = [];
        try {
          const nftsResponse = await fetch(nftUrl);
          console.log('NFT response ok:', nftsResponse.ok, 'status:', nftsResponse.status);
          const nftsJson = await nftsResponse.json();
          console.log('NFT response json:', nftsJson);
          allUserNfts = Array.isArray(nftsJson.data) ? nftsJson.data : [];
        } catch (nftError) {
          console.error('Error fetching NFT data:', nftError);
        }
        // Fetch leaderboard entry
        const response = await fetch('/api/leaderboard?limit=1000');
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }
        
        const data = await response.json();
        const userEntry = data.entries.find(
          (entry: LeaderboardEntry) => entry.address.toLowerCase() === address.toLowerCase()
        );
        
        if (userEntry) {
          // Calculate points per day from total points per minute of ALL NFTs
          const totalPointsPerMinute = allUserNfts.reduce((acc: number, nft: EnhancedNftData) => {
            const totalPoints = Number(nft.scorePerSecond);
            const lifetimeSecs = Number(nft.expirationTimestamp) - Number(nft.startTimestamp);
            const rate = lifetimeSecs > 0 ? (totalPoints / lifetimeSecs) * 60 : 0;
            return acc + rate;
          }, 0);
          
          // Convert points per minute to points per day (60 mins * 24 hours)
          const pointsPerDay = totalPointsPerMinute * 60 * 24;
          
          console.log(`Total Points/min: ${totalPointsPerMinute.toFixed(2)}, daily rate: ${pointsPerDay.toFixed(2)} from ${allUserNfts.length} NFTs`);
          
          // Override nftCount to actual length if desired
          const nftCount = allUserNfts.length;
          
          setUserRank({
            ...userEntry,
            nftCount,
            dailyPoints: pointsPerDay
          });
        } else {
          // If user not found in leaderboard data, create a mock entry
          setUserRank({
            rank: 999,
            address: address,
            totalScore: 0,
            collectedScore: 0,
            nftCount: 0,
            dailyPoints: 0
          });
        }
      } catch (error) {
        console.error('Error fetching user rank:', error);
        // Create a mock entry in case of error
        setUserRank({
          rank: 999,
          address: address,
          totalScore: 0,
          collectedScore: 0,
          nftCount: 0,
          dailyPoints: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRank();
  }, [address, isConnected]);

  if (!isConnected) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center">
        <div className="bg-pixel-purple-dark border-4 border-white rounded-none flex items-center h-16 px-4">
          <div className="w-6 h-6 border-4 border-t-pixel-accent border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <span className="ml-3 font-pixel text-pixel-accent">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Button */}
      <div 
        ref={buttonRef}
        className="flex items-center cursor-pointer" 
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        <div className="flex items-center">
          <div className="bg-pixel-accent border-4 border-pixel-purple-medium rounded-none flex items-center h-20 shadow-lg hover:shadow-2xl hover:bg-yellow-300 transition-all duration-200 transform hover:-translate-y-1">
            <div className="px-6 flex items-center justify-center h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-pixel-purple-medium rounded-none mr-4 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pixel-accent" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-extrabold text-pixel-purple-dark font-pixel whitespace-nowrap mr-4 tracking-wide uppercase" style={{ fontSize: '32px', letterSpacing: '1px', textShadow: '2px 2px 0 rgba(0,0,0,0.2)' }}>YOUR PROFILE</span>
              <div className="flex items-center justify-center w-12 h-12 bg-pixel-purple-medium rounded-none border-4 border-pixel-purple-dark overflow-hidden shadow-md transform hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 text-pixel-accent transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dropdown with fixed positioning */}
      {dropdownOpen && (
        <div 
          ref={dropdownRef}
          className="fixed mt-2 z-50 animate-fadeIn"
          style={{
            width: '320px',
            maxWidth: 'calc(100vw - 20px)',
            top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 8 : 0,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="bg-pixel-purple-dark border-4 border-white shadow-xl rounded-none overflow-hidden">
            {/* Rank display with absolutely minimal spacing */}
            <div className="bg-pixel-purple-dark border-b-4 border-white relative">
              <p className="text-white font-pixel mb-0 text-base text-center pt-2">YOUR RANK</p>
              <p className="font-bold text-pixel-accent font-pixel text-center" style={{ fontSize: '40px', lineHeight: '0.8', marginTop: '5px', marginBottom: '15px' }}>#{userRank?.rank || '?'}</p>
            </div>
            
            {/* TOTAL POINT section (previously Points Per Day) with animated glow */}
            <div className="text-center py-5 border-b-4 border-white bg-pixel-purple-dark relative overflow-hidden">
              <div className="absolute inset-0 bg-pixel-purple-light opacity-10 animate-pulse-slow"></div>
              <div className="relative z-10">
                <p className="text-white font-pixel mb-4" style={{ fontSize: '18px' }}>TOTAL POINT</p>
                <p className="font-bold text-pixel-accent font-pixel" style={{ fontSize: '36px', textShadow: '0px 0px 15px rgba(240,230,140,1)', filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.7))' }}>{formatNumber(userRank?.collectedScore || 0)}</p>
              </div>
            </div>
            
            {/* Points Per Day and NFTs Grid */}
            <div className="border-b-4 border-white bg-pixel-purple-dark" style={{ minHeight: '100px' }}>
              <div className="relative h-full flex flex-col">
                {/* Place the vertical divider in the center */}
                <div className="absolute h-full border-r-4 border-white" style={{ left: '50%', transform: 'translateX(-50%)' }}></div>
                
                {/* Header row with labels on the same horizontal line */}
                <div className="flex w-full py-2">
                  <div className="w-1/2 text-center">
                    <p className="text-white font-pixel text-sm">POINTS PER DAY</p>
                  </div>
                  <div className="w-1/2 text-center">
                    <p className="text-white font-pixel text-sm">NFTs</p>
                  </div>
                </div>
                
                {/* Values row */}
                <div className="flex w-full flex-grow items-center">
                  <div className="w-1/2 text-center">
                    <p className="font-bold text-white font-pixel text-2xl">+{formatNumber(userRank?.dailyPoints || 0)}</p>
                  </div>
                  <div className="w-1/2 text-center">
                    <p className="font-bold text-white font-pixel text-2xl">{userRank?.nftCount || 0}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Navigation Buttons with improved styling */}
            <div className="grid grid-cols-2">
              <a 
                href="/leaderboard" 
                className="block text-center bg-pixel-purple-dark py-3 whitespace-nowrap"
              >
                <span className="text-pixel-accent font-pixel tracking-wider uppercase font-bold" style={{ textDecoration: 'underline' }}>LEADERBOARD</span>
              </a>
              <a 
                href={`/collection?address=${address}`} 
                className="block text-center bg-pixel-purple-dark py-3 whitespace-nowrap"
              >
                <span className="text-pixel-accent font-pixel tracking-wider uppercase font-bold" style={{ textDecoration: 'underline' }}>MY NFTs</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 