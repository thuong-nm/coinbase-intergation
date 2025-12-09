import { useState, useEffect } from 'react';
import { useGetAccessToken, useCurrentUser } from '@coinbase/cdp-hooks';
import { SendEvmTransactionButton } from '@coinbase/cdp-react';
import { authService } from '../services/authService';
import { Button } from './ui/Button';
import { Loader2, Check, ExternalLink } from 'lucide-react';
import './SendTransactionModal.css';

interface SendTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// USDC contract address on Base Sepolia (Testnet)
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const USDC_DECIMALS = 6;
const BASE_SEPOLIA_CHAIN_ID = 84532;

function SendTransactionModal({ isOpen, onClose, onSuccess }: SendTransactionModalProps) {
  const { getAccessToken } = useGetAccessToken();
  const { currentUser } = useCurrentUser();
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [validationData, setValidationData] = useState<any>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [success, setSuccess] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string>('');

  // Use regular EVM account (EOA), NOT smart account
  // SendEvmTransactionButton requires EOA for signing
  const evmAddress = currentUser?.evmAccounts?.[0];

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRecipientAddress('');
      setAmount('');
      setError(null);
      setValidating(false);
      setValidated(false);
      setValidationData(null);
      setTransaction(null);
      setSuccess(false);
      setTransactionHash('');
    }
  }, [isOpen]);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!recipientAddress || !recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
      setError('Please enter a valid Ethereum address (0x...)');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (!evmAddress) {
      setError('Wallet account not found. Please try logging in again.');
      return;
    }

    setError(null);
    setValidating(true);

    try {
      // Get Coinbase access token
      const coinbaseAccessToken = await getAccessToken();
      if (!coinbaseAccessToken) {
        throw new Error('Failed to get Coinbase access token');
      }

      console.log('[SEND-USDC] Step 1: Validating transaction with backend');

      // Validate transaction with backend
      const validationResult = await authService.sendUSDC({
        accessToken: coinbaseAccessToken,
        destinationAddress: recipientAddress,
        amount: amountNum,
      });

      console.log('[SEND-USDC] Step 2: Validation successful:', validationResult);

      if (!validationResult.data) {
        throw new Error('Invalid validation response from backend');
      }

      setValidationData(validationResult.data);

      // Build ERC20 transfer transaction
      const amountInSmallestUnit = BigInt(Math.floor(amountNum * Math.pow(10, USDC_DECIMALS)));
      const transferFunctionSignature = '0xa9059cbb';
      const paddedRecipient = recipientAddress.slice(2).padStart(64, '0');
      const paddedAmount = amountInSmallestUnit.toString(16).padStart(64, '0');
      const data = `${transferFunctionSignature}${paddedRecipient}${paddedAmount}` as `0x${string}`;

      const tx = {
        to: USDC_ADDRESS as `0x${string}`,
        value: 0n,
        data: data,
        chainId: BASE_SEPOLIA_CHAIN_ID,
        type: 'eip1559' as const,
      };

      console.log('[SEND-USDC] Step 3: Transaction prepared:', tx);

      setTransaction(tx);
      setValidated(true);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate transaction';
      console.error('[SEND-USDC] Validation error:', err);
      setError(errorMessage);
    } finally {
      setValidating(false);
    }
  };

  const handleTransactionSuccess = (txHash: string) => {
    console.log('[SEND-USDC] Transaction successful! Hash:', txHash);
    setTransactionHash(txHash);
    setSuccess(true);

    // Auto close after 5 seconds
    setTimeout(() => {
      handleClose();
      if (onSuccess) onSuccess();
    }, 5000);
  };

  const handleTransactionError = (err: Error) => {
    console.error('[SEND-USDC] Transaction error:', err);
    setError(err.message || 'Failed to send transaction');
    setValidated(false);
    setTransaction(null);
  };

  const handleClose = () => {
    onClose();
  };

  const handleBack = () => {
    setValidated(false);
    setTransaction(null);
    setError(null);
  };

  const getExplorerUrl = (hash: string) => {
    return `https://sepolia.basescan.org/tx/${hash}`;
  };

  if (!isOpen) return null;

  return (
    <div className="send-modal-overlay" onClick={handleClose}>
      <div className="send-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="send-modal-header">
          <h2>Send USDC</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        {success ? (
          <div className="send-form" style={{ textAlign: 'center' }}>
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: '1rem',
              padding: '2rem',
              marginBottom: '1.5rem'
            }}>
              <Check size={64} style={{ color: '#22c55e', margin: '0 auto 1rem' }} />
              <h3 style={{ color: '#22c55e', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
                Transaction Sent!
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Your USDC transfer has been submitted
              </p>
            </div>

            {transactionHash && (
              <a
                href={getExplorerUrl(transactionHash)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  marginBottom: '1rem'
                }}
              >
                View on Base Sepolia Explorer <ExternalLink size={16} />
              </a>
            )}

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Closing automatically...
            </p>
          </div>
        ) : validated && transaction && evmAddress ? (
          <div className="send-form">
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Confirm Transaction
              </h3>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong>From:</strong> {evmAddress.slice(0, 10)}...{evmAddress.slice(-8)}
                </p>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong>To:</strong> {recipientAddress.slice(0, 10)}...{recipientAddress.slice(-8)}
                </p>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong>Amount:</strong> {amount} USDC
                </p>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong>Network:</strong> Base Sepolia (Testnet)
                </p>
              </div>
            </div>

            {error && (
              <div className="error-message" style={{ marginBottom: '1rem' }}>
                <span>❌</span> {error}
              </div>
            )}

            <div className="form-actions">
              <Button
                type="button"
                onClick={handleBack}
                variant="ghost"
              >
                Back
              </Button>

              <SendEvmTransactionButton
                account={evmAddress}
                network="base-sepolia"
                transaction={transaction}
                onSuccess={handleTransactionSuccess}
                onError={handleTransactionError}
                pendingLabel="Sending..."
              >
                Confirm & Send
              </SendEvmTransactionButton>
            </div>

            <div className="send-info">
              <p>⚠️ Please review the details carefully before confirming</p>
              <p>🔐 Your transaction will be signed securely by Coinbase</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleValidate} className="send-form">
            <div className="form-group">
              <label htmlFor="recipient">Recipient Address</label>
              <input
                id="recipient"
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                disabled={validating}
                className="address-input"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="amount">Amount (USDC)</label>
              <input
                id="amount"
                type="number"
                step="0.000001"
                min="0.000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={validating}
                className="amount-input"
              />
            </div>

            {error && (
              <div className="error-message">
                <span>❌</span> {error}
              </div>
            )}

            <div className="form-actions">
              <Button
                type="button"
                onClick={handleClose}
                variant="ghost"
                disabled={validating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={validating}
              >
                {validating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>

            <div className="send-info">
              <p>💰 Currency: USDC only</p>
              <p>🌐 Network: Base Sepolia (Testnet)</p>
              <p>⚠️ Please verify the recipient address carefully</p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default SendTransactionModal;
