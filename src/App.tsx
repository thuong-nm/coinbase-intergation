import { CDPReactProvider, AuthButton, type Config, type Theme } from "@coinbase/cdp-react";
import WalletInfo from "./components/WalletInfo";
import { Background } from "./components/Layout/Background";
import { Card } from "./components/ui/Card";
import './App.css';

const config: Config = {
  projectId: "745c902f-e0bd-4888-85ff-e46c47868e46",
  ethereum: {
    createOnLogin: "smart",
  },
  appName: "Coinbase Embedded Wallet Auth",
  appLogoUrl: "",
  authMethods: ["email"],
  showCoinbaseFooter: true,
};

const theme: Partial<Theme> = {
  "colors-bg-default": "#0a0a1f",
  "colors-bg-alternate": "#050511",
  "colors-bg-primary": "#00f3ff",
  "colors-bg-secondary": "#bc13fe",
  "colors-fg-default": "#ffffff",
  "colors-fg-muted": "#94a3b8",
  "colors-fg-primary": "#00f3ff",
  "colors-fg-onPrimary": "#000000",
  "colors-fg-onSecondary": "#ffffff",
  "colors-line-default": "rgba(255, 255, 255, 0.1)",
  "borderRadius-cta": "9999px",
  "borderRadius-link": "9999px",
  "borderRadius-input": "12px",
  "borderRadius-modal": "24px",
  "font-family-sans": "'Orbitron', sans-serif"
};

function App() {
  return (
    <CDPReactProvider config={config} theme={theme}>
      <Background>
        <div className="app-container">
          <header className="app-header">
            <p className="app-subtitle">
              Coinbase Embedded Wallet Authentication
            </p>
          </header>

          <main className="app-main">
            <Card className="glass-panel" style={{ padding: '2rem' }}>
              <div className="auth-card-content">
                <AuthButton />
              </div>
            </Card>

            <WalletInfo />
          </main>
        </div>
      </Background>
    </CDPReactProvider>
  );
}

export default App;
