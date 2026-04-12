import { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useDroppable } from '@dnd-kit/react';
import { Plus, MoreHorizontal } from 'lucide-react';
import type { ListWithCards } from '@flowboard/shared';
import { CardItem } from './CardItem';
import { InlineInput } from './InlineInput';
import { useBoardStore } from '../../stores/board.store';
import { useUpdateList, useDeleteList, useCreateCard } from '../../hooks/useBoardMutations';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface ColumnContainerProps {
  list: ListWithCards;
  boardId: string;
}

export function ColumnContainer({ list, boardId }: ColumnContainerProps) {
  const sortedCards = useMemo(
    () => [...list.cards].sort((a, b) => a.position - b.position),
    [list.cards],
  );
  const reducedMotion = useReducedMotion();

  const updateList = useUpdateList(boardId);
  const deleteList = useDeleteList(boardId);
  const createCard = useCreateCard(boardId);

  const [isEditingName, setIsEditingName] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Droppable for detecting drag-over state on this column
  const { ref: dropRef, isDropTarget } = useDroppable({
    id: `column-${list.id}`,
    type: 'column',
    accept: 'item',
    collisionPriority: 1,
  });

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  function handleRenameSave(newName: string) {
    updateList.mutate({ id: list.id, name: newName });
    setIsEditingName(false);
  }

  function handleDeleteList() {
    deleteList.mutate({ id: list.id });
    setShowDeleteConfirm(false);
    setShowMenu(false);
  }

  function handleAddCard(title: string) {
    createCard.mutate({ title, listId: list.id });
    setIsAddingCard(false);
  }

  return (
    <div
      ref={dropRef}
      className={`w-[280px] min-w-[280px] bg-bg-surface border rounded-[12px] p-3 flex flex-col transition-colors ${
        isDropTarget
          ? 'border-accent bg-bg-surface'
          : 'border-border-subtle'
      }`}
      role="region"
      aria-label={list.name}
      style={isDropTarget ? { boxShadow: 'inset 0 0 0 1px rgba(34, 211, 238, 0.05)' } : undefined}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3">
        {isEditingName ? (
          <InlineInput
            value={list.name}
            onSave={handleRenameSave}
            onCancel={() => setIsEditingName(false)}
            className="flex-1 font-display font-semibold text-lg"
          />
        ) : (
          <h2
            className="font-display font-semibold text-lg text-text-primary leading-[1.25] cursor-pointer truncate flex-1"
            onClick={() => setIsEditingName(true)}
            title="Click to rename"
          >
            {list.name}
          </h2>
        )}

        <div className="flex items-center gap-1 ml-2">
          <span className="font-mono text-xs text-text-muted">
            {list.cards.length}
          </span>

          {/* Options menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-text-muted hover:text-text-primary rounded transition-colors"
              aria-label="List options"
            >
              <MoreHorizontal size={16} />
            </button>

            {showMenu && !showDeleteConfirm && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-bg-elevated border border-border-subtle rounded-[8px] shadow-modal z-20 py-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full text-left px-3 py-2 text-sm text-accent-danger hover:bg-bg-card transition-colors font-body"
                >
                  Delete list
                </button>
              </div>
            )}

            {showDeleteConfirm && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-bg-elevated border border-border-subtle rounded-[8px] shadow-modal z-20 p-3">
                <p className="font-body text-sm text-text-primary mb-3">
                  Delete this list and all its cards? This can't be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteList}
                    className="bg-accent-danger text-white font-body text-sm h-8 px-3 rounded-[8px] hover:opacity-90 transition-opacity"
                  >
                    Delete List
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setShowMenu(false);
                    }}
                    className="text-text-muted hover:text-text-primary font-body text-sm h-8 px-3 rounded-[8px] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card List */}
      <div
        className="flex-1 flex flex-col gap-2 overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 160px)' }}
      >
        {sortedCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="font-body text-sm text-text-secondary">No cards yet</p>
            <p className="font-body text-xs text-text-muted mt-1">
              Click below to add your first card.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedCards.map((card, index) => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : {
                        layout: { type: 'spring', stiffness: 200, damping: 25, mass: 0.8 },
                        opacity: { duration: 0.25 },
                        scale: { duration: 0.25 },
                      }
                }
              >
                <CardItem
                  card={card}
                  boardId={boardId}
                  index={index}
                  onClick={() => useBoardStore.getState().openCard(card.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Column Footer — Add Card */}
      {isAddingCard ? (
        <div className="mt-2">
          <InlineInput
            value=""
            onSave={handleAddCard}
            onCancel={() => setIsAddingCard(false)}
            placeholder="Enter card title..."
            className="w-full font-body text-sm"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingCard(true)}
          className="flex items-center gap-1 mt-2 py-2 px-3 text-text-muted hover:text-text-primary font-body text-sm rounded-[8px] transition-colors"
        >
          <Plus size={16} />
          <span>Add a card</span>
        </button>
      )}
    </div>
  );
}
