import type { Card } from '@flowboard/shared';

interface CardItemProps {
  card: Card;
  onClick: () => void;
}

export function CardItem({ card, onClick }: CardItemProps) {
  return (
    <div
      role="button"
      aria-label={card.title}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="bg-bg-card border border-border-subtle rounded-[8px] shadow-card cursor-grab hover:bg-bg-card-hover hover:shadow-card-hover transition-all overflow-hidden"
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
