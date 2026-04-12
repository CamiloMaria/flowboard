import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';

interface AddListGhostProps {
  onAdd: (name: string) => void;
}

export function AddListGhost({ onAdd }: AddListGhostProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed) {
      onAdd(trimmed);
      setName('');
      setIsEditing(false);
    }
  }

  function handleCancel() {
    setName('');
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="w-[280px] min-w-[280px] border border-dashed border-border-subtle rounded-[12px] flex items-center justify-center gap-1 py-8 text-text-muted hover:border-accent hover:text-accent transition-colors cursor-pointer"
      >
        <Plus size={16} />
        <span className="font-body text-sm">+ Add List</span>
      </button>
    );
  }

  return (
    <div className="w-[280px] min-w-[280px] bg-bg-surface border border-border-subtle rounded-[12px] p-3">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter list name..."
        className="w-full bg-bg-card border border-border-subtle focus:border-border-focus rounded-[8px] py-2 px-3 text-text-primary font-body text-sm outline-none transition-colors"
      />
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="bg-accent text-bg-base font-body text-sm font-semibold h-8 px-4 rounded-[8px] hover:bg-accent-hover transition-colors"
        >
          Add List
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="text-text-muted hover:text-text-primary font-body text-sm h-8 px-3 rounded-[8px] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
