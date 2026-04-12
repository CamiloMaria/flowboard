import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { FloatingToolbar } from './FloatingToolbar';
import { ReconnectBanner } from './ReconnectBanner';
import { useYjsProvider, type YjsConnectionStatus } from '../../hooks/useYjsProvider';
import type { CoEditorInfo } from '@flowboard/shared';
import type * as Y from 'yjs';
import type { WebsocketProvider } from 'y-websocket';

interface CollaborativeEditorProps {
  cardId: string;
  user: { name: string; color: string };
  /** Optional: pass ydoc/provider from parent (if lifted) */
  ydoc?: Y.Doc;
  provider?: WebsocketProvider;
  status?: YjsConnectionStatus;
  coEditors?: CoEditorInfo[];
}

export function CollaborativeEditor({
  cardId,
  user,
  ydoc: externalYdoc,
  provider: externalProvider,
  status: externalStatus,
  coEditors: externalCoEditors,
}: CollaborativeEditorProps) {
  // Use internal hook only if ydoc/provider not passed from parent
  const internal = useYjsProvider({ cardId, user });
  const ydoc = externalYdoc ?? internal.ydoc;
  const provider = externalProvider ?? internal.provider;
  const status = externalStatus ?? internal.status;
  // coEditors exposed for parent consumption
  void (externalCoEditors ?? internal.coEditors);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          history: false, // Yjs handles undo/redo
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
              CollaborationCursor.configure({
                provider,
                user: { name: user.name, color: user.color },
              }),
            ]
          : []),
        Placeholder.configure({
          placeholder: 'Add a description...',
        }),
        Link.configure({
          openOnClick: false,
        }),
      ],
      editorProps: {
        attributes: {
          class:
            'w-full min-h-[120px] bg-bg-card border border-border-subtle focus:border-border-focus rounded-[8px] py-3 px-4 font-body text-sm text-text-primary prose-invert outline-none',
        },
      },
    },
    [ydoc, provider],
  );

  return (
    <div className="relative">
      {(status === 'connecting' || status === 'disconnected' || status === 'failed') &&
      status !== 'connected' ? (
        <ReconnectBanner status={status} />
      ) : null}
      {editor && <FloatingToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
