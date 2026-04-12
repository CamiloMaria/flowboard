import { useEffect, useRef, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Card } from '@flowboard/shared';
import { InlineInput } from './InlineInput';
import { useUpdateCard, useDeleteCard } from '../../hooks/useBoardMutations';

interface CardDetailModalProps {
  card: Card;
  listName: string;
  boardId: string;
  onClose: () => void;
}

export function CardDetailModal({ card, listName, boardId, onClose }: CardDetailModalProps) {
  const updateCard = useUpdateCard(boardId);
  const deleteCard = useDeleteCard(boardId);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [description, setDescription] = useState(card.descriptionText ?? '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the previously focused element for focus restoration
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  // Focus trap: focus modal on mount
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  // Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleTitleSave(newTitle: string) {
    updateCard.mutate({ id: card.id, title: newTitle });
    setIsEditingTitle(false);
  }

  function handleDescriptionBlur() {
    const trimmed = description.trim();
    if (trimmed !== (card.descriptionText ?? '').trim()) {
      updateCard.mutate({ id: card.id, descriptionText: trimmed || undefined });
    }
  }

  function handleDelete() {
    deleteCard.mutate({ id: card.id });
    onClose();
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  const createdDate = new Date(card.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <AnimatePresence>
      <motion.div
        key="modal-overlay"
        className="fixed inset-0 z-50 flex items-start justify-center bg-bg-base/70 backdrop-blur-sm"
        onClick={handleOverlayClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="w-full max-w-2xl bg-bg-elevated border border-border-subtle rounded-[12px] shadow-modal p-6 mt-[10vh] mx-4 outline-none"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 25,
            duration: 0.25,
          }}
        >
          {/* Close button */}
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors p-1"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Title */}
          <div className="mb-1">
            {isEditingTitle ? (
              <InlineInput
                value={card.title}
                onSave={handleTitleSave}
                onCancel={() => setIsEditingTitle(false)}
                className="w-full font-display font-semibold text-lg"
              />
            ) : (
              <h2
                id="modal-title"
                className="font-display font-semibold text-lg text-text-primary cursor-pointer"
                onClick={() => setIsEditingTitle(true)}
                title="Click to edit title"
              >
                {card.title}
              </h2>
            )}
          </div>

          {/* Breadcrumb */}
          <p className="font-body text-sm text-text-secondary mb-1">
            in List: {listName}
          </p>

          {/* Created date */}
          <p className="font-mono text-xs text-text-muted mb-4">
            Created {createdDate}
          </p>

          {/* Description section */}
          <div className="space-y-4">
            <div>
              <label className="font-body text-sm text-text-secondary block mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Add a description..."
                className="w-full min-h-[120px] bg-bg-card border border-border-subtle focus:border-border-focus rounded-[8px] py-3 px-4 font-body text-sm text-text-primary placeholder:text-text-muted outline-none resize-y transition-colors"
              />
            </div>

            {/* Delete section */}
            <div className="pt-4 border-t border-border-subtle">
              {showDeleteConfirm ? (
                <div>
                  <p className="font-body text-sm text-text-primary mb-3">
                    Delete this card? This can't be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="bg-accent-danger text-white font-body text-sm h-8 px-3 rounded-[8px] hover:opacity-90 transition-opacity"
                    >
                      Delete Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-text-muted hover:text-text-primary font-body text-sm h-8 px-3 rounded-[8px] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 text-accent-danger hover:opacity-80 transition-opacity font-body text-sm"
                  aria-label="Delete card"
                >
                  <Trash2 size={16} />
                  <span>Delete card</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
