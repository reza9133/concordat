// ============================================================
// CaseDetailPage — full case detail, actions, timeline
// ============================================================

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Scale, User, FileText, Gavel, Shield, AlertCircle,
  ExternalLink, RefreshCw, Link as LinkIcon,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Badge, statusToBadgeVariant, formatStatus } from '../components/ui/Badge';
import { CaseTimeline } from '../components/concordat/CaseTimeline';
import { ContractAddress } from '../components/ui/ContractAddress';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ToastContainer } from '../components/ui/Toast';
import { useWallet } from '../hooks/useWallet';
import { useCaseStatus } from '../hooks/useContract';
import { useToast } from '../hooks/useToast';
import {
  writeCaseSubmitDefense,
  writeCaseRequestRuling,
  writeCaseAppeal,
  writeCaseFinalize,
  writeCaseAbandonAppeal,
  truncateAddress,
  getErrorMessage,
} from '../lib/genlayer';

type CaseAction = 'defense' | 'ruling' | 'appeal' | 'finalize' | 'abandon';

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-text-secondary flex-shrink-0">{label}</span>
      <span className={`text-sm font-medium text-text-primary text-right ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function ActionPanel({
  caseAddress,
  senderAddress,
  canRequestRuling,
  caseStatus,
  onSuccess,
}: {
  caseAddress: string;
  senderAddress: string;
  canRequestRuling: boolean;
  caseStatus: ReturnType<typeof useCaseStatus>['status'];
  onSuccess: () => void;
}) {
  const [activeAction, setActiveAction] = useState<CaseAction | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { toasts, dismiss, success: toastSuccess, error: toastError } = useToast();

  if (!caseStatus) return null;

  const isAccused = senderAddress.toLowerCase() === caseStatus.accused.toLowerCase();
  const isComplainant = senderAddress.toLowerCase() === caseStatus.complainant.toLowerCase();
  const status = caseStatus.status;
  const now = Math.floor(Date.now() / 1000);

  // Determine available actions
  const actions: { key: CaseAction; label: string; icon: React.ElementType; condition: boolean; needsUrl: boolean; urlLabel?: string; urlPlaceholder?: string }[] = [
    {
      key: 'defense',
      label: 'Submit Defense',
      icon: Shield,
      condition: status === 'open' && isAccused && now < caseStatus.defense_deadline,
      needsUrl: true,
      urlLabel: 'Defense URL',
      urlPlaceholder: 'https://your-defense-document…',
    },
    {
      key: 'ruling',
      label: 'Request Ruling',
      icon: Gavel,
      condition: canRequestRuling,
      needsUrl: false,
    },
    {
      key: 'appeal',
      label: 'Appeal Ruling',
      icon: Scale,
      condition: status === 'ruled' && (
        (isComplainant && caseStatus.first_ruling?.verdict === 'dismissed') ||
        (isAccused && caseStatus.first_ruling?.verdict === 'sustained')
      ) && caseStatus.appeal_deadline !== null && now < (caseStatus.appeal_deadline ?? Infinity),
      needsUrl: true,
      urlLabel: 'Appeal Grounds URL',
      urlPlaceholder: 'https://your-appeal-grounds…',
    },
    {
      key: 'finalize',
      label: 'Finalize Case',
      icon: FileText,
      condition: status === 'ruled' && caseStatus.appeal_deadline !== null && now > (caseStatus.appeal_deadline ?? 0),
      needsUrl: false,
    },
    {
      key: 'abandon',
      label: 'Abandon Appeal',
      icon: AlertCircle,
      condition: status === 'under_appeal',
      needsUrl: false,
    },
  ];

  const visibleActions = actions.filter((a) => a.condition);

  const executeAction = async () => {
    if (!activeAction) return;
    setIsLoading(true);
    setActionError(null);

    try {
      const addr = senderAddress as `0x${string}`;
      const cAddr = caseAddress as `0x${string}`;

      switch (activeAction) {
        case 'defense':
          await writeCaseSubmitDefense(addr, cAddr, urlInput);
          toastSuccess('Defense Submitted', 'Your defense has been recorded on-chain.');
          break;
        case 'ruling':
          await writeCaseRequestRuling(addr, cAddr);
          toastSuccess('Ruling Requested', 'The AI will now deliberate on this case.');
          break;
        case 'appeal':
          await writeCaseAppeal(addr, cAddr, urlInput);
          toastSuccess('Appeal Filed', 'Your appeal has been submitted.');
          break;
        case 'finalize':
          await writeCaseFinalize(addr, cAddr);
          toastSuccess('Case Finalized', 'The case outcome is now permanent.');
          break;
        case 'abandon':
          await writeCaseAbandonAppeal(addr, cAddr);
          toastSuccess('Appeal Abandoned', 'The appeal has been dropped.');
          break;
      }
      setActiveAction(null);
      setUrlInput('');
      onSuccess();
    } catch (err) {
      const msg = getErrorMessage(err);
      setActionError(msg);
      toastError('Action Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (visibleActions.length === 0) return null;

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <Card gradientBorder>
        <CardHeader>
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <Gavel className="w-4 h-4 text-primary" />
            Available Actions
          </h3>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2 mb-4">
            {visibleActions.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={activeAction === key ? 'primary' : 'outline'}
                size="sm"
                leftIcon={<Icon className="w-3.5 h-3.5" />}
                onClick={() => setActiveAction(activeAction === key ? null : key)}
              >
                {label}
              </Button>
            ))}
          </div>

          {activeAction && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              {visibleActions.find((a) => a.key === activeAction)?.needsUrl && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5" />
                      {visibleActions.find((a) => a.key === activeAction)?.urlLabel}
                    </span>
                  </label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={visibleActions.find((a) => a.key === activeAction)?.urlPlaceholder}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              )}

              {actionError && (
                <p className="text-sm text-danger flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {actionError}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isLoading}
                  onClick={executeAction}
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setActiveAction(null); setUrlInput(''); setActionError(null); }}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </CardBody>
      </Card>
    </>
  );
}

export function CaseDetailPage() {
  const { address: caseAddress } = useParams<{ address: string }>();
  const { address: walletAddress, isConnected } = useWallet();
  const { status, canRequestRuling, isLoading, error, refetch } = useCaseStatus(caseAddress ?? '');

  if (!caseAddress) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <p className="text-text-secondary">Invalid case address.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </Link>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner variant="spinner" size="lg" />
          </div>
        )}

        {error && (
          <Card>
            <div className="flex items-center gap-2 text-danger">
              <AlertCircle className="w-5 h-5" />
              <p>Failed to load case: {error}</p>
            </div>
          </Card>
        )}

        {status && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Case header */}
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-text-primary">Case Detail</h1>
                    <Badge variant={statusToBadgeVariant(status.status)} dot size="md">
                      {formatStatus(status.status)}
                    </Badge>
                  </div>
                  <ContractAddress address={caseAddress} size="sm" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={refetch}
                >
                  Refresh
                </Button>
              </div>

              {/* Timeline */}
              <div className="py-4 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">
                  Case Lifecycle
                </p>
                <CaseTimeline currentStatus={status.status} />
              </div>
            </Card>

            {/* Parties + Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-text-primary flex items-center gap-2">
                    <User className="w-4 h-4 text-text-secondary" />
                    Parties
                  </h3>
                </CardHeader>
                <CardBody>
                  <InfoRow label="Complainant" value={truncateAddress(status.complainant, 6)} mono />
                  <InfoRow label="Accused" value={truncateAddress(status.accused, 6)} mono />
                  {status.appellant && (
                    <InfoRow label="Appellant" value={truncateAddress(status.appellant, 6)} mono />
                  )}
                  <InfoRow label="Rule Violated" value={`#${status.rule_number}`} />
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-text-primary flex items-center gap-2">
                    <FileText className="w-4 h-4 text-text-secondary" />
                    Documents
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Complaint</p>
                      <a
                        href={status.complaint_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View Document <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {status.defense_url && (
                      <div>
                        <p className="text-xs text-text-secondary mb-1">Defense</p>
                        <a
                          href={status.defense_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          View Defense <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {status.appeal_grounds_url && (
                      <div>
                        <p className="text-xs text-text-secondary mb-1">Appeal Grounds</p>
                        <a
                          href={status.appeal_grounds_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          View Appeal <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Ruling section */}
            {status.first_ruling && (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-text-primary flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-primary" />
                    First Ruling
                    <Badge
                      variant={status.first_ruling.verdict === 'sustained' ? 'suspended' : 'good'}
                      size="sm"
                    >
                      {status.first_ruling.verdict === 'sustained' ? 'Sustained' : 'Dismissed'}
                    </Badge>
                  </h3>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-text-secondary leading-relaxed mb-3">
                    {status.first_ruling.reasoning}
                  </p>
                  {status.first_ruling.penalty_points > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger font-medium">
                      <AlertCircle className="w-4 h-4" />
                      {status.first_ruling.penalty_points} penalty points applied
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Final ruling */}
            {status.final_ruling && (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-text-primary flex items-center gap-2">
                    <Scale className="w-4 h-4 text-secondary" />
                    Final Ruling
                    <Badge
                      variant={status.final_ruling.verdict === 'sustained' ? 'suspended' : 'good'}
                      size="sm"
                    >
                      {status.final_ruling.verdict === 'sustained' ? 'Sustained' : 'Dismissed'}
                    </Badge>
                  </h3>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-text-secondary leading-relaxed mb-3">
                    {status.final_ruling.reasoning}
                  </p>
                  {status.final_ruling.penalty_points > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger font-medium">
                      <AlertCircle className="w-4 h-4" />
                      {status.final_ruling.penalty_points} penalty points applied
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Actions panel — only if wallet connected */}
            {isConnected && walletAddress && (
              <ActionPanel
                caseAddress={caseAddress}
                senderAddress={walletAddress}
                canRequestRuling={canRequestRuling}
                caseStatus={status}
                onSuccess={refetch}
              />
            )}

            {!isConnected && (
              <Card>
                <p className="text-sm text-text-secondary text-center py-2">
                  Connect your wallet to take actions on this case.
                </p>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
