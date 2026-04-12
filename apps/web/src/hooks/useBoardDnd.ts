import { useState, useRef, useCallback, useMemo } from 'react';
import { move } from '@dnd-kit/helpers';
import type { Card, BoardWithLists } from '@flowboard/shared';
import { getQueryClient } from '../providers/QueryProvider';
import { useMoveCard } from './useBoardMutations';

interface DragState {
  activeCard: Card | null;
  activeCardOriginalListId: string | null;
}

/**
 * Converts board data into the Record<listId, cardId[]> format
 * that @dnd-kit/helpers move() expects.
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

/**
 * Builds a flat lookup of all cards by ID from the board data.
 */
function buildCardsById(board: BoardWithLists): Record<string, Card> {
  const map: Record<string, Card> = {};
  for (const list of board.lists) {
    for (const card of list.cards) {
      map[card.id] = card;
    }
  }
  return map;
}

export function useBoardDnd(boardId: string, board: BoardWithLists | undefined) {
  const [dragState, setDragState] = useState<DragState>({
    activeCard: null,
    activeCardOriginalListId: null,
  });

  // Local React state for card positions during drag.
  // @dnd-kit/react 0.3.x REQUIRES onDragOver to update React state
  // so its internal sort tracking matches the rendered DOM.
  // null = not dragging, use board data as-is.
  const [itemsMap, setItemsMap] = useState<Record<string, string[]> | null>(null);

  const moveCard = useMoveCard(boardId);
  const snapshotRef = useRef<BoardWithLists | null>(null);

  // Flat card lookup for rendering cards by ID
  const cardsById = useMemo(
    () => (board ? buildCardsById(board) : {}),
    [board],
  );

  const onDragStart = useCallback(
    (event: any) => {
      const source = event.operation.source;
      const card = source?.data?.card as Card | undefined;
      if (card && board) {
        const queryClient = getQueryClient();
        snapshotRef.current =
          queryClient.getQueryData<BoardWithLists>(['board', boardId]) ?? null;

        // Initialize local items map from current board state
        setItemsMap(boardToItemsMap(board));

        setDragState({
          activeCard: card,
          activeCardOriginalListId: card.listId,
        });
      }
    },
    [boardId, board],
  );

  const onDragOver = useCallback(
    (event: any) => {
      const source = event.operation.source;
      if (source?.type === 'column') return;

      // Update local React state with @dnd-kit/helpers move().
      // This re-renders cards in their new groups, keeping
      // @dnd-kit's internal state in sync with the DOM.
      setItemsMap((current) => (current ? move(current, event) : current));
    },
    [],
  );

  const onDragEnd = useCallback(
    (event: any) => {
      const { source, target } = event.operation;
      const card = source?.data?.card as Card | undefined;

      // Clear the local DnD state — rendering returns to cache data
      const currentItemsMap = itemsMap;
      setItemsMap(null);

      if (event.canceled) {
        if (snapshotRef.current) {
          const queryClient = getQueryClient();
          queryClient.setQueryData(['board', boardId], snapshotRef.current);
        }
        setDragState({ activeCard: null, activeCardOriginalListId: null });
        return;
      }

      if (!card || !source) {
        setDragState({ activeCard: null, activeCardOriginalListId: null });
        return;
      }

      // Find where the card ended up in the items map
      let targetListId: string | undefined;
      let targetIndex = 0;

      if (currentItemsMap) {
        for (const [listId, cardIds] of Object.entries(currentItemsMap)) {
          const idx = cardIds.indexOf(card.id);
          if (idx !== -1) {
            targetListId = listId;
            targetIndex = idx;
            break;
          }
        }
      }

      // Fallback: check droppable column (for empty lists)
      if (!targetListId && target?.id) {
        const droppableId = String(target.id);
        if (droppableId.startsWith('column-')) {
          targetListId = droppableId.replace('column-', '');
          targetIndex = 0;
        }
      }

      if (!targetListId) {
        targetListId = card.listId;
      }

      // Read current board state to calculate fractional position
      const queryClient = getQueryClient();
      const currentBoard = queryClient.getQueryData<BoardWithLists>(['board', boardId]);

      if (currentBoard) {
        const targetList = currentBoard.lists.find((l) => l.id === targetListId);
        if (targetList) {
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

          moveCard.mutate({
            cardId: card.id,
            targetListId: targetListId!,
            newPosition,
          });
        }
      }

      setDragState({ activeCard: null, activeCardOriginalListId: null });
    },
    [boardId, moveCard, itemsMap],
  );

  /**
   * Returns the card IDs for a given list, respecting DnD state.
   * During drag: uses the local items map (updated by onDragOver).
   * Not dragging: returns null (caller uses cache data).
   */
  const getCardIdsForList = useCallback(
    (listId: string): string[] | null => {
      if (!itemsMap) return null;
      return itemsMap[listId] ?? [];
    },
    [itemsMap],
  );

  return {
    activeCard: dragState.activeCard,
    activeCardOriginalListId: dragState.activeCardOriginalListId,
    cardsById,
    getCardIdsForList,
    onDragStart,
    onDragOver,
    onDragEnd,
  };
}
