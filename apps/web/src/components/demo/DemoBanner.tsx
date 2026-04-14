import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'flowboard-demo-banner-dismissed';

/**
 * Demo mode banner — fixed top, full-width, bg-elevated + accent left border, 40px height.
 * Shows "You're watching a live demo" text.
 * Dismissible via X button, persists in sessionStorage per D-13.
 */
export function DemoBanner() {
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined'
      ? sessionStorage.getItem(STORAGE_KEY) === 'true'
      : false,
  );

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem(STORAGE_KEY, 'true');
  }

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 40, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-0 left-0 right-0 z-50 h-[40px] bg-bg-elevated border-l-[3px] border-l-accent flex items-center justify-between px-4 overflow-hidden"
        >
          <p className="font-body text-sm text-text-secondary">
            You&apos;re watching a live demo &mdash; real-time collaboration powered by
            WebSockets &amp; CRDTs.
          </p>
          <button
            onClick={handleDismiss}
            className="text-text-muted hover:text-text-primary transition-colors p-1 shrink-0"
            aria-label="Dismiss demo banner"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
