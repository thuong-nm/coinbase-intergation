# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Melee Fantasy Sports - Coinbase Embedded Wallet Frontend. A React + TypeScript + Vite application integrating Coinbase CDP (Customer Data Platform) for non-custodial wallet authentication with Smart Account functionality and USDC transactions on Base Sepolia.

**Tech Stack**: React 18.3, TypeScript 5.9, Vite 7, @coinbase/cdp-react 0.0.68, viem for blockchain interactions

## Development Commands

```bash
# Development
npm run dev              # Start dev server on port 3000 (not default 5173)

# Build
npm run build           # TypeScript compilation + Vite production build
npm run preview         # Preview production build locally

# Code Quality
npm run lint            # Run ESLint
npm run lint -- --fix   # Auto-fix linting issues
```

## Architecture

### Coinbase CDP Integration

**Provider Setup** ([src/App.tsx](src/App.tsx:1-63))
- Root component wraps app with `CDPReactProvider`
- Project ID: `745c902f-e0bd-4888-85ff-e46c47868e46`
- Auth methods: Email (SMS/Google/Apple disabled in current config)
- Smart Account creation: Enabled via `ethereum.createOnLogin: "smart"`
- Custom theme with Orbitron font and neon color scheme

**Smart Accounts vs EOA**:
- Users get **both** an EOA (Externally Owned Account) and a Smart Account
- `evmAddress` from `useEvmAddress()` hook = EOA address
- `currentUser.evmSmartAccounts[0]` = Smart Account address (used for gasless transactions)
- Smart Account uses CDP Paymaster for gas sponsorship on Base Sepolia

### Authentication Flow

**Dual Authentication System**:
1. **Coinbase Authentication** (handled by `@coinbase/cdp-react`)
   - User signs in via `<AuthButton />`
   - Coinbase issues JWT access token
   - Token accessible via `useGetAccessToken()` hook

2. **Backend Authentication** ([src/components/WalletInfo.tsx](src/components/WalletInfo.tsx:29-42))
   - Frontend automatically calls backend `/v1/coinbase/verify` with Coinbase token
   - Backend verifies token and returns internal JWT tokens
   - Backend tokens stored in localStorage (`backend_access_token`, `backend_refresh_token`)
   - All subsequent API calls use backend token in Authorization header

### Service Layer Architecture

**authService** ([src/services/authService.ts](src/services/authService.ts))
- Singleton service pattern: `export const authService = new AuthService()`
- Base URL: `http://localhost:3002/api` (hardcoded, previously configurable via env)
- Methods:
  - `verifyCoinbaseToken()` - Initial backend authentication
  - `refreshToken()` - Token refresh mechanism
  - `getBackendToken()` - Retrieve stored backend token
  - `recordWithdrawTransaction()` - Log USDC withdrawals to backend
  - `getTransactionHistory()` - Fetch transaction history with pagination/filters

**Transaction History Backend Integration**:
- Endpoint: `GET /v1/transaction/all?type={type}&page={page}&take={take}&sortBy=createdAt&order=DESC`
- Transaction types: `deposit`, `withdraw`, `invest`, `reward`, `refund`
- Pagination: 25 items per page default
- **No blockchain queries**: All transaction data from backend API, not BaseScan/RPC

### USDC Transaction System

**Send Flow** ([src/components/SendTransactionModal.tsx](src/components/SendTransactionModal.tsx))
1. User inputs recipient address and amount
2. Encode ERC20 transfer function using viem's `encodeFunctionData()`
3. Send via Smart Account using `useSendUserOperation()` hook
4. **Gasless transaction**: `useCdpPaymaster: true` (CDP sponsors gas)
5. On success: Automatically record transaction to backend via `recordWithdrawTransaction()`
6. USDC contract: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia)

**Balance Checking** ([src/components/WalletBalance.tsx](src/components/WalletBalance.tsx))
- Uses Base RPC endpoint (`https://sepolia.base.org`)
- Fetches both native ETH and ERC20 token balances
- USDC icon: `https://cryptologos.cc/logos/usd-coin-usdc-logo.png`
- Handles rate limiting gracefully (429 errors don't show to user)

### Component Structure

**Key Components**:
- `WalletInfo.tsx` - Main authenticated view, displays wallet info, backend auth status, deposit/send buttons
- `TransactionHistory.tsx` - Tabbed transaction history (all/deposit/withdraw/invest/reward/refund) with pagination
- `SendTransactionModal.tsx` - USDC send modal with Smart Account integration
- `DepositModal.tsx` - Coinbase Pay onramp integration
- `WalletBalance.tsx` - Token balance display with RPC queries
- `ui/Card.tsx`, `ui/Button.tsx` - Reusable UI components with neon/glass theme

**State Management**:
- No Redux/Zustand - Uses React hooks and CDP hooks
- CDP hooks: `useCurrentUser()`, `useEvmAddress()`, `useIsSignedIn()`, `useGetAccessToken()`, `useSendUserOperation()`
- Parent-child communication via props (e.g., `balanceRefreshKey` prop to trigger refresh)

### Styling System

**CSS Architecture**:
- Global styles: [src/index.css](src/index.css) - CSS variables, Orbitron font, glass morphism effects
- Component-specific: `Component.css` files co-located with `.tsx` files
- No CSS-in-JS libraries (styled-components, emotion, etc.)
- Color scheme: Black (`#000000`), Orange (`#FF5F00`, `#FF9500`), White accent
- Z-index management: Coinbase modal overrides (2147483647) to prevent UI conflicts

**Important z-index notes**:
- Coinbase Sign In Modal must be highest z-index (already handled in index.css)
- Uses aggressive CSS selectors to override Coinbase default styles

### Backend API Contract

**Base URL**: `http://localhost:3002/api/v1`

**Endpoints Used**:
- `POST /coinbase/verify` - Verify Coinbase token, returns backend JWT
- `POST /transaction/withdraw` - Record USDC withdrawal transaction
- `GET /transaction/all` - Get transaction history (with type, page, take, sortBy, order params)
- `POST /coinbase/onramp` - Get Coinbase Pay onramp URL

**Authentication**: All requests (except `/coinbase/verify`) require `Authorization: Bearer {backendToken}` header

## Important Implementation Details

### Transaction Hash Recording
When a USDC transaction succeeds, the transaction hash is automatically sent to backend:
```typescript
// In SendTransactionModal.tsx
authService.recordWithdrawTransaction(data.transactionHash)
```
This happens in a non-blocking way - failures don't show to user.

### Balance Refresh Pattern
After sending USDC, balance refresh is triggered via prop increment:
```typescript
// In WalletInfo.tsx
setBalanceRefreshKey(prev => prev + 1)
```
WalletBalance component watches this prop and refetches with 1s delay to avoid rate limiting.

### Type Mapping: Backend → UI
Transaction types from backend map to UI display:
- `withdraw` → `send` (red, arrow up)
- `deposit`/`reward`/`refund` → `receive` (green, arrow down)
- `invest` → `send` (treated as outgoing)

### Network Configuration
Currently hardcoded to **Base Sepolia** testnet:
- RPC: `https://sepolia.base.org`
- Explorer: `https://sepolia.basescan.org`
- Chain ID: 84532
- For mainnet: Change network prop to `base-mainnet`

## Common Patterns

### Adding a New Transaction Type
1. Update `TransactionType` type in `TransactionHistory.tsx`
2. Add tab config to `transactionTabs` array with icon
3. Update backend type mapping logic in `fetchTransactionHistory()`
4. No backend changes needed if type already exists

### Adding a New API Method
1. Add method to `AuthService` class in `authService.ts`
2. Use `this.getBackendToken()` for authentication
3. Add proper error handling with `response.ok` check
4. Log with prefix (e.g., `[AUTH-SERVICE]`) for debugging

### Creating a New Modal
1. Create `ComponentModal.tsx` with `isOpen`, `onClose`, `onSuccess?` props
2. Add state in parent: `const [isModalOpen, setIsModalOpen] = useState(false)`
3. Use overlay click-to-close pattern (see SendTransactionModal.tsx)
4. Don't auto-close on success - let user see confirmation UI

## Environment Variables

Only one env var used: `VITE_API_BASE_URL` (not currently used - hardcoded in authService.ts)

## TypeScript Notes

- Strict mode enabled in tsconfig
- Type safety enforced for all props and state
- Viem provides full type inference for contract interactions
- `@types/node` installed for Node.js types (buffer polyfills)

## Build Process

Build runs: `tsc -b && vite build`
- TypeScript compilation must pass first
- Vite bundles React app with code splitting
- Large chunks warning is expected (Coinbase SDK, viem are heavy)
- Output: `dist/` directory

## Debugging Tips

All services use prefixed console logs:
- `[AUTH-SERVICE]` - authService.ts
- `[TX-HISTORY]` - TransactionHistory.tsx
- `[SEND-USDC]` - SendTransactionModal.tsx
- `[WALLET-BALANCE]` - WalletBalance.tsx

Check browser localStorage for:
- `backend_access_token`
- `backend_refresh_token`

## Critical Constraints

1. **Never use BaseScan or RPC for transaction history** - Always use backend API
2. **Always use Smart Account for USDC sends** - Not the EOA
3. **Record all withdrawals to backend** - Via `recordWithdrawTransaction()`
4. **Handle CDP Paymaster failures gracefully** - User may not have gas
5. **Preserve z-index overrides** - Coinbase modals must be highest
