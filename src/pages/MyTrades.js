import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useTrades } from '../hooks/useTrades';
import { formatAddress, formatInscriptionId } from '../utils/ordinalsApi';

const STATUS_STYLES = {
  created: { color: 'var(--text-muted)', label: 'Pending' },
  awaiting_counterparty: { color: 'var(--accent)', label: 'Awaiting Signatures' },
  both_signed: { color: 'var(--green)', label: 'Ready to Broadcast' },
  broadcast: { color: 'var(--accent)', label: 'Broadcasting' },
  completed: { color: 'var(--green)', label: 'Completed' },
  cancelled: { color: 'var(--red)', label: 'Cancelled' },
};

export default function MyTrades() {
  const { wallet, connect, connecting } = useWallet();
  const { myTrades } = useTrades();

  if (!wallet) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 32px', textAlign: 'center' }}>
        <div className="card">
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔌</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '12px' }}>
            Connect to View Trades
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '13px' }}>
            Connect your Xverse wallet to see your active and past trades.
          </p>
          <button onClick={connect} disabled={connecting} className="btn btn-primary">
            {connecting ? 'Connecting...' : 'Connect Xverse'}
          </button>
        </div>
      </div>
    );
  }

  const trades = myTrades(wallet.ordinalsAddress);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 32px' }}>
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '11px',
            letterSpacing: '0.15em',
            color: 'var(--accent)',
            marginBottom: '8px',
            textTransform: 'uppercase',
          }}>
            My Trades
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700 }}>
            Trade History
          </h1>
        </div>
        <Link to="/create" className="btn btn-primary">
          + New Trade
        </Link>
      </div>

      {trades.length === 0 ? (
        <div style={{
          padding: '80px 32px',
          textAlign: 'center',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '8px' }}>
            No trades yet
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
            Create your first trade or accept one via a shared link.
          </p>
          <Link to="/create" className="btn btn-primary">
            Create First Trade
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {trades.map(trade => {
            const isInitiator = trade.initiator?.address === wallet.ordinalsAddress;
            const myInscription = isInitiator ? trade.initiator : trade.counterparty;
            const theirInscription = isInitiator ? trade.counterparty : trade.initiator;
            const statusStyle = STATUS_STYLES[trade.status] || STATUS_STYLES.created;

            return (
              <Link
                key={trade.id}
                to={`/trade/${trade.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr auto auto',
                  gap: '16px',
                  alignItems: 'center',
                  padding: '20px 24px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  transition: 'all 0.15s',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--border-bright)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                {/* My inscription */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    background: 'var(--bg)',
                    flexShrink: 0,
                  }}>
                    {myInscription && (
                      <img
                        src={`https://api.hiro.so/ordinals/v1/inscriptions/${myInscription.inscriptionId}/content`}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => e.target.style.display = 'none'}
                      />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                      {isInitiator ? 'You offer' : 'You accepted with'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600 }}>
                      #{myInscription?.inscriptionNumber?.toLocaleString() ?? '—'}
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ color: 'var(--accent)', fontSize: '18px' }}>⇄</div>

                {/* Their inscription */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    background: 'var(--bg)',
                    flexShrink: 0,
                  }}>
                    {theirInscription && (
                      <img
                        src={`https://api.hiro.so/ordinals/v1/inscriptions/${theirInscription.inscriptionId}/content`}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => e.target.style.display = 'none'}
                      />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                      For
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600 }}>
                      {theirInscription
                        ? `#${theirInscription.inscriptionNumber?.toLocaleString()}`
                        : <span style={{ color: 'var(--text-muted)' }}>Pending...</span>
                      }
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: statusStyle.color,
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}>
                  {statusStyle.label}
                </div>

                {/* Arrow */}
                <div style={{ color: 'var(--text-muted)' }}>→</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
