// ============================================================
// Wallet management — EIP-6963 discovery + active-provider registry
//
// Every installed wallet (MetaMask, Rabby, OKX, Coinbase...) announces
// itself via EIP-6963, so the user can pick which one to use instead of
// whichever extension grabbed `window.ethereum`.
//
// The active provider lives here, at module level, so useWallet (which
// picks it) and lib/genlayer.ts (which signs with it) always talk to the
// same wallet. Until one is picked it falls back to MetaMask / the first
// announced wallet / `window.ethereum`.
// ============================================================

import { studionet } from 'genlayer-js/chains';
import type { EthereumProvider, EIP6963ProviderDetail } from '../types';

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

/** Network the dApp targets */
export const TARGET_CHAIN = studionet;
export const NETWORK_LABEL = 'Studionet';

const CHAIN_ID_HEX = `0x${studionet.id.toString(16)}`;

const EXPLORER_URL = (
  studionet as unknown as { blockExplorers?: { default?: { url?: string } } }
).blockExplorers?.default?.url;

/** GenLayer Studionet parameters for wallet_addEthereumChain */
const CHAIN_PARAMS = {
  chainId: CHAIN_ID_HEX,
  chainName: studionet.name,
  nativeCurrency: studionet.nativeCurrency,
  rpcUrls: [...studionet.rpcUrls.default.http],
  blockExplorerUrls: EXPLORER_URL ? [EXPLORER_URL] : [],
};

// ------------------------------------------------------------
// EIP-6963 discovery
// ------------------------------------------------------------

type WalletListener = (wallets: EIP6963ProviderDetail[]) => void;

const announced: EIP6963ProviderDetail[] = [];
const listeners = new Set<WalletListener>();

if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (event) => {
    const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail;
    if (
      detail?.provider &&
      detail.info?.uuid &&
      !announced.some((d) => d.info.uuid === detail.info.uuid)
    ) {
      announced.push(detail);
      listeners.forEach((listener) => listener([...announced]));
    }
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

/**
 * Live list of announced wallets (also picks up extensions that announce
 * themselves late). Calls `onUpdate` immediately with what is known so far.
 * Returns an unsubscribe function.
 */
export function subscribeToWallets(onUpdate: WalletListener): () => void {
  if (typeof window === 'undefined') return () => {};
  listeners.add(onUpdate);
  onUpdate([...announced]);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  return () => {
    listeners.delete(onUpdate);
  };
}

/** One-shot discovery: ask wallets to announce and wait a moment for answers. */
export function discoverWallets(timeoutMs = 250): Promise<EIP6963ProviderDetail[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve([]);
      return;
    }
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    setTimeout(() => resolve([...announced]), timeoutMs);
  });
}

// ------------------------------------------------------------
// Active provider
// ------------------------------------------------------------

let activeProvider: EthereumProvider | null = null;

export function setActiveProvider(provider: EthereumProvider | null): void {
  activeProvider = provider ?? null;
}

/**
 * The provider the app should use: the wallet the user picked, otherwise
 * MetaMask / the first announced wallet, otherwise `window.ethereum`.
 */
export function getEthereumProvider(): EthereumProvider | null {
  if (activeProvider) return activeProvider;
  if (typeof window === 'undefined') return null;
  const preferred = announced.find((d) => d.info.rdns === 'io.metamask') ?? announced[0];
  return preferred?.provider ?? window.ethereum ?? null;
}

// ------------------------------------------------------------
// Chain helpers
// ------------------------------------------------------------

export async function readChainId(provider: EthereumProvider): Promise<string | null> {
  try {
    return String(await provider.request({ method: 'eth_chainId' }));
  } catch {
    return null;
  }
}

/** True when `chainIdHex` (as reported by a wallet) is the target network */
export function isTargetChain(chainIdHex: string | null | undefined): boolean {
  return Boolean(chainIdHex) && parseInt(String(chainIdHex), 16) === studionet.id;
}

/**
 * Switch to Studionet, adding it first if the wallet doesn't know it yet.
 * Returns true on success, false if the user rejected it or the wallet
 * doesn't support the request — a failed switch never drops an otherwise
 * good connection, the UI just shows a "wrong network" state with a retry.
 */
export async function switchToTargetChain(provider: EthereumProvider): Promise<boolean> {
  if (isTargetChain(await readChainId(provider))) return true;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_ID_HEX }],
    });
    return true;
  } catch (switchError) {
    // 4902 / -32603: this wallet has never seen the chain — add it, which
    // (EIP-3085) also switches to it on approval.
    const code = (switchError as { code?: number })?.code;
    if (code === 4902 || code === -32603) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [CHAIN_PARAMS],
        });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

/** Friendly message for common wallet error codes */
export function describeWalletError(err: unknown, fallback: string): string {
  const e = err as { code?: number; message?: string } | null;
  if (e?.code === 4001) return 'Request cancelled in your wallet.';
  if (e?.code === -32002) {
    return 'A request is already pending in your wallet — open the extension to continue.';
  }
  return e?.message || fallback;
}
