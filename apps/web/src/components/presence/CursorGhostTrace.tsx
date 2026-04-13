import { motion } from 'motion/react';

interface CursorGhostTraceProps {
  /** User's cursor color */
  color: string;
  /** Last known X position */
  x: number;
  /** Last known Y position */
  y: number;
  /** Called when the 600ms fade animation completes */
  onComplete: () => void;
}

/**
 * Ghost trace glow dot that lingers for 600ms after a cursor exits.
 * Creates a dissolving glow effect at the cursor's last position (D-09, PLSH-04).
 * Rendered inside AnimatePresence in CursorOverlay.
 */
export function CursorGhostTrace({ color, x, y, onComplete }: CursorGhostTraceProps) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        width: 14,
        height: 14,
        borderRadius: '50%',
        backgroundColor: color,
        filter: `drop-shadow(0 0 14px ${color})`,
        zIndex: 39,
      }}
      initial={{ opacity: 0.8, scale: 1 }}
      animate={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
    />
  );
}
