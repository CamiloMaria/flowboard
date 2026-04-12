import { useParams } from 'react-router';
import { useBoard } from '../hooks/useBoard';
import { BoardHeader } from '../components/board/BoardHeader';
import { ColumnContainer } from '../components/board/ColumnContainer';
import { BoardSkeleton } from '../components/board/BoardSkeleton';
import { AddListGhost } from '../components/board/AddListGhost';
import { useCreateList } from '../hooks/useBoardMutations';

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { data: board, isLoading, error } = useBoard(boardId!);
  const createList = useCreateList(boardId!);

  if (isLoading) return <BoardSkeleton />;
  if (error || !board) return <div className="p-6 text-accent-danger">Failed to load board</div>;

  return (
    <div className="h-screen flex flex-col bg-bg-base">
      <BoardHeader name={board.name} />
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
    </div>
  );
}
