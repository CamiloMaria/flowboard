import { motion, AnimatePresence } from 'motion/react';
import { usePresenceStore } from '../../stores/presence.store';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { UserAvatar } from './UserAvatar';

const MAX_VISIBLE = 5;

/**
 * Avatar strip showing online users in the board header (D-09/D-10/D-11/D-12).
 * Shows max 5 avatars with a "+N" overflow pill. Join/leave animations use
 * spring scale. Layout animation handles stack reflow.
 */
export function OnlineUsers() {
  const onlineUsers = usePresenceStore((s) => s.onlineUsers);
  const reducedMotion = useReducedMotion();

  const visible = onlineUsers.slice(0, MAX_VISIBLE);
  const overflow = onlineUsers.length - MAX_VISIBLE;

  return (
    <div
      className="flex items-center"
      aria-label={`${onlineUsers.length} user${onlineUsers.length === 1 ? '' : 's'} online`}
    >
      <AnimatePresence mode="popLayout">
        {visible.map((user, i) => (
          <motion.div
            key={user.userId}
            layout
            initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={
              reducedMotion
                ? { opacity: 0, transition: { duration: 0.1 } }
                : { scale: 0, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : {
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                    duration: 0.25,
                    layout: { type: 'spring', stiffness: 300, damping: 25 },
                  }
            }
            style={{ marginLeft: i === 0 ? 0 : -8 }}
          >
            <UserAvatar name={user.name} color={user.color} size="md" />
          </motion.div>
        ))}

        {overflow > 0 && (
          <motion.div
            key="overflow-pill"
            layout
            initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 300, damping: 20 }
            }
            className="flex items-center justify-center rounded-full font-body select-none shrink-0"
            style={{
              marginLeft: -8,
              height: 32,
              padding: '0 8px',
              fontSize: 12,
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-bg-surface)',
              border: '2px solid var(--color-bg-base)',
            }}
          >
            +{overflow}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
