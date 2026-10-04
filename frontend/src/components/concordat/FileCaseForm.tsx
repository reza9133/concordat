// ============================================================
// FileCaseForm — form to file a new case against an accused
// ============================================================

import { useState } from 'react';
import { Scale, User, Hash, Link as LinkIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { writeFileCase, getErrorMessage } from '../../lib/genlayer';
import type { Rule } from '../../types';

interface FileCaseFormProps {
  senderAddress: string;
  rules: Rule[];
  onSuccess?: (txHash: string, caseAddress: string | null) => void;
  onError?: (message: string) => void;
}

export function FileCaseForm({ senderAddress, rules, onSuccess, onError }: FileCaseFormProps) {
  const [accused, setAccused] = useState('');
  const [ruleNumber, setRuleNumber] = useState<string>('');
  const [complaintUrl, setComplaintUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const activeRules = rules.filter((r) => r.active);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!accused || !/^0x[0-9a-fA-F]{40}$/.test(accused)) {
      newErrors.accused = 'Enter a valid Ethereum address (0x…)';
    }
    if (accused.toLowerCase() === senderAddress.toLowerCase()) {
      newErrors.accused = 'You cannot file a case against yourself';
    }
    if (!ruleNumber) {
      newErrors.ruleNumber = 'Please select a rule that was violated';
    }
    if (!complaintUrl || (!complaintUrl.startsWith('http://') && !complaintUrl.startsWith('https://')) || /^https?:\/\/(localhost|\[|\d+(\.\d+){0,3}(\/|:|\?|#|$))/i.test(complaintUrl)) {
      newErrors.complaintUrl = 'Enter a valid URL (http:// or https://)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { txHash, caseAddress } = await writeFileCase(
        senderAddress as `0x${string}`,
        accused,
        parseInt(ruleNumber),
        complaintUrl
      );
      setAccused('');
      setRuleNumber('');
      setComplaintUrl('');
      setErrors({});
      onSuccess?.(txHash, caseAddress);
    } catch (err) {
      const msg = getErrorMessage(err);
      onError?.(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Accused address */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1.5">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-text-secondary" />
            Accused Address
          </span>
        </label>
        <input
          type="text"
          value={accused}
          onChange={(e) => setAccused(e.target.value.trim())}
          placeholder="0x1234…abcd"
          className={`w-full px-4 py-3 rounded-xl border bg-white font-mono text-sm text-text-primary placeholder-text-secondary/60
            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors
            ${errors.accused ? 'border-danger focus:border-danger focus:ring-danger/30' : 'border-border'}`}
        />
        {errors.accused && (
          <p className="mt-1.5 text-xs text-danger">{errors.accused}</p>
        )}
      </div>

      {/* Rule selection */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1.5">
          <span className="flex items-center gap-1.5">
            <Hash className="w-4 h-4 text-text-secondary" />
            Rule Violated
          </span>
        </label>
        <select
          value={ruleNumber}
          onChange={(e) => setRuleNumber(e.target.value)}
          className={`w-full px-4 py-3 rounded-xl border bg-white text-sm text-text-primary
            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors
            ${errors.ruleNumber ? 'border-danger focus:border-danger focus:ring-danger/30' : 'border-border'}`}
        >
          <option value="">Select a rule…</option>
          {activeRules.map((rule) => (
            <option key={rule.number} value={rule.number}>
              Rule #{rule.number} — {rule.title}
            </option>
          ))}
        </select>
        {errors.ruleNumber && (
          <p className="mt-1.5 text-xs text-danger">{errors.ruleNumber}</p>
        )}
        {activeRules.length === 0 && (
          <p className="mt-1.5 text-xs text-text-secondary">No active rules found. Rules must be added by the hall owner.</p>
        )}
      </div>

      {/* Complaint URL */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1.5">
          <span className="flex items-center gap-1.5">
            <LinkIcon className="w-4 h-4 text-text-secondary" />
            Complaint URL
          </span>
        </label>
        <input
          type="url"
          value={complaintUrl}
          onChange={(e) => setComplaintUrl(e.target.value.trim())}
          placeholder="https://…"
          className={`w-full px-4 py-3 rounded-xl border bg-white text-sm text-text-primary placeholder-text-secondary/60
            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors
            ${errors.complaintUrl ? 'border-danger focus:border-danger focus:ring-danger/30' : 'border-border'}`}
        />
        <p className="mt-1.5 text-xs text-text-secondary">
          Link to evidence on a public website (a domain name, not an IP address). Only the URL is recorded, not the page, so prefer a page that will not change, such as a gist revision or an archived copy. If the page is edited after the ruling, an appeal cannot re-judge it and the first ruling stands.
        </p>
        {errors.complaintUrl && (
          <p className="mt-1.5 text-xs text-danger">{errors.complaintUrl}</p>
        )}
      </div>

      {/* Warning */}
      <div className="flex gap-2.5 p-3.5 rounded-xl bg-accent/10 border border-accent/20">
        <Scale className="w-4.5 h-4.5 w-[18px] h-[18px] text-amber-700 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          Filing a false or malicious case may result in your own standing being penalized.
          Make sure your complaint is genuine and supported by evidence.
        </p>
      </div>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        isLoading={isSubmitting}
        leftIcon={<Scale className="w-4 h-4" />}
      >
        {isSubmitting ? 'Filing Case…' : 'File Case'}
      </Button>
    </form>
  );
}
