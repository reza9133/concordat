// ============================================================
// AppPage — Main Dashboard: wallet, hall info, cases, file case
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, Scale, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CaseCard } from '../components/concordat/CaseCard';
import { HallConfigCard } from '../components/concordat/HallConfigCard';
import { FileCaseForm } from '../components/concordat/FileCaseForm';
import { CountUpNumber } from '../components/concordat/CountUpNumber';
import { SkeletonCard } from '../components/ui/LoadingSpinner';
import { useWallet } from '../hooks/useWallet';
import { useHallConfig } from '../hooks/useContract';
import { useRules } from '../hooks/useContract';
import { useCases } from '../hooks/useContract';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ui/Toast';

type Tab = 'cases' | 'file';

function NotConnectedBanner({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <Wallet className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-text-primary mb-2">Connect Your Wallet</h3>
      <p className="text-text-secondary mb-6 max-w-sm">
        Connect your wallet to file cases, check standings, and interact with the Concordat Hall.
        Read-only views like the case list are available without connecting.
      </p>
      <Button variant="primary" onClick={onConnect} leftIcon={<Wallet className="w-4 h-4" />}>
        Connect Wallet
      </Button>
    </div>
  );
}

export function AppPage() {
  const { address, isConnected, isConnecting, connect } = useWallet();
  const { config, isLoading: configLoading, error: configError } = useHallConfig();
  const { rules } = useRules();
  const {
    cases,
    total,
    isLoading: casesLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refetch: refetchCases,
  } = useCases();
  const { toasts, dismiss, success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const navigate = useNavigate();

  const isOwner = config && address
    ? config.owner.toLowerCase() === address.toLowerCase()
    : false;

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">
            Manage cases and interact with the Concordat Hall
          </p>
        </motion.div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Hall info */}
          <div className="lg:col-span-1 space-y-5">
            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card padding="md">
                <div className="text-3xl font-extrabold text-primary">
                  <CountUpNumber value={total} />
                </div>
                <p className="text-xs text-text-secondary mt-1 font-medium">Total Cases</p>
              </Card>
              <Card padding="md">
                <div className="text-3xl font-extrabold text-secondary">
                  <CountUpNumber value={rules.filter((r) => r.active).length} />
                </div>
                <p className="text-xs text-text-secondary mt-1 font-medium">Active Rules</p>
              </Card>
            </div>

            {/* Hall config */}
            {configLoading ? (
              <SkeletonCard />
            ) : configError ? (
              <Card>
                <div className="flex items-center gap-2 text-danger text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {configError}
                </div>
              </Card>
            ) : config ? (
              <HallConfigCard config={config} />
            ) : null}

            {/* Owner badge */}
            {isOwner && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20 text-sm text-amber-700">
                <Scale className="w-4 h-4" />
                <span className="font-semibold">You are the Hall Owner</span>
              </div>
            )}

            {/* Wallet section on mobile */}
            {!isConnected && (
              <Card>
                <NotConnectedBanner onConnect={connect} />
              </Card>
            )}
          </div>

          {/* Right column: Cases tabs */}
          <div className="lg:col-span-2">
            {/* Tab bar */}
            <div className="flex gap-1 p-1 bg-white rounded-2xl border border-border mb-5">
              {([
                { key: 'cases', label: 'All Cases', icon: Scale },
                { key: 'file', label: 'File a Case', icon: FileText },
              ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    activeTab === key
                      ? 'bg-gradient-brand text-white shadow-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Cases tab */}
            {activeTab === 'cases' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-text-primary">
                    {total} Case{total !== 1 ? 's' : ''}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    onClick={refetchCases}
                  >
                    Refresh
                  </Button>
                </div>

                {casesLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                ) : cases.length === 0 ? (
                  <div className="text-center py-16">
                    <Scale className="w-12 h-12 text-border mx-auto mb-4" />
                    <p className="text-text-secondary font-medium">No cases filed yet</p>
                    <p className="text-sm text-text-secondary mt-1">
                      Be the first to file a case
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {cases.map((addr, i) => (
                      <CaseCard key={addr} address={addr} index={i} />
                    ))}
                  </div>
                )}

                {hasMore && (
                  <div className="mt-6 text-center">
                    <Button
                      variant="outline"
                      isLoading={isLoadingMore}
                      onClick={loadMore}
                    >
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* File Case tab */}
            {activeTab === 'file' && (
              <Card>
                {!isConnected ? (
                  <NotConnectedBanner onConnect={connect} />
                ) : isConnecting ? null : (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-text-primary">File a Case</h2>
                        <p className="text-sm text-text-secondary">
                          Report a community rule violation
                        </p>
                      </div>
                    </div>
                    <FileCaseForm
                      senderAddress={address!}
                      rules={rules}
                      onSuccess={(txHash, caseAddress) => {
                        success('Case Filed!', `Transaction: ${txHash.slice(0, 20)}…`);
                        refetchCases();
                        setActiveTab('cases');
                        if (caseAddress) navigate(`/cases/${caseAddress}`);
                      }}
                      onError={(msg) => toastError('Failed to File Case', msg)}
                    />
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
