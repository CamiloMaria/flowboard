import { useState, useRef, useCallback } from 'react';
import { move } from '@dnd-kit/helpers';
import type { Card, BoardWithLists } from '@flowboard/shared';
import { getQueryClient } from '../providers/QueryProvider';
import { useMoveCard } from './useBoardMutations';

interface DragState {
  activeCard: Card | null;
  activeCardOriginalListId: string | null;
}

/**
 * Builds a Record<listId, cardId[]> from the board for @dnd-kit's move helper.
 */
function boardToItemsMap(board: BoardWithLists): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const list of board.lists) {
    map[list.id] = [...list.cards]
      .sort((a, b) => a.position - b.position)
      .map((c) => c.id);
  }
  return map;
}

export function useBoardDnd(boardId: string) {
  const [dragState, setDragState] = useState<DragState>({
    activeCard: null,
    activeCardOriginalListId: null,
  });

  const moveCard = useMoveCard(boardId);
  const snapshotRef = useRef<BoardWithLists | null>(null);
  // Tracks the items map during drag for @dnd-kit move helper
  const itemsMapRef = useRef<Record<string, string[]>>({});

  const onDragStart = useCallback(
    (event: { operation: { source: { data?: { card?: Card } } } }) => {
      const card = event.operation.source?.data?.card as Card | undefined;
      if (card) {
        const queryClient = getQueryClient();
        const board =
          queryClient.getQueryData<BoardWithLists>(['board', boardId]) ?? null;
        snapshotRef.current = board;
        if (board) {
          itemsMapRef.current = boardToItemsMap(board);
        }

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
      const sourceType = event.operation.source?.type;
      if (sourceType === 'column') return;

      // Use @dnd-kit/helpers move() to update items map during drag.
      // This handles moving items into empty columns automatically.
      itemsMapRef.current = move(itemsMapRef.current, event as any);
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

      // Determine target list from the items map (handles empty lists correctly)
      let targetListId = card.listId;
      let targetIndex = 0;
      for (const [listId, cardIds] of Object.entries(itemsMapRef.current)) {
        const idx = cardIds.indexOf(card.id);
        if (idx !== -1) {
          targetListId = listId;
          targetIndex = idx;
          break;
        }
      }

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
            newPosition = 1000;
          } else if (targetIndex === 0) {
            newPosition = otherCards[0].position / 2;
          } else if (targetIndex >= otherCards.length) {
            newPosition = otherCards[otherCards.length - 1].position + 1000;
          } else {
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
