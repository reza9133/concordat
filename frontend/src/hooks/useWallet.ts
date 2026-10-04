// ============================================================
// useWallet — shared wallet state (React context)
//
//  - EIP-6963 discovery -> `availableWallets`, so the user picks which
//    wallet to use.
//  - The picked wallet is remembered and auto-reconnected on the next
//    visit (unless the user disconnected on purpose).
//  - `disconnect()` revokes this site's permission in the wallet itself,
//    so the next connect shows a real consent prompt.
//  - `switchAccount()` opens the wallet's own account picker.
//  - The connect modal's open state lives here so any button in the app
//    (navbar, "connect your wallet" banners) opens the same modal.
//
// This file is plain .ts (no JSX) on purpose: it replaces the old
// hooks/useWallet.ts in place, so a leftover copy of the old file can never
// shadow it during module resolution.
//
// State is shared through <WalletProvider>, so every component that calls
// useWallet() sees the same connection.
// ============================================================

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { EIP6963ProviderDetail } from '../types';
import {
  NETWORK_LABEL,
  describeWalletError,
  discoverWallets,
  getEthereumProvider,
  isTargetChain,
  readChainId,
  setActiveProvider,
  subscribeToWallets,
  switchToTargetChain,
} from '../lib/wallet';

/** Remembers which wallet (by EIP-6963 rdns) to auto-reconnect to. */
const SELECTED_WALLET_KEY = 'concordat:wallet_rdns';
/** Set on Disconnect so the next page load does NOT silently reconnect. */
const DISCONNECT_KEY = 'concordat:disconnected';

// localStorage can throw (private mode, blocked storage) — never let that
// take the wallet flow down.
function store(action: 'get' | 'set' | 'remove', key: string, value?: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    if (action === 'get') return window.localStorage.getItem(key);
    if (action === 'set') window.localStorage.setItem(key, value ?? '');
    if (action === 'remove') window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable: choices only last for this session */
  }
  return null;
}

function isWalletDetail(value: unknown): value is EIP6963ProviderDetail {
  const v = value as Partial<EIP6963ProviderDetail> | null | undefined;
  return Boolean(v?.info && v?.provider);
}

export interface WalletState {
  address: string | null;
  chainId: string | null;
  /** Wallet is on GenLayer Studionet */
  chainOk: boolean;
  /** An account is connected (it may still be on the wrong network) */
  isConnected: boolean;
  /** Account connected but the wallet is on another network */
  wrongNetwork: boolean;

  isInitializing: boolean;
  isConnecting: boolean;
  isSwitching: boolean;
  error: string | null;
  clearError: () => void;

  availableWallets: EIP6963ProviderDetail[];
  selectedWalletRdns: string | null;
  /** An EIP-6963 wallet announced itself, or a legacy injected one exists */
  hasWallet: boolean;

  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;

  /** Pass a wallet from `availableWallets` to connect to that one specifically. */
  connect: (wallet?: EIP6963ProviderDetail) => Promise<string | null>;
  disconnect: () => Promise<void>;
  switchAccount: () => Promise<string | null>;
  switchNetwork: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

function useWalletState(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [provider, setProvider] = useState<ReturnType<typeof getEthereumProvider>>(null);
  const [selectedWalletRdns, setSelectedWalletRdns] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<EIP6963ProviderDetail[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const chainOk = isTargetChain(chainId);

  // -- live wallet discovery ---------------------------------------------
  useEffect(() => subscribeToWallets(setAvailableWallets), []);

  // -- restore the previous session on load ------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // The user disconnected on purpose: stay disconnected.
      if (store('get', DISCONNECT_KEY) === '1') {
        setIsInitializing(false);
        return;
      }

      let rdns = store('get', SELECTED_WALLET_KEY);
      if (rdns) {
        const wallets = await discoverWallets();
        const match = wallets.find((w) => w.info.rdns === rdns);
        if (match) {
          setActiveProvider(match.provider);
        } else {
          // That wallet is no longer installed — forget it.
          rdns = null;
          store('remove', SELECTED_WALLET_KEY);
        }
      }
      if (cancelled) return;

      const active = getEthereumProvider();
      if (!active) {
        setIsInitializing(false);
        return;
      }

      try {
        // eth_accounts (not eth_requestAccounts): no popup, only returns an
        // account if the wallet already granted this site access.
        const accounts = (await active.request({ method: 'eth_accounts' })) as string[];
        const id = await readChainId(active);
        if (cancelled) return;
        setProvider(active);
        setSelectedWalletRdns(rdns);
        setChainId(id);
        setAddress(accounts?.[0] ?? null);
      } catch {
        /* wallet not ready / locked — stay disconnected */
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // -- follow account / chain changes made inside the wallet -------------
  useEffect(() => {
    if (!provider?.on) return undefined;

    const onAccountsChanged = async (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;
      const next = accounts?.[0] ?? null;
      if (next) store('remove', DISCONNECT_KEY);
      const id = await readChainId(provider);
      setAddress(next);
      if (id) setChainId(id);
    };
    const onChainChanged = (...args: unknown[]) => setChainId(String(args[0]));
    const onDisconnect = () => setAddress(null);

    provider.on('accountsChanged', onAccountsChanged);
    provider.on('chainChanged', onChainChanged);
    provider.on('disconnect', onDisconnect);
    return () => {
      provider.removeListener?.('accountsChanged', onAccountsChanged);
      provider.removeListener?.('chainChanged', onChainChanged);
      provider.removeListener?.('disconnect', onDisconnect);
    };
  }, [provider]);

  // -- modal --------------------------------------------------------------
  const openModal = useCallback(() => {
    setError(null);
    setModalOpen(true);
  }, []);
  const closeModal = useCallback(() => setModalOpen(false), []);
  const clearError = useCallback(() => setError(null), []);

  // -- actions ------------------------------------------------------------
  const connect = useCallback(async (walletDetail?: EIP6963ProviderDetail) => {
    // Guard against being wired straight to onClick (which passes an event).
    const detail = isWalletDetail(walletDetail) ? walletDetail : null;
    const target = detail ? detail.provider : getEthereumProvider();

    if (!target) {
      setError('No EVM wallet found. Install MetaMask, Rabby, or another wallet extension.');
      return null;
    }

    setIsConnecting(true);
    setError(null);
    try {
      const accounts = (await target.request({ method: 'eth_requestAccounts' })) as string[];
      if (!accounts?.[0]) throw new Error('No account returned by wallet.');

      // Only now commit the choice, so cancelling the popup leaves nothing
      // half-selected. The active provider must be set before the address
      // changes: write clients are built from it as soon as a page sees the
      // new address.
      if (detail) {
        setActiveProvider(detail.provider);
        store('set', SELECTED_WALLET_KEY, detail.info.rdns);
      }
      store('remove', DISCONNECT_KEY);

      const switched = await switchToTargetChain(target);
      const id = await readChainId(target);

      setProvider(target);
      if (detail) setSelectedWalletRdns(detail.info.rdns);
      setChainId(id);
      setAddress(accounts[0]);

      if (switched) {
        setModalOpen(false);
      } else {
        setError(`Connected, but your wallet is not on ${NETWORK_LABEL}. Switch network to continue.`);
      }
      return accounts[0];
    } catch (err) {
      setError(describeWalletError(err, 'Failed to connect wallet.'));
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const active = getEthereumProvider();
    if (active) {
      try {
        await active.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }],
        });
      } catch {
        /* not every wallet implements revocation — the local disconnect
           below still works, it just won't force a fresh prompt */
      }
    }

    setActiveProvider(null);
    store('remove', SELECTED_WALLET_KEY);
    store('set', DISCONNECT_KEY, '1');

    setProvider(null);
    setSelectedWalletRdns(null);
    setAddress(null);
    setChainId(null);
    setError(null);
    setModalOpen(false);
  }, []);

  const switchAccount = useCallback(async () => {
    const active = getEthereumProvider();
    if (!active) return null;

    setIsSwitching(true);
    setError(null);
    try {
      // Shows the wallet's own account picker even when already connected.
      await active.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
      const accounts = (await active.request({ method: 'eth_accounts' })) as string[];
      if (!accounts?.[0]) throw new Error('No account selected.');
      setAddress(accounts[0]);
      return accounts[0];
    } catch (err) {
      setError(describeWalletError(err, 'Failed to switch account.'));
      return null;
    } finally {
      setIsSwitching(false);
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    const active = getEthereumProvider();
    if (!active) return;

    setIsSwitching(true);
    setError(null);
    try {
      const ok = await switchToTargetChain(active);
      const id = await readChainId(active);
      if (id) setChainId(id);
      if (!ok) setError(`Switch your wallet to ${NETWORK_LABEL} to continue.`);
    } finally {
      setIsSwitching(false);
    }
  }, []);

  return {
    address,
    chainId,
    chainOk,
    isConnected: Boolean(address),
    wrongNetwork: Boolean(address && !chainOk),

    isInitializing,
    isConnecting,
    isSwitching,
    error,
    clearError,

    availableWallets,
    selectedWalletRdns,
    hasWallet: availableWallets.length > 0 || Boolean(getEthereumProvider()),

    modalOpen,
    openModal,
    closeModal,

    connect,
    disconnect,
    switchAccount,
    switchNetwork,
  };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const value = useWalletState();
  return createElement(WalletContext.Provider, { value }, children);
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}
