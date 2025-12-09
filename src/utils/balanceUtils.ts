export function formatBalance(balance: string, decimals: number): string {
  const num = parseFloat(balance);
  if (isNaN(num)) return '0';
  return num.toFixed(decimals);
}

export function parseERC20Balance(hexBalance: string, decimals: number): string {
  // Remove 0x prefix
  const hex = hexBalance.startsWith('0x') ? hexBalance.slice(2) : hexBalance;

  // Convert hex to BigInt
  const balance = BigInt('0x' + hex);

  // Convert to decimal string with proper decimals
  const divisor = BigInt(10 ** decimals);
  const integerPart = balance / divisor;
  const fractionalPart = balance % divisor;

  // Pad fractional part with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');

  // Combine and parse as float
  const result = `${integerPart}.${fractionalStr}`;
  return result;
}

export function weiToEth(weiHex: string): string {
  return parseERC20Balance(weiHex, 18);
}

export function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getTokenIcon(symbol: string): string {
  const icons: Record<string, string> = {
    ETH: '⟠',
    USDC: '💵',
    DAI: '💰',
    USDT: '💵',
    WETH: '⟠',
    MATIC: '🔷',
    WMATIC: '🔷',
  };
  return icons[symbol] || '🪙';
}

export function sortBalancesByValue(balances: Array<{ symbol: string; balance: string; decimals: number; usdValue?: string }>): Array<{ symbol: string; balance: string; decimals: number; usdValue?: string }> {
  return balances.sort((a, b) => {
    const aVal = parseFloat(a.balance);
    const bVal = parseFloat(b.balance);
    return bVal - aVal;
  });
}
