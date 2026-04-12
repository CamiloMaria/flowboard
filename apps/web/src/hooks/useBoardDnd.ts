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
    (event: Parameters<NonNullable<React.ComponentProps<typeof import('@dnd-kit/react').DragDropProvider>['onDragStart']>>[0]) => {
      const source = event.operation.source;
      const card = (source?.data as any)?.card as Card | undefined;
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
    (event: Parameters<NonNullable<React.ComponentProps<typeof import('@dnd-kit/react').DragDropProvider>['onDragOver']>>[0]) => {
      const source = event.operation.source;
      if (source?.type === 'column') return;
    },
    [],
  );

  const onDragEnd = useCallback(
    (event: Parameters<NonNullable<React.ComponentProps<typeof import('@dnd-kit/react').DragDropProvider>['onDragEnd']>>[0]) => {
      const { source, target } = event.operation;
      const card = (source?.data as any)?.card as Card | undefined;

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

      // Determine target list:
      // 1. source.group — @dnd-kit updates this when the item enters a new sortable group
      // 2. target.id — the droppable column ID (handles empty lists)
      // 3. Fallback to original list
      const sourceAny = source as any;
      let targetListId = sourceAny.group as string | undefined;

      if ((!targetListId || targetListId === card.listId) && target?.id) {
        const droppableId = String(target.id);
        if (droppableId.startsWith('column-')) {
          targetListId = droppableId.replace('column-', '');
        }
      }

      if (!targetListId) {
        targetListId = card.listId;
      }

      const targetIndex: number = sourceAny.index ?? 0;

      if (targetListId === card.listId && targetIndex === 0 && !sourceAny.group) {
        setDragState({ activeCard: null, activeCardOriginalListId: null });
        return;
      }

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
