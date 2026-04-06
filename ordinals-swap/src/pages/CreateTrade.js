import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useTrades } from '../hooks/useTrades';
import InscriptionPicker from '../components/InscriptionPicker';

export default function CreateTrade() {
  const navigate = useNavigate();
  const { wallet, connect, connecting } = useWallet();
  const { createTrade } = useTrades();
  const [selectedInscription, setSelectedInscription] = useState(null);
  const [creating, setCreating] = useState(false);

  if (!wallet) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 32px', textAlign: 'center' }}>
        <div className="card">
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔌</div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '20px',
            marginBottom: '12px',
            color: 'var(--text)',
          }}>
            Connect Your Wallet
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '13px' }}>
            Connect your Xverse wallet to browse your inscriptions and create a trade.
          </p>
          <button
            onClick={connect}
            disabled={connecting}
            className="btn btn-primary"
          >
            {connecting ? 'Connecting...' : 'Connect Xverse Wallet'}
          </button>
        </div>
      </div>
    );
  }

  async function handleCreate() {
    if (!selectedInscription) return;
    setCreating(true);
    try {
      const tradeId = createTrade({
        address: wallet.ordinalsAddress,
        publicKey: wallet.publicKey,
        inscriptionId: selectedInscription.id,
        inscriptionNumber: selectedInscription.number,
        contentUrl: `https://api.hiro.so/ordinals/v1/inscriptions/${selectedInscription.id}/content`,
        contentType: selectedInscription.content_type,
        collectionName: selectedInscription.collection_name || null,
      });
      navigate(`/trade/${tradeId}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '11px',
          letterSpacing: '0.15em',
          color: 'var(--accent)',
          marginBottom: '12px',
          textTransform: 'uppercase',
        }}>
          New Trade
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '28px',
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: '8px',
        }}>
          Select Your Inscription
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Choose the inscription you want to offer in the trade. Your counterparty will see this
          and offer one of their inscriptions in return.
        </p>
      </div>

      {/* Picker */}
      <div style={{ marginBottom: '48px' }}>
        <InscriptionPicker
          address={wallet.ordinalsAddress}
          onSelect={setSelectedInscription}
          selectedId={selectedInscription?.id}
        />
      </div>

      {/* Selected preview + action */}
      {selectedInscription && (
        <div
          className="card fade-in"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            border: '1px solid var(--accent)',
            background: 'var(--accent-dim)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              background: 'var(--bg)',
              flexShrink: 0,
            }}>
              <img
                src={`https://api.hiro.so/ordinals/v1/inscriptions/${selectedInscription.id}/content`}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => e.target.style.display = 'none'}
              />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '14px',
                color: 'var(--text)',
                marginBottom: '4px',
              }}>
                Inscription #{selectedInscription.number?.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {selectedInscription.content_type?.split(';')[0]}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setSelectedInscription(null)}
              className="btn btn-ghost"
              style={{ fontSize: '12px' }}
            >
              Change
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="btn btn-primary"
            >
              {creating ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> Creating Trade...</>
              ) : (
                'Create Trade & Get Link →'
              )}
            </button>
          </div>
        </div>
      )}

      {!selectedInscription && (
        <div style={{
          textAlign: 'center',
          padding: '24px',
          color: 'var(--text-muted)',
          fontSize: '13px',
        }}>
          Select an inscription above to continue
        </div>
      )}
    </div>
  );
}
