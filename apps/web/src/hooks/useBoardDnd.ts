import { useState, useRef, useCallback } from 'react';
import type { Card, BoardWithLists } from '@flowboard/shared';
import { getQueryClient } from '../providers/QueryProvider';
import { useMoveCard } from './useBoardMutations';

interface DragState {
  activeCard: Card | null;
  activeCardOriginalListId: string | null;
}

export function useBoardDnd(boardId: string) {
  const [dragState, setDragState] = useState<DragState>({
    activeCard: null,
    activeCardOriginalListId: null,
  });

  const moveCard = useMoveCard(boardId);
  const snapshotRef = useRef<BoardWithLists | null>(null);

  const onDragStart = useCallback(
    (event: { operation: { source: { data?: { card?: Card } } } }) => {
      const card = event.operation.source?.data?.card as Card | undefined;
      if (card) {
        // Snapshot board state before drag for revert on cancel
        const queryClient = getQueryClient();
        snapshotRef.current =
          queryClient.getQueryData<BoardWithLists>(['board', boardId]) ?? null;

        setDragState({
          activeCard: card,
          activeCardOriginalListId: card.listId,
        });
      }
    },
    [boardId],
  );

  const onDragOver = useCallback(
    (event: { operation: { source: { type?: string } } }) => {
      // @dnd-kit/react handles optimistic visual reordering via its sorting plugins.
      // For cross-list moves, the `group` prop on useSortable handles the visual transfer.
      // We only need to prevent column-type sources from triggering item moves.
      const sourceType = event.operation.source?.type;
      if (sourceType === 'column') return;
      // Visual reordering is handled by @dnd-kit's internal optimistic sorting.
    },
    [],
  );

  const onDragEnd = useCallback(
    (event: {
      canceled?: boolean;
      operation: {
        source: {
          data?: { card?: Card };
          type?: string;
          initialGroup?: string;
          group?: string;
          initialIndex?: number;
          index?: number;
        };
      };
    }) => {
      const { source } = event.operation;
      const card = source.data?.card as Card | undefined;

      // If drag was canceled, revert to snapshot
      if (event.canceled) {
        if (snapshotRef.current) {
          const queryClient = getQueryClient();
          queryClient.setQueryData(['board', boardId], snapshotRef.current);
        }
        setDragState({ activeCard: null, activeCardOriginalListId: null });
        return;
      }

      if (!card) {
        setDragState({ activeCard: null, activeCardOriginalListId: null });
        return;
      }

      // Determine target list and position from the source's final group/index
      const targetListId = (source.group as string) ?? card.listId;
      const targetIndex = source.index ?? 0;

      // Read current board state from cache to calculate fractional position
      const queryClient = getQueryClient();
      const board = queryClient.getQueryData<BoardWithLists>(['board', boardId]);

      if (board) {
        const targetList = board.lists.find((l) => l.id === targetListId);
        if (targetList) {
          // Get sorted cards in the target list, excluding the dragged card
          const otherCards = [...targetList.cards]
            .filter((c) => c.id !== card.id)
            .sort((a, b) => a.position - b.position);

          let newPosition: number;

          if (otherCards.length === 0) {
            // Empty list or only card
            newPosition = 1000;
          } else if (targetIndex === 0) {
            // Dropping at start
            newPosition = otherCards[0].position / 2;
          } else if (targetIndex >= otherCards.length) {
            // Dropping at end
            newPosition = otherCards[otherCards.length - 1].position + 1000;
          } else {
            // Dropping between two cards
            const prevCard = otherCards[targetIndex - 1];
            const nextCard = otherCards[targetIndex];
            newPosition = (prevCard.position + nextCard.position) / 2;
          }

          // Fire the move mutation (optimistic update + server sync)
          moveCard.mutate({
            cardId: card.id,
            targetListId,
            newPosition,
          });
        }
      }

      setDragState({ activeCard: null, activeCardOriginalListId: null });
    },
    [boardId, moveCard],
  );

  return {
    activeCard: dragState.activeCard,
    activeCardOriginalListId: dragState.activeCardOriginalListId,
    onDragStart,
    onDragOver,
    onDragEnd,
  };
}
