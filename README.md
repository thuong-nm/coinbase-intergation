# Melee Fantasy Sports - Coinbase Authentication Frontend

React + TypeScript + Vite application for Coinbase Embedded Wallet authentication, integrated with Melee Fantasy Sports backend.

## Features

- **Coinbase Embedded Wallet Integration**: Non-custodial wallet authentication
- **Multiple Auth Methods**: Email, SMS, Google OAuth, Apple OAuth
- **Backend Integration**: Automatic token verification with backend API
- **Real-time Wallet Info**: Display wallet address, user info, and backend status
- **Responsive Design**: Mobile-first design with beautiful UI
- **TypeScript**: Full type safety

## Tech Stack

- React 18.3
- TypeScript 5.9
- Vite 7
- @coinbase/cdp-react 0.0.58
- @coinbase/cdp-hooks 0.0.58

## Prerequisites

- Node.js v20.19.0 (LTS)
- npm
- Backend API running (default: http://localhost:3000)

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

Create a `.env` file (copy from `.env.example`):

```bash
# Backend API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
```

**Note**: The Coinbase Project ID is already configured in [src/App.tsx](src/App.tsx). Update it if you have your own project.

## Development

```bash
# Start development server (with hot reload)
npm run dev
```

The app will be available at `http://localhost:5173`

## Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── App.tsx                      # Main app with CDPReactProvider
├── App.css                      # Main app styles
├── main.tsx                     # Entry point
├── index.css                    # Global styles
├── components/
│   ├── WalletInfo.tsx          # Wallet info & backend auth component
│   └── WalletInfo.css          # Component styles
├── services/
│   └── authService.ts          # Backend API service
└── types/
    └── auth.ts                 # TypeScript types
```

## How It Works

### Authentication Flow

1. **User Authentication**
   - User clicks "Sign In" button
   - Chooses auth method (Email/SMS/OAuth)
   - Coinbase creates embedded wallet and issues JWT token

2. **Backend Integration**
   - Frontend automatically calls `/api/v1/auth/coinbase/verify`
   - Sends Coinbase JWT access token to backend
   - Backend verifies token and creates/updates user
   - Backend returns internal JWT tokens

3. **Token Management**
   - Backend tokens stored in localStorage
   - Tokens sent with subsequent API requests via `Authorization` header

### Key Components

#### App.tsx
Main component with Coinbase CDP configuration:
- Project ID: `745c902f-e0bd-4888-85ff-e46c47868e46`
- Auth methods: Email, SMS, Google, Apple
- Smart wallet creation enabled

#### WalletInfo.tsx
Displays wallet information and handles backend authentication:
- Shows Coinbase wallet address
- Displays user email/phone (if available)
- Auto-authenticates with backend
- Shows backend connection status
- Debug panel with full data

#### authService.ts
API service for backend communication:
- `verifyCoinbaseToken()` - Verify Coinbase token with backend
- `refreshToken()` - Refresh backend access token
- Token storage management

## API Integration

### Backend Endpoint

```typescript
POST /api/v1/auth/coinbase/verify
Content-Type: application/json

{
  "accessToken": "coinbase-jwt-token"
}
```

### Expected Response

```json
{
  "status": 200,
  "data": {
    "accessToken": "backend-jwt-token",
    "refreshToken": "backend-refresh-token",
    "user": {
      "_id": "user-id",
      "walletAddress": "0x...",
      "walletProvider": "coinbase",
      "status": "active",
      "role": "user",
      "proxyWalletAddress": "0x...",
      "proxyWalletBalance": 0
    }
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3000/api` |

## Testing

1. **Start Backend Server**
   ```bash
   cd ../.. # Go to backend root
   npm run start:dev
   ```

2. **Start Frontend**
   ```bash
   npm run dev
   ```

3. **Test Authentication Flow**
   - Open http://localhost:5173
   - Click "Sign In" button
   - Choose authentication method
   - Complete authentication
   - Verify wallet info displays
   - Check backend authentication status

4. **Verify Backend Integration**
   - Check browser console for logs
   - Verify localStorage has backend tokens
   - Check backend logs for authentication request

## Troubleshooting

### Backend Connection Failed

**Error**: "Authentication failed" or network errors

**Solution**:
1. Verify backend is running (`npm run start:dev`)
2. Check `VITE_API_BASE_URL` in `.env`
3. Verify CORS is enabled on backend
4. Check backend logs for errors

### TypeScript Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

```bash
# Check TypeScript compilation
npm run build

# If errors, check tsconfig files
cat tsconfig.json
cat tsconfig.app.json
```

## Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint -- --fix
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security Notes

- Never commit `.env` file with real credentials
- Backend tokens stored in localStorage (consider httpOnly cookies for production)
- Always use HTTPS in production
- Implement token refresh mechanism for long sessions

## Related Documentation

- [Coinbase CDP React Docs](https://docs.cdp.coinbase.com/cdp-react/docs/welcome)
- [Coinbase OnchainKit](https://onchainkit.xyz/)
- [Backend Authentication Guide](../../COINBASE_TESTING.md)

## License

Private - Melee Fantasy Sports
