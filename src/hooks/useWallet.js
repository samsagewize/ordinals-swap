import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { request, AddressPurpose } from 'sats-connect';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('ordinalswap_wallet');
    if (saved) {
      try { setWallet(JSON.parse(saved)); }
      catch (_) { localStorage.removeItem('ordinalswap_wallet'); }
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const response = await request('wallet_connect', {
        addresses: [AddressPurpose.Ordinals, AddressPurpose.Payment],
        message: 'OrdinalSwap needs your Bitcoin addresses to facilitate trustless P2P trades.',
      });
      if (response.status === 'success') {
        const ordinals = response.result.addresses.find(a => a.purpose === AddressPurpose.Ordinals);
        const payment = response.result.addresses.find(a => a.purpose === AddressPurpose.Payment);
        const walletData = {
          ordinalsAddress: ordinals?.address,
          paymentAddress: payment?.address,
          publicKey: ordinals?.publicKey,
        };
        setWallet(walletData);
        localStorage.setItem('ordinalswap_wallet', JSON.stringify(walletData));
      } else {
        throw new Error(response.error?.message || 'Wallet connection rejected');
      }
    } catch (err) {
      setError(err?.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try { await request('wallet_disconnect', null); } catch (_) {}
    setWallet(null);
    localStorage.removeItem('ordinalswap_wallet');
  }, []);

  const shortAddress = wallet?.ordinalsAddress
    ? `${wallet.ordinalsAddress.slice(0, 6)}...${wallet.ordinalsAddress.slice(-4)}`
    : null;

  return (
    <WalletContext.Provider value={{ wallet, connecting, error, connect, disconnect, shortAddress, isConnected: !!wallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
