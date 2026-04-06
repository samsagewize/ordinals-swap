import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';

export default function Navbar() {
  const { wallet, connecting, connect, disconnect, shortAddress } = useWallet();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/create', label: 'New Trade' },
    { to: '/my-trades', label: 'My Trades' },
  ];

  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      padding: '0 32px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      background: 'rgba(8,8,8,0.95)',
      backdropFilter: 'blur(12px)',
      zIndex: 100,
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: 28,
          height: 28,
          background: 'var(--accent)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 900,
          color: '#000',
          fontFamily: 'var(--font-display)',
        }}>
          ₿
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          color: 'var(--text)',
        }}>
          ORDINALSWAP
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius)',
              fontSize: '12px',
              letterSpacing: '0.05em',
              fontWeight: location.pathname === to ? 700 : 400,
              color: location.pathname === to ? 'var(--accent)' : 'var(--text-muted)',
              background: location.pathname === to ? 'var(--accent-dim)' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Wallet button */}
      <div style={{ position: 'relative' }}>
        {wallet ? (
          <div>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 14px',
                border: '1px solid var(--border-bright)',
                borderRadius: 'var(--radius)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--green)',
                display: 'inline-block',
                boxShadow: '0 0 6px var(--green)',
              }} />
              {shortAddress}
              <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>▾</span>
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-bright)',
                borderRadius: 'var(--radius-lg)',
                padding: '8px',
                minWidth: '200px',
                zIndex: 200,
              }}>
                <div style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: '8px',
                }}>
                  <div style={{ marginBottom: '4px' }}>Ordinals Address</div>
                  <div style={{ color: 'var(--text)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                    {wallet.ordinalsAddress?.slice(0, 16)}...
                  </div>
                </div>
                <button
                  onClick={() => { disconnect(); setShowMenu(false); }}
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--red)' }}
                >
                  Disconnect Wallet
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={connecting}
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '8px 16px' }}
          >
            {connecting ? (
              <><span className="spinner" style={{ width: 12, height: 12 }} /> Connecting...</>
            ) : (
              'Connect Xverse'
            )}
          </button>
        )}
      </div>
    </nav>
  );
}
