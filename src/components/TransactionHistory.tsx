import { useState, useEffect, useCallback } from 'react';
import { useEvmAddress } from '@coinbase/cdp-hooks';
import { authService } from '../services/authService';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { RefreshCw, ExternalLink, AlertCircle, Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import './TransactionHistory.css';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  blockNumber: number;
  type: 'send' | 'receive';
  tokenSymbol?: string;
  tokenAmount?: string;
  status: 'success' | 'failed' | 'pending';
}

type NetworkType = 'base-sepolia' | 'base-mainnet';
type TransactionType = 'all' | 'deposit' | 'withdraw' | 'invest' | 'reward' | 'refund';

interface TransactionHistoryProps {
  network?: NetworkType;
}

function TransactionHistory({ network = 'base-sepolia' }: TransactionHistoryProps) {
  const { evmAddress } = useEvmAddress();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TransactionType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const pageSize = 25;

  const getExplorerUrl = useCallback((hash: string) => {
    const baseUrl = network === 'base-mainnet'
      ? 'https://basescan.org'
      : 'https://sepolia.basescan.org';
    return `${baseUrl}/tx/${hash}`;
  }, [network]);

  const getAddressExplorerUrl = useCallback((address: string) => {
    const baseUrl = network === 'base-mainnet'
      ? 'https://basescan.org'
      : 'https://sepolia.basescan.org';
    return `${baseUrl}/address/${address}`;
  }, [network]);

  const fetchTransactionHistory = useCallback(async (page: number = 1, type?: TransactionType) => {
    if (!evmAddress) return;

    console.log('[TX-HISTORY] ========================================');
    console.log('[TX-HISTORY] Fetching from Backend API');
    console.log('[TX-HISTORY] Address:', evmAddress);
    console.log('[TX-HISTORY] Type filter:', type || 'all');
    console.log('[TX-HISTORY] Page:', page);

    setLoading(true);
    setError(null);

    try {
      // Fetch transaction history from backend with type filter
      const result = await authService.getTransactionHistory({
        type: type && type !== 'all' ? type : undefined,
        page,
        take: pageSize,
        sortBy: 'createdAt',
        order: 'DESC',
      });

      console.log(`[TX-HISTORY] Found ${result.data.length} transactions from backend`);
      console.log(`[TX-HISTORY] Total: ${result.total}, Page: ${result.page}`);

      const txs: Transaction[] = [];

      // Process backend results
      for (const tx of result.data) {
        // Determine transaction type based on backend data
        // Map backend type to UI type (send/receive)
        let uiType: 'send' | 'receive' = 'send';
        if (tx.type === 'withdraw') {
          uiType = 'send';
        } else if (tx.type === 'deposit' || tx.type === 'reward' || tx.type === 'refund') {
          uiType = 'receive';
        }

        // Parse amount - backend should provide formatted amount
        const amount = tx.amount ? parseFloat(tx.amount) : 0;

        // Parse timestamp - backend should provide Unix timestamp or ISO string
        let timestamp: number;
        if (typeof tx.timestamp === 'number') {
          timestamp = tx.timestamp;
        } else if (typeof tx.createdAt === 'string') {
          timestamp = Math.floor(new Date(tx.createdAt).getTime() / 1000);
        } else {
          timestamp = Math.floor(Date.now() / 1000);
        }

        txs.push({
          hash: tx.transactionHash || tx.hash || '',
          from: tx.from || tx.fromAddress || '',
          to: tx.to || tx.toAddress || '',
          value: amount.toString(),
          timestamp: timestamp,
          blockNumber: tx.blockNumber || 0,
          type: uiType,
          tokenSymbol: tx.tokenSymbol || 'USDC',
          tokenAmount: amount.toFixed(2),
          status: tx.status || 'success',
        });
      }

      console.log(`[TX-HISTORY] Processed ${txs.length} transactions`);
      if (txs.length > 0) {
        console.log('[TX-HISTORY] Sample:', txs.slice(0, 3).map(t => ({
          hash: t.hash.slice(0, 10) + '...',
          type: t.type,
          amount: t.tokenAmount
        })));
      }

      setTransactions(txs);
      setTotalTransactions(result.total);
      setTotalPages(Math.ceil(result.total / pageSize));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transaction history';

      console.error('[TX-HISTORY] Error:', errorMessage);

      // If no backend token, show friendly message
      if (errorMessage.includes('Backend token not found')) {
        setError('Please authenticate to view transaction history');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [evmAddress, pageSize]);

  useEffect(() => {
    if (evmAddress) {
      setCurrentPage(1);
      fetchTransactionHistory(1, activeTab);
    }
  }, [evmAddress, activeTab, fetchTransactionHistory]);

  const handleRefresh = () => {
    setCurrentPage(1);
    fetchTransactionHistory(1, activeTab);
  };

  const handleTabChange = (tab: TransactionType) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchTransactionHistory(newPage, activeTab);
  };

  const transactionTabs: { label: string; value: TransactionType; icon: string }[] = [
    { label: 'All', value: 'all', icon: '📋' },
    { label: 'Deposit', value: 'deposit', icon: '💰' },
    { label: 'Withdraw', value: 'withdraw', icon: '📤' },
    { label: 'Invest', value: 'invest', icon: '📈' },
    { label: 'Reward', value: 'reward', icon: '🎁' },
    { label: 'Refund', value: 'refund', icon: '↩️' },
  ];

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (!evmAddress) {
    return (
      <Card className="transaction-history-card">
        <h2 className="history-title">Transaction History</h2>
        <p className="text-secondary" style={{ marginTop: '0.5rem' }}>Please connect your wallet first</p>
      </Card>
    );
  }

  return (
    <Card className="transaction-history-card">
      <div className="history-header">
        <h2 className="history-title">Transaction History</h2>
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

      <div className="network-badge">
        <span className="badge-label">Network:</span>
        <span className="badge-value">
          {network === 'base-mainnet' ? 'Base Mainnet' : 'Base Sepolia'}
        </span>
      </div>

      {/* Transaction Type Tabs */}
      <div className="transaction-tabs">
        {transactionTabs.map((tab) => (
          <button
            key={tab.value}
            className={`tab-button ${activeTab === tab.value ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.value)}
            disabled={loading}
          >
            <span style={{ marginRight: '0.5rem' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && transactions.length === 0 && (
        <div className="loading-container">
          <Loader2 size={32} className="animate-spin" />
          <p>Loading transactions...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && transactions.length > 0 && (
        <>
          <div className="transactions-list">
            {transactions.map((tx) => (
              <div key={tx.hash} className={`transaction-item ${tx.type}`}>
                <div className="tx-icon">
                  {tx.type === 'send' ? (
                    <ArrowUpRight size={20} className="icon-send" />
                  ) : (
                    <ArrowDownLeft size={20} className="icon-receive" />
                  )}
                </div>

                <div className="tx-details">
                  <div className="tx-row">
                    <div className="tx-type-container">
                      <span className="tx-type">
                        {tx.type === 'send' ? 'Sent' : 'Received'}
                      </span>
                      {tx.tokenAmount && (
                        <span className={`tx-amount ${tx.type}`}>
                          {tx.type === 'send' ? '-' : '+'}{tx.tokenAmount} {tx.tokenSymbol}
                        </span>
                      )}
                    </div>
                    <span className={`tx-status status-${tx.status}`}>
                      {tx.status}
                    </span>
                  </div>

                  <div className="tx-row">
                    <span className="tx-address">
                      {tx.type === 'send' ? 'To: ' : 'From: '}
                      <a
                        href={getAddressExplorerUrl(tx.type === 'send' ? tx.to : tx.from)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="address-link"
                      >
                        {formatAddress(tx.type === 'send' ? tx.to : tx.from)}
                      </a>
                    </span>
                    <span className="tx-date">{formatDate(tx.timestamp)}</span>
                  </div>

                  <div className="tx-row">
                    <a
                      href={getExplorerUrl(tx.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-hash-link"
                    >
                      {formatAddress(tx.hash)} <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">
                Page {currentPage} of {totalPages} • {totalTransactions} total transactions
              </div>
              <div className="pagination-buttons">
                <button
                  className="pagination-button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  ← Previous
                </button>
                <button
                  className="pagination-button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !error && transactions.length === 0 && (
        <div className="empty-state">
          <p>No transactions found</p>
          <p className="text-secondary">Transactions will appear here once you send or receive tokens</p>
        </div>
      )}
    </Card>
  );
}

export default TransactionHistory;
