import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link,
  List,
  ListOrdered,
  Heading2,
  Minus,
} from 'lucide-react';

interface FloatingToolbarProps {
  editor: Editor;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive: boolean;
  ariaLabel: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, ariaLabel, disabled, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={isActive}
      disabled={disabled}
      className={`flex items-center justify-center w-7 h-7 rounded-[4px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        isActive
          ? 'text-accent bg-accent/10'
          : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-border-subtle mx-0.5" />;
}

export function FloatingToolbar({ editor }: FloatingToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      className="flex items-center gap-0.5 border border-border-subtle border-b-0 rounded-t-[8px] bg-bg-elevated px-2 py-1"
    >
      {/* Text style */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        ariaLabel="Bold (Ctrl+B)"
      >
        <Bold size={15} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        ariaLabel="Italic (Ctrl+I)"
      >
        <Italic size={15} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        ariaLabel="Strikethrough"
      >
        <Strikethrough size={15} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        ariaLabel="Inline code (Ctrl+E)"
      >
        <Code size={15} />
      </ToolbarButton>

      <Divider />

      {/* Block types */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        ariaLabel="Heading"
      >
        <Heading2 size={15} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        ariaLabel="Bullet list"
      >
        <List size={15} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        ariaLabel="Numbered list"
      >
        <ListOrdered size={15} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        isActive={false}
        ariaLabel="Horizontal rule"
      >
        <Minus size={15} />
      </ToolbarButton>

      <Divider />

      {/* Link */}
      <ToolbarButton
        onClick={() => {
          if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
          } else {
            const url = window.prompt('Enter URL:');
            if (url) {
              // WR-03: Only allow http/https URLs to prevent javascript: URI injection
              try {
                const parsed = new URL(url);
                if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              } catch {
                // Invalid URL — ignore
              }
            }
          }
        }}
        isActive={editor.isActive('link')}
        ariaLabel="Add link (Ctrl+K)"
      >
        <Link size={15} />
      </ToolbarButton>
    </div>
  );
}
