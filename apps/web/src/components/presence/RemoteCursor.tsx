import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import type { CursorPosition } from '@flowboard/shared';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface RemoteCursorProps {
  userId: string;
  name: string;
  color: string;
  position: CursorPosition;
}

/**
 * Renders a single remote user cursor on the board canvas.
 * - 16×20px arrow SVG in user color
 * - Name pill offset from tip
 * - Glow effect via drop-shadow
 * - Idle breathe animation after 3s stationary
 * - Ghost-fade exit via parent AnimatePresence
 */
export function RemoteCursor({
  userId,
  name,
  color,
  position,
}: RemoteCursorProps) {
  const reducedMotion = useReducedMotion();
  const [isIdle, setIsIdle] = useState(false);

  // Detect idle after 3s
  useEffect(() => {
    setIsIdle(false);
    const timer = setTimeout(() => setIsIdle(true), 3_000);
    return () => clearTimeout(timer);
  }, [position.x, position.y]);

  return (
    <motion.div
      key={userId}
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{
        zIndex: 40,
        // CSS custom property for the breathe animation
        '--cursor-color': color,
      } as React.CSSProperties}
      // Position via transform for GPU-accelerated smooth movement
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        x: position.x,
        y: position.y,
        opacity: 1,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        scale: 0.8,
        transition: { duration: reducedMotion ? 0.2 : 0.4 },
      }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : {
              x: { type: 'tween', duration: 0.06, ease: 'linear' },
              y: { type: 'tween', duration: 0.06, ease: 'linear' },
              opacity: { duration: 0.15 },
              scale: { type: 'spring', stiffness: 300, damping: 20 },
            }
      }
    >
      {/* Cursor arrow SVG — 16×20px */}
      <svg
        width="16"
        height="20"
        viewBox="0 0 16 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={
          isIdle && !reducedMotion ? 'cursor-breathe' : ''
        }
        style={{
          filter: `drop-shadow(0 0 8px ${color})`,
        }}
      >
        <path
          d="M0.5 0.5L15 10L8 11.5L4.5 19.5L0.5 0.5Z"
          fill={color}
        />
      </svg>

      {/* Name pill — offset 6px right, 2px down from arrow tip */}
      <div
        className="absolute whitespace-nowrap select-none rounded-full font-body"
        style={{
          top: 2,
          left: 18,
          backgroundColor: color,
          color: '#FFFFFF',
          fontSize: 12,
          lineHeight: '16px',
          padding: '2px 8px',
        }}
      >
        {name}
      </div>
    </motion.div>
  );
}
