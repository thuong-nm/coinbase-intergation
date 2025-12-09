# Send Transaction Implementation Guide

## Overview

This document explains how to implement USDC transfer functionality using Coinbase Embedded Wallet and Smart Accounts. This implementation works for both web and mobile applications.

## Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Web Implementation (React)](#web-implementation-react)
4. [Mobile Implementation Guide](#mobile-implementation-guide)
5. [Key Concepts](#key-concepts)
6. [Troubleshooting](#troubleshooting)

---

## Architecture

### Flow Diagram

```
User Input (Recipient Address + Amount)
    ↓
Frontend/Mobile App
    ↓
Coinbase CDP SDK
    ↓
Smart Account (Account Abstraction)
    ↓
CDP Paymaster (Gas Sponsorship)
    ↓
Blockchain (Base Sepolia)
    ↓
Transaction Confirmed
```

### Key Points

- **100% Client-side**: No backend API needed for transaction signing
- **Gasless**: CDP Paymaster sponsors gas fees (free for users)
- **Smart Account**: Uses ERC-4337 Account Abstraction
- **Secure**: User maintains full control via Coinbase session

---

## Prerequisites

### 1. Coinbase CDP Setup

- **Project ID**: Get from [Coinbase Developer Portal](https://portal.cdp.coinbase.com/)
- **Network**: Base Sepolia (testnet) or Base Mainnet
- **Smart Account**: Enabled in CDP provider config

### 2. Required Dependencies

#### Web (React/TypeScript)
```json
{
  "@coinbase/cdp-hooks": "^latest",
  "@coinbase/cdp-react": "^latest",
  "viem": "^latest"
}
```

#### Mobile (React Native)
```json
{
  "@coinbase/wallet-mobile-sdk": "^latest",
  "ethers": "^6.0.0" // or "viem"
}
```

### 3. Token Information

**USDC Contract Addresses:**
- Base Sepolia (Testnet): `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Base Mainnet: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

**Token Decimals:** 6 (not 18!)

---

## Web Implementation (React)

### Step 1: Configure CDP Provider

```tsx
// App.tsx
import { CDPHooksProvider } from '@coinbase/cdp-hooks';

function App() {
  return (
    <CDPHooksProvider
      config={{
        projectId: "your-project-id",
        ethereum: {
          createOnLogin: "smart" // Enable Smart Account
        }
      }}
    >
      <YourApp />
    </CDPHooksProvider>
  );
}
```

### Step 2: Create Send Transaction Component

```tsx
// SendTransactionModal.tsx
import { useState, useEffect } from 'react';
import { useCurrentUser, useSendUserOperation } from '@coinbase/cdp-hooks';
import { encodeFunctionData } from 'viem';

// USDC contract address on Base Sepolia
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

function SendTransactionModal() {
  const { currentUser } = useCurrentUser();
  const { sendUserOperation, status, data, error } = useSendUserOperation();

  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');

  // Get Smart Account address
  const smartAccount = currentUser?.evmSmartAccounts?.[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!smartAccount) {
      alert('Smart account not found');
      return;
    }

    // Convert amount to smallest unit (USDC has 6 decimals)
    const amountNum = parseFloat(amount);
    const amountInSmallestUnit = BigInt(
      Math.floor(amountNum * Math.pow(10, USDC_DECIMALS))
    );

    // Encode ERC20 transfer function call
    const transferData = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [recipientAddress as `0x${string}`, amountInSmallestUnit],
    });

    // Send transaction via Smart Account
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
      useCdpPaymaster: true, // Enable gasless transactions
    });
  };

  // Handle success
  useEffect(() => {
    if (status === 'success' && data?.transactionHash) {
      console.log('Transaction Hash:', data.transactionHash);
      console.log('Explorer:', `https://sepolia.basescan.org/tx/${data.transactionHash}`);
    }
  }, [status, data]);

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Recipient Address (0x...)"
        value={recipientAddress}
        onChange={(e) => setRecipientAddress(e.target.value)}
      />
      <input
        type="number"
        placeholder="Amount (USDC)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button type="submit" disabled={status === 'pending'}>
        {status === 'pending' ? 'Sending...' : 'Send USDC'}
      </button>

      {status === 'success' && (
        <div>
          <p>✅ Transaction Sent!</p>
          <p>Hash: {data?.transactionHash}</p>
          <a
            href={`https://sepolia.basescan.org/tx/${data?.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Explorer
          </a>
        </div>
      )}

      {status === 'error' && (
        <div>❌ Error: {error?.message}</div>
      )}
    </form>
  );
}
```

---

## Mobile Implementation Guide

### Overview

For mobile apps (React Native, Flutter, Swift, Kotlin), the approach is similar but uses different SDKs.

### React Native Implementation

#### Step 1: Install Dependencies

```bash
npm install @coinbase/wallet-mobile-sdk ethers
```

#### Step 2: Initialize Coinbase Wallet SDK

```tsx
// App.tsx
import { CoinbaseWalletSDK } from '@coinbase/wallet-mobile-sdk';

const sdk = new CoinbaseWalletSDK({
  appName: 'Your App Name',
  appLogoUrl: 'https://your-app.com/logo.png',
  darkMode: false,
});
```

#### Step 3: Connect Wallet & Get Smart Account

```tsx
import { ethers } from 'ethers';

// Connect wallet
const provider = await sdk.makeWeb3Provider();
await provider.enable();

// Get accounts (Smart Account will be returned)
const accounts = await provider.request({
  method: 'eth_accounts'
});
const smartAccount = accounts[0];

console.log('Smart Account:', smartAccount);
```

#### Step 4: Send USDC Transaction

```tsx
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const USDC_DECIMALS = 6;

async function sendUSDC(recipientAddress: string, amount: number) {
  // Create contract instance
  const usdcContract = new ethers.Contract(
    USDC_ADDRESS,
    [
      'function transfer(address to, uint256 value) returns (bool)',
    ],
    new ethers.BrowserProvider(provider)
  );

  // Convert amount to smallest unit
  const amountInSmallestUnit = ethers.parseUnits(
    amount.toString(),
    USDC_DECIMALS
  );

  // Send transaction
  const tx = await usdcContract.transfer(
    recipientAddress,
    amountInSmallestUnit
  );

  console.log('Transaction Hash:', tx.hash);

  // Wait for confirmation
  const receipt = await tx.wait();
  console.log('Transaction Confirmed:', receipt);

  return tx.hash;
}

// Usage
const txHash = await sendUSDC(
  '0xRecipientAddress',
  10.5 // 10.5 USDC
);
```

### Native iOS (Swift) Implementation

```swift
import CoinbaseWalletSDK
import Web3

// 1. Initialize SDK
let cbWallet = CoinbaseWalletSDK(
    appName: "Your App",
    appLogoUrl: URL(string: "https://your-app.com/logo.png")!
)

// 2. Connect wallet
cbWallet.initiateHandshake { result in
    switch result {
    case .success(let account):
        print("Smart Account: \(account)")
    case .failure(let error):
        print("Error: \(error)")
    }
}

// 3. Send USDC
let usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
let recipientAddress = "0x..."
let amount = 10.5

// Encode transfer function
let function = ERC20Functions.transfer(
    contract: usdcAddress,
    to: recipientAddress,
    value: BigUInt(amount * 1_000_000) // 6 decimals
)

cbWallet.makeRequest(request: function) { result in
    switch result {
    case .success(let txHash):
        print("Transaction Hash: \(txHash)")
    case .failure(let error):
        print("Error: \(error)")
    }
}
```

### Native Android (Kotlin) Implementation

```kotlin
import com.coinbase.wallet.core.CoinbaseWalletSDK
import org.web3j.abi.FunctionEncoder
import org.web3j.abi.datatypes.Address
import org.web3j.abi.datatypes.generated.Uint256

// 1. Initialize SDK
val cbWallet = CoinbaseWalletSDK(
    context = applicationContext,
    domain = Uri.parse("https://your-app.com"),
    openIntent = { intent -> startActivity(intent) }
)

// 2. Connect wallet
cbWallet.initiateHandshake { result ->
    when (result) {
        is Result.Success -> {
            val account = result.value.account
            Log.d("Wallet", "Smart Account: $account")
        }
        is Result.Failure -> {
            Log.e("Wallet", "Error: ${result.error}")
        }
    }
}

// 3. Send USDC
val usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
val recipientAddress = "0x..."
val amount = 10.5

// Encode ERC20 transfer function
val function = Function(
    "transfer",
    listOf(
        Address(recipientAddress),
        Uint256((amount * 1_000_000).toLong()) // 6 decimals
    ),
    emptyList()
)
val data = FunctionEncoder.encode(function)

// Send transaction
cbWallet.makeEthereumRequest(
    request = EthereumRequest.SendTransaction(
        fromAddress = smartAccount,
        toAddress = usdcAddress,
        value = "0",
        data = data
    )
) { result ->
    when (result) {
        is Result.Success -> {
            val txHash = result.value
            Log.d("Transaction", "Hash: $txHash")
        }
        is Result.Failure -> {
            Log.e("Transaction", "Error: ${result.error}")
        }
    }
}
```

---

## Key Concepts

### 1. Smart Account vs Regular EOA

| Feature | Regular EOA | Smart Account |
|---------|-------------|---------------|
| Gas Fees | User pays | Sponsored (gasless) |
| Private Key | User manages | Coinbase manages |
| Account Type | Externally Owned | Smart Contract |
| Batch Transactions | No | Yes |
| Programmable | No | Yes |

### 2. ERC20 Transfer Function

```solidity
function transfer(address to, uint256 value) returns (bool)
```

**Encoding Process:**
1. Function selector: `0xa9059cbb`
2. Recipient address: 32 bytes (padded)
3. Amount: 32 bytes (uint256)

**Example:**
```
Function: transfer
To: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
Amount: 1 USDC (1000000 in smallest unit)

Encoded data:
0xa9059cbb
000000000000000000000000742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
00000000000000000000000000000000000000000000000000000000000f4240
```

### 3. Amount Conversion

**IMPORTANT: USDC has 6 decimals (not 18!)**

```javascript
// Convert USDC amount to smallest unit
const amount = 10.5; // USDC
const amountInSmallestUnit = amount * 1_000_000; // 10,500,000

// Or using BigInt
const amountBigInt = BigInt(Math.floor(amount * 10**6));
```

**Common Mistakes:**
- ❌ Using 18 decimals (like ETH)
- ❌ Not converting to smallest unit
- ❌ Using float instead of BigInt for large amounts

### 4. Gas Sponsorship (Paymaster)

**CDP Paymaster (Base only):**
```typescript
await sendUserOperation({
  evmSmartAccount: smartAccount,
  network: 'base-sepolia',
  calls: [...],
  useCdpPaymaster: true // ← Enable gasless
});
```

**Custom Paymaster (Other networks):**
```typescript
await sendUserOperation({
  evmSmartAccount: smartAccount,
  network: 'arbitrum',
  calls: [...],
  paymasterUrl: 'https://your-paymaster.com' // ERC-7677 compliant
});
```

### 5. Transaction Status Tracking

```typescript
const { status, data, error } = useSendUserOperation();

// status can be:
// - 'idle': Not started
// - 'pending': Transaction in progress
// - 'success': Transaction confirmed
// - 'error': Transaction failed

// data contains:
// - transactionHash: The transaction hash
// - blockNumber: Block number
// - etc.

// error contains:
// - message: Error message
// - code: Error code
```

---

## Troubleshooting

### Common Errors

#### 1. "EVM account not found"

**Cause:** Using wrong account type (regular EOA instead of Smart Account)

**Solution:**
```typescript
// ❌ Wrong
const account = currentUser?.evmAccounts?.[0];

// ✅ Correct
const smartAccount = currentUser?.evmSmartAccounts?.[0];
```

#### 2. "ERC20: transfer amount exceeds balance"

**Cause:** Insufficient USDC balance in Smart Account

**Solution:**
- Check balance on block explorer
- Transfer USDC to Smart Account first
- For testnet: Use faucet to get test USDC

#### 3. "Chain base-mainnet is not supported"

**Cause:** CDP Paymaster only supports specific networks

**Solution:**
```typescript
// Use testnet for development
network: 'base-sepolia' // ✅

// Or use custom paymaster for other networks
paymasterUrl: 'https://your-paymaster.com'
```

#### 4. Invalid amount encoding

**Cause:** Wrong decimal places or incorrect BigInt conversion

**Solution:**
```typescript
// ❌ Wrong (using 18 decimals)
const amount = BigInt(10.5 * 10**18);

// ✅ Correct (USDC has 6 decimals)
const amount = BigInt(Math.floor(10.5 * 10**6));
```

### Debugging Tips

1. **Enable Console Logs:**
```typescript
console.log('Smart Account:', smartAccount);
console.log('Transfer Data:', transferData);
console.log('Amount in smallest unit:', amountInSmallestUnit);
```

2. **Check Transaction on Explorer:**
```
Base Sepolia: https://sepolia.basescan.org/tx/{txHash}
Base Mainnet: https://basescan.org/tx/{txHash}
```

3. **Verify Smart Account Balance:**
```
https://sepolia.basescan.org/address/{smartAccount}
```

4. **Test with Small Amounts First:**
```typescript
// Start with 0.01 USDC for testing
const testAmount = 0.01;
```

---

## Additional Resources

- [Coinbase CDP Documentation](https://docs.cdp.coinbase.com/)
- [Smart Accounts Guide](https://docs.cdp.coinbase.com/embedded-wallets/evm-features/smart-accounts)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Viem Documentation](https://viem.sh/)
- [Base Network Explorer](https://basescan.org/)

---

## Summary

### Key Takeaways

1. ✅ **No Backend Needed**: All transaction signing happens client-side
2. ✅ **Gasless**: CDP Paymaster sponsors gas fees on Base
3. ✅ **Smart Account**: Use `evmSmartAccounts[0]`, not regular EOA
4. ✅ **6 Decimals**: USDC uses 6 decimals, not 18
5. ✅ **viem for Encoding**: Use `encodeFunctionData()` for clean ABI encoding

### Quick Start Checklist

- [ ] Configure CDP provider with `createOnLogin: "smart"`
- [ ] Get Smart Account address from `currentUser.evmSmartAccounts[0]`
- [ ] Convert amount with 6 decimals: `amount * 10**6`
- [ ] Encode transfer function with viem
- [ ] Send via `useSendUserOperation()` with `useCdpPaymaster: true`
- [ ] Track status and display transaction hash
- [ ] Test on Base Sepolia before mainnet

---

**Document Version:** 1.0
**Last Updated:** 2025-12-09
**Author:** FSM Development Team
