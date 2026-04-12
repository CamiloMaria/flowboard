import { useRef, useEffect } from 'react';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import type { BoardWithLists } from '@flowboard/shared';
import { useBoardDnd } from '../../hooks/useBoardDnd';
import { ColumnContainer } from './ColumnContainer';
import { AddListGhost } from './AddListGhost';
import { CardDragOverlay } from './CardDragOverlay';
import { useCreateList } from '../../hooks/useBoardMutations';

interface BoardCanvasProps {
  board: BoardWithLists;
}

const EDGE_ZONE = 60;
const MAX_SPEED = 15;

export function BoardCanvas({ board }: BoardCanvasProps) {
  const { activeCard, onDragStart, onDragOver, onDragEnd } = useBoardDnd(
    board.id,
  );
  const createList = useCreateList(board.id);
  const boardRef = useRef<HTMLDivElement>(null);

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

  return (
    <DragDropProvider
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div
        ref={boardRef}
        className="flex-1 overflow-x-auto overflow-y-hidden p-6 flex gap-4"
        style={{ scrollbarWidth: 'none' }}
      >
        {board.lists
          .sort((a, b) => a.position - b.position)
          .map((list) => (
            <ColumnContainer key={list.id} list={list} boardId={board.id} />
          ))}
        <AddListGhost onAdd={(name) => createList.mutate({ name })} />
      </div>

      <DragOverlay>
        {activeCard ? <CardDragOverlay card={activeCard} /> : null}
      </DragOverlay>
    </DragDropProvider>
  );
}
