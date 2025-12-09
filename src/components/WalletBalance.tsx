import { useState, useEffect, useCallback } from 'react';
import { useEvmAddress } from '@coinbase/cdp-hooks';
import {
  formatBalance,
  parseERC20Balance,
  weiToEth,
  shortenAddress,
  getTokenIcon,
  sortBalancesByValue
} from '../utils/balanceUtils';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import './WalletBalance.css';

interface TokenBalance {
  symbol: string;
  balance: string;
  decimals: number;
  usdValue?: string;
}

type NetworkType = 'base-sepolia' | 'base-mainnet' | 'ethereum-sepolia' | 'ethereum-mainnet';

function WalletBalance() {
  const { evmAddress } = useEvmAddress();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkType>('base-sepolia');

  // ... helpers using useCallback ...
  const getRpcUrl = useCallback((network: string): string => {
    const rpcUrls: Record<string, string> = {
      'base-sepolia': 'https://sepolia.base.org',
      'base-mainnet': 'https://mainnet.base.org',
      'ethereum-sepolia': 'https://ethereum-sepolia-rpc.publicnode.com',
      'ethereum-mainnet': 'https://ethereum-rpc.publicnode.com',
    };
    return rpcUrls[network] || rpcUrls['base-sepolia'];
  }, []);

  const getTokenAddresses = useCallback((network: string): Array<{ address: string; symbol: string; decimals: number }> => {
    const tokensByNetwork: Record<string, Array<{ address: string; symbol: string; decimals: number }>> = {
      'base-sepolia': [
        { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', symbol: 'USDC', decimals: 6 },
      ],
      'base-mainnet': [
        { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6 },
        { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', symbol: 'DAI', decimals: 18 },
      ],
      'ethereum-sepolia': [
        { address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', symbol: 'USDC', decimals: 6 },
      ],
      'ethereum-mainnet': [
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
        { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', decimals: 18 },
        { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
      ],
    };
    return tokensByNetwork[network] || [];
  }, []);

  const fetchNativeBalance = useCallback(async (address: string, network: string): Promise<TokenBalance> => {
    try {
      const rpcUrl = getRpcUrl(network);
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const balanceEth = weiToEth(data.result);
      const formattedBalance = formatBalance(balanceEth, 6);
      return { symbol: 'ETH', balance: formattedBalance, decimals: 18 };
    } catch (_error) {
      return { symbol: 'ETH', balance: '0', decimals: 18 };
    }
  }, [getRpcUrl]);

  const fetchTokenBalances = useCallback(async (address: string, network: string): Promise<TokenBalance[]> => {
    try {
      const tokens = getTokenAddresses(network);
      const rpcUrl = getRpcUrl(network);

      const balancePromises = tokens.map(async (token) => {
        try {
          const data = `0x70a08231000000000000000000000000${address.slice(2)}`;
          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{ to: token.address, data: data }, 'latest'],
              id: 1,
            }),
          });
          const result = await response.json();
          if (result.error || !result.result || result.result === '0x') return null;

          const balance = parseERC20Balance(result.result, token.decimals);
          if (parseFloat(balance) > 0) {
            return {
              symbol: token.symbol,
              balance: formatBalance(balance, 6),
              decimals: token.decimals,
            };
          }
          return null;
        } catch { return null; }
      });

      const results = await Promise.all(balancePromises);
      return results.filter((b): b is TokenBalance => b !== null);
    } catch { return []; }
  }, [getRpcUrl, getTokenAddresses]);

  const fetchBalances = useCallback(async () => {
    if (!evmAddress) return;
    setLoading(true);
    setError(null);
    try {
      const nativeBalance = await fetchNativeBalance(evmAddress, network);
      const tokenBalances = await fetchTokenBalances(evmAddress, network);
      const allBalances = sortBalancesByValue([nativeBalance, ...tokenBalances]);
      setBalances(allBalances);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setLoading(false);
    }
  }, [evmAddress, network, fetchNativeBalance, fetchTokenBalances]);

  useEffect(() => {
    if (evmAddress) fetchBalances();
  }, [evmAddress, network, fetchBalances]);

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNetwork(e.target.value as NetworkType);
  };

  const handleRefresh = () => fetchBalances();

  if (!evmAddress) {
    return (
      <Card className="wallet-balance-card">
        <h2 className="balance-title">Wallet Balance</h2>
        <p className="text-secondary" style={{ marginTop: '0.5rem' }}>Please connect your wallet first</p>
      </Card>
    );
  }

  return (
    <Card className="wallet-balance-card">
      <div className="balance-header">
        <h2 className="balance-title">Wallet Balance</h2>
        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="refresh-btn"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Refresh
        </Button>
      </div>

      <div className="network-selector">
        <label htmlFor="balance-network" className="network-label">Network:</label>
        <select
          id="balance-network"
          value={network}
          onChange={handleNetworkChange}
          className="network-select"
          disabled={loading}
        >
          <option value="base-sepolia">Base Sepolia (Testnet)</option>
          <option value="base-mainnet">Base Mainnet</option>
          <option value="ethereum-sepolia">Ethereum Sepolia (Testnet)</option>
          <option value="ethereum-mainnet">Ethereum Mainnet</option>
        </select>
      </div>

      {loading && balances.length === 0 && (
        <div className="loading-container">
          <Loader2 size={32} className="animate-spin" />
          <p>Loading balances...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && balances.length > 0 && (
        <div className="balances-list">
          {balances.map((token, index) => (
            <div key={index} className="balance-item">
              <div className="token-info">
                <span className="token-icon">{getTokenIcon(token.symbol)}</span>
                <div className="token-details">
                  <span className="token-symbol">{token.symbol}</span>
                  <span className="token-network">{network}</span>
                </div>
              </div>
              <div className="balance-values">
                <span className="balance-amount">{token.balance}</span>
                {token.usdValue && (
                  <span className="balance-usd">${token.usdValue}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && balances.length === 0 && (
        <div className="empty-state">
          <p>No balances found on {network}</p>
          <p>Try switching networks or add some tokens</p>
        </div>
      )}

      <div className="footer-info">
        <p>
          Showing balances for address: <code className="address-pill">{shortenAddress(evmAddress)}</code>
        </p>
      </div>
    </Card>
  );
}

export default WalletBalance;
