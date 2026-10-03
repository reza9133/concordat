// ============================================================
// useWallet hook — wallet connection state management
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  connectWallet,
  getAccounts,
  onAccountsChanged,
  onChainChanged,
  switchToStudionet,
} from '../lib/wallet';
import { getErrorMessage } from '../lib/genlayer';

interface UseWalletReturn {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
}

const DISCONNECT_KEY = 'concordat:disconnected';

function isDisconnected(): boolean {
  try {
    return localStorage.getItem(DISCONNECT_KEY) === '1';
  } catch {
    return false;
  }
}

function setDisconnected(value: boolean): void {
  try {
    if (value) localStorage.setItem(DISCONNECT_KEY, '1');
    else localStorage.removeItem(DISCONNECT_KEY);
  } catch {
    /* storage unavailable: disconnect only lasts for this session */
  }
}

export function useWallet(): UseWalletReturn {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing accounts on mount (unless the user disconnected on purpose)
  useEffect(() => {
    if (isDisconnected()) return;
    getAccounts().then((accounts) => {
      if (accounts.length > 0) setAddress(accounts[0]);
    });
  }, []);

  // Subscribe to wallet events
  useEffect(() => {
    const unsubAccounts = onAccountsChanged((accounts) => {
      if (isDisconnected()) return;
      if (accounts.length > 0) {
        setAddress(accounts[0]);
      } else {
        setAddress(null);
      }
    });

    const unsubChain = onChainChanged(() => {
      // Re-fetch accounts after chain change
      if (isDisconnected()) return;
      getAccounts().then((accounts) => {
        if (accounts.length > 0) setAddress(accounts[0]);
      });
    });

    return () => {
      unsubAccounts();
      unsubChain();
    };
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const addr = await connectWallet();
      setDisconnected(false);
      setAddress(addr);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setDisconnected(true);
    setAddress(null);
    setError(null);
  }, []);

  const switchNetwork = useCallback(async () => {
    try {
      await switchToStudionet();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  return {
    address,
    isConnected: !!address,
    isConnecting,
    error,
    connect,
    disconnect,
    switchNetwork,
  };
}
