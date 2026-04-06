import React, { useState } from 'react';
import { getInscriptionContentUrl, formatInscriptionId, getInscriptionExplorerUrl, isImageType } from '../utils/ordinalsApi';

export default function InscriptionCard({ inscription, selected = false, onSelect, showDetails = false, compact = false }) {
  const [imgError, setImgError] = useState(false);
  const contentUrl = getInscriptionContentUrl(inscription.id);
  const isImage = isImageType(inscription.content_type);

  return (
    <div
      onClick={onSelect ? () => onSelect(inscription) : undefined}
      style={{
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        background: selected ? 'var(--accent-dim)' : 'var(--bg-card)',
        cursor: onSelect ? 'pointer' : 'default',
        overflow: 'hidden',
        transition: 'all 0.15s',
        boxShadow: selected ? `0 0 0 1px var(--accent), 0 4px 20px var(--accent-glow)` : 'none',
      }}
      onMouseEnter={e => { if (!selected && onSelect) { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
      onMouseLeave={e => { if (!selected && onSelect) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}}
    >
      <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        {isImage && !imgError ? (
          <img src={contentUrl} alt={`Inscription #${inscription.number}`} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : inscription.content_type?.startsWith('text/html') ? (
          <iframe src={contentUrl} title={`Inscription #${inscription.number}`} style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }} sandbox="allow-scripts" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '11px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px' }}>
              {inscription.content_type?.startsWith('text/') ? '📄' : inscription.content_type?.startsWith('audio/') ? '🎵' : inscription.content_type?.startsWith('video/') ? '🎬' : '📦'}
            </div>
            <div>{inscription.content_type || 'Unknown'}</div>
          </div>
        )}
        {selected && (
          <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--accent)', color: '#000', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>✓</div>
        )}
      </div>
      <div style={{ padding: compact ? '10px 12px' : '14px 16px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: compact ? '11px' : '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
          #{inscription.number?.toLocaleString() ?? '—'}
        </div>
        {!compact && (
          <>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>{formatInscriptionId(inscription.id)}</div>
            {showDetails && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                <span className="tag tag-gray">{inscription.content_type?.split(';')[0] || 'unknown'}</span>
                {inscription.sat_rarity && inscription.sat_rarity !== 'common' && <span className="tag tag-orange">{inscription.sat_rarity}</span>}
              </div>
            )}
            <a href={getInscriptionExplorerUrl(inscription.id)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-block', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              View on ordinals.com ↗
            </a>
          </>
        )}
      </div>
    </div>
  );
}
