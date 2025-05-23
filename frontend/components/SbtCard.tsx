'use client';

import React from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { LILNAD_NFT_ADDRESS, LilnadNFTAbi } from '@/lib/contracts';
import { monadTestnet } from '@/lib/chains';
import { useEffect, useState } from 'react';
import { formatEther } from 'viem';

// Expected structure for sbtInfo from props (raw data from contract)
interface SbtInfoProp {
  startTimestamp: string;
  lastCollect: string;
  collected: string;
  isDead: boolean; // Raw isDead from contract
}

// Expected structure for rankData from props (cached S, T values)
interface RankDataProp {
  S: string;
  T: string;
}

// Expected structure for calculated values from backend
interface CalculatedValuesProp {
  isActuallyDead: boolean;       // Calculated by backend
  collectableNow: string;      // Calculated by backend (as string)
  totalAccrued: string;        // Calculated by backend (as string)
}

// Props for the simplified display-only card
interface SbtCardProps {
  tokenId: string;
  initialRank: number;
  initialStartTimestamp: string;
  initialExpirationTimestamp: string;
  scorePerSecond: string;   // Points per second from contract
  collectableNow: string;   // Points accumulated so far
}

// Solidity constant - ACCRUAL_WINDOW_SECS might still be useful for display or minor client-side logic if any remains
// const ACCRUAL_WINDOW_SECS = 24 * 60 * 60; 
// calculateCollectable function is now removed as backend handles this.

export default function SbtCard({
  tokenId,
  initialRank,
  initialStartTimestamp,
  initialExpirationTimestamp,
  scorePerSecond,
  collectableNow,
}: SbtCardProps) {
  // Determine rank name and image URL
  const rankNames = ['UR', 'SSR', 'SR', 'R', 'UC', 'C'];
  const rankName = rankNames[initialRank] || 'F';
  const imageUrl = `/image/${rankName}.png`;

  // Rank-specific styles for border, header, badge, and corners
  const rankStyles: Record<string, { 
    border: string; 
    headerBg: string; 
    badgeBg: string; 
    badgeText: string; 
    corner: string; 
    glow: string;
    pattern: string;
    shadow: string;
    animation: string;
    detailsBg: string;
  }> = {
    UR: { 
      border: '#FF0000', 
      headerBg: '#FF0000', 
      badgeBg: '#FF0000', 
      badgeText: '#000000', 
      corner: '#FF0000',
      glow: '0 0 4px #FF0000',
      pattern: 'repeating-linear-gradient(90deg, #FF0000, #FF0000 4px, #DC0000 4px, #DC0000 8px)',
      shadow: '4px 4px 0px #990000',
      animation: 'animate-pulse-slow',
      detailsBg: '#1a1a1a'
    },
    SSR: { 
      border: '#EAB308', 
      headerBg: '#EAB308', 
      badgeBg: '#EAB308', 
      badgeText: '#000000', 
      corner: '#EAB308',
      glow: '0 0 2px #EAB308',
      pattern: 'repeating-linear-gradient(90deg, #EAB308, #EAB308 4px, #D97706 4px, #D97706 8px)',
      shadow: '4px 4px 0px #92400E',
      animation: 'animate-pulse-slow',
      detailsBg: '#1a1a1a'
    },
    SR: { 
      border: '#A78BFA', 
      headerBg: '#A78BFA', 
      badgeBg: '#A78BFA', 
      badgeText: '#000000', 
      corner: '#A78BFA',
      glow: 'none',
      pattern: 'repeating-linear-gradient(90deg, #A78BFA, #A78BFA 4px, #8B5CF6 4px, #8B5CF6 8px)',
      shadow: '4px 4px 0px #7C3AED',
      animation: 'animate-pulse-slow',
      detailsBg: '#1a1a1a'
    },
    R: { 
      border: '#60A5FA', 
      headerBg: '#60A5FA', 
      badgeBg: '#60A5FA', 
      badgeText: '#000000', 
      corner: '#60A5FA',
      glow: 'none',
      pattern: 'repeating-linear-gradient(90deg, #60A5FA, #60A5FA 4px, #3B82F6 4px, #3B82F6 8px)',
      shadow: '4px 4px 0px #2563EB',
      animation: '',
      detailsBg: '#1a1a1a'
    },
    UC: { 
      border: '#4ADE80', 
      headerBg: '#4ADE80', 
      badgeBg: '#4ADE80', 
      badgeText: '#000000', 
      corner: '#4ADE80',
      glow: 'none',
      pattern: 'repeating-linear-gradient(90deg, #4ADE80, #4ADE80 4px, #22C55E 4px, #22C55E 8px)',
      shadow: '4px 4px 0px #16A34A',
      animation: '',
      detailsBg: '#1a1a1a'
    },
    C: { 
      border: '#94A3B8', 
      headerBg: '#94A3B8', 
      badgeBg: '#94A3B8', 
      badgeText: '#000000', 
      corner: '#94A3B8',
      glow: 'none',
      pattern: 'repeating-linear-gradient(90deg, #94A3B8, #94A3B8 4px, #64748B 4px, #64748B 8px)',
      shadow: '4px 4px 0px #475569',
      animation: '',
      detailsBg: '#1a1a1a'
    },
    F: { 
      border: '#6B7280', 
      headerBg: '#6B7280', 
      badgeBg: '#6B7280', 
      badgeText: '#000000', 
      corner: '#6B7280',
      glow: 'none',
      pattern: 'repeating-linear-gradient(90deg, #6B7280, #6B7280 4px, #4B5563 4px, #4B5563 8px)',
      shadow: '4px 4px 0px #374151',
      animation: '',
      detailsBg: '#1a1a1a'
    },
  };
  const style = rankStyles[rankName] || { 
    border: '#9C27B0', 
    headerBg: '#9C27B0', 
    badgeBg: 'rgba(0,0,0,0.9)', 
    badgeText: '#F0E68C', 
    corner: '#F0E68C',
    glow: 'none',
    pattern: 'none',
    shadow: '4px 4px 0px #6D28D9',
    animation: '',
    detailsBg: '#1a1a1a'
  };

  // Format dates for display
  const mintedDate = new Date(Number(initialStartTimestamp) * 1000).toLocaleString();
  const expirationDate = new Date(Number(initialExpirationTimestamp) * 1000).toLocaleString();

  // Compute points per minute: total points (S) divided by lifetime seconds (T), times 60
  const totalPointsNum = Number(scorePerSecond);
  const lifetimeSecs = Number(initialExpirationTimestamp) - Number(initialStartTimestamp);
  const ratePerMinuteDisplay = lifetimeSecs > 0
    ? ((totalPointsNum / lifetimeSecs) * 60).toFixed(2)
    : '0';
  // Format collected points to 2 decimal places
  const collectedDisplay = parseFloat(collectableNow).toFixed(2);

  return (
    <div className="relative border-4 rounded-none bg-pixel-bg text-base w-full max-w-[210px] mx-auto m-0 p-0 overflow-visible group transition-transform duration-150 hover:-translate-y-2 pixelated" 
         style={{ 
           borderColor: style.border, 
           backgroundImage: style.pattern,
           boxShadow: style.shadow,
         }}>
      {/* Pixel corners */}
      <div className="absolute top-0 left-0 w-2 h-2 z-0 pointer-events-none" 
           style={{ backgroundColor: style.corner }} />
      <div className="absolute top-0 right-0 w-2 h-2 z-0 pointer-events-none" 
           style={{ backgroundColor: style.corner }} />
      <div className="absolute bottom-0 left-0 w-2 h-2 z-10" 
           style={{ backgroundColor: style.corner }} />
      <div className="absolute bottom-0 right-0 w-2 h-2 z-10" 
           style={{ backgroundColor: style.corner }} />

      {/* Header: LILNAD */}
      <div className="py-1 text-center mt-0 rounded-none m-0 p-0" 
           style={{ backgroundColor: style.headerBg, color: style.badgeText }}>
        <div className="font-press-start text-lg md:text-xl tracking-wider shadow-pixel-text leading-none">LILNAD</div>
        <div className="font-press-start text-base md:text-lg tracking-wider shadow-pixel-text leading-none">#{tokenId}</div>
      </div>
      {/* Divider */}
      <div className="w-full border-t-2 my-0" style={{ borderTopColor: style.border }}></div>
      {/* Rank badge ใต้ divider */}
      <div className="w-full flex justify-center my-0">
        <span className="inline-block px-3 py-0 text-base font-bold font-press-start tracking-widest border-2" 
              style={{ 
                backgroundColor: style.badgeBg, 
                color: style.badgeText, 
                borderColor: style.border,
                boxShadow: '2px 2px 0px #000'
              }}>
          {rankName}
        </span>
      </div>
      {/* รูป NFT แบบ 1:1 */}
      <div className="relative bg-black flex items-center justify-center border-b-2 aspect-square w-full" 
           style={{ borderBottomColor: style.border }}>
        <img
          src={imageUrl}
          alt={`NFT ${tokenId}`}
          className="w-full h-full object-cover pixelated"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Details Section */}
      <div className="p-2 space-y-1 text-pixel-text font-vt323" 
           style={{ background: style.detailsBg }}>
        <div className="flex justify-between items-center text-sm relative">
          <span className="font-bold text-pixel-accent">Points</span>
          <span className="font-bold text-pixel-accent">{collectedDisplay}</span>
        </div>
        <div className="flex justify-between items-center text-sm relative">
          <span className="font-bold text-pixel-purple-light">Rate/min</span>
          <span className="text-pixel-accent">{ratePerMinuteDisplay}</span>
        </div>
        <div className="flex flex-col gap-1 mt-1 text-xs text-pixel-text/80">
          <span>Minted: <span className="font-bold text-pixel-accent">{mintedDate}</span></span>
          <span>Expires: <span className="font-bold text-pixel-accent">{expirationDate}</span></span>
        </div>
      </div>
    </div>
  );
} 
