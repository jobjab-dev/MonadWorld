export function truncateAddress(address: string, length: number = 4): string {
  if (!address || address.length < length * 2 + 2) return address
  return `${address.slice(0, length + 2)}...${address.slice(-length)}`
} 