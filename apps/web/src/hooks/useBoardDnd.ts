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
      // Let @dnd-kit handle visual reordering via CSS transforms.
      // No state updates needed during drag — we resolve the final
      // target in onDragEnd using source.group + target.id.
      const sourceType = event.operation.source?.type;
      if (sourceType === 'column') return;
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
          group?: string;
          index?: number;
        };
        target?: {
          id?: string | number;
        };
      };
    }) => {
      const { source, target } = event.operation;
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

      // Determine target list:
      // 1. source.group — @dnd-kit updates this when the item enters a new sortable group
      // 2. target.id — the droppable column ID (handles empty lists where no sortable items exist)
      // 3. Fallback to original list
      let targetListId = source.group as string | undefined;

      // If source.group didn't change (no sortable items in target), check the droppable column
      if ((!targetListId || targetListId === card.listId) && target?.id) {
        const droppableId = String(target.id);
        if (droppableId.startsWith('column-')) {
          targetListId = droppableId.replace('column-', '');
        }
      }

      if (!targetListId) {
        targetListId = card.listId;
      }

      const targetIndex = source.index ?? 0;

      // Skip if card didn't actually move
      if (targetListId === card.listId && targetIndex === 0 && !source.group) {
        setDragState({ activeCard: null, activeCardOriginalListId: null });
        return;
      }

      // Read current board state from cache to calculate fractional position
      const queryClient = getQueryClient();
      const board = queryClient.getQueryData<BoardWithLists>(['board', boardId]);

      if (board) {
        const targetList = board.lists.find((l) => l.id === targetListId);
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
