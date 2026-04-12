import type { RefObject } from 'react';
import { AnimatePresence } from 'motion/react';
import { usePresenceStore } from '../../stores/presence.store';
import { getCurrentUser } from '../../lib/user';
import { RemoteCursor } from './RemoteCursor';

interface CursorOverlayProps {
  boardRef: RefObject<HTMLDivElement | null>;
}

/**
 * Board-level cursor rendering layer. Positioned as an overlay inside
 * the board canvas, pointer-events-none so it doesn't interfere with
 * drag-and-drop or card interactions. Renders a RemoteCursor for each
 * online user except the local user.
 */
export function CursorOverlay({ boardRef }: CursorOverlayProps) {
  const cursorPositions = usePresenceStore((s) => s.cursorPositions);
  const onlineUsers = usePresenceStore((s) => s.onlineUsers);

  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.sub;

  // Build a lookup of userId → user info
  const userMap = new Map(onlineUsers.map((u) => [u.userId, u]));

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 40 }}
      aria-hidden="true"
    >
      <AnimatePresence>
        {Object.entries(cursorPositions)
          .filter(([userId]) => userId !== currentUserId)
          .map(([userId, position]) => {
            const user = userMap.get(userId);
            return (
              <RemoteCursor
                key={userId}
                userId={userId}
                name={user?.name ?? 'Anonymous'}
                color={user?.color ?? '#22D3EE'}
                position={position}
              />
            );
          })}
      </AnimatePresence>
    </div>
  );
}
