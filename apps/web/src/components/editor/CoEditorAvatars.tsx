import { AnimatePresence, motion } from 'motion/react';
import type { CoEditorInfo } from '@flowboard/shared';
import { UserAvatar } from '../presence/UserAvatar';

interface CoEditorAvatarsProps {
  coEditors: CoEditorInfo[];
}

const MAX_VISIBLE = 3;

export function CoEditorAvatars({ coEditors }: CoEditorAvatarsProps) {
  if (coEditors.length === 0) return null;

  const visible = coEditors.slice(0, MAX_VISIBLE);
  const overflow = coEditors.length - MAX_VISIBLE;

  return (
    <div className="flex items-center" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {visible.map((editor) => (
          <motion.div
            key={editor.userId}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="-ml-1.5 first:ml-0"
          >
            <UserAvatar name={editor.name} color={editor.color} size="sm" />
          </motion.div>
        ))}
      </AnimatePresence>

      {overflow > 0 && (
        <div className="-ml-1.5 w-6 h-6 rounded-full bg-bg-card border-[1.5px] border-bg-base flex items-center justify-center font-body text-[10px] text-text-secondary select-none">
          +{overflow}
        </div>
      )}
    </div>
  );
}
