import { motion } from 'motion/react';
import type { Card } from '@flowboard/shared';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface CardDragOverlayProps {
  card: Card;
  /** Horizontal velocity in pixels/sec from pointer movement tracking */
  dragVelocity?: number;
}

/** Clamp a value between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Drag overlay rendered inside DragOverlay component.
 * Shows a scaled-up card clone with elevated shadow and velocity-based rotation
 * per DESIGN.md D-08: spring(1, 80, 12) with +/-2deg tilt.
 */
export function CardDragOverlay({ card, dragVelocity = 0 }: CardDragOverlayProps) {
  const reducedMotion = useReducedMotion();

  // Compute rotation: positive velocity = clockwise tilt, clamped to +/-2deg
  const rotation = reducedMotion ? 0 : clamp(dragVelocity * 0.01, -2, 2);

  return (
    <motion.div
      className="w-[256px] bg-bg-card-active border border-accent rounded-[8px] shadow-card-drag opacity-95 scale-[1.03]"
      style={{ zIndex: 1000 }}
      animate={{ rotate: rotation }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : {
              type: 'spring',
              stiffness: 80,
              damping: 12,
              mass: 1,
            }
      }
    >
      {/* Cover color stripe */}
      {card.coverColor && (
        <div
          className="h-[3px] rounded-t-[7px]"
          style={{ backgroundColor: card.coverColor }}
        />
      )}

      {/* Card content */}
      <div className="py-3 px-4">
        <p className="font-body text-sm text-text-primary truncate">
          {card.title}
        </p>
      </div>
    </motion.div>
  );
}
