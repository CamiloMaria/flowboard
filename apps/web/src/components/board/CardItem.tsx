import { useState } from 'react';
import type { Card } from '@flowboard/shared';
import { InlineInput } from './InlineInput';
import { useUpdateCard } from '../../hooks/useBoardMutations';

interface CardItemProps {
  card: Card;
  boardId: string;
  onClick: () => void;
}

export function CardItem({ card, boardId, onClick }: CardItemProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const updateCard = useUpdateCard(boardId);

  function handleTitleSave(newTitle: string) {
    updateCard.mutate({ id: card.id, title: newTitle });
    setIsEditingTitle(false);
  }

  function handleCardClick(e: React.MouseEvent) {
    // Don't open modal if we're in edit mode
    if (isEditingTitle) return;
    onClick();
  }

  function handleTitleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setIsEditingTitle(true);
  }

  return (
    <div
      role="button"
      aria-label={card.title}
      tabIndex={0}
      onClick={handleCardClick}
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
        {isEditingTitle ? (
          <InlineInput
            value={card.title}
            onSave={handleTitleSave}
            onCancel={() => setIsEditingTitle(false)}
            className="w-full font-body text-sm"
          />
        ) : (
          <p
            className="font-body text-sm text-text-primary truncate cursor-text"
            onClick={handleTitleClick}
          >
            {card.title}
          </p>
        )}
      </div>
    </div>
  );
}
