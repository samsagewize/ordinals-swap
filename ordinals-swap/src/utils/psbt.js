/**
 * PSBT (Partially Signed Bitcoin Transaction) utilities for Ordinals atomic swaps
 * 
 * How an Ordinals swap works via PSBT:
 * 
 * 1. Both parties identify the UTXOs holding their inscriptions
 * 2. A PSBT is constructed with:
 *    - Input 0: UTXO from Initiator containing their inscription
 *    - Input 1: UTXO from Counterparty containing their inscription
 *    - Output 0: Initiator's ordinals address (receives counterparty's inscription)
 *    - Output 1: Counterparty's ordinals address (receives initiator's inscription)
 * 3. Each party signs their respective input using Xverse's signPsbt
 * 4. The signatures are combined into a final PSBT
 * 5. The final PSBT is broadcast to the Bitcoin network
 * 
 * This is an ATOMIC swap - either both inscriptions move or neither does.
 * No trust required between parties.
 */

/**
 * Build an unsigned PSBT for an Ordinals swap
 * 
 * In production this requires:
 * - bitcoinjs-lib for PSBT construction
 * - UTXO data from an Ordinals indexer (which satoshi the inscription is on)
 * - Both parties' Taproot public keys
 * 
 * @param {Object} params
 * @param {Object} params.initiatorInscription - { inscriptionId, utxo: { txid, vout, value }, address, publicKey }
 * @param {Object} params.counterpartyInscription - { inscriptionId, utxo: { txid, vout, value }, address, publicKey }
 * @returns {string} Base64-encoded unsigned PSBT
 */
export async function buildSwapPsbt({ initiatorInscription, counterpartyInscription }) {
  // Dynamic import of bitcoinjs-lib to avoid SSR issues
  const bitcoin = await import('bitcoinjs-lib');
  
  const network = bitcoin.networks.bitcoin; // mainnet
  const psbt = new bitcoin.Psbt({ network });

  // Add initiator's inscription UTXO as input
  psbt.addInput({
    hash: initiatorInscription.utxo.txid,
    index: initiatorInscription.utxo.vout,
    witnessUtxo: {
      script: bitcoin.address.toOutputScript(initiatorInscription.address, network),
      value: initiatorInscription.utxo.value,
    },
    // For Taproot (Xverse uses P2TR addresses starting with bc1p):
    tapInternalKey: initiatorInscription.publicKey
      ? Buffer.from(initiatorInscription.publicKey, 'hex').slice(1) // x-only pubkey
      : undefined,
  });

  // Add counterparty's inscription UTXO as input
  psbt.addInput({
    hash: counterpartyInscription.utxo.txid,
    index: counterpartyInscription.utxo.vout,
    witnessUtxo: {
      script: bitcoin.address.toOutputScript(counterpartyInscription.address, network),
      value: counterpartyInscription.utxo.value,
    },
    tapInternalKey: counterpartyInscription.publicKey
      ? Buffer.from(counterpartyInscription.publicKey, 'hex').slice(1)
      : undefined,
  });

  // Output 0: Initiator receives counterparty's inscription (dust value 546 sats minimum)
  psbt.addOutput({
    address: initiatorInscription.address,
    value: 546, // inscription dust limit
  });

  // Output 1: Counterparty receives initiator's inscription
  psbt.addOutput({
    address: counterpartyInscription.address,
    value: 546,
  });

  // Note: In a real implementation you'd also need to account for:
  // - Network fees (paid from one or both parties' payment UTXOs)
  // - The exact satoshi offset within the UTXO where the inscription lives

  return psbt.toBase64();
}

/**
 * Request Xverse to sign a specific input in a PSBT
 * Uses the SatsConnect signPsbt API
 * 
 * @param {string} psbtBase64 - Base64-encoded PSBT
 * @param {number} inputIndex - Which input index this wallet should sign
 * @param {string} address - The address whose input we're signing
 * @returns {string} Base64-encoded partially-signed PSBT
 */
export async function signPsbtWithXverse(psbtBase64, inputIndex, address) {
  return new Promise(async (resolve, reject) => {
    try {
      const SatsConnect = await import('@sats-connect/core').catch(() => null);
      
      if (!SatsConnect?.default) {
        // Fallback: try window.BitcoinProvider
        if (window.BitcoinProvider?.signPsbt) {
          const signed = await window.BitcoinProvider.signPsbt(psbtBase64, {
            inputsToSign: [{ address, signingIndexes: [inputIndex] }],
          });
          return resolve(signed);
        }
        throw new Error('Xverse signing API not found');
      }

      SatsConnect.default.request('signPsbt', {
        psbt: psbtBase64,
        inputsToSign: [
          {
            address,
            signingIndexes: [inputIndex],
            sigHash: 0x01, // SIGHASH_ALL
          },
        ],
        broadcast: false, // We'll broadcast manually after combining
        message: 'Sign to authorize your side of the Ordinals swap',
      }, (response) => {
        if (response.status === 'success') {
          resolve(response.result.psbt);
        } else {
          reject(new Error(response.error?.message || 'PSBT signing rejected'));
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Combine two partially-signed PSBTs into a fully-signed PSBT
 * (one signed by initiator, one signed by counterparty)
 * 
 * @param {string} psbt1Base64 - PSBT signed by initiator
 * @param {string} psbt2Base64 - PSBT signed by counterparty
 * @returns {string} Base64-encoded fully-signed PSBT
 */
export async function combinePsbts(psbt1Base64, psbt2Base64) {
  const bitcoin = await import('bitcoinjs-lib');
  
  const psbt1 = bitcoin.Psbt.fromBase64(psbt1Base64);
  const psbt2 = bitcoin.Psbt.fromBase64(psbt2Base64);
  
  psbt1.combine(psbt2);
  psbt1.finalizeAllInputs();
  
  return psbt1.toBase64();
}

/**
 * Broadcast a finalized PSBT to the Bitcoin network via mempool.space API
 * 
 * @param {string} psbtBase64 - Fully signed, finalized PSBT
 * @returns {string} Transaction ID (txid)
 */
export async function broadcastPsbt(psbtBase64) {
  const bitcoin = await import('bitcoinjs-lib');
  
  const psbt = bitcoin.Psbt.fromBase64(psbtBase64);
  const tx = psbt.extractTransaction();
  const txHex = tx.toHex();
  
  const res = await fetch('https://mempool.space/api/tx', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: txHex,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Broadcast failed: ${errText}`);
  }

  const txid = await res.text();
  return txid.trim();
}

/**
 * Fetch UTXO data for an inscription from the Hiro API
 * This tells us exactly which transaction output holds the inscription
 */
export async function fetchInscriptionUtxo(inscriptionId) {
  const res = await fetch(`https://api.hiro.so/ordinals/v1/inscriptions/${inscriptionId}`);
  if (!res.ok) throw new Error('Failed to fetch inscription UTXO data');
  const data = await res.json();
  
  // Parse the satpoint: txid:vout:offset
  const [txid, vout] = data.satpoint.split(':');
  
  return {
    txid,
    vout: parseInt(vout),
    value: data.value, // in satoshis
  };
}
