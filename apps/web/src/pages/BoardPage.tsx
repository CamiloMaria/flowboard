import { useParams } from 'react-router';
import { AnimatePresence } from 'motion/react';
import { useBoard } from '../hooks/useBoard';
import { BoardHeader } from '../components/board/BoardHeader';
import { BoardCanvas } from '../components/board/BoardCanvas';
import { BoardSkeleton } from '../components/board/BoardSkeleton';
import { CardDetailModal } from '../components/board/CardDetailModal';
import { useBoardStore } from '../stores/board.store';

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { data: board, isLoading, error } = useBoard(boardId!);
  const selectedCardId = useBoardStore((s) => s.selectedCardId);
  const closeCard = useBoardStore((s) => s.closeCard);

  if (isLoading) return <BoardSkeleton />;
  if (error || !board) return <div className="p-6 text-accent-danger">Failed to load board</div>;

  // Find selected card and its list name
  let selectedCard = null;
  let selectedListName = '';
  if (selectedCardId) {
    for (const list of board.lists) {
      const found = list.cards.find((c) => c.id === selectedCardId);
      if (found) {
        selectedCard = found;
        selectedListName = list.name;
        break;
      }
    }
  }

  return (
    <div className="h-screen flex flex-col bg-bg-base">
      <BoardHeader name={board.name} />
      <BoardCanvas board={board} />

      <AnimatePresence>
        {selectedCard && (
          <CardDetailModal
            key={selectedCard.id}
            card={selectedCard}
            listName={selectedListName}
            boardId={board.id}
            onClose={closeCard}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
