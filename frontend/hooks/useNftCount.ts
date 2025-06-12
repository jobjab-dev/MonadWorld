import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

export function useNftCount() {
  const { isConnected, address } = useAccount();
  const [nftCount, setNftCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchNftCount = async () => {
      if (!isConnected || !address) {
        setNftCount(0);
        return;
      }

      setIsLoading(true);
      try {
        // TODO: Replace with actual contract call
        // For now, simulate API call
        const response = await fetch(`/api/nfts/${address}/count`);
        if (response.ok) {
          const data = await response.json();
          setNftCount(data.count || 0);
        } else {
          setNftCount(0);
        }
      } catch (error) {
        console.error('Error fetching NFT count:', error);
        setNftCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    if (isMounted) {
      fetchNftCount();
    }
  }, [isConnected, address, isMounted]);

  return {
    nftCount,
    isLoading,
    isMounted
  };
}