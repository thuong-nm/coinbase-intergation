import { useEffect, useState } from 'react';
import { useCurrentUser, useIsSignedIn, useEvmAddress, useGetAccessToken } from '@coinbase/cdp-hooks';
import { authService } from '../services/authService';
import type { BackendAuthResponse } from '../types/auth';
import Deposit from './Deposit';
import WalletBalance from './WalletBalance';
import DepositModal from './DepositModal';
import SendTransactionModal from './SendTransactionModal';
import TransactionHistory from './TransactionHistory';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import './WalletInfo.css';

function WalletInfo() {
  const { currentUser: _user } = useCurrentUser();
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress } = useEvmAddress();
  const { getAccessToken } = useGetAccessToken();
  const [backendAuth, setBackendAuth] = useState<BackendAuthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);

  useEffect(() => {
    const authenticate = async () => {
      if (isSignedIn) {
        const token = await getAccessToken();
        if (token) {
          authenticateWithBackend(token);
        }
      } else {
        setBackendAuth(null);
        setError(null);
      }
    };
    authenticate();
  }, [isSignedIn, getAccessToken]);

  const authenticateWithBackend = async (token: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.verifyCoinbaseToken(token);
      setBackendAuth(response);

      // Store backend token in localStorage
      localStorage.setItem('backend_access_token', response.accessToken);
      localStorage.setItem('backend_refresh_token', response.refreshToken);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear backend tokens
    localStorage.removeItem('backend_access_token');
    localStorage.removeItem('backend_refresh_token');
    setBackendAuth(null);
    setError(null);
  };

  const copyToken = async () => {
    if (backendAuth?.accessToken) {
      await navigator.clipboard.writeText(backendAuth.accessToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const copyWalletAddress = async () => {
    if (backendAuth?.user.walletAddress) {
      await navigator.clipboard.writeText(backendAuth.user.walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const truncateToken = (token: string, startChars = 10, endChars = 10) => {
    if (token.length <= startChars + endChars) return token;
    return `${token.substring(0, startChars)}...${token.substring(token.length - endChars)}`;
  };

  if (!isSignedIn) {
    return (
      <Card className="welcome-card">
        <h2 className="welcome-title">👋 Welcome!</h2>
        <p className="welcome-text">Please authenticate with Coinbase to continue</p>
      </Card>
    );
  }

  return (
    <>
      <div className="wallet-info-container">
        <Card variant="neon" style={{ padding: '1.5rem' }}>
          <h2 className="auth-header">
            <span style={{ fontSize: '1.5em' }}>🎉</span> Authenticated!
          </h2>

          <div className="section-wrapper">
            <div className="info-section">
              <h3 className="section-title">Coinbase Wallet</h3>
              <div className="info-row">
                <span className="label">Address:</span>
                <span className="value-box">
                  {evmAddress || 'Loading...'}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Authenticated:</span>
                <span className="badge">
                  <Check size={14} /> Signed In
                </span>
              </div>
            </div>

            <div className="info-section">
              <h3 className="section-title secondary">Backend Authentication</h3>

              {loading && (
                <div className="loading-box">
                  <Loader2 className="spinner" size={20} />
                  Authenticating with backend...
                </div>
              )}

              {error && (
                <div className="error-box">
                  <AlertCircle size={20} />
                  <div>
                    <strong style={{ display: 'block' }}>Error</strong>
                    {error}
                  </div>
                </div>
              )}

              {backendAuth && (
                <div className="success-box">
                  <div className="success-header">
                    <Check size={20} />
                    <strong>Backend Connected!</strong>
                  </div>

                  <div className="grid-2-cols">
                    <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span className="label" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Wallet Address</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <span className="value-box" style={{ background: 'none', padding: 0 }}>{truncateToken(backendAuth.user.walletAddress, 6, 4)}</span>
                        <button onClick={copyWalletAddress} className={`copy-btn ${copiedAddress ? 'copied' : ''}`}>
                          {copiedAddress ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span className="label" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Access Token</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <span className="value-box" style={{ background: 'none', padding: 0 }} title={backendAuth.accessToken}>
                          {truncateToken(backendAuth.accessToken)}
                        </span>
                        <button onClick={copyToken} className={`copy-btn ${copiedToken ? 'copied' : ''}`}>
                          {copiedToken ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>

                    {backendAuth.user.walletProvider && (
                      <div className="info-row" style={{ display: 'block' }}>
                        <span className="label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Provider</span>
                        <span className="badge" style={{ background: 'rgba(255, 105, 180, 0.2)', color: 'var(--secondary)' }}>
                          {backendAuth.user.walletProvider}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <WalletBalance triggerRefresh={balanceRefreshKey} />

        <div className="action-buttons">
          <Button
            variant="primary"
            onClick={() => setIsDepositModalOpen(true)}
            disabled={!backendAuth}
          >
            💰 Deposit
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsSendModalOpen(true)}
            disabled={!backendAuth}
          >
            📤 Send
          </Button>
        </div>
      </div>

      <Deposit />

      <TransactionHistory network="base-sepolia" />

      {/* Sign out button at the bottom */}
      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="secondary"
          onClick={handleLogout}
          style={{ minWidth: '200px' }}
        >
          🚪 Sign Out
        </Button>
      </div>

      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
      />

      <SendTransactionModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        onSuccess={() => {
          // Refresh balance after successful transaction without reloading page
          setBalanceRefreshKey(prev => prev + 1);
        }}
      />
    </>
  );
}

export default WalletInfo;
