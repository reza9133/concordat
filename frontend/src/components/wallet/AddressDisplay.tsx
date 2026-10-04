// ============================================================
// AddressDisplay — address with optional copy-to-clipboard
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { truncateAddress } from '../../lib/genlayer';

interface AddressDisplayProps {
  address: string | null;
  /** Show the whole address (wrapping) instead of the shortened form */
  full?: boolean;
  showCopy?: boolean;
  className?: string;
}

export function AddressDisplay({
  address,
  full = false,
  showCopy = false,
  className = '',
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!address) return <span className={className}>—</span>;

  async function handleCopy(event: React.MouseEvent) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(address!);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the full address is selectable anyway */
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={address}>
      <code className={`font-mono text-text-primary ${full ? 'break-all text-sm' : ''}`}>
        {full ? address : truncateAddress(address, 4)}
      </code>
      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded p-1 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
          aria-label={copied ? 'Address copied' : 'Copy address'}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </span>
  );
}
