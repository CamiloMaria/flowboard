import { Plus } from 'lucide-react';
import type { ListWithCards } from '@flowboard/shared';
import { CardItem } from './CardItem';
import { useBoardStore } from '../../stores/board.store';

interface ColumnContainerProps {
  list: ListWithCards;
  boardId: string;
}

export function ColumnContainer({ list, boardId }: ColumnContainerProps) {
  const sortedCards = [...list.cards].sort((a, b) => a.position - b.position);

  return (
    <div
      className="w-[280px] min-w-[280px] bg-bg-surface border border-border-subtle rounded-[12px] p-3 flex flex-col"
      role="region"
      aria-label={list.name}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3">
        <h2 className="font-display font-semibold text-lg text-text-primary leading-[1.25]">
          {list.name}
        </h2>
        <span className="font-mono text-xs text-text-muted">
          {list.cards.length}
        </span>
      </div>

      {/* Card List */}
      <div
        className="flex-1 flex flex-col gap-2 overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 160px)' }}
      >
        {sortedCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="font-body text-sm text-text-secondary">No cards yet</p>
            <p className="font-body text-xs text-text-muted mt-1">
              Click below to add your first card.
            </p>
          </div>
        ) : (
          sortedCards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onClick={() => useBoardStore.getState().openCard(card.id)}
            />
          ))
        )}
      </div>

      {/* Column Footer — placeholder button, Plan 04 wires actual create flow */}
      <button
        type="button"
        className="flex items-center gap-1 mt-2 py-2 px-3 text-text-muted hover:text-text-primary font-body text-sm rounded-[8px] transition-colors"
      >
        <Plus size={16} />
        <span>Add a card</span>
      </button>
    </div>
  );
}
