// ============================================================
// AddRuleForm — owner-only form to add rules to the rulebook
// ============================================================

import { useState } from 'react';
import { BookOpen, Type, AlignLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { writeAddRule, getErrorMessage } from '../../lib/genlayer';

interface AddRuleFormProps {
  senderAddress: string;
  onSuccess?: (txHash: string) => void;
  onError?: (message: string) => void;
}

export function AddRuleForm({ senderAddress, onSuccess, onError }: AddRuleFormProps) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    if (title.trim().length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }
    if (!text.trim() || text.trim().length < 10) {
      newErrors.text = 'Rule text must be at least 10 characters';
    }
    if (text.trim().length > 2000) {
      newErrors.text = 'Rule text must be 2000 characters or less';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const txHash = await writeAddRule(
        senderAddress as `0x${string}`,
        title.trim(),
        text.trim()
      );
      setTitle('');
      setText('');
      setErrors({});
      onSuccess?.(txHash);
    } catch (err) {
      onError?.(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1.5">
          <span className="flex items-center gap-1.5">
            <Type className="w-4 h-4 text-text-secondary" />
            Rule Title
          </span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., No Harassment"
          maxLength={100}
          className={`w-full px-4 py-3 rounded-xl border bg-white text-sm text-text-primary placeholder-text-secondary/60
            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors
            ${errors.title ? 'border-danger' : 'border-border'}`}
        />
        <div className="flex justify-between mt-1">
          {errors.title ? (
            <p className="text-xs text-danger">{errors.title}</p>
          ) : <span />}
          <span className="text-xs text-text-secondary">{title.length}/100</span>
        </div>
      </div>

      {/* Rule text */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1.5">
          <span className="flex items-center gap-1.5">
            <AlignLeft className="w-4 h-4 text-text-secondary" />
            Rule Text
          </span>
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe the rule in detail. Be specific about what constitutes a violation…"
          rows={4}
          maxLength={2000}
          className={`w-full px-4 py-3 rounded-xl border bg-white text-sm text-text-primary placeholder-text-secondary/60
            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none
            ${errors.text ? 'border-danger' : 'border-border'}`}
        />
        <div className="flex justify-between mt-1">
          {errors.text ? (
            <p className="text-xs text-danger">{errors.text}</p>
          ) : <span />}
          <span className="text-xs text-text-secondary">{text.length}/2000</span>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        isLoading={isSubmitting}
        leftIcon={<BookOpen className="w-4 h-4" />}
      >
        {isSubmitting ? 'Adding Rule…' : 'Add Rule'}
      </Button>
    </form>
  );
}
