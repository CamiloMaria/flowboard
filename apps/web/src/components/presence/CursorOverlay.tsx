import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { AnimatePresence } from 'motion/react';
import { usePresenceStore } from '../../stores/presence.store';
import { getCurrentUser } from '../../lib/user';
import { RemoteCursor } from './RemoteCursor';
import { CursorGhostTrace } from './CursorGhostTrace';

interface GhostTrace {
  color: string;
  x: number;
  y: number;
}

interface CursorOverlayProps {
  boardRef: RefObject<HTMLDivElement | null>;
}

/**
 * Board-level cursor rendering layer. Positioned as an overlay inside
 * the board canvas, pointer-events-none so it doesn't interfere with
 * drag-and-drop or card interactions. Renders a RemoteCursor for each
 * online user except the local user, plus ghost traces when cursors exit.
 */
export function CursorOverlay({ boardRef: _boardRef }: CursorOverlayProps) {
  const cursorPositions = usePresenceStore((s) => s.cursorPositions);
  const onlineUsers = usePresenceStore((s) => s.onlineUsers);

  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.sub;

  // Ghost traces: map of userId → last position + color (for departed cursors)
  const [ghostTraces, setGhostTraces] = useState<Map<string, GhostTrace>>(new Map());

  // Track previous cursor user IDs to detect departures
  const prevCursorUserIdsRef = useRef<Set<string>>(new Set());

  // Build a lookup of userId → user info
  const userMap = new Map(onlineUsers.map((u) => [u.userId, u]));

  // Detect cursor departures and spawn ghost traces
  useEffect(() => {
    const currentIds = new Set(
      Object.keys(cursorPositions).filter((id) => id !== currentUserId),
    );
    const prevIds = prevCursorUserIdsRef.current;

    // Find users who had cursors before but don't anymore
    for (const userId of prevIds) {
      if (!currentIds.has(userId)) {
        // User departed — create ghost trace at their last known position
        const lastPos = prevCursorUserIdsRef.current.has(userId)
          ? cursorPositions[userId]
          : undefined;

        // We need to capture position before it's removed from the store
        // Use the userMap to get color
        const user = userMap.get(userId);
        if (user) {
          setGhostTraces((prev) => {
            const next = new Map(prev);
            // Use a fallback position if the cursor was already removed
            next.set(userId, {
              color: user.color ?? '#22D3EE',
              x: lastPos?.x ?? 0,
              y: lastPos?.y ?? 0,
            });
            return next;
          });
        }
      }
    }

    prevCursorUserIdsRef.current = currentIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorPositions, currentUserId]);

  const handleGhostComplete = useCallback((userId: string) => {
    setGhostTraces((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  }, []);

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

      {/* Ghost traces — glow dots that linger 600ms after cursor exit */}
      <AnimatePresence>
        {Array.from(ghostTraces.entries()).map(([userId, trace]) => (
          <CursorGhostTrace
            key={`ghost-${userId}`}
            color={trace.color}
            x={trace.x}
            y={trace.y}
            onComplete={() => handleGhostComplete(userId)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
