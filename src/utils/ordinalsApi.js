/**
 * Ordinals API utilities
 * Uses the Hiro Systems Ordinals API (free, no auth required for basic usage)
 * Docs: https://docs.hiro.so/ordinals
 */

const HIRO_API = 'https://api.hiro.so/ordinals/v1';
const HIRO_CONTENT = 'https://api.hiro.so/ordinals/v1/inscriptions';

/**
 * Fetch all inscriptions owned by a given Bitcoin address
 */
export async function fetchInscriptionsByAddress(address, { limit = 20, offset = 0 } = {}) {
  const url = `${HIRO_API}/inscriptions?address=${address}&limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch inscriptions: ${res.statusText}`);
  const data = await res.json();
  return data; // { total: number, results: Inscription[] }
}

/**
 * Fetch a single inscription by ID
 */
export async function fetchInscription(inscriptionId) {
  const url = `${HIRO_API}/inscriptions/${inscriptionId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch inscription ${inscriptionId}`);
  return await res.json();
}

/**
 * Get the content URL for an inscription (image, text, etc.)
 */
export function getInscriptionContentUrl(inscriptionId) {
  return `${HIRO_CONTENT}/${inscriptionId}/content`;
}

/**
 * Get the thumbnail/preview URL for an inscription
 */
export function getInscriptionPreviewUrl(inscriptionId) {
  // Ordinals.com also provides previews
  return `https://ordinals.com/preview/${inscriptionId}`;
}

/**
 * Check if a content type is an image
 */
export function isImageType(contentType) {
  return contentType?.startsWith('image/');
}

/**
 * Check if a content type is text/HTML
 */
export function isTextType(contentType) {
  return contentType?.startsWith('text/');
}

/**
 * Format an inscription ID for display (truncated)
 */
export function formatInscriptionId(id) {
  if (!id) return '';
  return `${id.slice(0, 8)}...${id.slice(-6)}`;
}

/**
 * Format a Bitcoin address for display
 */
export function formatAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

/**
 * Get explorer URL for a transaction
 */
export function getTxExplorerUrl(txid) {
  return `https://mempool.space/tx/${txid}`;
}

/**
 * Get explorer URL for an inscription
 */
export function getInscriptionExplorerUrl(inscriptionId) {
  return `https://ordinals.com/inscription/${inscriptionId}`;
}
