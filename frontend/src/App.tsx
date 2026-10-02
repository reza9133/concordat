// ============================================================
// App.tsx — Router with shared layout (Navbar + Footer)
// ============================================================

import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { AppPage } from './pages/AppPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { RulebookPage } from './pages/RulebookPage';
import { StandingsPage } from './pages/StandingsPage';
import { DocsPage } from './pages/DocsPage';
import { HowItWorksPage } from './pages/HowItWorksPage';

/** Page transition wrapper */
function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/** 404 page */
function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center pt-16 px-4">
      <div className="text-8xl font-extrabold gradient-text mb-4">404</div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">Page Not Found</h1>
      <p className="text-text-secondary mb-8">The page you are looking for does not exist.</p>
      <a
        href="/"
        className="px-6 py-3 bg-gradient-brand text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
      >
        Go Home
      </a>
    </div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <PageTransition>
                  <HomePage />
                </PageTransition>
              }
            />
            <Route
              path="/app"
              element={
                <PageTransition>
                  <AppPage />
                </PageTransition>
              }
            />
            <Route
              path="/cases/:address"
              element={
                <PageTransition>
                  <CaseDetailPage />
                </PageTransition>
              }
            />
            <Route
              path="/rulebook"
              element={
                <PageTransition>
                  <RulebookPage />
                </PageTransition>
              }
            />
            <Route
              path="/standings"
              element={
                <PageTransition>
                  <StandingsPage />
                </PageTransition>
              }
            />
            <Route
              path="/docs"
              element={
                <PageTransition>
                  <DocsPage />
                </PageTransition>
              }
            />
            <Route
              path="/how-it-works"
              element={
                <PageTransition>
                  <HowItWorksPage />
                </PageTransition>
              }
            />
            <Route
              path="*"
              element={
                <PageTransition>
                  <NotFound />
                </PageTransition>
              }
            />
          </Routes>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
