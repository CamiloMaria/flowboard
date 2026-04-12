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

export function BoardCanvas({ board }: BoardCanvasProps) {
  const { activeCard, onDragStart, onDragOver, onDragEnd } = useBoardDnd(
    board.id,
  );
  const createList = useCreateList(board.id);

  return (
    <DragDropProvider
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div
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
