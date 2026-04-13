import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { getAccessToken } from '../lib/api';
import type { CoEditorInfo } from '@flowboard/shared';

export type YjsConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'failed';

interface UseYjsProviderOptions {
  cardId: string;
  user: { name: string; color: string };
}

interface UseYjsProviderReturn {
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  status: YjsConnectionStatus;
  coEditors: CoEditorInfo[];
}

const MAX_RECONNECT_ATTEMPTS = 6;

export function useYjsProvider({ cardId, user }: UseYjsProviderOptions): UseYjsProviderReturn {
  const [status, setStatus] = useState<YjsConnectionStatus>('connecting');
  const [coEditors, setCoEditors] = useState<CoEditorInfo[]>([]);
  // WR-05: Use state (not refs) for ydoc/provider so setting them triggers re-render
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    const doc = new Y.Doc();
    const token = getAccessToken() ?? '';

    // In production, VITE_API_URL points to Oracle Cloud backend (e.g. https://api.example.com).
    // In local dev, empty → use current origin so Vite proxy handles /yjs WebSocket.
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const wsUrl = apiUrl.replace(/^http/, 'ws') + '/yjs';

    const prov = new WebsocketProvider(wsUrl, `card:${cardId}`, doc, {
      params: { token },
    });

    setYdoc(doc);
    setProvider(prov);

    // Set local awareness state for cursor rendering
    prov.awareness.setLocalStateField('user', {
      name: user.name,
      color: user.color,
    });

    // Track connection status
    prov.on('status', ({ status: wsStatus }: { status: string }) => {
      if (wsStatus === 'connected') {
        reconnectAttempts.current = 0;
        setStatus('connected');
      } else if (wsStatus === 'disconnected') {
        reconnectAttempts.current += 1;
        if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
          setStatus('failed');
        } else {
          setStatus('disconnected');
        }
      } else if (wsStatus === 'connecting') {
        setStatus('connecting');
      }
    });

    // Track co-editors from awareness
    const updateCoEditors = () => {
      const states = prov.awareness.getStates();
      const editors: CoEditorInfo[] = [];

      states.forEach((state, clientId) => {
        // Skip local client
        if (clientId === doc.clientID) return;
        if (state.user) {
          editors.push({
            userId: String(clientId),
            name: state.user.name,
            color: state.user.color,
          });
        }
      });

      setCoEditors(editors);
    };

    prov.awareness.on('change', updateCoEditors);

    return () => {
      prov.awareness.off('change', updateCoEditors);
      prov.destroy();
      doc.destroy();
      setYdoc(null);
      setProvider(null);
    };
  }, [cardId, user.name, user.color]);

  return { ydoc, provider, status, coEditors };
}
