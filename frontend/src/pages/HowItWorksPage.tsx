// ============================================================
// HowItWorksPage — animated step-by-step visual explainer
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, BookOpen, Scale, Shield, Brain, ChevronRight, Star, ChevronDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const STEPS = [
  {
    number: 1,
    icon: Building2,
    title: 'Deploy the Hall',
    tagline: 'Establish your community hub',
    description:
      'The ConcordatHall contract is deployed with community-specific configuration: the community name, who the owner/admin is, how many penalty points lead to probation or suspension, and time windows for defense submission and appeals.',
    details: [
      'Set community name and owner address',
      'Configure probation and suspension thresholds',
      'Define defense and appeal time windows',
      'Contract is immutably deployed on GenLayer',
    ],
    gradient: 'from-blue-500 to-cyan-500',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
  },
  {
    number: 2,
    icon: BookOpen,
    title: 'Write the Rulebook',
    tagline: 'Define community standards',
    description:
      'The hall owner populates the rulebook with community rules. Each rule has a number, title, and detailed description. Rules can be retired when obsolete but never deleted — preserving historical context.',
    details: [
      'Owner adds rules with add_rule(title, text)',
      'Each rule receives a sequential number',
      'Rules can be retired but not destroyed',
      'Retired rules preserve case history integrity',
    ],
    gradient: 'from-purple-500 to-primary',
    bgLight: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
  },
  {
    number: 3,
    icon: Scale,
    title: 'File a Case',
    tagline: 'Report a rule violation',
    description:
      'Any community member can file a case against another member by specifying the accused address, the rule they allegedly violated, and a URL linking to complaint evidence (GitHub issue, forum post, etc.).',
    details: [
      'Call file_case(accused, rule_number, complaint_url)',
      'A new ConcordatCase contract is deployed',
      'Defense window starts immediately',
      'Complaint URL is immutably recorded on-chain',
    ],
    gradient: 'from-primary to-purple-500',
    bgLight: 'bg-primary/5',
    border: 'border-primary/20',
    text: 'text-primary',
  },
  {
    number: 4,
    icon: Shield,
    title: 'Submit a Defense',
    tagline: 'The accused responds',
    description:
      'The accused party has a configurable time window (e.g., 5 minutes or 1 week) to submit a defense URL linking to their counter-argument. If no defense is submitted, the AI will adjudicate based only on the complaint.',
    details: [
      'Accused calls submit_defense(url)',
      'Defense URL is recorded on-chain',
      'Window closes after configured time (the complainant can withdraw only before an answer)',
      'No defense = AI rules on complaint alone',
    ],
    gradient: 'from-green-500 to-secondary',
    bgLight: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
  },
  {
    number: 5,
    icon: Brain,
    title: 'AI Ruling',
    tagline: 'Impartial AI consensus',
    description:
      'Once the accused has submitted a defense, or the defense window has closed, anyone can trigger the AI ruling via request_ruling(). GenLayer\'s validators read the complaint and defense URLs, analyze the content against the rule, and reach consensus on a verdict with penalty points.',
    details: [
      'Anyone calls request_ruling()',
      'Multiple AI validators analyze the case',
      'Consensus is reached on verdict and penalty',
      'Result is written immutably on-chain',
    ],
    gradient: 'from-pink-500 to-rose-500',
    bgLight: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-700',
  },
  {
    number: 6,
    icon: Scale,
    title: 'Appeal',
    tagline: 'Challenge the ruling',
    description:
      'The losing party has an appeal window to challenge the ruling by submitting grounds for appeal. This triggers a new appeal contract (ConcordatAppeal) where the AI reviews the first ruling against the stored evidence and the appellant\'s grounds. The first ruling stands unless the grounds clearly show a mistake. Anyone then triggers the review with review().',
    details: [
      'Losing party calls appeal(grounds_url)',
      'New ConcordatAppeal contract is created',
      'Deference standard: the first ruling stands unless clearly mistaken',
      'Only one appeal per case allowed',
    ],
    gradient: 'from-orange-500 to-amber-500',
    bgLight: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
  },
  {
    number: 7,
    icon: Star,
    title: 'Final Outcome & Reputation',
    tagline: 'Results recorded forever',
    description:
      'If nobody appeals, anyone can call finalize() once the appeal window has passed. If the case was appealed, the appeal review reports its result to the case automatically when the network finalizes it, and no finalize() call is needed. Either way, the final ruling\'s penalty points are applied to the accused\'s standing, affecting their community reputation.',
    details: [
      'Call finalize() after the appeal window if nobody appealed',
      'Penalty points applied to accused standing',
      'Status updated: good → probation → suspended',
      'Case permanently archived on-chain',
    ],
    gradient: 'from-yellow-500 to-amber-500',
    bgLight: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
  },
];

export function HowItWorksPage() {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-4">
            The Complete Process
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary mb-4">
            How Concordat Works
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto">
            From filing a case to receiving a final AI-powered ruling — a transparent,
            step-by-step community dispute resolution system.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-7 top-8 bottom-8 w-0.5 timeline-line hidden sm:block" />

          <div className="space-y-4">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isExpanded = expandedStep === idx;

              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.07, duration: 0.4 }}
                >
                  <div
                    className={`
                      relative sm:pl-20 cursor-pointer
                    `}
                    onClick={() => setExpandedStep(isExpanded ? null : idx)}
                  >
                    {/* Step icon (absolute on sm+) */}
                    <div
                      className={`
                        hidden sm:flex absolute left-0 top-4 w-14 h-14 rounded-2xl
                        bg-gradient-to-br ${step.gradient} items-center justify-center
                        shadow-primary z-10 flex-shrink-0
                      `}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <div
                      className={`
                        bg-white rounded-2xl border transition-all duration-300
                        ${isExpanded ? `${step.border} shadow-card-hover` : 'border-border hover:border-primary/30 hover:shadow-card'}
                      `}
                    >
                      {/* Header */}
                      <div className="flex items-center gap-4 p-5">
                        {/* Mobile icon */}
                        <div
                          className={`
                            sm:hidden w-10 h-10 rounded-xl bg-gradient-to-br ${step.gradient}
                            flex items-center justify-center flex-shrink-0
                          `}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-xs font-bold uppercase tracking-wider ${step.text}`}>
                              Step {step.number}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-text-primary">{step.title}</h3>
                          <p className="text-sm text-text-secondary">{step.tagline}</p>
                        </div>

                        <ChevronDown
                          className={`w-5 h-5 text-text-secondary transition-transform duration-300 flex-shrink-0 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>

                      {/* Expanded content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className={`mx-5 mb-5 p-4 rounded-xl ${step.bgLight} border ${step.border}`}>
                              <p className={`text-sm leading-relaxed mb-4 ${step.text}`}>
                                {step.description}
                              </p>
                              <ul className="space-y-2">
                                {step.details.map((detail) => (
                                  <li key={detail} className="flex items-center gap-2 text-sm text-text-primary">
                                    <ChevronRight className={`w-3.5 h-3.5 ${step.text} flex-shrink-0`} />
                                    {detail}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-14 text-center"
        >
          <h2 className="text-2xl font-bold text-text-primary mb-3">Ready to get started?</h2>
          <p className="text-text-secondary mb-6">
            Launch the app, connect your wallet, and explore the Concordat Hall.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/app">
              <Button variant="primary" size="lg">
                Open App
              </Button>
            </Link>
            <Link to="/docs">
              <Button variant="outline" size="lg">
                Read Documentation
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
