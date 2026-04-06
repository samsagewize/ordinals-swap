import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CreateTrade from './pages/CreateTrade';
import TradePage from './pages/TradePage';
import MyTrades from './pages/MyTrades';
import { WalletProvider } from './hooks/useWallet';
import { TradeProvider } from './hooks/useTrades';

function App() {
  return (
    <WalletProvider>
      <TradeProvider>
        <Router>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: 1 }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/create" element={<CreateTrade />} />
                <Route path="/trade/:tradeId" element={<TradePage />} />
                <Route path="/my-trades" element={<MyTrades />} />
              </Routes>
            </main>
            <footer style={{
              borderTop: '1px solid var(--border)',
              padding: '20px 32px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px'
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '0.1em' }}>
                ORDINALSWAP
              </span>
              <span>Trustless P2P Ordinals trading via PSBT · Bitcoin mainnet</span>
              <span>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  GitHub ↗
                </a>
              </span>
            </footer>
          </div>
        </Router>
      </TradeProvider>
    </WalletProvider>
  );
}

export default App;
