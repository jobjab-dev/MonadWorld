import useSWR from 'swr'

export interface EnhancedNftData {
  tokenId: string;
  rank: number;
  metadataUri: string;
  startTimestamp: string;
  expirationTimestamp: string;
  isDead: boolean;
  scorePerSecond: string;
  collectableNow: string;
  errorFetchingOnChainData?: boolean;
  errorMessage?: string;
}

interface NftApiResponse {
  data: EnhancedNftData[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  message?: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useOwnedNfts(address?: string, page: number = 1) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const key = address && apiBaseUrl
    ? `${apiBaseUrl}/api/nfts/owner/${address}?page=${page}&limit=20`
    : null
  const { data, error, isLoading } = useSWR<NftApiResponse>(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  return {
    nfts: data?.data ?? [],
    totalPages: data?.totalPages ?? 0,
    totalItems: data?.totalItems ?? 0,
    isLoading: Boolean(isLoading && !error),
    error: error ? (error as Error).message : null,
  }
} 