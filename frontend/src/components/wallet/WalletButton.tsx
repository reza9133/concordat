// ============================================================
// WalletButton — connect/disconnect wallet, network indicator
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ChevronDown, Copy, LogOut, Check, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { useWallet } from '../../hooks/useWallet';
import { truncateAddress } from '../../lib/genlayer';
import { studionet } from 'genlayer-js/chains';

export function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect, error } = useWallet();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isOnCorrectNetwork, setIsOnCorrectNetwork] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Check network
  useEffect(() => {
    if (!isConnected) return;
    const checkNetwork = async () => {
      if (!window.ethereum) return;
      const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;
      const targetHex = `0x${studionet.id.toString(16)}`;
      setIsOnCorrectNetwork(chainId.toLowerCase() === targetHex.toLowerCase());
    };
    checkNetwork();
    window.ethereum?.on('chainChanged', () => checkNetwork());
  }, [isConnected]);

  const handleCopyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          variant="primary"
          size="sm"
          isLoading={isConnecting}
          leftIcon={<Wallet className="w-4 h-4" />}
          onClick={connect}
        >
          {isConnecting ? 'Connecting…' : 'Connect Wallet'}
        </Button>
        {error && (
          <p className="text-xs text-danger flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        {/* Network dot */}
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isOnCorrectNetwork ? 'bg-secondary' : 'bg-danger'
          }`}
          title={isOnCorrectNetwork ? 'GenLayer Studionet' : 'Wrong network'}
        />
        <span className="text-sm font-mono font-medium text-text-primary">
          {truncateAddress(address!, 4)}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${
            isDropdownOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-border shadow-card-hover z-50"
          >
            {/* Address section */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnCorrectNetwork ? 'bg-secondary' : 'bg-danger'
                  }`}
                />
                <span className="text-xs font-medium text-text-secondary">
                  {isOnCorrectNetwork ? 'GenLayer Studionet' : 'Wrong Network'}
                </span>
              </div>
              <p className="font-mono text-sm text-text-primary break-all">{address}</p>
            </div>

            {/* Actions */}
            <div className="p-2">
              <button
                onClick={handleCopyAddress}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-background text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-secondary" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? 'Copied!' : 'Copy Address'}
              </button>

              <button
                onClick={() => { disconnect(); setIsDropdownOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-danger/5 text-sm text-text-secondary hover:text-danger transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
