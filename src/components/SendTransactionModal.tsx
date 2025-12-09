import { useState, useEffect } from 'react';
import { useCurrentUser, useSendUserOperation } from '@coinbase/cdp-hooks';
import { encodeFunctionData } from 'viem';
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

// ERC20 ABI for transfer function
const erc20Abi = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

function SendTransactionModal({ isOpen, onClose, onSuccess }: SendTransactionModalProps) {
  const { currentUser } = useCurrentUser();
  const { sendUserOperation, status, data, error } = useSendUserOperation();

  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Use Smart Account for gasless transactions
  const smartAccount = currentUser?.evmSmartAccounts?.[0];

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRecipientAddress('');
      setAmount('');
      setFormError(null);
    }
  }, [isOpen]);

  // Handle success - Log transaction details
  useEffect(() => {
    if (status === 'success' && data?.transactionHash) {
      const explorerUrl = `https://sepolia.basescan.org/tx/${data.transactionHash}`;

      console.log('[SEND-USDC] ================================');
      console.log('[SEND-USDC] Transaction Successful!');
      console.log('[SEND-USDC] Transaction Hash:', data.transactionHash);
      console.log('[SEND-USDC] Explorer URL:', explorerUrl);
      console.log('[SEND-USDC] ================================');

      // Call success callback but don't auto-close
      if (onSuccess) onSuccess();
    }
  }, [status, data, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!recipientAddress || !recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
      setFormError('Please enter a valid Ethereum address (0x...)');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }

    if (!smartAccount) {
      setFormError('Smart account not found. Please try logging in again.');
      return;
    }

    setFormError(null);

    try {
      console.log('[SEND-USDC] Preparing transaction...');
      console.log('[SEND-USDC] Smart Account:', smartAccount);
      console.log('[SEND-USDC] To:', recipientAddress);
      console.log('[SEND-USDC] Amount:', amountNum, 'USDC');

      // Convert amount to smallest unit (USDC has 6 decimals)
      const amountInSmallestUnit = BigInt(Math.floor(amountNum * Math.pow(10, USDC_DECIMALS)));

      // Encode ERC20 transfer function call using viem
      const transferData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipientAddress as `0x${string}`, amountInSmallestUnit],
      });

      console.log('[SEND-USDC] Transfer data:', transferData);
      console.log('[SEND-USDC] Amount in smallest unit:', amountInSmallestUnit.toString());

      // Send user operation via Smart Account (gasless with CDP Paymaster)
      await sendUserOperation({
        evmSmartAccount: smartAccount,
        network: 'base-sepolia',
        calls: [
          {
            to: USDC_ADDRESS as `0x${string}`,
            value: 0n,
            data: transferData,
          },
        ],
        useCdpPaymaster: true, // Enable gasless transactions on Base
      });

      console.log('[SEND-USDC] User operation submitted');

    } catch (err) {
      console.error('[SEND-USDC] Transaction error:', err);
      setFormError(err instanceof Error ? err.message : 'Failed to send USDC');
    }
  };

  const handleClose = () => {
    onClose();
  };

  const getExplorerUrl = (hash: string) => {
    return `https://sepolia.basescan.org/tx/${hash}`;
  };

  if (!isOpen) return null;

  const isPending = status === 'pending';
  const isSuccess = status === 'success';
  const hasError = status === 'error' || formError;

  return (
    <div className="send-modal-overlay" onClick={handleClose}>
      <div className="send-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="send-modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img
              src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png"
              alt="USDC"
              style={{ width: 24, height: 24 }}
            />
            Send USDC
          </h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        {isSuccess && data?.transactionHash ? (
          <div className="send-form">
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '1rem',
              padding: '2rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
                <Check size={64} style={{ color: '#22c55e' }} />
                <img
                  src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png"
                  alt="USDC"
                  style={{
                    position: 'absolute',
                    bottom: -8,
                    right: -8,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '2px solid rgba(0, 0, 0, 0.8)',
                    background: 'white'
                  }}
                />
              </div>
              <h3 style={{ color: '#22c55e', marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>
                Transaction Sent!
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 0 }}>
                Your USDC transfer has been submitted
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Transaction Details
              </h4>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.25rem',
                  fontWeight: 500,
                  textTransform: 'uppercase'
                }}>
                  Transaction Hash
                </label>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  color: 'var(--text-primary)'
                }}>
                  {data.transactionHash}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.25rem',
                  fontWeight: 500,
                  textTransform: 'uppercase'
                }}>
                  Block Explorer
                </label>
                <a
                  href={getExplorerUrl(data.transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    padding: '0.5rem 1rem',
                    background: 'rgba(255, 95, 0, 0.1)',
                    border: '1px solid rgba(255, 95, 0, 0.3)',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 95, 0, 0.2)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 95, 0, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 95, 0, 0.3)';
                  }}
                >
                  View on BaseScan <ExternalLink size={14} />
                </a>
              </div>

              <div style={{
                padding: '0.75rem',
                background: 'rgba(255, 149, 0, 0.1)',
                border: '1px solid rgba(255, 149, 0, 0.2)',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)'
              }}>
                💡 Tip: You can check the transaction status on the block explorer
              </div>
            </div>

            <Button
              type="button"
              onClick={handleClose}
              variant="primary"
              style={{ width: '100%' }}
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="send-form">
            <div style={{
              background: 'rgba(255, 95, 0, 0.1)',
              border: '1px solid rgba(255, 95, 0, 0.3)',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)'
            }}>
              <p style={{ margin: 0, color: 'var(--text-primary)' }}>
                🎁 <strong style={{ color: 'var(--secondary)' }}>Gasless Transaction</strong> - No ETH needed for gas fees!
              </p>
              {smartAccount && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem' }}>
                  Using Smart Account: <code style={{ color: 'var(--secondary)' }}>{smartAccount.slice(0, 10)}...{smartAccount.slice(-8)}</code>
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="recipient">Recipient Address</label>
              <input
                id="recipient"
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                disabled={isPending}
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
                disabled={isPending}
                className="amount-input"
              />
            </div>

            {isPending && (
              <div style={{
                background: 'rgba(255, 149, 0, 0.1)',
                border: '1px solid rgba(255, 149, 0, 0.3)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                color: 'var(--text-primary)'
              }}>
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--secondary)' }} />
                <span>Processing transaction...</span>
              </div>
            )}

            {hasError && (
              <div className="error-message">
                <span>❌</span> {formError || error?.message || 'Transaction failed'}
              </div>
            )}

            <div className="form-actions">
              <Button
                type="button"
                onClick={handleClose}
                variant="ghost"
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isPending || !smartAccount}
              >
                {isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send USDC'
                )}
              </Button>
            </div>

            <div className="send-info">
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img
                  src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png"
                  alt="USDC"
                  style={{ width: 16, height: 16 }}
                />
                Currency: USDC only
              </p>
              <p>🌐 Network: Base Sepolia (Testnet)</p>
              <p>⚠️ Please verify the recipient address carefully</p>
              <p>🔐 Powered by Coinbase Smart Account</p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default SendTransactionModal;
