'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { truncateAddress } from '../../lib/utils'

// Define leaderboard entry type
type LeaderboardEntry = {
  rank: number
  address: string
  totalScore: number
  collectedScore: number
  nftCount: number
}

// API response type
type LeaderboardResponse = {
  totalEntries: number
  currentPage: number
  totalPages: number
  entries: LeaderboardEntry[]
  dataSource: string
  cacheTimestamp: string
}

export default function LeaderboardPage() {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const { address } = useAccount()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState("Connecting to backend...")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string | null>(null)
  
  // Function to format large numbers with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.floor(num))
  }

  // Fetch leaderboard data
  const fetchLeaderboard = async (page: number = 1, limit: number = 20) => {
    setIsLoading(true)
    setLoadingProgress("Connecting to backend...")
    setError(null)
    
    try {
      // Log the API request being made
      console.log(`Fetching leaderboard data for page ${page}, limit ${limit}`)
      setLoadingProgress("Fetching leaderboard data...")
      
      // Fetch data from the backend API
      const response = await fetch(`/api/leaderboard?page=${page}&limit=${limit}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
      }
      
      const data: LeaderboardResponse = await response.json()
      
      // Update state with fetched data
      setLeaderboard(data.entries)
      setCurrentPage(data.currentPage)
      setTotalPages(data.totalPages)
      setLastUpdated(data.cacheTimestamp)
      
      // Find and set the user's rank
      if (address) {
        setLoadingProgress("Finding your ranking...")
        
        // If user's rank is not in the current page, fetch all entries to find it
        if (!data.entries.some(entry => entry.address.toLowerCase() === address.toLowerCase())) {
          console.log("User not found in current page, fetching full leaderboard")
          
          const fullResponse = await fetch(`/api/leaderboard?limit=1000`)
          
          if (!fullResponse.ok) {
            throw new Error(`Failed to fetch full leaderboard: ${fullResponse.status}`)
          }
          
          const fullData = await fullResponse.json()
          const userEntry = fullData.entries.find(
            (entry: LeaderboardEntry) => entry.address.toLowerCase() === address.toLowerCase()
          )
          
          if (userEntry) {
            setUserRank(userEntry)
          } else {
            setUserRank(null)
          }
        } else {
          // User found in current page data
          const userEntry = data.entries.find(
            entry => entry.address.toLowerCase() === address.toLowerCase()
          )
          setUserRank(userEntry || null)
        }
      } else {
        setUserRank(null)
      }
    } catch (err: any) {
      console.error("Error fetching leaderboard:", err)
      setError(`${err.message || "Failed to fetch leaderboard data"}`)
      setLeaderboard([])
    } finally {
      setIsLoading(false)
    }
  }
  
  // Fetch data on initial load and when connected account changes
  useEffect(() => {
    fetchLeaderboard(currentPage)
  }, [address])
  
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      fetchLeaderboard(newPage)
    }
  }
  
  const handleRetry = () => {
    fetchLeaderboard(currentPage)
  }
  
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 leaderboard-page box-border">
      <div className="relative mb-10">
        <div className="relative mx-auto w-full max-w-xl flex justify-center mb-8">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-pixel-purple-dark border-3 border-pixel-purple-medium rotate-45"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-pixel-purple-dark border-3 border-pixel-purple-medium rotate-45"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 w-3 h-3 bg-pixel-accent rotate-45"></div>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-pixel-accent rotate-45"></div>
          <div>
            <h1 className="text-6xl font-bold font-press-start text-pixel-accent text-shadow-pixel tracking-wide">LEADERBOARD</h1>
          </div>
        </div>
        
        <div className="flex justify-center items-center gap-4 mb-8">
          {lastUpdated && (
            <div className="last-updated">
              <span className="font-vt323 text-lg">Last updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
            </div>
          )}
          <button
            onClick={() => fetchLeaderboard(currentPage)}
            className="refresh-button"
            aria-label="Refresh leaderboard"
          >
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              REFRESH
            </span>
          </button>
        </div>
      </div>
      
      {/* Not connected message */}
      {!address && !isLoading && (
        <div className="mb-10 border-2 border-gray-600 bg-gray-800 p-6 text-center shadow-pixel-md relative overflow-hidden">
          <p className="text-gray-300 font-vt323 text-2xl">Connect your wallet to see your position on the leaderboard</p>
          <div className="flex justify-center mt-4">
            <div className="px-6 py-3 bg-pixel-purple-medium text-pixel-accent font-press-start text-lg border-2 border-pixel-purple-light shadow-pixel-md inline-block cursor-pointer hover:bg-pixel-purple-dark transition-colors">
              CONNECT WALLET
            </div>
          </div>
        </div>
      )}
      
      {isLoading && (
        <div className="flex justify-center items-center min-h-[350px] border-2 border-pixel-purple-medium bg-pixel-purple-dark bg-opacity-30 p-8">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-20 w-20 border-t-4 border-b-4 border-pixel-accent rounded-none animate-spin shadow-pixel-lg"></div>
            <p className="mt-6 text-2xl font-vt323 text-pixel-accent">{loadingProgress}</p>
            <p className="mt-2 text-lg text-gray-400 font-vt323">This may take up to 15 seconds on first load</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-900 border-2 border-red-600 text-white px-6 py-5 relative mb-10 shadow-pixel-md" role="alert">
          <div className="absolute top-0 right-0 w-2 h-2 bg-red-300"></div>
          <p className="font-bold font-press-start text-red-300 mb-2 text-lg">ERROR</p>
          <p className="block sm:inline mb-4 font-vt323 text-xl">{error}</p>
          <button 
            onClick={handleRetry}
            className="mt-3 px-6 py-2.5 bg-red-600 text-white hover:bg-red-700 shadow-pixel-lg hover:shadow-pixel-md hover:translate-y-0.5 border-2 border-red-500 font-press-start text-base"
          >
            Retry
          </button>
        </div>
      )}
      
      {!isLoading && !error && leaderboard.length === 0 && (
        <div className="text-center py-16 border-4 border-pixel-purple-medium bg-pixel-purple-dark shadow-pixel-xl relative overflow-hidden">
          <p className="text-3xl mb-5 font-press-start text-pixel-accent">No leaderboard data available yet</p>
          <p className="text-xl text-gray-300 font-vt323">Be the first to mint some Lilnads and start collecting scores!</p>
          <Link href="/mint" className="mt-8 inline-block px-8 py-3 bg-pixel-accent text-black font-bold border-2 border-amber-700 shadow-pixel-lg hover:shadow-pixel-md hover:translate-y-0.5 transition-all font-press-start text-lg">
            Mint Now
          </Link>
        </div>
      )}
      
      {!isLoading && !error && leaderboard.length > 0 && (
        <div className="leaderboard-container mb-12">
          {/* Decorative pixel corner elements around the table */}
          <div className="absolute top-0 left-0 w-6 h-6 bg-pixel-accent rotate-45"></div>
          <div className="absolute top-0 right-0 w-6 h-6 bg-pixel-accent rotate-45"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 bg-pixel-accent rotate-45"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-pixel-accent rotate-45"></div>
          
          <div className="overflow-x-auto p-6 w-full box-border">
            <table className="w-full max-w-full bg-[#3b1f60] border-4 border-t-pixel-purple-light border-l-pixel-purple-light border-r-pixel-purple-dark border-b-pixel-purple-dark shadow-pixel-xl relative table-auto">
              <thead>
                <tr>
                  <th className="leaderboard-header w-1/6">RANK</th>
                  <th className="leaderboard-header w-2/5">ADDRESS</th>
                  <th className="leaderboard-header w-1/6">NFTS</th>
                  <th className="leaderboard-header w-1/4">POINTS</th>
                </tr>
              </thead>
              <tbody className="divide-y-4 divide-[#4a2980]">
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.address}
                    className={
                      `${address?.toLowerCase() === entry.address.toLowerCase() 
                        ? 'bg-purple-900 bg-opacity-80 border-l-4 border-r-4 border-pixel-accent' 
                        : 'leaderboard-row-hover'}
                      transition-colors duration-150 relative`
                    }
                  >
                    <td className="leaderboard-cell w-1/6">
                      <div className="flex items-center justify-center">
                        {entry.rank <= 3 ? (
                          <div className="relative w-14 h-14">
                            <div className={`absolute -inset-2 opacity-70 animate-pulse-slow rounded-none ${
                              entry.rank === 1 ? 'bg-yellow-300' : 
                              entry.rank === 2 ? 'bg-gray-300' : 
                              'bg-amber-700'}`}
                            ></div>
                            <span className={`rank-${entry.rank} w-14 h-14 relative z-10`}>
                              {entry.rank}
                            </span>
                          </div>
                        ) : (
                          <span className="text-white font-vt323 font-semibold w-14 h-14 inline-flex items-center justify-center text-2xl border-3 border-[#5b2db3] shadow-pixel-md">{entry.rank}</span>
                        )}
                      </div>
                    </td>
                    <td className="leaderboard-cell w-2/5">
                      {truncateAddress(entry.address)}
                      {address?.toLowerCase() === entry.address.toLowerCase() && (
                        <span className="ml-3 px-4 py-1.5 text-base bg-pixel-accent text-black border-2 border-t-yellow-400 border-l-yellow-400 border-r-amber-700 border-b-amber-700 shadow-pixel-lg font-press-start">YOU</span>
                      )}
                    </td>
                    <td className="leaderboard-cell w-1/6">
                      {entry.nftCount}
                    </td>
                    <td className="leaderboard-cell w-1/4">
                      {formatNumber(entry.collectedScore)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-10 font-vt323">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`pagination-button ${currentPage === 1 ? 'disabled' : ''}`}
              >
                PREV
              </button>
              
              <div className="text-xl text-pixel-accent px-6 py-3 bg-[#3b1f60] border-4 border-t-pixel-purple-light border-l-pixel-purple-light border-r-pixel-purple-dark border-b-pixel-purple-dark shadow-pixel-xl">
                Page {currentPage} of {totalPages}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`pagination-button ${currentPage === totalPages ? 'disabled' : ''}`}
              >
                NEXT
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 