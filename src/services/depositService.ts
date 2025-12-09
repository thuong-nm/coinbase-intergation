// Note: CDP SDK is designed for server-side use with Node.js
// For browser applications, use the Coinbase CDP React hooks or call backend APIs
// This service provides both client-side (browser) and server-side (with CDP SDK) methods

// IMPORTANT: This service uses REGULAR EVM ACCOUNTS (EOA - Externally Owned Accounts)
// NOT Smart Accounts. Regular accounts are simpler and more cost-effective.
// See ACCOUNT_TYPES_COMPARISON.md for details.

// Type definitions for CDP SDK (without importing the actual SDK in browser)
export type EvmServerAccount = {
  address: string; // Regular EOA address (not smart account)
  name?: string;
};

export type CdpClientType = any; // Placeholder for CDP Client type

export interface DepositAddressResponse {
  address: string;
  network: string;
  currency: string;
  qrCodeUrl?: string;
}

export interface DepositTransactionStatus {
  transactionHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations?: number;
  amount?: string;
  currency?: string;
  timestamp?: string;
}

export interface WalletBalance {
  currency: string;
  amount: string;
  decimals?: number;
}

class DepositService {
  private cdpClient: CdpClientType | null = null;
  private  isBrowser = typeof window !== 'undefined';

  /**
   * Initialize CDP SDK with API credentials (Server-side only)
   * Note: CDP SDK requires Node.js environment and should be used on backend
   * For browser apps, use backend API endpoints instead
   */
  async initializeCDP(apiKeyId?: string, apiKeySecret?: string, walletSecret?: string): Promise<void> {
    if (this.isBrowser) {
      return;
    }

    try {
      // Only load CDP SDK on server-side
      const { CdpClient } = await import('@coinbase/cdp-sdk');

      if (!apiKeyId || !apiKeySecret || !walletSecret) {
        return;
      }

      this.cdpClient = new CdpClient({
        apiKeyId,
        apiKeySecret,
        walletSecret,
      });

    } catch (error) {
      throw new Error('Failed to initialize CDP SDK');
    }
  }

  /**
   * Get CDP client instance
   */
  getCdpClient(): CdpClientType | null {
    return this.cdpClient;
  }
  /**
   * Generate a deposit address for the user's wallet
   * @param network - Network to deposit to (e.g., 'base-sepolia', 'ethereum-mainnet')
   * @param currency - Currency to deposit (e.g., 'ETH', 'USDC')
   */
  async generateDepositAddress(
    walletAddress: string,
    network: string = 'base-sepolia',
    currency: string = 'ETH'
  ): Promise<DepositAddressResponse> {
    try {
      // For Coinbase embedded wallets, the deposit address is typically the wallet address itself
      // You can customize this based on your requirements

      return {
        address: walletAddress,
        network,
        currency,
      };
    } catch (error) {
      throw new Error('Failed to generate deposit address');
    }
  }

  /**
   * Monitor deposit transaction status
   * @param transactionHash - Transaction hash to monitor
   * @param _network - Network where transaction occurred (reserved for future use)
   */
  async monitorDepositTransaction(
    transactionHash: string,
    _network: string = 'base-sepolia'
  ): Promise<DepositTransactionStatus> {
    try {
      // This is a placeholder - you would integrate with your backend
      // or use Coinbase APIs to monitor transaction status

      // Example implementation would call your backend API
      const response = await fetch(`/api/deposits/status/${transactionHash}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('backend_access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transaction status');
      }

      const data = await response.json();

      return {
        transactionHash,
        status: data.status || 'pending',
        confirmations: data.confirmations,
        amount: data.amount,
        currency: data.currency,
        timestamp: data.timestamp,
      };
    } catch (error) {
      // Return pending status if monitoring fails
      return {
        transactionHash,
        status: 'pending',
      };
    }
  }

  /**
   * Notify backend about incoming deposit
   * @param depositData - Deposit information
   */
  async notifyBackendDeposit(depositData: {
    walletAddress: string;
    amount: string;
    currency: string;
    network: string;
    transactionHash?: string;
  }): Promise<void> {
    try {
      const response = await fetch('/api/deposits/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('backend_access_token')}`
        },
        body: JSON.stringify(depositData)
      });

      if (!response.ok) {
        throw new Error('Failed to notify backend about deposit');
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get deposit history for the user
   */
  async getDepositHistory(walletAddress: string): Promise<any[]> {
    try {
      const response = await fetch(`/api/deposits/history/${walletAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('backend_access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch deposit history');
      }

      const data = await response.json();
      return data.deposits || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Generate QR code for deposit address
   */
  generateQRCode(address: string, amount?: string, currency?: string): string {
    // Generate QR code URL using a service like qrserver.com
    let qrData = address;

    if (amount && currency) {
      // Create a payment URI for better UX
      qrData = `ethereum:${address}?value=${amount}&token=${currency}`;
    }

    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
  }

  /**
   * Create a new REGULAR EVM account (EOA) using CDP SDK (Server-side only)
   *
   * This creates a standard Externally Owned Account (EOA), NOT a Smart Account.
   * Regular accounts are simpler, cheaper, and sufficient for most use cases.
   *
   * For browser apps, call your backend API that uses CDP SDK
   * @param name - Optional account name
   * @returns Regular EVM account (EOA) with address and optional name
   */
  async createEvmAccount(name?: string): Promise<EvmServerAccount> {
    if (this.isBrowser) {
      throw new Error('This method requires CDP SDK and can only be called from server-side. Please use backend API.');
    }

    if (!this.cdpClient) {
      throw new Error('CDP SDK not initialized. Call initializeCDP() first');
    }

    try {
      // Creates a REGULAR account (EOA), not Smart Account
      const account = await this.cdpClient.evm.createAccount({ name });
      return account;
    } catch (error) {
      throw new Error('Failed to create regular EVM account');
    }
  }

  /**
   * Import an existing EVM account using CDP SDK (Server-side only)
   * @param privateKey - Private key to import (must be prefixed with 0x)
   * @param name - Optional account name
   */
  async importEvmAccount(privateKey: string, name?: string): Promise<EvmServerAccount> {
    if (this.isBrowser) {
      throw new Error('This method requires CDP SDK and can only be called from server-side. Please use backend API.');
    }

    if (!this.cdpClient) {
      throw new Error('CDP SDK not initialized. Call initializeCDP() first');
    }

    try {
      const account = await this.cdpClient.evm.importAccount({
        privateKey: privateKey as `0x${string}`,
        name,
      });
      return account;
    } catch (error) {
      throw new Error('Failed to import EVM account');
    }
  }

  /**
   * Get or create an EVM account (Server-side only)
   * @param name - Account name
   */
  async getOrCreateEvmAccount(name: string): Promise<EvmServerAccount> {
    if (this.isBrowser) {
      throw new Error('This method requires CDP SDK and can only be called from server-side. Please use backend API.');
    }

    if (!this.cdpClient) {
      throw new Error('CDP SDK not initialized. Call initializeCDP() first');
    }

    try {
      const account = await this.cdpClient.evm.getOrCreateAccount({ name });
      return account;
    } catch (error) {
      throw new Error('Failed to get or create EVM account');
    }
  }

  /**
   * Export EVM account private key (Server-side only)
   * @param nameOrAddress - Account name or address (address must be prefixed with 0x)
   */
  async exportEvmAccount(nameOrAddress: { name?: string; address?: string }): Promise<string> {
    if (this.isBrowser) {
      throw new Error('This method requires CDP SDK and can only be called from server-side. Please use backend API.');
    }

    if (!this.cdpClient) {
      throw new Error('CDP SDK not initialized. Call initializeCDP() first');
    }

    try {
      const privateKey = await this.cdpClient.evm.exportAccount(nameOrAddress as any);
      return privateKey;
    } catch (error) {
      throw new Error('Failed to export EVM account');
    }
  }

  /**
   * Request testnet faucet funds for EVM account (Server-side only)
   * For browser apps, call your backend API
   * @param accountAddress - EVM account address
   * @param network - Network to request funds from (default: base-sepolia)
   * @param token - Token to request (default: eth)
   */
  async requestTestnetFunds(
    accountAddress: string,
    network: 'base-sepolia' | 'ethereum-sepolia' = 'base-sepolia',
    token: 'eth' | 'usdc' | 'eurc' | 'cbbtc' = 'eth'
  ): Promise<any> {
    if (this.isBrowser) {
      throw new Error('This method requires CDP SDK and can only be called from server-side. Please use backend API.');
    }

    if (!this.cdpClient) {
      throw new Error('CDP SDK not initialized. Call initializeCDP() first');
    }

    try {
      const result = await this.cdpClient.evm.requestFaucet({
        address: accountAddress,
        network,
        token
      });
      return result;
    } catch (error) {
      throw new Error('Failed to request testnet funds. Make sure you are on a testnet network.');
    }
  }
}

export const depositService = new DepositService();
