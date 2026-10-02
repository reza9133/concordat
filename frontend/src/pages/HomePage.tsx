// ============================================================
// HomePage — animated landing page with hero, stats, features
// ============================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Scale, Brain, Shield, Star, Zap, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CountUpNumber } from '../components/concordat/CountUpNumber';
import { readGetCaseCount, readGetConfig } from '../lib/genlayer';

const FADE_UP = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

const STAGGER = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Rulings',
    description:
      'Cases are adjudicated by GenLayer intelligent contracts reaching consensus through multiple AI validators — impartial, transparent, and on-chain.',
    gradient: 'from-primary to-purple-500',
  },
  {
    icon: Scale,
    title: 'Full Appeal System',
    description:
      'Every ruling can be challenged. The losing party can file an appeal with supporting grounds, triggering a fresh AI review of the dispute.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Shield,
    title: 'On-Chain Reputation',
    description:
      'Penalty points accumulate transparently. Repeated violations lead to probation or suspension, maintaining community standards automatically.',
    gradient: 'from-pink-500 to-rose-500',
  },
];

/** Floating animated background orbs */
function BackgroundOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="orb w-96 h-96 bg-primary/20 top-[-100px] left-[-100px] animate-float"
        style={{ animationDelay: '0s' }}
      />
      <div
        className="orb w-72 h-72 bg-purple-400/15 top-[20%] right-[-80px] animate-float"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="orb w-56 h-56 bg-pink-400/15 bottom-[10%] left-[20%] animate-float"
        style={{ animationDelay: '4s' }}
      />
    </div>
  );
}

/** Animated SVG contract flow diagram */
function ContractDiagram() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      className="relative w-full max-w-lg mx-auto"
    >
      <svg viewBox="0 0 480 160" className="w-full" xmlns="http://www.w3.org/2000/svg">
        {/* Hall box */}
        <rect x="10" y="45" width="120" height="70" rx="12" fill="white" stroke="#E5E1F8" strokeWidth="1.5" />
        <text x="70" y="78" textAnchor="middle" fontSize="12" fontWeight="600" fill="#1A1035">ConcordatHall</text>
        <text x="70" y="96" textAnchor="middle" fontSize="10" fill="#6B7280">file_case()</text>

        {/* Arrow 1 */}
        <motion.path
          d="M 130 80 L 190 80"
          stroke="#6C47FF"
          strokeWidth="2"
          strokeDasharray="4 3"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        />
        <polygon points="190,75 200,80 190,85" fill="#6C47FF" />

        {/* Case box */}
        <rect x="200" y="45" width="120" height="70" rx="12" fill="white" stroke="#A855F7" strokeWidth="1.5" />
        <text x="260" y="78" textAnchor="middle" fontSize="12" fontWeight="600" fill="#1A1035">ConcordatCase</text>
        <text x="260" y="96" textAnchor="middle" fontSize="10" fill="#6B7280">appeal()</text>

        {/* Arrow 2 */}
        <motion.path
          d="M 320 80 L 380 80"
          stroke="#A855F7"
          strokeWidth="2"
          strokeDasharray="4 3"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        />
        <polygon points="380,75 390,80 380,85" fill="#A855F7" />

        {/* Appeal box */}
        <rect x="390" y="45" width="80" height="70" rx="12" fill="white" stroke="#EC4899" strokeWidth="1.5" />
        <text x="430" y="78" textAnchor="middle" fontSize="11" fontWeight="600" fill="#1A1035">Appeal</text>
        <text x="430" y="96" textAnchor="middle" fontSize="10" fill="#6B7280">AI ruling</text>

        {/* Labels above arrows */}
        <text x="162" y="70" textAnchor="middle" fontSize="9" fill="#6C47FF" fontWeight="500">creates</text>
        <text x="352" y="70" textAnchor="middle" fontSize="9" fill="#A855F7" fontWeight="500">triggers</text>
      </svg>
    </motion.div>
  );
}

export function HomePage() {
  const [caseCount, setCaseCount] = useState<number | null>(null);
  const [communityName, setCommunityName] = useState<string | null>(null);

  useEffect(() => {
    readGetCaseCount().then(setCaseCount).catch(() => {});
    readGetConfig().then((c) => setCommunityName(c.community)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 pt-20 pb-16 overflow-hidden">
        <BackgroundOrbs />

        <motion.div
          variants={STAGGER}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-4xl mx-auto"
        >
          {/* Pill badge */}
          <motion.div variants={FADE_UP}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-6">
              <Zap className="w-3.5 h-3.5" />
              Powered by GenLayer Intelligent Contracts
            </span>
          </motion.div>

          {/* Main title */}
          <motion.h1
            variants={FADE_UP}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.08]"
          >
            Community Rules{' '}
            <span className="gradient-text-animated" style={{ backgroundSize: '300% 300%' }}>
              Enforced by AI
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={FADE_UP}
            className="text-xl sm:text-2xl text-text-secondary max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            Concordat brings on-chain dispute resolution to communities. File cases, submit
            defenses, and receive impartial rulings through decentralized AI consensus.
          </motion.p>

          {/* CTA buttons */}
          <motion.div variants={FADE_UP} className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <Link to="/app">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Launch App
              </Button>
            </Link>
            <Link to="/docs">
              <Button size="lg" variant="outline">
                Read Docs
              </Button>
            </Link>
          </motion.div>

          {/* Contract diagram */}
          <motion.div variants={FADE_UP} className="mb-4">
            <p className="text-xs text-text-secondary mb-4 uppercase tracking-wider font-medium">
              Contract Architecture
            </p>
            <ContractDiagram />
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="w-6 h-6 text-text-secondary animate-bounce" />
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-white border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              {
                value: caseCount ?? 0,
                label: 'Total Cases',
                suffix: '+',
                color: 'text-primary',
              },
              {
                value: 100,
                label: 'AI Accuracy',
                suffix: '%',
                color: 'text-secondary',
              },
              {
                value: 0,
                label: 'Human Bias',
                suffix: '',
                color: 'text-text-primary',
              },
              {
                value: 24,
                label: 'Hours Available',
                suffix: '/7',
                color: 'text-primary',
              },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-4xl sm:text-5xl font-extrabold ${stat.color}`}>
                  <CountUpNumber value={stat.value} suffix={stat.suffix} duration={1500} />
                </div>
                <p className="text-sm text-text-secondary mt-2 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
          {communityName && (
            <p className="text-center mt-8 text-sm text-text-secondary">
              Currently serving the{' '}
              <span className="font-semibold text-primary">{communityName}</span> community
            </p>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
              How Concordat Works
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              A transparent, automated system for community dispute resolution that anyone can
              trust — because it runs on code, not politics.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-2xl border border-border p-6 shadow-card hover:shadow-card-hover transition-all duration-300"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-primary`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">{feature.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-brand relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to govern fairly?
            </h2>
            <p className="text-white/80 text-lg mb-8">
              Connect your wallet and explore the Concordat system — create cases, check member
              standings, and experience AI-powered community governance.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/app">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 shadow-lg"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Open App
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button
                  size="lg"
                  className="border-white/40 text-white hover:bg-white/10"
                  variant="outline"
                >
                  How It Works
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
