import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import Placeholder from '@tiptap/extension-placeholder';
import { collaborationCursor } from './collaboration-cursor';
import { FloatingToolbar } from './FloatingToolbar';
import { ReconnectBanner } from './ReconnectBanner';
import type { YjsConnectionStatus } from '../../hooks/useYjsProvider';
import type { CoEditorInfo } from '@flowboard/shared';
import type * as Y from 'yjs';
import type { WebsocketProvider } from 'y-websocket';

interface CollaborativeEditorProps {
  cardId: string;
  user: { name: string; color: string };
  ydoc?: Y.Doc;
  provider?: WebsocketProvider;
  status?: YjsConnectionStatus;
  coEditors?: CoEditorInfo[];
}

export function CollaborativeEditor({
  user,
  ydoc,
  provider,
  status = 'connecting',
}: CollaborativeEditorProps) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          undoRedo: false, // Yjs handles undo/redo
          link: { openOnClick: false },
        }),
        ...(ydoc
          ? [
              Collaboration.configure({
                document: ydoc,
                field: 'description',
              }),
            ]
          : []),
        ...(provider
          ? [
              collaborationCursor(provider, {
                name: user.name,
                color: user.color,
              }),
            ]
          : []),
        Placeholder.configure({
          placeholder: 'Add a description...',
        }),
      ],
      editorProps: {
        attributes: {
          class:
            'tiptap w-full min-h-[120px] bg-bg-card border border-border-subtle rounded-b-[8px] py-3 px-4 font-body text-sm text-text-primary prose-invert outline-none focus:border-border-focus',
        },
      },
    },
    [ydoc, provider],
  );

  return (
    <div className="relative">
      {status !== 'connected' && (
        <ReconnectBanner status={status} />
      )}
      {editor && <FloatingToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
