import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';

const STEPS = [
  {
    num: '01',
    title: 'Connect Xverse',
    desc: 'Connect your Xverse wallet to browse your inscriptions.',
  },
  {
    num: '02',
    title: 'Pick Your Inscription',
    desc: 'Choose which Ordinal you want to trade away.',
  },
  {
    num: '03',
    title: 'Share Trade Link',
    desc: 'Send a unique trade link to your counterparty.',
  },
  {
    num: '04',
    title: 'Both Parties Sign',
    desc: 'Each wallet signs their side of the PSBT independently.',
  },
  {
    num: '05',
    title: 'Atomic Swap',
    desc: 'The transaction broadcasts — both inscriptions swap simultaneously.',
  },
];

export default function Home() {
  const { wallet, connect, connecting } = useWallet();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>

      {/* Hero */}
      <div style={{
        textAlign: 'center',
        marginBottom: '100px',
        animation: 'fadeIn 0.6s ease forwards',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          border: '1px solid rgba(247,147,26,0.3)',
          borderRadius: '20px',
          background: 'var(--accent-dim)',
          marginBottom: '32px',
          fontSize: '11px',
          letterSpacing: '0.1em',
          color: 'var(--accent)',
          textTransform: 'uppercase',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent)',
          }} />
          Bitcoin Mainnet · Trustless PSBT Swaps
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 6vw, 72px)',
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          marginBottom: '24px',
          color: 'var(--text)',
        }}>
          Trade Ordinals
          <br />
          <span style={{ color: 'var(--accent)' }}>Peer-to-Peer.</span>
        </h1>

        <p style={{
          fontSize: '16px',
          color: 'var(--text-dim)',
          maxWidth: '520px',
          margin: '0 auto 40px',
          lineHeight: 1.8,
        }}>
          Swap Bitcoin inscriptions directly with anyone, anywhere.
          No middleman. No escrow. Just two wallets and a cryptographic
          atomic swap via PSBT.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {wallet ? (
            <Link to="/create" className="btn btn-primary" style={{ fontSize: '14px', padding: '14px 28px' }}>
              Start a Trade →
            </Link>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="btn btn-primary"
              style={{ fontSize: '14px', padding: '14px 28px' }}
            >
              {connecting ? 'Connecting...' : 'Connect Xverse to Start'}
            </button>
          )}
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ fontSize: '14px', padding: '14px 28px' }}
          >
            View on GitHub ↗
          </a>
        </div>
      </div>

      {/* How it works */}
      <div style={{ marginBottom: '80px' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '11px',
          letterSpacing: '0.15em',
          color: 'var(--accent)',
          marginBottom: '16px',
          textTransform: 'uppercase',
        }}>
          How it works
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '48px',
          color: 'var(--text)',
        }}>
          Five steps to a trustless swap
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '1px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              style={{
                padding: '28px 24px',
                background: 'var(--bg-card)',
                borderRight: i < STEPS.length - 1 ? '1px solid var(--border)' : 'none',
                position: 'relative',
              }}
            >
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '28px',
                fontWeight: 900,
                color: 'var(--border-bright)',
                marginBottom: '16px',
                lineHeight: 1,
              }}>
                {step.num}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '8px',
                color: 'var(--text)',
              }}>
                {step.title}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {step.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '16px',
      }}>
        {[
          {
            icon: '🔐',
            title: 'Non-Custodial',
            desc: 'Your keys, your coins. The platform never holds your inscriptions or private keys.',
          },
          {
            icon: '⚡',
            title: 'Atomic Execution',
            desc: 'PSBTs ensure both inscriptions move in a single transaction — no partial fills.',
          },
          {
            icon: '🔗',
            title: 'On-Chain Settlement',
            desc: 'Every trade settles directly on Bitcoin. No sidechains, no bridges, no custodians.',
          },
          {
            icon: '🦊',
            title: 'Xverse Native',
            desc: 'Built for Xverse wallet. Connect once, sign trades with a single tap.',
          },
        ].map(item => (
          <div key={item.title} className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '24px', flexShrink: 0 }}>{item.icon}</div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '6px',
                color: 'var(--text)',
              }}>
                {item.title}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
