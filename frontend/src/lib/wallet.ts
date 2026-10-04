// ============================================================
// Wallet management — EIP-6963 + window.ethereum
// Handles MetaMask and other injected wallets
// ============================================================

import { studionet } from 'genlayer-js/chains';
import type { EthereumProvider, EIP6963ProviderDetail } from '../types';

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

/** GenLayer Studionet chain parameters for wallet_addEthereumChain */
const STUDIONET_CHAIN_PARAMS = {
  chainId: `0x${studionet.id.toString(16)}`,
  chainName: studionet.name,
  nativeCurrency: studionet.nativeCurrency,
  rpcUrls: [studionet.rpcUrls.default.http[0]],
};

// EIP-6963: wallets announce themselves; collect them as they do.
const announced: EIP6963ProviderDetail[] = [];
if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (event) => {
    const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail;
    if (detail?.provider && !announced.some((d) => d.info.uuid === detail.info.uuid)) {
      announced.push(detail);
    }
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

/**
 * Returns the injected Ethereum provider. Prefers an EIP-6963 announced
 * provider (MetaMask first), then window.ethereum.
 */
export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === 'undefined') return null;
  const preferred = announced.find((d) => d.info.rdns === 'io.metamask') ?? announced[0];
  return preferred?.provider ?? window.ethereum ?? null;
}

/** Request account access from the wallet */
export async function requestAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error('No Ethereum wallet found. Please install MetaMask.');

  const accounts = await provider.request({
    method: 'eth_requestAccounts',
  });
  return accounts as string[];
}

/** Get currently connected accounts without prompting */
export async function getAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();
  if (!provider) return [];

  const accounts = await provider.request({ method: 'eth_accounts' });
  return accounts as string[];
}

/**
 * Connect wallet and switch to GenLayer Studionet.
 * Returns the connected address.
 */
export async function connectWallet(): Promise<string> {
  const accounts = await requestAccounts();
  if (!accounts.length) throw new Error('No accounts returned by wallet.');

  await switchToStudionet();
  return accounts[0];
}

/** Add GenLayer Studionet to the wallet and switch to it */
export async function switchToStudionet(): Promise<void> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error('No Ethereum wallet found.');

  const targetChainId = `0x${studionet.id.toString(16)}`;

  try {
    // Attempt to switch first
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetChainId }],
    });
  } catch (switchError) {
    // If chain not found (4902), add it
    const err = switchError as { code?: number };
    if (err.code === 4902 || err.code === -32603) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [STUDIONET_CHAIN_PARAMS],
      });
    } else {
      throw switchError;
    }
  }
}

/** Get the current chain ID from the wallet */
export async function getChainId(): Promise<string | null> {
  const provider = getEthereumProvider();
  if (!provider) return null;
  const chainId = await provider.request({ method: 'eth_chainId' });
  return chainId as string;
}

/** Check if the wallet is on GenLayer Studionet */
export async function isOnStudionet(): Promise<boolean> {
  const chainId = await getChainId();
  if (!chainId) return false;
  const targetHex = `0x${studionet.id.toString(16)}`;
  return chainId.toLowerCase() === targetHex.toLowerCase();
}

/** Subscribe to account change events */
export function onAccountsChanged(handler: (accounts: string[]) => void): () => void {
  const provider = getEthereumProvider();
  if (!provider) return () => {};

  const wrappedHandler = (...args: unknown[]) => handler(args[0] as string[]);
  provider.on('accountsChanged', wrappedHandler);
  return () => provider.removeListener('accountsChanged', wrappedHandler);
}

/** Subscribe to chain change events */
export function onChainChanged(handler: (chainId: string) => void): () => void {
  const provider = getEthereumProvider();
  if (!provider) return () => {};

  const wrappedHandler = (...args: unknown[]) => handler(args[0] as string);
  provider.on('chainChanged', wrappedHandler);
  return () => provider.removeListener('chainChanged', wrappedHandler);
}
