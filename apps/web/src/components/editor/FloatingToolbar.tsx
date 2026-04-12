import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { Bold, Italic, Strikethrough, Code, Link } from 'lucide-react';

interface FloatingToolbarProps {
  editor: Editor;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, ariaLabel, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={isActive}
      className={`flex items-center justify-center w-7 h-7 rounded-[4px] transition-colors ${
        isActive
          ? 'text-accent bg-accent/10'
          : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

export function FloatingToolbar({ editor }: FloatingToolbarProps) {
  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        duration: [150, 100],
        animation: 'shift-away',
        moveTransition: 'transform 0.15s ease-out',
      }}
    >
      <div className="flex items-center gap-0.5 bg-bg-elevated border border-border-subtle rounded-[8px] p-1 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          ariaLabel="Bold (Cmd+B)"
        >
          <Bold size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          ariaLabel="Italic (Cmd+I)"
        >
          <Italic size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          ariaLabel="Strikethrough (Cmd+Shift+S)"
        >
          <Strikethrough size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          ariaLabel="Inline code (Cmd+E)"
        >
          <Code size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            if (editor.isActive('link')) {
              editor.chain().focus().unsetLink().run();
            } else {
              const url = window.prompt('Enter URL:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }
          }}
          isActive={editor.isActive('link')}
          ariaLabel="Add link (Cmd+K)"
        >
          <Link size={16} />
        </ToolbarButton>
      </div>
    </BubbleMenu>
  );
}
