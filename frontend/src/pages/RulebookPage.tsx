// ============================================================
// RulebookPage — list all rules, filter, add rule (owner)
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { RuleCard } from '../components/concordat/RuleCard';
import { AddRuleForm } from '../components/concordat/AddRuleForm';
import { SkeletonCard } from '../components/ui/LoadingSpinner';
import { ToastContainer } from '../components/ui/Toast';
import { useWallet } from '../hooks/useWallet';
import { useRules, useHallConfig } from '../hooks/useContract';
import { useToast } from '../hooks/useToast';
import { writeRetireRule, getErrorMessage } from '../lib/genlayer';

type Filter = 'all' | 'active' | 'retired';

export function RulebookPage() {
  const { address, isConnected } = useWallet();
  const { rules, isLoading, error, refetch } = useRules();
  const { config } = useHallConfig();
  const { toasts, dismiss, success, error: toastError } = useToast();
  const [filter, setFilter] = useState<Filter>('active');
  const [showAddForm, setShowAddForm] = useState(false);
  const [retiringRule, setRetiringRule] = useState<number | null>(null);

  const isOwner = config && address
    ? config.owner.toLowerCase() === address.toLowerCase()
    : false;

  const filteredRules = rules.filter((r) => {
    if (filter === 'active') return r.active;
    if (filter === 'retired') return !r.active;
    return true;
  });

  const handleRetireRule = async (ruleNumber: number) => {
    if (!address) return;
    setRetiringRule(ruleNumber);
    try {
      await writeRetireRule(address as `0x${string}`, ruleNumber);
      success('Rule Retired', `Rule #${ruleNumber} has been retired.`);
      refetch();
    } catch (err) {
      toastError('Failed to Retire Rule', getErrorMessage(err));
    } finally {
      setRetiringRule(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="max-w-4xl mx-auto">
        {/* Hero header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-primary">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Rulebook</h1>
              <p className="text-text-secondary">
                {config?.community ? `${config.community} community rules` : 'Community governance rules'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Controls bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          {/* Filter tabs */}
          <div className="flex gap-1 p-1 bg-white rounded-xl border border-border">
            {(['active', 'retired', 'all'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="ml-1.5 text-xs opacity-70">
                  ({f === 'active' ? rules.filter((r) => r.active).length
                    : f === 'retired' ? rules.filter((r) => !r.active).length
                    : rules.length})
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={refetch}
            >
              Refresh
            </Button>
            {isOwner && isConnected && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                rightIcon={
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showAddForm ? 'rotate-180' : ''}`}
                  />
                }
                onClick={() => setShowAddForm((v) => !v)}
              >
                Add Rule
              </Button>
            )}
          </div>
        </div>

        {/* Add Rule Form */}
        <AnimatePresence>
          {showAddForm && isOwner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <Card gradientBorder>
                <div className="flex items-center gap-2 mb-5">
                  <Plus className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-text-primary">Add New Rule</h3>
                </div>
                <AddRuleForm
                  senderAddress={address!}
                  onSuccess={(txHash) => {
                    success('Rule Added!', `Transaction: ${txHash.slice(0, 20)}…`);
                    refetch();
                    setShowAddForm(false);
                  }}
                  onError={(msg) => toastError('Failed to Add Rule', msg)}
                />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rules grid */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <Card>
            <div className="flex items-center gap-2 text-danger">
              <AlertCircle className="w-5 h-5" />
              <p>Failed to load rules: {error}</p>
            </div>
          </Card>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-border mx-auto mb-4" />
            <p className="text-text-secondary font-medium">
              {filter === 'active' ? 'No active rules' : filter === 'retired' ? 'No retired rules' : 'No rules yet'}
            </p>
            {isOwner && filter === 'active' && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setShowAddForm(true)}
              >
                Add First Rule
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRules.map((rule, i) => (
              <RuleCard
                key={rule.number}
                rule={rule}
                index={i}
                isOwner={!!isOwner}
                onRetire={handleRetireRule}
                isRetiring={retiringRule === rule.number}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
