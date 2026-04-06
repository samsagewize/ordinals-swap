/**
 * PSBT utilities for Ordinals atomic swaps
 *
 * Fee structure:
 * - Input 0: Initiator's inscription UTXO
 * - Input 1: Initiator's payment UTXO (covers dust + platform fee + network fee)
 * - Input 2: Counterparty's inscription UTXO
 * - Output 0: Initiator receives counterparty's inscription (546 sats dust)
 * - Output 1: Counterparty receives initiator's inscription (546 sats dust)
 * - Output 2: Platform fee → 3FxKYyYJcxn6Tx2RvQM8szTzYKTQYskgWq (2000 sats)
 * - Output 3: Change back to initiator (remainder after fees)
 *
 * The initiator pays:
 *   - 546 sats dust to carry their inscription to counterparty
 *   - 2000 sats platform fee
 *   - Bitcoin network miner fee (~500-2000 sats depending on mempool)
 */

const PLATFORM_FEE_ADDRESS = '3FxKYyYJcxn6Tx2RvQM8szTzYKTQYskgWq';
const PLATFORM_FEE_SATS = 2000;
const DUST_LIMIT = 546;
const ESTIMATED_NETWORK_FEE = 1500; // sats, conservative estimate

export async function buildSwapPsbt({
  initiatorInscription,
  initiatorPaymentUtxo,       // { txid, vout, value } — initiator's BTC UTXO to pay fees
  counterpartyInscription,
}) {
  const bitcoin = await import('bitcoinjs-lib');
  const network = bitcoin.networks.bitcoin;
  const psbt = new bitcoin.Psbt({ network });

  // ── Inputs ──────────────────────────────────────────────────────

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

  // Input 1 — initiator's payment UTXO (funds the fee outputs)
  if (initiatorPaymentUtxo) {
    psbt.addInput({
      hash: initiatorPaymentUtxo.txid,
      index: initiatorPaymentUtxo.vout,
      witnessUtxo: {
        script: bitcoin.address.toOutputScript(initiatorInscription.paymentAddress, network),
        value: initiatorPaymentUtxo.value,
      },
    });
  }

  // Input 2 — counterparty's inscription UTXO
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

  // ── Outputs ─────────────────────────────────────────────────────

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

  // Output 2 — platform fee paid by initiator
  psbt.addOutput({
    address: PLATFORM_FEE_ADDRESS,
    value: PLATFORM_FEE_SATS,
  });

  // Output 3 — change back to initiator's payment address
  if (initiatorPaymentUtxo) {
    const totalIn = initiatorInscription.utxo.value + initiatorPaymentUtxo.value;
    const totalOut = DUST_LIMIT + DUST_LIMIT + PLATFORM_FEE_SATS;
    const change = totalIn - totalOut - ESTIMATED_NETWORK_FEE;
    if (change > DUST_LIMIT) {
      psbt.addOutput({
        address: initiatorInscription.paymentAddress,
        value: change,
      });
    }
  }

  return psbt.toBase64();
}

export async function signPsbtWithXverse(psbtBase64, inputIndexes, address) {
  return new Promise(async (resolve, reject) => {
    try {
      const { request } = await import('sats-connect');
      const response = await request('signPsbt', {
        psbt: psbtBase64,
        inputsToSign: [
          {
            address,
            signingIndexes: inputIndexes, // array e.g. [0, 1] for initiator, [2] for counterparty
            sigHash: 0x01,
          },
        ],
        broadcast: false,
        message: 'Sign to authorize your side of the Ordinals swap.',
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
  return { txid, vout: parseInt(vout), value: data.value };
}

/**
 * Fetch the initiator's payment UTXOs to fund the fee.
 * Picks the smallest UTXO that covers the required amount.
 */
export async function fetchPaymentUtxo(paymentAddress, minValue = PLATFORM_FEE_SATS + DUST_LIMIT + ESTIMATED_NETWORK_FEE) {
  const res = await fetch(`https://api-3.xverse.app/v1/address/${paymentAddress}/utxo`);
  if (!res.ok) throw new Error('Failed to fetch payment UTXOs');
  const data = await res.json();

  const suitable = (data.results || [])
    .filter(u => u.value >= minValue && !u.inscriptions?.length) // don't spend inscription UTXOs
    .sort((a, b) => a.value - b.value); // pick smallest that covers cost

  if (!suitable.length) {
    throw new Error(`Insufficient BTC to pay the 2,000 sat platform fee. Need at least ${minValue} sats in your payment address.`);
  }

  return { txid: suitable[0].tx_hash, vout: suitable[0].vout, value: suitable[0].value };
}

export { PLATFORM_FEE_SATS, PLATFORM_FEE_ADDRESS, ESTIMATED_NETWORK_FEE, DUST_LIMIT };
