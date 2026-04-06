import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const WalletContext = createContext(null);

/**
 * Xverse wallet provider API reference:
 * https://docs.xverse.app/sats-connect
 * 
 * This hook connects to the Xverse wallet via the SatsConnect / window.BitcoinProvider API.
 * It requests wallet addresses and handles the connection state.
 */

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null); // { ordinalsAddress, paymentAddress, publicKey }
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Check if already connected on mount (persisted in localStorage)
  useEffect(() => {
    const saved = localStorage.getItem('ordinalswap_wallet');
    if (saved) {
      try {
        setWallet(JSON.parse(saved));
      } catch (_) {
        localStorage.removeItem('ordinalswap_wallet');
      }
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);

    try {
      // Check if Xverse is installed
      if (!window.XverseProviders?.BitcoinProvider && !window.BitcoinProvider) {
        throw new Error('Xverse wallet not found. Please install the Xverse browser extension.');
      }

      // Use SatsConnect to request addresses
      // SatsConnect is the standard interface Xverse exposes
      const { default: SatsConnect } = await import('@sats-connect/core').catch(() => null);

      if (SatsConnect) {
        // Real SatsConnect flow (when package is installed)
        await new Promise((resolve, reject) => {
          SatsConnect.request('getAccounts', {
            purposes: ['ordinals', 'payment'],
            message: 'OrdinalSwap needs your Bitcoin addresses to facilitate trustless trades.',
          }, (response) => {
            if (response.status === 'success') {
              const ordinals = response.result.find(a => a.purpose === 'ordinals');
              const payment = response.result.find(a => a.purpose === 'payment');
              const walletData = {
                ordinalsAddress: ordinals?.address,
                paymentAddress: payment?.address,
                publicKey: ordinals?.publicKey,
              };
              setWallet(walletData);
              localStorage.setItem('ordinalswap_wallet', JSON.stringify(walletData));
              resolve();
            } else {
              reject(new Error(response.error?.message || 'Wallet connection rejected'));
            }
          });
        });
      } else {
        // Fallback: try window.BitcoinProvider directly
        const accounts = await window.BitcoinProvider?.requestAccounts?.();
        if (accounts && accounts.length > 0) {
          const walletData = {
            ordinalsAddress: accounts[0],
            paymentAddress: accounts[0],
            publicKey: null,
          };
          setWallet(walletData);
          localStorage.setItem('ordinalswap_wallet', JSON.stringify(walletData));
        } else {
          throw new Error('No accounts returned from wallet');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    localStorage.removeItem('ordinalswap_wallet');
  }, []);

  const shortAddress = wallet?.ordinalsAddress
    ? `${wallet.ordinalsAddress.slice(0, 6)}...${wallet.ordinalsAddress.slice(-4)}`
    : null;

  return (
    <WalletContext.Provider value={{
      wallet,
      connecting,
      error,
      connect,
      disconnect,
      shortAddress,
      isConnected: !!wallet,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
