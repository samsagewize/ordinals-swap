import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const TradeContext = createContext(null);

/**
 * Trade status flow:
 * created → awaiting_counterparty → both_signed → broadcast → completed
 *                                 → cancelled
 * 
 * A trade object shape:
 * {
 *   id: string (UUID),
 *   createdAt: ISO string,
 *   status: 'created' | 'awaiting_counterparty' | 'both_signed' | 'broadcast' | 'completed' | 'cancelled',
 *   
 *   // Initiator side
 *   initiator: {
 *     address: string,
 *     publicKey: string,
 *     inscriptionId: string,
 *     inscriptionNumber: number,
 *     contentUrl: string,
 *     contentType: string,
 *     collectionName: string,
 *     signed: boolean,
 *     psbtBase64: string | null,
 *   },
 *   
 *   // Counterparty side (filled in when they accept)
 *   counterparty: {
 *     address: string,
 *     publicKey: string,
 *     inscriptionId: string,
 *     inscriptionNumber: number,
 *     contentUrl: string,
 *     contentType: string,
 *     collectionName: string,
 *     signed: boolean,
 *     psbtBase64: string | null,
 *   } | null,
 *   
 *   // Combined PSBT once both sides provide their partial signatures
 *   finalPsbtBase64: string | null,
 *   txid: string | null,
 * }
 */

export function TradeProvider({ children }) {
  const [trades, setTrades] = useState(() => {
    try {
      const saved = localStorage.getItem('ordinalswap_trades');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage whenever trades change
  useEffect(() => {
    localStorage.setItem('ordinalswap_trades', JSON.stringify(trades));
  }, [trades]);

  const createTrade = useCallback((initiatorData) => {
    const id = uuidv4();
    const trade = {
      id,
      createdAt: new Date().toISOString(),
      status: 'created',
      initiator: {
        ...initiatorData,
        signed: false,
        psbtBase64: null,
      },
      counterparty: null,
      finalPsbtBase64: null,
      txid: null,
    };

    setTrades(prev => ({ ...prev, [id]: trade }));
    return id;
  }, []);

  const getTrade = useCallback((id) => {
    return trades[id] || null;
  }, [trades]);

  const updateTrade = useCallback((id, updates) => {
    setTrades(prev => {
      if (!prev[id]) return prev;
      return { ...prev, [id]: { ...prev[id], ...updates } };
    });
  }, []);

  const acceptTrade = useCallback((id, counterpartyData) => {
    setTrades(prev => {
      if (!prev[id]) return prev;
      const trade = prev[id];
      if (trade.status !== 'created') return prev;
      return {
        ...prev,
        [id]: {
          ...trade,
          status: 'awaiting_counterparty',
          counterparty: {
            ...counterpartyData,
            signed: false,
            psbtBase64: null,
          },
        },
      };
    });
  }, []);

  const signTrade = useCallback((id, role, psbtBase64) => {
    setTrades(prev => {
      if (!prev[id]) return prev;
      const trade = { ...prev[id] };

      if (role === 'initiator') {
        trade.initiator = { ...trade.initiator, signed: true, psbtBase64 };
      } else {
        trade.counterparty = { ...trade.counterparty, signed: true, psbtBase64 };
      }

      // Check if both signed
      if (trade.initiator?.signed && trade.counterparty?.signed) {
        trade.status = 'both_signed';
      }

      return { ...prev, [id]: trade };
    });
  }, []);

  const completeTrade = useCallback((id, txid) => {
    setTrades(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], status: 'completed', txid },
      };
    });
  }, []);

  const cancelTrade = useCallback((id) => {
    setTrades(prev => {
      if (!prev[id]) return prev;
      return { ...prev, [id]: { ...prev[id], status: 'cancelled' } };
    });
  }, []);

  const myTrades = useCallback((address) => {
    if (!address) return [];
    return Object.values(trades).filter(
      t => t.initiator?.address === address || t.counterparty?.address === address
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [trades]);

  return (
    <TradeContext.Provider value={{
      trades,
      createTrade,
      getTrade,
      updateTrade,
      acceptTrade,
      signTrade,
      completeTrade,
      cancelTrade,
      myTrades,
    }}>
      {children}
    </TradeContext.Provider>
  );
}

export function useTrades() {
  const ctx = useContext(TradeContext);
  if (!ctx) throw new Error('useTrades must be used within TradeProvider');
  return ctx;
}
