import { useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import type { BoardWithLists } from '@flowboard/shared';
import { useBoardDnd } from '../../hooks/useBoardDnd';
import { ColumnContainer } from './ColumnContainer';
import { AddListGhost } from './AddListGhost';
import { CardDragOverlay } from './CardDragOverlay';
import { CursorOverlay } from '../presence/CursorOverlay';
import { useCreateList } from '../../hooks/useBoardMutations';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { usePresence } from '../../hooks/usePresence';

interface BoardCanvasProps {
  board: BoardWithLists;
}

const EDGE_ZONE = 60;
const MAX_SPEED = 15;

export function BoardCanvas({ board }: BoardCanvasProps) {
  const {
    activeCard,
    cardsById,
    getCardIdsForList,
    onDragStart,
    onDragOver,
    onDragEnd,
  } = useBoardDnd(board.id, board);
  const createList = useCreateList(board.id);
  const reducedMotion = useReducedMotion();
  const boardRef = useRef<HTMLDivElement>(null);

  // Emit own cursor position + heartbeat for presence
  usePresence(board.id, boardRef);

  // Auto-scroll when dragging to board edges (D-11)
  useEffect(() => {
    if (!activeCard) return;

    function handlePointerMove(e: PointerEvent) {
      const el = boardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const leftDist = e.clientX - rect.left;
      const rightDist = rect.right - e.clientX;

      if (leftDist < EDGE_ZONE) {
        const speed = MAX_SPEED * (1 - leftDist / EDGE_ZONE);
        el.scrollLeft -= speed;
      } else if (rightDist < EDGE_ZONE) {
        const speed = MAX_SPEED * (1 - rightDist / EDGE_ZONE);
        el.scrollLeft += speed;
      }
    }

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [activeCard]);

  const sortedLists = useMemo(
    () => [...board.lists].sort((a, b) => a.position - b.position),
    [board.lists],
  );

  return (
    <DragDropProvider
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div
        ref={boardRef}
        className="relative flex-1 overflow-x-auto overflow-y-hidden p-6 flex gap-4"
        style={{ scrollbarWidth: 'none' }}
      >
        <AnimatePresence>
          {sortedLists.map((list) => (
              <motion.div
                key={list.id}
                layout
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : {
                        duration: 0.3,
                        layout: { type: 'spring', stiffness: 200, damping: 25 },
                      }
                }
              >
                <ColumnContainer
                  list={list}
                  boardId={board.id}
                  cardsById={cardsById}
                  getCardIdsForList={getCardIdsForList}
                />
              </motion.div>
            ))}
        </AnimatePresence>
        <AddListGhost onAdd={(name) => createList.mutate({ name })} />
        <CursorOverlay boardRef={boardRef} />
      </div>

      <DragOverlay>
        {activeCard ? <CardDragOverlay card={activeCard} /> : null}
      </DragOverlay>
    </DragDropProvider>
  );
}
