// ============================================================
// WalletButton — navbar wallet control + the modal behind it
//
//  - disconnected: "Connect Wallet" button -> modal with the wallet picker
//  - connected: address chip -> modal with wallet details, network status,
//    the member's standing, switch account and disconnect
//
// All state comes from the shared useWallet() context.
// ============================================================

import { useEffect, type ReactNode } from 'react';
import { AlertCircle, ChevronDown, ExternalLink, LogOut, User, Wallet } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { StandingBadge } from '../concordat/StandingBadge';
import { AddressDisplay } from './AddressDisplay';
import { WalletPickerList } from './WalletPickerList';
import { useWallet } from '../../hooks/useWallet';
import { useStanding } from '../../hooks/useContract';
import { truncateAddress } from '../../lib/genlayer';
import { NETWORK_LABEL } from '../../lib/wallet';

const METAMASK_INSTALL_URL = 'https://metamask.io/download/';

const NOTICE_TONES = {
  warn: 'border-accent/30 bg-accent/10 text-amber-900',
  error: 'border-danger/30 bg-danger/10 text-red-800',
  info: 'border-border bg-background text-text-secondary',
} as const;

function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: keyof typeof NOTICE_TONES;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex gap-3 rounded-2xl border px-4 py-3 text-sm ${NOTICE_TONES[tone]}`}>
      {tone !== 'info' && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0 space-y-2">
        {title && <p className="font-medium">{title}</p>}
        <div className={`space-y-2 ${tone === 'info' ? 'text-xs leading-relaxed' : 'leading-relaxed'}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function WalletButton() {
  const {
    address,
    chainOk,
    isInitializing,
    isConnecting,
    isSwitching,
    error,
    hasWallet,
    availableWallets,
    selectedWalletRdns,
    modalOpen,
    openModal,
    closeModal,
    connect,
    disconnect,
    switchAccount,
    switchNetwork,
  } = useWallet();

  // Member standing in the hall — refetched whenever the modal opens so it
  // is fresh after a ruling lands.
  const { standing, isLoading: standingLoading, lookup } = useStanding();
  useEffect(() => {
    if (address && modalOpen) lookup(address);
  }, [address, modalOpen, lookup]);

  const walletName =
    availableWallets.find((w) => w.info.rdns === selectedWalletRdns)?.info.name ?? 'your wallet';

  // -- trigger -------------------------------------------------------------
  const trigger = !address ? (
    <Button
      variant="primary"
      size="sm"
      isLoading={isConnecting}
      disabled={isInitializing}
      leftIcon={<Wallet className="w-4 h-4" />}
      onClick={openModal}
    >
      {isConnecting ? 'Connecting…' : 'Connect Wallet'}
    </Button>
  ) : (
    <button
      onClick={openModal}
      title="Wallet details"
      aria-haspopup="dialog"
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 ${
        chainOk ? 'bg-background border-border' : 'bg-accent/10 border-accent/40'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          chainOk ? 'bg-secondary' : 'bg-accent animate-pulse'
        }`}
        aria-label={chainOk ? 'Connected' : 'Wrong network'}
      />
      <span className="text-sm font-mono font-medium text-text-primary">
        {truncateAddress(address, 4)}
      </span>
      <ChevronDown className="w-4 h-4 text-text-secondary" />
    </button>
  );

  // -- modal ---------------------------------------------------------------
  return (
    <>
      {trigger}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={address ? 'Wallet Details' : 'Connect to GenLayer'}
        description={
          address
            ? `Connected with ${walletName}`
            : 'Connect a wallet to file cases, defend yourself, and appeal rulings.'
        }
      >
        {!address ? (
          <div className="space-y-4">
            {!hasWallet ? (
              <>
                <Notice tone="warn" title="No wallet detected">
                  Install a wallet extension to continue — MetaMask is a good default if you
                  don&apos;t already have one.
                </Notice>
                <a
                  href={METAMASK_INSTALL_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-medium text-white shadow-primary transition-all hover:opacity-90"
                >
                  <ExternalLink className="w-4 h-4" />
                  Install MetaMask
                </a>
                <Notice>
                  After installing a wallet, refresh this page and click &quot;Connect Wallet&quot;
                  again.
                </Notice>
              </>
            ) : (
              <>
                <WalletPickerList
                  wallets={availableWallets}
                  onSelect={(picked) => connect(picked)}
                  onFallbackConnect={() => connect()}
                  disabled={isConnecting}
                />

                {isConnecting && (
                  <p className="text-center text-sm text-text-secondary">Waiting for your wallet…</p>
                )}

                {error && (
                  <Notice tone="error" title="Connection error">
                    {error}
                  </Notice>
                )}

                <Notice>
                  <p>Choosing a wallet will prompt it to:</p>
                  <ol className="mt-2 list-inside list-decimal space-y-1">
                    <li>Connect your wallet to this app</li>
                    <li>Add the GenLayer {NETWORK_LABEL} network to your wallet</li>
                    <li>Switch to the {NETWORK_LABEL} network</li>
                  </ol>
                  <p className="mt-2">
                    Disconnecting always forgets this choice, so you can pick a different wallet
                    next time.
                  </p>
                </Notice>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <InfoCard label="Your address">
              <AddressDisplay address={address} full showCopy />
            </InfoCard>

            <InfoCard label="Hall standing">
              {standingLoading ? (
                <p className="text-sm text-text-secondary">Loading…</p>
              ) : standing ? (
                <div className="space-y-2">
                  <StandingBadge standing={standing} size="sm" />
                  <p className="text-xs text-text-secondary">
                    {standing.points} penalty {standing.points === 1 ? 'point' : 'points'} ·{' '}
                    {standing.open_cases} open {standing.open_cases === 1 ? 'case' : 'cases'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">—</p>
              )}
            </InfoCard>

            <InfoCard label="Network status">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    chainOk ? 'bg-secondary' : 'bg-accent animate-pulse'
                  }`}
                />
                <span className="text-sm text-text-primary">
                  {chainOk ? `Connected to GenLayer ${NETWORK_LABEL}` : 'Wrong network'}
                </span>
              </div>
            </InfoCard>

            {!chainOk && (
              <Notice tone="warn" title="Network warning">
                <p>
                  You&apos;re not on GenLayer {NETWORK_LABEL}. Sending a transaction from the wrong
                  network would use that network&apos;s own currency instead of GEN.
                </p>
                <Button size="sm" fullWidth onClick={switchNetwork} disabled={isSwitching}>
                  {isSwitching ? 'Switching…' : 'Switch network'}
                </Button>
              </Notice>
            )}

            {error && (
              <Notice tone="error" title="Error">
                {error}
              </Notice>
            )}

            <div className="space-y-2.5 border-t border-border pt-4">
              <Button
                variant="outline"
                fullWidth
                leftIcon={<User className="w-4 h-4" />}
                onClick={switchAccount}
                disabled={isSwitching}
              >
                {isSwitching ? 'Switching…' : 'Switch account'}
              </Button>
              <Button
                variant="ghost"
                fullWidth
                leftIcon={<LogOut className="w-4 h-4" />}
                onClick={disconnect}
                disabled={isSwitching}
                className="!text-danger hover:!bg-danger/5"
              >
                Disconnect wallet
              </Button>
            </div>

            <Notice>
              Use &quot;Switch account&quot; to select a different account in {walletName}. Use
              &quot;Disconnect&quot; to remove this site from your wallet.
            </Notice>
          </div>
        )}
      </Modal>
    </>
  );
}
