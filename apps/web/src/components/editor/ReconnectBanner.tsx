import { motion, AnimatePresence } from 'motion/react';
import type { YjsConnectionStatus } from '../../hooks/useYjsProvider';

interface ReconnectBannerProps {
  status: YjsConnectionStatus;
}

export function ReconnectBanner({ status }: ReconnectBannerProps) {
  const isFailed = status === 'failed';

  return (
    <AnimatePresence>
      {(status === 'connecting' || status === 'disconnected' || status === 'failed') && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div
            className={`flex items-center justify-between h-8 px-3 rounded-t-[8px] border-l-[3px] font-body text-xs ${
              isFailed
                ? 'bg-accent-danger/10 border-l-accent-danger text-accent-danger'
                : 'bg-accent-warn/10 border-l-accent-warn text-accent-warn'
            }`}
          >
            <span>
              {isFailed
                ? 'Connection lost — your changes are saved locally'
                : 'Reconnecting...'}
            </span>
            {isFailed && (
              <button
                type="button"
                onClick={() => {
                  // Get text content from the TipTap editor via DOM query
                  const editorEl = document.querySelector('.tiptap');
                  if (editorEl) {
                    navigator.clipboard.writeText(editorEl.textContent ?? '');
                  }
                }}
                className="text-accent-danger hover:text-accent-danger/80 font-body text-xs underline underline-offset-2 transition-colors"
              >
                Copy content
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
