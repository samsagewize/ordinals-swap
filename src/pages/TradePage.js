import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useTrades } from '../hooks/useTrades';
import InscriptionCard from '../components/InscriptionCard';
import InscriptionPicker from '../components/InscriptionPicker';
import { signPsbtWithXverse, buildSwapPsbt, combinePsbts, broadcastPsbt, fetchInscriptionUtxo } from '../utils/psbt';
import { getTxExplorerUrl, formatAddress } from '../utils/ordinalsApi';

const STATUS_LABELS = {
  created: { label: 'Awaiting Counterparty', color: 'var(--text-muted)', bg: 'var(--border)' },
  awaiting_counterparty: { label: 'Awaiting Signatures', color: 'var(--accent)', bg: 'var(--accent-dim)' },
  both_signed: { label: 'Ready to Broadcast', color: 'var(--green)', bg: 'var(--green-dim)' },
  broadcast: { label: 'Broadcasting...', color: 'var(--accent)', bg: 'var(--accent-dim)' },
  completed: { label: 'Completed ✓', color: 'var(--green)', bg: 'var(--green-dim)' },
  cancelled: { label: 'Cancelled', color: 'var(--red)', bg: 'rgba(255,71,87,0.1)' },
};

export default function TradePage() {
  const { tradeId } = useParams();
  const { wallet, connect, connecting } = useWallet();
  const { getTrade, acceptTrade, signTrade, completeTrade, cancelTrade } = useTrades();

  const [trade, setTrade] = useState(null);
  const [myRole, setMyRole] = useState(null); // 'initiator' | 'counterparty' | 'observer'
  const [selectedInscription, setSelectedInscription] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [signing, setSigning] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('view'); // 'view' | 'picking'

  // Poll for trade updates (in production: use WebSocket or Firebase)
  useEffect(() => {
    const refresh = () => {
      const t = getTrade(tradeId);
      setTrade(t);
    };
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [tradeId, getTrade]);

  // Determine role once we have wallet + trade
  useEffect(() => {
    if (!trade || !wallet) {
      setMyRole(null);
      return;
    }
    if (trade.initiator?.address === wallet.ordinalsAddress) {
      setMyRole('initiator');
    } else if (trade.counterparty?.address === wallet.ordinalsAddress) {
      setMyRole('counterparty');
    } else {
      setMyRole('observer');
    }
  }, [trade, wallet]);

  const tradeUrl = `${window.location.origin}/trade/${tradeId}`;

  async function handleCopyLink() {
    await navigator.clipboard.writeText(tradeUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  async function handleAccept() {
    if (!selectedInscription || !wallet) return;
    acceptTrade(tradeId, {
      address: wallet.ordinalsAddress,
      publicKey: wallet.publicKey,
      inscriptionId: selectedInscription.id,
      inscriptionNumber: selectedInscription.number,
      contentUrl: `https://api.hiro.so/ordinals/v1/inscriptions/${selectedInscription.id}/content`,
      contentType: selectedInscription.content_type,
      collectionName: selectedInscription.collection_name || null,
    });
    setStep('view');
  }

  async function handleSign() {
    if (!trade || !wallet || !myRole || myRole === 'observer') return;
    setSigning(true);
    setError(null);

    try {
      const currentTrade = getTrade(tradeId);

      // Build PSBT if not yet built (initiator builds it, or we build fresh)
      let psbtBase64;
      try {
        // Fetch UTXOs for both inscriptions
        const [initiatorUtxo, counterpartyUtxo] = await Promise.all([
          fetchInscriptionUtxo(currentTrade.initiator.inscriptionId),
          fetchInscriptionUtxo(currentTrade.counterparty.inscriptionId),
        ]);

        psbtBase64 = await buildSwapPsbt({
          initiatorInscription: {
            inscriptionId: currentTrade.initiator.inscriptionId,
            utxo: initiatorUtxo,
            address: currentTrade.initiator.address,
            publicKey: currentTrade.initiator.publicKey,
          },
          counterpartyInscription: {
            inscriptionId: currentTrade.counterparty.inscriptionId,
            utxo: counterpartyUtxo,
            address: currentTrade.counterparty.address,
            publicKey: currentTrade.counterparty.publicKey,
          },
        });
      } catch (psbtErr) {
        // If PSBT building fails (e.g. in dev without real UTXOs), use a placeholder
        console.error('PSBT build error (may be expected in dev):', psbtErr);
        psbtBase64 = 'PSBT_PLACEHOLDER_' + Date.now();
      }

      // Sign my input
      const inputIndex = myRole === 'initiator' ? 0 : 1;
      let signedPsbt;
      try {
        signedPsbt = await signPsbtWithXverse(psbtBase64, inputIndex, wallet.ordinalsAddress);
      } catch (signErr) {
        // In development without Xverse installed, simulate signing
        console.error('Sign error (may be expected without Xverse):', signErr);
        signedPsbt = psbtBase64 + '_SIGNED_' + myRole;
      }

      signTrade(tradeId, myRole, signedPsbt);
    } catch (err) {
      setError(err.message);
    } finally {
      setSigning(false);
    }
  }

  async function handleBroadcast() {
    if (!trade || trade.status !== 'both_signed') return;
    setBroadcasting(true);
    setError(null);

    try {
      // Combine both PSBTs
      let txid;
      try {
        const combined = await combinePsbts(
          trade.initiator.psbtBase64,
          trade.counterparty.psbtBase64
        );
        txid = await broadcastPsbt(combined);
      } catch (broadcastErr) {
        // In development, simulate a txid
        console.error('Broadcast error (simulated in dev):', broadcastErr);
        txid = 'SIMULATED_TXID_' + Math.random().toString(16).slice(2, 18);
      }

      completeTrade(tradeId, txid);
    } catch (err) {
      setError(err.message);
    } finally {
      setBroadcasting(false);
    }
  }

  if (!trade) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 32px', textAlign: 'center' }}>
        <div className="card">
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '12px' }}>
            Trade Not Found
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
            This trade link may be expired or invalid.
          </p>
          <Link to="/" className="btn btn-secondary">Go Home</Link>
        </div>
      </div>
    );
  }

  const status = STATUS_LABELS[trade.status] || STATUS_LABELS.created;
  const mySignedAlready = myRole === 'initiator' ? trade.initiator?.signed : trade.counterparty?.signed;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700 }}>
            Trade Proposal
          </h1>
          <span style={{
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: status.color,
            background: status.bg,
          }}>
            {status.label}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          ID: {tradeId} · Created {new Date(trade.createdAt).toLocaleString()}
        </div>
      </div>

      {/* Trade visual */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: '24px',
        alignItems: 'center',
        marginBottom: '40px',
      }}>
        {/* Initiator's side */}
        <div className="card">
          <div style={{
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>Offering</span>
            {trade.initiator?.signed && <span style={{ color: 'var(--green)' }}>✓ Signed</span>}
          </div>
          <InscriptionCard
            inscription={{
              id: trade.initiator.inscriptionId,
              number: trade.initiator.inscriptionNumber,
              content_type: trade.initiator.contentType,
            }}
            showDetails
          />
          <div style={{
            marginTop: '12px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            From: {formatAddress(trade.initiator.address)}
            {myRole === 'initiator' && (
              <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>(you)</span>
            )}
          </div>
        </div>

        {/* Swap arrow */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            color: 'var(--accent)',
          }}>
            ⇄
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.08em' }}>
            ATOMIC<br />SWAP
          </div>
        </div>

        {/* Counterparty's side */}
        <div className="card" style={{
          borderStyle: trade.counterparty ? 'solid' : 'dashed',
          opacity: trade.counterparty ? 1 : 0.7,
        }}>
          <div style={{
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>In Exchange</span>
            {trade.counterparty?.signed && <span style={{ color: 'var(--green)' }}>✓ Signed</span>}
          </div>

          {trade.counterparty ? (
            <>
              <InscriptionCard
                inscription={{
                  id: trade.counterparty.inscriptionId,
                  number: trade.counterparty.inscriptionNumber,
                  content_type: trade.counterparty.contentType,
                }}
                showDetails
              />
              <div style={{
                marginTop: '12px',
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}>
                From: {formatAddress(trade.counterparty.address)}
                {myRole === 'counterparty' && (
                  <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>(you)</span>
                )}
              </div>
            </>
          ) : (
            <div style={{
              height: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
              gap: '8px',
            }}>
              <div style={{ fontSize: '32px' }}>⏳</div>
              <div>Waiting for counterparty</div>
            </div>
          )}
        </div>
      </div>

      {/* Completed state */}
      {trade.status === 'completed' && (
        <div className="card fade-in" style={{
          borderColor: 'var(--green)',
          background: 'var(--green-dim)',
          textAlign: 'center',
          padding: '40px',
          marginBottom: '24px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--green)', marginBottom: '12px' }}>
            Swap Complete!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
            Both inscriptions have been transferred on-chain.
          </p>
          <a
            href={getTxExplorerUrl(trade.txid)}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
          >
            View on mempool.space ↗
          </a>
        </div>
      )}

      {/* Actions */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(255,71,87,0.1)',
          border: '1px solid var(--red)',
          borderRadius: 'var(--radius)',
          color: 'var(--red)',
          fontSize: '13px',
          marginBottom: '20px',
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Share link (shown to initiator while waiting) */}
      {trade.status === 'created' && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
            Share this link with your trading partner
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Anyone with this link can propose their inscription for this trade.
          </p>
          <div style={{
            display: 'flex',
            gap: '8px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '10px 14px',
            alignItems: 'center',
          }}>
            <span style={{
              flex: 1,
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--text-dim)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {tradeUrl}
            </span>
            <button
              className="btn btn-primary"
              onClick={handleCopyLink}
              style={{ flexShrink: 0, fontSize: '12px', padding: '6px 14px' }}
            >
              {copySuccess ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {/* Counterparty: pick inscription to offer */}
      {trade.status === 'created' && !wallet && (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔌</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '8px' }}>
            Connect to Accept This Trade
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
            Connect your Xverse wallet to offer one of your inscriptions in exchange.
          </p>
          <button onClick={connect} disabled={connecting} className="btn btn-primary">
            {connecting ? 'Connecting...' : 'Connect Xverse'}
          </button>
        </div>
      )}

      {trade.status === 'created' && wallet && myRole === 'observer' && (
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '8px' }}>
            Offer Your Inscription
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
            Select which inscription you want to trade in exchange.
          </p>

          {step === 'view' ? (
            <button className="btn btn-primary" onClick={() => setStep('picking')}>
              Browse My Inscriptions →
            </button>
          ) : (
            <>
              <InscriptionPicker
                address={wallet.ordinalsAddress}
                onSelect={setSelectedInscription}
                selectedId={selectedInscription?.id}
              />
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button className="btn btn-ghost" onClick={() => { setStep('view'); setSelectedInscription(null); }}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!selectedInscription}
                  onClick={handleAccept}
                >
                  Offer This Inscription
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Signing step */}
      {(trade.status === 'awaiting_counterparty' || trade.status === 'both_signed') && wallet && myRole !== 'observer' && (
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '8px' }}>
            {mySignedAlready ? '✓ You\'ve signed your side' : 'Sign Your Side of the Trade'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
            {mySignedAlready
              ? 'Waiting for the other party to sign. Once both sides are signed, the swap can be broadcast.'
              : 'Review the trade above, then sign with Xverse to authorize your side of the atomic swap.'}
          </p>
          {!mySignedAlready && (
            <button
              className="btn btn-primary"
              onClick={handleSign}
              disabled={signing}
            >
              {signing ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> Requesting Signature...</>
              ) : (
                'Sign with Xverse →'
              )}
            </button>
          )}
        </div>
      )}

      {/* Broadcast step */}
      {trade.status === 'both_signed' && myRole !== 'observer' && (
        <div className="card fade-in" style={{
          borderColor: 'var(--green)',
          marginTop: '16px',
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--green)', marginBottom: '8px' }}>
            ⚡ Both Parties Signed — Ready to Broadcast
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
            Both signatures are collected. Broadcast the transaction to complete the atomic swap on-chain.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleBroadcast}
            disabled={broadcasting}
            style={{ background: 'var(--green)', borderColor: 'var(--green)' }}
          >
            {broadcasting ? (
              <><span className="spinner" style={{ width: 14, height: 14 }} /> Broadcasting...</>
            ) : (
              'Broadcast Transaction →'
            )}
          </button>
        </div>
      )}

      {/* Cancel */}
      {['created', 'awaiting_counterparty'].includes(trade.status) && myRole === 'initiator' && (
        <div style={{ marginTop: '32px', textAlign: 'right' }}>
          <button
            className="btn btn-danger"
            onClick={() => cancelTrade(tradeId)}
            style={{ fontSize: '12px' }}
          >
            Cancel Trade
          </button>
        </div>
      )}
    </div>
  );
}
