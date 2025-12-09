// Smart Account Service - Advanced wallet features with Account Abstraction
// Note: This requires CDP SDK and should be used on backend

export type EvmSmartAccount = {
  address: string;
  name?: string;
  owners?: string[];
};

export type CdpClientType = any;

class SmartAccountService {
  private cdpClient: CdpClientType | null = null;
  private isBrowser = typeof window !== 'undefined';

  /**
   * Initialize CDP SDK (Server-side only)
   */
  async initializeCDP(apiKeyId?: string, apiKeySecret?: string, walletSecret?: string): Promise<void> {
    if (this.isBrowser) {
      return;
    }

    try {
      const { CdpClient } = await import('@coinbase/cdp-sdk');

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
   * Create a Smart Account (Account Abstraction)
   * Smart Accounts có thể:
   * - Sponsor gas fees (gasless transactions)
   * - Multi-signature support
   * - Social recovery
   * - Batch transactions
   * - Programmable logic
   */
  async createSmartAccount(params: {
    name?: string;
    owner: string; // EOA address that will own this smart account
  }): Promise<EvmSmartAccount> {
    if (this.isBrowser) {
      throw new Error('Smart Accounts can only be created from backend. Call backend API.');
    }

    if (!this.cdpClient) {
      throw new Error('CDP SDK not initialized');
    }

    try {
      const smartAccount = await this.cdpClient.evm.createSmartAccount({
        name: params.name,
        owner: params.owner,
      });

      return {
        address: smartAccount.address,
        name: params.name,
        owners: [params.owner],
      };
    } catch (error) {
      throw new Error('Failed to create smart account');
    }
  }

  /**
   * Get or Create Smart Account
   */
  async getOrCreateSmartAccount(params: {
    name: string;
    owner: string;
  }): Promise<EvmSmartAccount> {
    if (this.isBrowser) {
      throw new Error('Use backend API for smart account operations');
    }

    if (!this.cdpClient) {
      throw new Error('CDP SDK not initialized');
    }

    try {
      const smartAccount = await this.cdpClient.evm.getOrCreateSmartAccount({
        name: params.name,
        owner: params.owner,
      });

      return {
        address: smartAccount.address,
        name: params.name,
      };
    } catch (error) {
      throw new Error('Failed to get or create smart account');
    }
  }

  /**
   * Send transaction from Smart Account with gas sponsorship
   * Gasless transaction - user không cần ETH để trả gas
   */
  async sendSponsoredTransaction(params: {
    smartAccountAddress: string;
    to: string;
    value?: string;
    data?: string;
  }): Promise<{ transactionHash: string }> {
    if (this.isBrowser) {
      throw new Error('Use backend API for transaction operations');
    }

    if (!this.cdpClient) {
      throw new Error('CDP SDK not initialized');
    }

    try {
      // Prepare user operation (Account Abstraction transaction)
      const userOp = await this.cdpClient.evm.prepareUserOperation({
        account: params.smartAccountAddress,
        calls: [
          {
            to: params.to,
            value: params.value || '0',
            data: params.data || '0x',
          },
        ],
      });

      // Send with gas sponsorship
      const result = await this.cdpClient.evm.sendUserOperation({
        account: params.smartAccountAddress,
        userOperation: userOp,
        sponsor: true, // This sponsors the gas fees!
      });

      return { transactionHash: result.transactionHash };
    } catch (error) {
      throw new Error('Failed to send sponsored transaction');
    }
  }

  /**
   * Batch multiple transactions into one
   * Execute nhiều transactions cùng lúc, chỉ trả gas 1 lần
   */
  async sendBatchTransactions(params: {
    smartAccountAddress: string;
    calls: Array<{
      to: string;
      value?: string;
      data?: string;
    }>;
  }): Promise<{ transactionHash: string }> {
    if (this.isBrowser) {
      throw new Error('Use backend API for batch operations');
    }

    if (!this.cdpClient) {
      throw new Error('CDP SDK not initialized');
    }

    try {
      const userOp = await this.cdpClient.evm.prepareUserOperation({
        account: params.smartAccountAddress,
        calls: params.calls.map(call => ({
          to: call.to,
          value: call.value || '0',
          data: call.data || '0x',
        })),
      });

      const result = await this.cdpClient.evm.sendUserOperation({
        account: params.smartAccountAddress,
        userOperation: userOp,
        sponsor: true,
      });

      return { transactionHash: result.transactionHash };
    } catch (error) {
      throw new Error('Failed to send batch transactions');
    }
  }

  /**
   * Check if address is a Smart Account
   */
  async isSmartAccount(address: string): Promise<boolean> {
    if (this.isBrowser) {
      throw new Error('Use backend API');
    }

    try {
      // Check if address has code (smart contract)
      const response = await fetch('https://sepolia.base.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getCode',
          params: [address, 'latest'],
          id: 1,
        }),
      });

      const data = await response.json();
      // If has code, it's a smart contract (smart account)
      return data.result !== '0x' && data.result !== '0x0';
    } catch (error) {
      return false;
    }
  }
}

export const smartAccountService = new SmartAccountService();
