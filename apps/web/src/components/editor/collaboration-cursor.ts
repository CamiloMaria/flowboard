/**
 * Custom CollaborationCursor extension that uses @tiptap/y-tiptap instead of
 * y-prosemirror. This is necessary because:
 *
 * - @tiptap/extension-collaboration@3.22 switched from y-prosemirror to
 *   @tiptap/y-tiptap (a fork with a DIFFERENT ySyncPluginKey).
 * - @tiptap/extension-collaboration-cursor@3.0.0 (the only v3 release) still
 *   imports yCursorPlugin from y-prosemirror.
 * - The cursor plugin looks up ystate via the old plugin key → undefined → crash.
 *
 * This file wraps @tiptap/y-tiptap's yCursorPlugin with the same TipTap
 * Extension interface the old package provided.
 */
import { Extension } from '@tiptap/react';
import {
  yCursorPlugin,
  defaultSelectionBuilder,
} from '@tiptap/y-tiptap';
import type { WebsocketProvider } from 'y-websocket';

interface CursorUser {
  name: string;
  color: string;
}

function defaultCursorRender(user: CursorUser): HTMLElement {
  const cursor = document.createElement('span');
  cursor.classList.add('collaboration-cursor__caret');
  cursor.setAttribute('style', `border-color: ${user.color}`);

  const label = document.createElement('div');
  label.classList.add('collaboration-cursor__label');
  label.setAttribute('style', `background-color: ${user.color}`);
  label.insertBefore(document.createTextNode(user.name), null);

  cursor.insertBefore(label, null);
  return cursor;
}

/**
 * Returns a configured TipTap extension for collaboration cursors.
 *
 * Usage:
 *   collaborationCursor(provider, { name: 'Alice', color: '#ff0' })
 */
export function collaborationCursor(
  provider: WebsocketProvider,
  user: CursorUser,
): Extension {
  return Extension.create({
    name: 'collaborationCursor',

    addProseMirrorPlugins() {
      provider.awareness.setLocalStateField('user', user);

      return [
        yCursorPlugin(
          provider.awareness,
          {
            cursorBuilder: defaultCursorRender,
            selectionBuilder: defaultSelectionBuilder,
          },
        ),
      ];
    },
  });
}
