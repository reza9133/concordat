// ============================================================
// DocsPage — multi-section documentation with sticky sidebar
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, ExternalLink } from 'lucide-react';
import { CONTRACT_ADDRESS } from '../lib/genlayer';

interface DocSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-[#1A1035] rounded-xl p-4 overflow-x-auto my-4">
      <code className="text-[#A5B4FC] text-sm font-mono leading-relaxed whitespace-pre">
        {children}
      </code>
    </pre>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-4 rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-background border-b border-border">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left font-semibold text-text-primary">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-background/50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-text-secondary">
                  {j === 0 ? (
                    <code className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded text-xs">
                      {cell}
                    </code>
                  ) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlowDiagram() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 my-6 p-4 bg-background rounded-xl border border-border">
      {['ConcordatHall', '→ file_case() →', 'ConcordatCase', '→ appeal() →', 'ConcordatAppeal'].map(
        (item, i) => (
          <span
            key={i}
            className={
              item.startsWith('→')
                ? 'text-text-secondary text-sm font-mono'
                : 'px-3 py-1.5 bg-white border border-primary/30 rounded-lg text-sm font-semibold text-primary'
            }
          >
            {item}
          </span>
        )
      )}
    </div>
  );
}

const SECTIONS: DocSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    content: (
      <div>
        <p className="text-text-secondary leading-relaxed mb-4">
          <strong className="text-text-primary">Concordat</strong> is an on-chain dispute resolution
          system for communities, built on{' '}
          <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            GenLayer
          </a>{' '}
          intelligent contracts. It enables communities to enforce governance rules through impartial,
          AI-powered adjudication rather than subjective human moderators.
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          The system consists of three contract types that work together:
        </p>
        <FlowDiagram />
        <ul className="space-y-2 text-text-secondary">
          <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong className="text-text-primary">ConcordatHall</strong> — The main registry. Holds config, rulebook, and member standings.</span></li>
          <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong className="text-text-primary">ConcordatCase</strong> — Created per dispute. Manages defense, AI ruling, and appeal window.</span></li>
          <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong className="text-text-primary">ConcordatAppeal</strong> — Created on appeal. Runs a fresh AI review with appeal context.</span></li>
        </ul>
      </div>
    ),
  },
  {
    id: 'how-it-works',
    title: 'How It Works',
    content: (
      <div>
        <p className="text-text-secondary leading-relaxed mb-6">
          The complete lifecycle of a Concordat dispute, from filing to final outcome:
        </p>
        {[
          { n: 1, title: 'File a Case', text: 'Any member calls file_case(accused, rule_number, complaint_url). A new ConcordatCase contract is deployed and the defense window begins.' },
          { n: 2, title: 'Submit Defense', text: 'The accused has until defense_deadline to call submit_defense(url) with a URL linking to their counter-argument document.' },
          { n: 3, title: 'Request Ruling', text: 'After the defense window closes (or if a defense was submitted), anyone can call request_ruling(). The GenLayer AI validators read both URLs and reach consensus.' },
          { n: 4, title: 'Ruling Delivered', text: 'The AI returns a verdict (sustained/dismissed), reasoning, and penalty_points. If sustained, the accused\'s standing is updated.' },
          { n: 5, title: 'Appeal Window', text: 'The losing party has appeal_window_seconds to call appeal(grounds_url). This creates a ConcordatAppeal contract for a fresh review.' },
          { n: 6, title: 'Finalize', text: 'After the appeal window expires, anyone calls finalize() to permanently close the case and commit the final outcome to the hall\'s state.' },
        ].map((step) => (
          <div key={step.n} className="flex gap-4 mb-5">
            <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {step.n}
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-1">{step.title}</h4>
              <p className="text-sm text-text-secondary">{step.text}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'contract-reference',
    title: 'Contract Reference',
    content: (
      <div>
        <h3 className="text-lg font-bold text-text-primary mb-3">ConcordatHall</h3>
        <p className="text-sm text-text-secondary mb-2">
          Deployed at:{' '}
          <code className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded text-xs">
            {CONTRACT_ADDRESS}
          </code>
        </p>
        <h4 className="font-semibold text-text-primary mt-4 mb-2">Read Methods</h4>
        <Table
          headers={['Method', 'Returns', 'Description']}
          rows={[
            ['get_config()', 'HallConfig', 'Returns hall configuration dict'],
            ['get_rules()', 'Rule[]', 'Returns all rules (active and retired)'],
            ['get_standing(address)', 'Standing', 'Returns member standing (points, status, dismissed_complaints)'],
            ['get_case(case_addr)', 'CaseEntry', 'Returns case registry entry'],
            ['get_cases(offset, limit)', 'address[]', 'Paginated list of case addresses'],
            ['get_case_count()', 'int', 'Total number of cases filed'],
          ]}
        />
        <h4 className="font-semibold text-text-primary mt-4 mb-2">Write Methods</h4>
        <Table
          headers={['Method', 'Access', 'Description']}
          rows={[
            ['add_rule(title, text)', 'Owner', 'Adds a new rule to the rulebook'],
            ['retire_rule(rule_number)', 'Owner', 'Marks a rule as retired (inactive)'],
            ['forgive_points(member, points)', 'Owner', 'Removes penalty points from a member'],
            ['file_case(accused, rule_number, url)', 'Anyone', 'Files a new dispute case, returns case address'],
          ]}
        />

        <h3 className="text-lg font-bold text-text-primary mb-3 mt-8">ConcordatCase</h3>
        <p className="text-sm text-text-secondary mb-3">Deployed per case via file_case()</p>
        <h4 className="font-semibold text-text-primary mt-4 mb-2">Read Methods</h4>
        <Table
          headers={['Method', 'Returns', 'Description']}
          rows={[
            ['get_status()', 'CaseStatus', 'Full case state including parties, URLs, ruling, timeline'],
            ['can_request_ruling()', 'bool', 'True if defense window passed or defense submitted'],
          ]}
        />
        <h4 className="font-semibold text-text-primary mt-4 mb-2">Write Methods</h4>
        <Table
          headers={['Method', 'Access', 'Description']}
          rows={[
            ['submit_defense(url)', 'Accused', 'Submits defense URL within defense window'],
            ['request_ruling()', 'Anyone', 'Triggers AI adjudication after defense window'],
            ['appeal(grounds_url)', 'Losing Party', 'Files appeal within appeal window'],
            ['finalize()', 'Anyone', 'Closes case after appeal window expires'],
            ['abandon_appeal()', 'Anyone', 'Drops a stuck appeal'],
          ]}
        />
      </div>
    ),
  },
  {
    id: 'filing-case',
    title: 'Filing a Case',
    content: (
      <div>
        <p className="text-text-secondary leading-relaxed mb-4">
          To file a case against a community member, navigate to the{' '}
          <strong className="text-text-primary">App</strong> page and click the{' '}
          <strong className="text-text-primary">File a Case</strong> tab.
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          You will need to provide:
        </p>
        <ul className="space-y-2 text-text-secondary mb-4">
          <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong className="text-text-primary">Accused address</strong> — The Ethereum address of the community member you are reporting</span></li>
          <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong className="text-text-primary">Rule number</strong> — Which rule from the rulebook was violated</span></li>
          <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong className="text-text-primary">Complaint URL</strong> — A publicly accessible link to your complaint/evidence document</span></li>
        </ul>
        <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl text-sm text-amber-700">
          <strong>Warning:</strong> Filing false or malicious complaints may result in your own standing being penalized. If too many of your complaints are dismissed (max_dismissed_complaints), the system will penalize your standing.
        </div>
        <CodeBlock>{`// Contract call
file_case(
  accused: "0x...",           // Accused member address
  rule_number: 1,              // Rule that was violated
  complaint_url: "https://..."  // Link to your evidence
)
// Returns: new case contract address`}</CodeBlock>
      </div>
    ),
  },
  {
    id: 'submitting-defense',
    title: 'Submitting a Defense',
    content: (
      <div>
        <p className="text-text-secondary leading-relaxed mb-4">
          If you are the accused in a case, you have until the defense deadline to submit a defense URL.
          This should link to a document that addresses the complaint point by point.
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          Navigate to the case detail page (accessible from the App page case list or via direct URL
          <code className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded text-xs ml-1">/cases/0x...</code>)
          and click <strong className="text-text-primary">Submit Defense</strong>.
        </p>
        <CodeBlock>{`// Contract call (accused only)
submit_defense(
  url: "https://..."  // Link to your defense document
)
// Must be called before defense_deadline`}</CodeBlock>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 mt-4">
          <strong>Tip:</strong> Write a clear, thorough defense document. The AI will read your defense URL and compare it against the complaint. Be factual and address each specific allegation.
        </div>
      </div>
    ),
  },
  {
    id: 'appealing',
    title: 'Appealing a Decision',
    content: (
      <div>
        <p className="text-text-secondary leading-relaxed mb-4">
          If the ruling goes against you, you have an appeal window to challenge it. Only the losing party can appeal:
        </p>
        <ul className="space-y-2 text-text-secondary mb-4">
          <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span>If the complaint was <strong className="text-text-primary">sustained</strong>, the accused can appeal</span></li>
          <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span>If the complaint was <strong className="text-text-primary">dismissed</strong>, the complainant can appeal</span></li>
        </ul>
        <CodeBlock>{`// Contract call (losing party only, within appeal_window)
appeal(
  grounds_url: "https://..."  // Link to appeal grounds document
)
// Creates ConcordatAppeal contract
// Fresh AI review with appeal context`}</CodeBlock>
        <p className="text-text-secondary text-sm leading-relaxed mt-4">
          The appeal grounds URL should explain why the original ruling was incorrect. The AI will review
          the original complaint, original defense, the first ruling, and your appeal grounds to reach
          a final decision.
        </p>
      </div>
    ),
  },
  {
    id: 'standings',
    title: 'Standings & Reputation',
    content: (
      <div>
        <p className="text-text-secondary leading-relaxed mb-4">
          Every community member starts with 0 penalty points and a "good" status. Sustained complaints
          increase their points, moving them through reputation levels:
        </p>
        <Table
          headers={['Status', 'Condition', 'Meaning']}
          rows={[
            ['good', 'Points < probation_points', 'Member is in good standing'],
            ['probation', 'probation_points ≤ points < suspension_points', 'Member is on probation, flagged for further scrutiny'],
            ['suspended', 'Points ≥ suspension_points', 'Member is suspended from the community'],
          ]}
        />
        <p className="text-text-secondary text-sm mt-4 leading-relaxed">
          The hall owner can forgive points for a member using{' '}
          <code className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded text-xs">
            forgive_points(member, points)
          </code>{' '}
          if rehabilitation is warranted. Dismissed complaints count toward{' '}
          <code className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded text-xs">
            max_dismissed_complaints
          </code>{' '}
          — too many dismissed complaints penalize the complainant instead.
        </p>
      </div>
    ),
  },
  {
    id: 'trust-security',
    title: 'Trust & Security Model',
    content: (
      <div>
        <p className="text-text-secondary leading-relaxed mb-4">
          Concordat is designed with security and fairness in mind:
        </p>
        {[
          {
            title: 'Dead Link Protection',
            text: 'The AI is instructed to treat inaccessible URLs as if no document was submitted. This prevents defending through link rot and ensures both parties can always verify the evidence.',
          },
          {
            title: 'Prompt Injection Protection',
            text: 'The AI\'s system prompt explicitly ignores any instructions embedded in complaint or defense documents. The AI is told to treat these as raw evidence, not instructions.',
          },
          {
            title: 'Decentralized Consensus',
            text: 'GenLayer\'s consensus mechanism requires multiple AI validators to agree on a ruling. A single malformed response doesn\'t affect the outcome — consensus must be reached.',
          },
          {
            title: 'Immutable Record',
            text: 'All case data, URLs, rulings, and appeal grounds are permanently stored on-chain. Nothing can be deleted or modified after submission.',
          },
          {
            title: 'No Human Bias',
            text: 'The entire process from case filing to final ruling happens through smart contracts. There is no human moderator to bribe, influence, or appeal to — only code and AI.',
          },
        ].map((item) => (
          <div key={item.title} className="mb-4 p-4 bg-white border border-border rounded-xl">
            <h4 className="font-semibold text-text-primary mb-1.5">{item.title}</h4>
            <p className="text-sm text-text-secondary">{item.text}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'faq',
    title: 'FAQ',
    content: (
      <div className="space-y-5">
        {[
          {
            q: 'Can I appeal more than once?',
            a: 'No. Each case allows only one appeal. The appeal ruling is final. This prevents infinite dispute loops.',
          },
          {
            q: 'What if my complaint URL goes dead?',
            a: 'The AI treats dead/inaccessible URLs as if no document was submitted. It\'s your responsibility to ensure your complaint URL remains accessible throughout the case lifecycle.',
          },
          {
            q: 'Can the same person file multiple cases against one member?',
            a: 'Yes, but if too many of your cases against a member are dismissed (exceeding max_dismissed_complaints), the system treats it as harassment and penalizes your own standing.',
          },
          {
            q: 'How long does an AI ruling take?',
            a: 'GenLayer AI rulings typically take a few seconds to minutes depending on network conditions and document complexity.',
          },
          {
            q: 'Who pays for the AI computation?',
            a: 'The person who calls request_ruling() pays the transaction gas. GenLayer intelligent contracts handle the AI computation as part of consensus.',
          },
          {
            q: 'Can the hall owner override a ruling?',
            a: 'No. The hall owner can only forgive penalty points after the fact — they cannot reverse or alter a ruling itself. This ensures rulings are truly AI-powered and neutral.',
          },
        ].map(({ q, a }) => (
          <div key={q} className="border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 bg-white">
              <p className="font-semibold text-text-primary">{q}</p>
            </div>
            <div className="px-5 py-4 bg-background border-t border-border">
              <p className="text-sm text-text-secondary">{a}</p>
            </div>
          </div>
        ))}

        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm text-primary">
          Have more questions?{' '}
          <a
            href="https://genlayer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline inline-flex items-center gap-1"
          >
            Visit GenLayer <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    ),
  },
];

export function DocsPage() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current.get(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 mb-8 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-primary">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Documentation</h1>
            <p className="text-text-secondary">Complete Concordat reference</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-24">
            <nav className="space-y-0.5">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                    ${activeSection === section.id
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background'
                    }
                  `}
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-12">
          {SECTIONS.map((section) => (
            <motion.section
              key={section.id}
              id={section.id}
              ref={(el) => { if (el) sectionRefs.current.set(section.id, el); }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl border border-border p-6 sm:p-8 scroll-mt-24"
            >
              <h2 className="text-2xl font-bold text-text-primary mb-6 pb-4 border-b border-border">
                {section.title}
              </h2>
              <div className="prose-like">{section.content}</div>
            </motion.section>
          ))}
        </main>
      </div>
    </div>
  );
}
