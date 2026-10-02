// ============================================================
// ContractAddress — copyable, truncated address display
// ============================================================

import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface ContractAddressProps {
  address: string;
  label?: string;
  size?: 'sm' | 'md';
  explorerUrl?: string;
  className?: string;
}

export function ContractAddress({
  address,
  label,
  size = 'md',
  explorerUrl,
  className = '',
}: ContractAddressProps) {
  const [copied, setCopied] = useState(false);

  const truncated = `${address.slice(0, 10)}…${address.slice(-8)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = address;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {label && (
        <span className={`${textSize} font-medium text-text-secondary`}>{label}</span>
      )}
      <div className="relative group inline-flex items-center gap-1">
        <span
          className={`${textSize} font-mono text-text-secondary bg-background px-2 py-1 rounded-lg border border-border`}
          title={address}
        >
          {truncated}
        </span>

        {/* Tooltip with full address */}
        <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-10">
          <div className="bg-text-primary text-white text-xs font-mono rounded-lg px-3 py-2 shadow-lg whitespace-nowrap max-w-xs break-all">
            {address}
          </div>
        </div>

        <button
          onClick={handleCopy}
          className={`p-1 rounded hover:bg-background transition-colors ${
            copied ? 'text-secondary' : 'text-text-secondary hover:text-text-primary'
          }`}
          title={copied ? 'Copied!' : 'Copy address'}
          aria-label="Copy address"
        >
          {copied ? (
            <Check className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
          ) : (
            <Copy className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
          )}
        </button>

        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-background text-text-secondary hover:text-text-primary transition-colors"
            title="View in explorer"
            aria-label="View in block explorer"
          >
            <ExternalLink className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
          </a>
        )}
      </div>
    </div>
  );
}
