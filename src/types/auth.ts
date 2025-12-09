export interface BackendUser {
  walletAddress: string;
  role: string;
  _id?: string;
  walletProvider?: 'metamask' | 'coinbase';
  proxyWalletAddress?: string;
  proxyWalletBalance?: number;
  status?: 'active' | 'pending' | 'banned';
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendAuthResponse {
  accessToken: string;
  refreshToken: string;
  expireIn: string;
  refreshExpireIn: string;
  user: BackendUser;
}
