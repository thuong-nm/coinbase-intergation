import type { BackendAuthResponse } from '../types/auth';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://melee-dev-api.merket.io';
const API_BASE_URL = 'https://fsm-be.dc1.merket.io/api';
// const API_BASE_URL = 'http://localhost:3002/api';
class AuthService {
  async verifyCoinbaseToken(accessToken: string): Promise<BackendAuthResponse> {
    const response = await fetch(`${API_BASE_URL}/v1/coinbase/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await fetch(`${API_BASE_URL}/v1/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const result = await response.json();
    return result.data;
  }

  getBackendToken(): string | null {
    return localStorage.getItem('backend_access_token');
  }

  clearTokens(): void {
    localStorage.removeItem('backend_access_token');
    localStorage.removeItem('backend_refresh_token');
  }

  async getOnrampUrl(
    paymentAmount: number,
    paymentCurrency: string = 'USD',
    paymentMethod: string = 'CARD',
    clientIp?: string
  ): Promise<{ onrampUrl: string }> {
    const backendToken = this.getBackendToken();
    if (!backendToken) {
      throw new Error('Backend token not found. Please authenticate first.');
    }

    const response = await fetch(`${API_BASE_URL}/v1/coinbase/onramp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${backendToken}`,
      },
      body: JSON.stringify({
        paymentAmount,
        paymentCurrency,
        paymentMethod,
        clientIp,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to get onramp URL: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  async sendTransaction(params: {
    recipientAddress: string;
    amount: number;
    currency: string;
    network: string;
  }): Promise<{ transactionHash?: string; success: boolean }> {
    const backendToken = this.getBackendToken();
    if (!backendToken) {
      throw new Error('Backend token not found. Please authenticate first.');
    }

    const response = await fetch(`${API_BASE_URL}/v1/transaction/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${backendToken}`,
      },
      body: JSON.stringify({
        to: params.recipientAddress,
        amount: params.amount,
        currency: params.currency,
        network: params.network,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to send transaction: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Send USDC from Smart Account (gasless)
   * Backend sponsors gas fees using Account Abstraction
   * Uses Coinbase access token for authentication
   */
  async sendUSDC(params: {
    accessToken: string;
    destinationAddress: string;
    amount: number;
  }): Promise<{
    status: number;
    message: string;
    data?: {
      walletAddress: string;
      destinationAddress?: string;
      amount?: string;
      assetId?: string;
      networkId?: string;
      message?: string;
      transactionHash?: string;
      transactionUrl?: string;
      status?: string;
    };
  }> {
    console.log('[AUTH-SERVICE] Sending USDC validation request:', {
      url: `${API_BASE_URL}/v1/coinbase/send`,
      destinationAddress: params.destinationAddress,
      amount: params.amount,
    });

    const response = await fetch(`${API_BASE_URL}/v1/coinbase/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: params.accessToken,
        destinationAddress: params.destinationAddress,
        amount: params.amount,
      }),
    });

    console.log('[AUTH-SERVICE] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AUTH-SERVICE] Error response:', errorData);
      throw new Error(errorData.message || `Failed to validate transaction: ${response.status}`);
    }

    const result = await response.json();
    console.log('[AUTH-SERVICE] Success response:', result);
    return result;
  }

  /**
   * Record a withdraw transaction to backend
   */
  async recordWithdrawTransaction(transactionHash: string): Promise<void> {
    const backendToken = this.getBackendToken();
    if (!backendToken) {
      throw new Error('Backend token not found. Please authenticate first.');
    }

    console.log('[AUTH-SERVICE] Recording withdraw transaction:', transactionHash);

    const response = await fetch(`${API_BASE_URL}/v1/transaction/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${backendToken}`,
      },
      body: JSON.stringify({
        transactionHash,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AUTH-SERVICE] Failed to record withdraw transaction:', errorData);
      throw new Error(errorData.message || `Failed to record withdraw transaction: ${response.status}`);
    }

    console.log('[AUTH-SERVICE] Withdraw transaction recorded successfully');
  }

  /**
   * Get transaction history from backend
   */
  async getTransactionHistory(params?: {
    type?: 'deposit' | 'withdraw' | 'invest' | 'reward' | 'refund';
    page?: number;
    take?: number;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    take: number;
  }> {
    const backendToken = this.getBackendToken();
    if (!backendToken) {
      throw new Error('Backend token not found. Please authenticate first.');
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
      sortBy: params?.sortBy || 'createdAt',
      order: params?.order || 'DESC',
      page: String(params?.page || 1),
      take: String(params?.take || 25),
    });

    if (params?.type) {
      queryParams.append('type', params.type);
    }

    console.log('[AUTH-SERVICE] Fetching transaction history from backend');
    console.log('[AUTH-SERVICE] Query params:', queryParams.toString());

    const response = await fetch(`${API_BASE_URL}/v1/transaction/all?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${backendToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AUTH-SERVICE] Failed to fetch transaction history:', errorData);
      throw new Error(errorData.message || `Failed to fetch transaction history: ${response.status}`);
    }

    const result = await response.json();
    console.log('[AUTH-SERVICE] Transaction history fetched:', result);

    return {
      data: result.data || [],
      total: result.total || 0,
      page: result.page || 1,
      take: result.take || 25,
    };
  }
}

export const authService = new AuthService();
