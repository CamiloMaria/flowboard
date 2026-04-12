import { useEffect, useRef, useState } from 'react';

interface InlineInputProps {
  value: string;
  onSave: (val: string) => void;
  onCancel: () => void;
  className?: string;
  placeholder?: string;
}

export function InlineInput({ value, onSave, onCancel, className, placeholder }: InlineInputProps) {
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  function handleSave() {
    const trimmed = text.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      onCancel();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`bg-bg-card border border-border-subtle focus:border-border-focus rounded-[8px] py-2 px-3 text-text-primary outline-none transition-colors ${className ?? ''}`}
    />
  );
}
