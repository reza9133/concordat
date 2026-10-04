// ============================================================
// WalletPickerList — one button per EIP-6963 wallet
//
// Falls back to a single generic "Connect Wallet" button when nothing has
// announced itself (older extensions without EIP-6963); connecting then
// uses `window.ethereum` directly.
// ============================================================

import { ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import type { EIP6963ProviderDetail } from '../../types';

interface WalletPickerListProps {
  wallets: EIP6963ProviderDetail[];
  onSelect: (wallet: EIP6963ProviderDetail) => void;
  onFallbackConnect: () => void;
  disabled?: boolean;
}

export function WalletPickerList({
  wallets,
  onSelect,
  onFallbackConnect,
  disabled = false,
}: WalletPickerListProps) {
  if (wallets.length === 0) {
    return (
      <Button fullWidth onClick={onFallbackConnect} disabled={disabled}>
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      {wallets.map((wallet) => (
        <button
          key={wallet.info.uuid}
          type="button"
          onClick={() => onSelect(wallet)}
          disabled={disabled}
          className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 text-left text-[15px] font-medium text-text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {wallet.info.icon && (
            <img src={wallet.info.icon} alt="" className="h-7 w-7 rounded-lg" />
          )}
          <span className="flex-1">{wallet.info.name}</span>
          <ChevronRight className="w-4 h-4 text-text-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </button>
      ))}
    </div>
  );
}
