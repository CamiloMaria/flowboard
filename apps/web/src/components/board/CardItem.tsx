import { useState, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { useSortable } from '@dnd-kit/react/sortable';
import type { Card } from '@flowboard/shared';
import { InlineInput } from './InlineInput';
import { useUpdateCard } from '../../hooks/useBoardMutations';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface CardItemProps {
  card: Card;
  boardId: string;
  index: number;
  /** Card index within its column — used for cascade stagger delay (D-10) */
  staggerIndex?: number;
  onClick: () => void;
}

export function CardItem({ card, boardId, index, staggerIndex = 0, onClick }: CardItemProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const updateCard = useUpdateCard(boardId);
  const reducedMotion = useReducedMotion();

  // Layout transition with cascade stagger delay: 30ms per card (D-10)
  const layoutTransition = useMemo(
    () => ({
      type: 'spring' as const,
      stiffness: 200,
      damping: 25,
      mass: 0.8,
      delay: reducedMotion ? 0 : staggerIndex * 0.03,
    }),
    [staggerIndex, reducedMotion],
  );

  const { ref: sortableRef, isDragging } = useSortable({
    id: card.id,
    index,
    data: { card, type: 'card' },
    type: 'item',
    accept: 'item',
    group: card.listId,
  });

  // Merge sortable ref with motion ref via callback
  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof sortableRef === 'function') {
        sortableRef(node);
      } else if (sortableRef && 'current' in sortableRef) {
        (sortableRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [sortableRef],
  );

  function handleTitleSave(newTitle: string) {
    updateCard.mutate({ id: card.id, title: newTitle });
    setIsEditingTitle(false);
  }

  function handleCardClick() {
    // Don't open modal if we're in edit mode or dragging
    if (isEditingTitle || isDragging) return;
    onClick();
  }

  function handleTitleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setIsEditingTitle(true);
  }

  return (
    <motion.div
      ref={mergedRef}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        layout: layoutTransition,
        opacity: { duration: reducedMotion ? 0 : 0.25, ease: 'easeOut' },
        scale: { duration: reducedMotion ? 0 : 0.25, ease: 'easeOut' },
      }}
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
      className={
        isDragging
          ? 'bg-bg-surface/50 border border-dashed border-border-subtle rounded-[8px] shadow-card opacity-50 overflow-hidden'
          : 'bg-bg-card border border-border-subtle rounded-[8px] shadow-card cursor-grab hover:bg-bg-card-hover hover:shadow-card-hover transition-all overflow-hidden'
      }
    >
      {/* Cover color stripe */}
      {card.coverColor && !isDragging && (
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
            className={
              isDragging
                ? 'font-body text-sm text-transparent truncate'
                : 'font-body text-sm text-text-primary truncate cursor-text'
            }
            onClick={isDragging ? undefined : handleTitleClick}
          >
            {card.title}
          </p>
        )}
      </div>
    </motion.div>
  );
}
