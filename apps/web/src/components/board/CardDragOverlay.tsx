import type { Card } from '@flowboard/shared';

interface CardDragOverlayProps {
  card: Card;
}

/**
 * Drag overlay rendered inside DragOverlay component.
 * Shows a scaled-up card clone with elevated shadow and rotation per D-09/UI-SPEC §5.
 */
export function CardDragOverlay({ card }: CardDragOverlayProps) {
  return (
    <div
      className="w-[256px] bg-bg-card-active border border-accent rounded-[8px] shadow-card-drag opacity-95 rotate-[2deg] scale-[1.03]"
      style={{ zIndex: 1000 }}
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
    </div>
  );
}
