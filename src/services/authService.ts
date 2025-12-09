import type { BackendAuthResponse } from '../types/auth';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://melee-dev-api.merket.io';
// const API_BASE_URL = 'https://fsm-be.dc1.merket.io/api';
const API_BASE_URL = 'http://localhost:3002/api';
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
}

export const authService = new AuthService();
