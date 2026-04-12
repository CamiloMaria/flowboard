import { useEffect, useRef, type RefObject } from 'react';
import { getSocket } from '../lib/socket';

const THROTTLE_MS = 50;
const HEARTBEAT_INTERVAL_MS = 5_000;

/**
 * Emits the local user's cursor position (throttled at 50ms) and sends
 * periodic heartbeats to keep Redis presence alive.
 */
export function usePresence(
  boardId: string,
  boardRef: RefObject<HTMLDivElement | null>,
) {
  const lastEmitRef = useRef(0);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleMouseMove = (e: MouseEvent) => {
      const el = boardRef.current;
      if (!el) return;

      const now = Date.now();
      if (now - lastEmitRef.current < THROTTLE_MS) return;
      lastEmitRef.current = now;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left + el.scrollLeft;
      const y = e.clientY - rect.top + el.scrollTop;

      socket.emit('presence:cursor', { x, y, boardId });
    };

    const el = boardRef.current;
    if (el) {
      el.addEventListener('mousemove', handleMouseMove);
    }

    // Heartbeat keeps the Redis TTL alive
    const heartbeatId = setInterval(() => {
      socket.emit('presence:heartbeat');
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (el) {
        el.removeEventListener('mousemove', handleMouseMove);
      }
      clearInterval(heartbeatId);
    };
  }, [boardId, boardRef]);
}
