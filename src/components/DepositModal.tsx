import { useState } from 'react';
import { authService } from '../services/authService';
import { Button } from './ui/Button';
import './DepositModal.css';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ip = "169.197.85.171";
      const result = await authService.getOnrampUrl(amountNum, 'USD', 'CARD', ip);

      // Redirect to Coinbase Onramp instead of using iframe
      window.location.href = result.onrampUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get deposit URL';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="deposit-modal-overlay" onClick={handleClose}>
      <div className="deposit-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="deposit-modal-header">
          <h2>Deposit Funds</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="deposit-form">
          <div className="form-group">
            <label htmlFor="amount">Amount (USD)</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              disabled={loading}
              className="amount-input"
              autoFocus
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
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Continue'}
            </Button>
          </div>

          <div className="deposit-info">
            <p>💳 Payment method: Card</p>
            <p>🪙 Currency: USDC</p>
            <p>🌐 Network: Base</p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DepositModal;
