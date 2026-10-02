// ============================================================
// Footer — branding, links, contract address display
// ============================================================

import { Link } from 'react-router-dom';
import { Github, ExternalLink, BookOpen } from 'lucide-react';
import { ConcordatLogo } from './ConcordatLogo';
import { GenLayerLogo } from './GenLayerLogo';
import { ContractAddress } from '../ui/ContractAddress';
import { CONTRACT_ADDRESS } from '../../lib/genlayer';

const FOOTER_LINKS = {
  product: [
    { label: 'App', to: '/app' },
    { label: 'Rulebook', to: '/rulebook' },
    { label: 'Standings', to: '/standings' },
    { label: 'How It Works', to: '/how-it-works' },
  ],
  resources: [
    { label: 'Documentation', to: '/docs' },
    { label: 'GenLayer Docs', href: 'https://docs.genlayer.com', external: true },
    { label: 'GitHub', href: 'https://github.com', external: true },
    { label: 'Studionet Explorer', href: 'https://studio.genlayer.com', external: true },
  ],
};

export function Footer() {
  return (
    <footer className="relative bg-white border-t border-border mt-auto">
      {/* Gradient top border */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-brand" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="md:col-span-2">
            <ConcordatLogo size={40} showText={true} />
            <p className="mt-3 text-sm text-text-secondary leading-relaxed max-w-sm">
              Community rules enforced by AI consensus. A decentralized dispute resolution
              system powered by GenLayer's intelligent contracts.
            </p>

            {/* Contract address */}
            <div className="mt-4">
              <p className="text-xs text-text-secondary mb-1 font-medium uppercase tracking-wide">
                Contract Address
              </p>
              <ContractAddress address={CONTRACT_ADDRESS} size="sm" />
            </div>

            {/* Social links */}
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-background text-text-secondary hover:text-text-primary transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://genlayer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-background text-text-secondary hover:text-text-primary transition-colors"
                aria-label="GenLayer Website"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
              <Link
                to="/docs"
                className="p-2 rounded-lg hover:bg-background text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Documentation"
              >
                <BookOpen className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Product</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-text-secondary hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Resources</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.resources.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-text-secondary hover:text-primary transition-colors inline-flex items-center gap-1"
                    >
                      {link.label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <Link
                      to={link.to!}
                      className="text-sm text-text-secondary hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-secondary">
            © {new Date().getFullYear()} Concordat. All rights reserved.
          </p>
          <a
            href="https://genlayer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-text-secondary hover:text-primary transition-colors"
          >
            <span>Powered by</span>
            <GenLayerLogo size={16} />
            <span className="font-semibold">GenLayer</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
