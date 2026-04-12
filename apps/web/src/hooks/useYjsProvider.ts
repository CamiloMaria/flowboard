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
  const reconnectAttempts = useRef(0);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const token = getAccessToken() ?? '';

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/yjs`;

    const provider = new WebsocketProvider(wsUrl, `card:${cardId}`, ydoc, {
      params: { token },
    });

    ydocRef.current = ydoc;
    providerRef.current = provider;

    // Set local awareness state for cursor rendering
    provider.awareness.setLocalStateField('user', {
      name: user.name,
      color: user.color,
    });

    // Track connection status
    provider.on('status', ({ status: wsStatus }: { status: string }) => {
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
      const states = provider.awareness.getStates();
      const editors: CoEditorInfo[] = [];

      states.forEach((state, clientId) => {
        // Skip local client
        if (clientId === ydoc.clientID) return;
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

    provider.awareness.on('change', updateCoEditors);

    return () => {
      provider.awareness.off('change', updateCoEditors);
      provider.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      providerRef.current = null;
    };
  }, [cardId, user.name, user.color]);

  return {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    status,
    coEditors,
  };
}
