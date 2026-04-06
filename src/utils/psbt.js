/**
 * PSBT (Partially Signed Bitcoin Transaction) utilities for Ordinals atomic swaps
 *
 * Swap flow:
 * - Input 0: Initiator's inscription UTXO
 * - Input 1: Counterparty's inscription UTXO
 * - Output 0: Initiator receives counterparty's inscription (546 sats dust)
 * - Output 1: Counterparty receives initiator's inscription (546 sats dust)
 * - Output 2: Platform fee → 3FxKYyYJcxn6Tx2RvQM8szTzYKTQYskgWq (2000 sats)
 */

const PLATFORM_FEE_ADDRESS = '3FxKYyYJcxn6Tx2RvQM8szTzYKTQYskgWq';
const PLATFORM_FEE_SATS = 2000;
const DUST_LIMIT = 546;

export async function buildSwapPsbt({ initiatorInscription, counterpartyInscription }) {
  const bitcoin = await import('bitcoinjs-lib');
  const network = bitcoin.networks.bitcoin;
  const psbt = new bitcoin.Psbt({ network });

  // Input 0 — initiator's inscription UTXO
  psbt.addInput({
    hash: initiatorInscription.utxo.txid,
    index: initiatorInscription.utxo.vout,
    witnessUtxo: {
      script: bitcoin.address.toOutputScript(initiatorInscription.address, network),
      value: initiatorInscription.utxo.value,
    },
    tapInternalKey: initiatorInscription.publicKey
      ? Buffer.from(initiatorInscription.publicKey, 'hex').slice(1)
      : undefined,
  });

  // Input 1 — counterparty's inscription UTXO
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

  // Output 0 — initiator receives counterparty's inscription
  psbt.addOutput({
    address: initiatorInscription.address,
    value: DUST_LIMIT,
  });

  // Output 1 — counterparty receives initiator's inscription
  psbt.addOutput({
    address: counterpartyInscription.address,
    value: DUST_LIMIT,
  });

  // Output 2 — platform fee (2000 sats to OrdinalSwap)
  psbt.addOutput({
    address: PLATFORM_FEE_ADDRESS,
    value: PLATFORM_FEE_SATS,
  });

  return psbt.toBase64();
}

export async function signPsbtWithXverse(psbtBase64, inputIndex, address) {
  return new Promise(async (resolve, reject) => {
    try {
      const { request } = await import('sats-connect');
      const response = await request('signPsbt', {
        psbt: psbtBase64,
        inputsToSign: [
          {
            address,
            signingIndexes: [inputIndex],
            sigHash: 0x01,
          },
        ],
        broadcast: false,
        message: 'Sign to authorize your side of the Ordinals swap. A 2000 sat platform fee applies.',
      });

      if (response.status === 'success') {
        resolve(response.result.psbt);
      } else {
        reject(new Error(response.error?.message || 'PSBT signing rejected'));
      }
    } catch (err) {
      reject(err);
    }
  });
}

export async function combinePsbts(psbt1Base64, psbt2Base64) {
  const bitcoin = await import('bitcoinjs-lib');
  const psbt1 = bitcoin.Psbt.fromBase64(psbt1Base64);
  const psbt2 = bitcoin.Psbt.fromBase64(psbt2Base64);
  psbt1.combine(psbt2);
  psbt1.finalizeAllInputs();
  return psbt1.toBase64();
}

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

  return (await res.text()).trim();
}

export async function fetchInscriptionUtxo(inscriptionId) {
  const res = await fetch(`https://api-3.xverse.app/v1/ordinals/inscription/${inscriptionId}`);
  if (!res.ok) throw new Error('Failed to fetch inscription UTXO data');
  const data = await res.json();
  const [txid, vout] = data.satpoint.split(':');
  return {
    txid,
    vout: parseInt(vout),
    value: data.value,
  };
}

export { PLATFORM_FEE_SATS, PLATFORM_FEE_ADDRESS };
