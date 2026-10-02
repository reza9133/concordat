// ============================================================
// StandingsPage — address lookup for member standing
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Trophy, AlertCircle, User, Eraser } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { StandingBadge, PointsMeter } from '../components/concordat/StandingBadge';
import { ContractAddress } from '../components/ui/ContractAddress';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ToastContainer } from '../components/ui/Toast';
import { useWallet } from '../hooks/useWallet';
import { useStanding, useHallConfig } from '../hooks/useContract';
import { useToast } from '../hooks/useToast';
import { writeForgivePoints, getErrorMessage } from '../lib/genlayer';

export function StandingsPage() {
  const { address: walletAddress, isConnected } = useWallet();
  const { config } = useHallConfig();
  const { standing, isLoading, error, lookup } = useStanding();
  const { toasts, dismiss, success, error: toastError } = useToast();

  const [searchAddress, setSearchAddress] = useState('');
  const [lookedUpAddress, setLookedUpAddress] = useState('');
  const [forgiveAmount, setForgiveAmount] = useState('');
  const [isForgiving, setIsForgiving] = useState(false);

  const isOwner = config && walletAddress
    ? config.owner.toLowerCase() === walletAddress.toLowerCase()
    : false;

  // Auto-load user's own standing on connect
  useEffect(() => {
    if (walletAddress && !lookedUpAddress) {
      setSearchAddress(walletAddress);
      setLookedUpAddress(walletAddress);
      lookup(walletAddress);
    }
  }, [walletAddress, lookedUpAddress, lookup]);

  const handleSearch = () => {
    const addr = searchAddress.trim();
    if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) return;
    setLookedUpAddress(addr);
    lookup(addr);
  };

  const handleForgive = async () => {
    if (!walletAddress || !lookedUpAddress || !forgiveAmount) return;
    const pts = parseInt(forgiveAmount);
    if (isNaN(pts) || pts <= 0) return;

    setIsForgiving(true);
    try {
      await writeForgivePoints(walletAddress as `0x${string}`, lookedUpAddress, pts);
      success('Points Forgiven', `${pts} points removed from ${lookedUpAddress.slice(0, 10)}…`);
      lookup(lookedUpAddress);
      setForgiveAmount('');
    } catch (err) {
      toastError('Failed to Forgive Points', getErrorMessage(err));
    } finally {
      setIsForgiving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-4 shadow-primary">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Member Standings</h1>
          <p className="text-text-secondary mt-2">
            Look up any member's standing, penalty points, and status
          </p>
        </motion.div>

        {/* Search form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="text"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="0x…address"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-white font-mono text-sm text-text-primary placeholder-text-secondary/60
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
              <Button
                variant="primary"
                leftIcon={<Search className="w-4 h-4" />}
                onClick={handleSearch}
                disabled={!searchAddress || !/^0x[0-9a-fA-F]{40}$/.test(searchAddress.trim())}
              >
                Lookup
              </Button>
            </div>

            {/* Quick-fill with own address */}
            {isConnected && walletAddress && searchAddress !== walletAddress && (
              <button
                onClick={() => {
                  setSearchAddress(walletAddress);
                  setLookedUpAddress(walletAddress);
                  lookup(walletAddress);
                }}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Use my address
              </button>
            )}
          </Card>
        </motion.div>

        {/* Results */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner variant="dots" size="md" />
          </div>
        )}

        {error && (
          <Card>
            <div className="flex items-center gap-2 text-danger">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          </Card>
        )}

        {standing && lookedUpAddress && !isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <Card gradientBorder>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <ContractAddress address={lookedUpAddress} label="Member:" />
                  {walletAddress?.toLowerCase() === lookedUpAddress.toLowerCase() && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                      You
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-5">
                  {/* Standing badge */}
                  <StandingBadge standing={standing} size="lg" showPoints />

                  {/* Points meter */}
                  {config && (
                    <PointsMeter
                      points={standing.points}
                      probationThreshold={config.probation_points}
                      suspensionThreshold={config.suspension_points}
                    />
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="text-center p-3 rounded-xl bg-background border border-border">
                      <div className="text-2xl font-bold text-text-primary">{standing.points}</div>
                      <div className="text-xs text-text-secondary mt-0.5">Penalty Points</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-background border border-border">
                      <div className="text-2xl font-bold text-text-primary">
                        {standing.dismissed_complaints}
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">Dismissed Complaints</div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Forgive points (owner only) */}
            {isOwner && isConnected && (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-text-primary flex items-center gap-2">
                    <Eraser className="w-4 h-4 text-secondary" />
                    Forgive Points (Owner)
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={standing.points}
                      value={forgiveAmount}
                      onChange={(e) => setForgiveAmount(e.target.value)}
                      placeholder="Points to forgive"
                      className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <Button
                      variant="secondary"
                      isLoading={isForgiving}
                      onClick={handleForgive}
                      disabled={!forgiveAmount || parseInt(forgiveAmount) <= 0}
                    >
                      Forgive
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}
          </motion.div>
        )}

        {!isLoading && !standing && !error && !lookedUpAddress && (
          <div className="text-center py-12 text-text-secondary">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Enter a wallet address to look up their standing</p>
          </div>
        )}
      </div>
    </div>
  );
}
