import React, { useState, useEffect } from 'react';
import { fetchInscriptionsByAddress } from '../utils/ordinalsApi';
import InscriptionCard from './InscriptionCard';

export default function InscriptionPicker({ address, onSelect, selectedId }) {
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 12;

  useEffect(() => {
    if (!address) return;
    loadInscriptions(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  async function loadInscriptions(pageNum) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInscriptionsByAddress(address, {
        limit: PAGE_SIZE,
        offset: pageNum * PAGE_SIZE,
      });
      setInscriptions(data.results || []);
      setTotal(data.total || 0);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading inscriptions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-card)',
      }}>
        <div style={{ color: 'var(--red)', marginBottom: '12px' }}>⚠ {error}</div>
        <button className="btn btn-secondary" onClick={() => loadInscriptions(0)}>
          Retry
        </button>
      </div>
    );
  }

  if (inscriptions.length === 0) {
    return (
      <div style={{
        padding: '48px 32px',
        textAlign: 'center',
        border: '1px dashed var(--border)',
        borderRadius: 'var(--radius-lg)',
        color: 'var(--text-muted)',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', marginBottom: '8px' }}>
          No inscriptions found
        </div>
        <div style={{ fontSize: '12px' }}>
          This address doesn't hold any Ordinal inscriptions yet.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {total} inscription{total !== 1 ? 's' : ''} found
          {selectedId && <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>• 1 selected</span>}
        </span>
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
            <button
              className="btn btn-ghost"
              disabled={page === 0}
              onClick={() => loadInscriptions(page - 1)}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              ← Prev
            </button>
            <span style={{ color: 'var(--text-muted)' }}>{page + 1} / {totalPages}</span>
            <button
              className="btn btn-ghost"
              disabled={page >= totalPages - 1}
              onClick={() => loadInscriptions(page + 1)}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '12px',
      }}>
        {inscriptions.map(inscription => (
          <InscriptionCard
            key={inscription.id}
            inscription={inscription}
            selected={inscription.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
