interface EthereumProvider {
  request(args: { method: string; params?: any[] }): Promise<any>;
  on?(eventName: string, handler: (...args: any[]) => void): void;
  removeListener?(eventName: string, handler: (...args: any[]) => void): void;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
}

interface Window {
  ethereum?: EthereumProvider;
}
