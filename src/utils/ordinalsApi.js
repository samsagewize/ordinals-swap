/**
 * Ordinals API utilities
 * Uses the Xverse API (replaces Hiro which is deprecated March 2026)
 * Docs: https://docs.xverse.app/api
 */

const XVERSE_API = 'https://api-3.xverse.app/v1';

// ── Security helpers ──────────────────────────────────────────────

/**
 * Validate a Bitcoin address looks legitimate before sending to API.
 * Accepts mainnet bech32 (bc1p / bc1q) and legacy (1.../3...) formats.
 */
export function isValidBitcoinAddress(address) {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  // Taproot (bc1p...), native segwit (bc1q...), legacy (1...) or P2SH (3...)
  return /^(bc1p|bc1q)[a-z0-9]{25,87}$/.test(trimmed) ||
         /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed);
}

/**
 * Sanitize an inscription ID — must be a 64-char hex txid + 'i' + index.
 */
export function isValidInscriptionId(id) {
  if (!address || typeof id !== 'string') return false;
  return /^[a-f0-9]{64}i[0-9]+$/.test(id.trim());
}

/**
 * Rate limiter — tracks API calls per address to prevent abuse.
 */
const _rateLimitMap = new Map();
export function checkRateLimit(address, maxPerMinute = 10) {
  const now = Date.now();
  const key = address.slice(0, 12);
  const entry = _rateLimitMap.get(key) || { count: 0, resetAt: now + 60000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60000; }
  entry.count++;
  _rateLimitMap.set(key, entry);
  if (entry.count > maxPerMinute) throw new Error('Too many requests. Please wait a moment.');
}

// ── Xverse API calls ──────────────────────────────────────────────

/**
 * Fetch all inscription UTXOs for a Bitcoin address using the Xverse API.
 * Returns an array of inscription objects.
 */
export async function fetchInscriptionsByAddress(address, { limit = 20, offset = 0 } = {}) {
  if (!isValidBitcoinAddress(address)) {
    throw new Error('Invalid Bitcoin address');
  }
  checkRateLimit(address);

  const url = `${XVERSE_API}/address/${address}/ordinal-utxo?limit=${limit}&offset=${offset}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (res.status === 429) throw new Error('Rate limited by API. Please wait a moment.');
  if (!res.ok) throw new Error(`Failed to fetch inscriptions (${res.status})`);

  const data = await res.json();

  // Xverse API returns { results: [...], total: N }
  // Normalize each UTXO's inscriptions into a flat list
  const inscriptions = [];
  for (const utxo of (data.results || [])) {
    for (const ins of (utxo.inscriptions || [])) {
      inscriptions.push({
        id: ins.id,
        number: ins.inscription_number,
        content_type: ins.content_type,
        sat_rarity: ins.sat_rarity || 'common',
        utxo: {
          txid: utxo.tx_hash,
          vout: utxo.vout,
          value: utxo.value,
        },
      });
    }
  }

  return {
    results: inscriptions,
    total: data.total || inscriptions.length,
  };
}

/**
 * Fetch a single inscription's details by ID.
 */
export async function fetchInscription(inscriptionId) {
  const url = `${XVERSE_API}/ordinals/inscription/${inscriptionId}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`Failed to fetch inscription ${inscriptionId}`);
  return await res.json();
}

/**
 * Get the content URL for rendering an inscription image/text.
 * Falls back to ordinals.com if Xverse CDN doesn't have it.
 */
export function getInscriptionContentUrl(inscriptionId) {
  return `https://ord-mirror.magiceden.dev/content/${inscriptionId}`;
}

export function isImageType(contentType) {
  return contentType?.startsWith('image/');
}

export function isTextType(contentType) {
  return contentType?.startsWith('text/');
}

export function formatInscriptionId(id) {
  if (!id) return '';
  return `${id.slice(0, 8)}...${id.slice(-6)}`;
}

export function formatAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function getTxExplorerUrl(txid) {
  return `https://mempool.space/tx/${txid}`;
}

export function getInscriptionExplorerUrl(inscriptionId) {
  return `https://ordinals.com/inscription/${inscriptionId}`;
}
