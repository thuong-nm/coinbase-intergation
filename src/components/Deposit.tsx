import { useState, useEffect } from 'react';
import { useEvmAddress } from '@coinbase/cdp-hooks';
import { depositService, type DepositAddressResponse } from '../services/depositService';
import { Button } from './ui/Button';
import './Deposit.css';

type NetworkOption = 'base-sepolia' | 'ethereum-sepolia' | 'base-mainnet' | 'ethereum-mainnet';
type CurrencyOption = 'ETH' | 'USDC' | 'USDT';

function Deposit() {
  const { evmAddress } = useEvmAddress();
  const [network, setNetwork] = useState<NetworkOption>('base-sepolia');
  const [currency, setCurrency] = useState<CurrencyOption>('ETH');
  const [depositInfo, setDepositInfo] = useState<DepositAddressResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (evmAddress) {
      generateDepositAddress();
    }
  }, [evmAddress, network, currency]);

  const generateDepositAddress = async () => {
    if (!evmAddress) {
      setError('Wallet address not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const info = await depositService.generateDepositAddress(evmAddress, network, currency);
      const qrCodeUrl = depositService.generateQRCode(info.address, undefined, currency);

      setDepositInfo({
        ...info,
        qrCodeUrl,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate deposit address';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!depositInfo?.address) return;

    try {
      await navigator.clipboard.writeText(depositInfo.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silent fail
    }
  };

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNetwork(e.target.value as NetworkOption);
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrency(e.target.value as CurrencyOption);
  };

  if (!evmAddress) {
    return (
      <div className="deposit-container">
        <div className="deposit-card">
          <h2>Deposit Funds</h2>
          <p className="warning">Please connect your wallet first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="deposit-container">
      <div className="deposit-card">
        <h2>Deposit Funds</h2>
        <p className="deposit-description">
          Send {currency} to your wallet address on {network}
        </p>

        <div className="deposit-settings">
          <div className="form-group">
            <label htmlFor="network">Network</label>
            <select
              id="network"
              value={network}
              onChange={handleNetworkChange}
              className="select-input"
            >
              <option value="base-sepolia">Base Sepolia (Testnet)</option>
              <option value="base-mainnet">Base Mainnet</option>
              <option value="ethereum-sepolia">Ethereum Sepolia (Testnet)</option>
              <option value="ethereum-mainnet">Ethereum Mainnet</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="currency">Currency</label>
            <select
              id="currency"
              value={currency}
              onChange={handleCurrencyChange}
              className="select-input"
            >
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="loading-state">
            <span className="spinner"></span>
            <p>Generating deposit address...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <span>❌</span>
            <p>{error}</p>
          </div>
        )}

        {depositInfo && !loading && (
          <div className="deposit-info">
            <div className="address-section">
              <label>Deposit Address</label>
              <div className="address-display">
                <code className="address-text">{depositInfo.address}</code>
                <button
                  onClick={copyToClipboard}
                  className={`copy-btn ${copied ? 'copied' : ''}`}
                  title="Copy address"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
              {copied && <span className="copy-feedback">Copied!</span>}
            </div>

            <div className="qr-section">
              <Button
                onClick={() => setShowQR(!showQR)}
                variant="secondary"
                size="sm"
              >
                {showQR ? 'Hide QR Code' : 'Show QR Code'}
              </Button>

              {showQR && depositInfo.qrCodeUrl && (
                <div className="qr-code">
                  <img src={depositInfo.qrCodeUrl} alt="Deposit QR Code" />
                  <p className="qr-caption">Scan to deposit</p>
                </div>
              )}
            </div>

            <div className="warning-box">
              <h4>⚠️ Important</h4>
              <ul>
                <li>Only send {currency} on {network} network</li>
                <li>Sending other tokens or using wrong network may result in loss of funds</li>
                <li>Minimum deposit amount may apply</li>
                <li>Deposits typically take 1-5 minutes to confirm</li>
              </ul>
            </div>

            <div className="network-info">
              <div className="info-row">
                <span className="info-label">Network:</span>
                <span className="info-value badge">{depositInfo.network}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Currency:</span>
                <span className="info-value badge">{depositInfo.currency}</span>
              </div>
            </div>
          </div>
        )}

        <div className="deposit-actions">
          <Button
            onClick={generateDepositAddress}
            variant="primary"
            disabled={loading}
          >
            Refresh Address
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Deposit;
