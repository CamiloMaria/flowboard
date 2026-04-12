import { useEffect } from 'react';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { getQueryClient } from '../providers/QueryProvider';
import { useBoardStore } from '../stores/board.store';
import type {
  BoardWithLists,
  CardMovePayload,
  CardCreatePayload,
  CardUpdatePayload,
  CardDeletePayload,
  ListCreatePayload,
  ListUpdatePayload,
  ListDeletePayload,
} from '@flowboard/shared';

/**
 * Connects to the Socket.io board room and handles all real-time events.
 * Remote changes update the TanStack Query cache directly (D-13) so the
 * UI reflects changes instantly. Connection status updates the Zustand
 * store for the header indicator (D-16).
 */
export function useBoardSocket(boardId: string) {
  useEffect(() => {
    const socket = connectSocket();
    const queryClient = getQueryClient();
    const { setConnectionStatus } = useBoardStore.getState();

    // --- Connection status handlers (D-16) ---
    const onConnect = () => {
      setConnectionStatus('connected');
      socket.emit('board:join', { boardId });
    };

    const onDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    // Socket.io v4.8: reconnect events fire on the Manager, not the socket
    const onReconnectAttempt = () => {
      setConnectionStatus('reconnecting');
    };

    const onReconnect = () => {
      setConnectionStatus('connected');
      socket.emit('board:join', { boardId });
      // Re-sync board data after reconnect to catch missed events
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect', onReconnect);

    // If already connected, join room immediately
    if (socket.connected) {
      setConnectionStatus('connected');
      socket.emit('board:join', { boardId });
    }

    // --- Board event handlers (D-13: apply changes directly to TanStack Query cache) ---

    const onCardMove = (payload: CardMovePayload) => {
      queryClient.setQueryData<BoardWithLists>(['board', boardId], (old) => {
        if (!old) return old;
        // Remove card from all lists (handles cross-list moves)
        const lists = old.lists.map((list) => ({
          ...list,
          cards: list.cards.filter((c) => c.id !== payload.cardId),
        }));
        // Add card to target list at correct position
        const targetList = lists.find((l) => l.id === payload.card.listId);
        if (targetList) {
          targetList.cards.push(payload.card);
          targetList.cards.sort((a, b) => a.position - b.position);
        }
        return { ...old, lists };
      });
    };

    const onCardCreate = (payload: CardCreatePayload) => {
      queryClient.setQueryData<BoardWithLists>(['board', boardId], (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.map((list) =>
            list.id === payload.card.listId
              ? {
                  ...list,
                  cards: [...list.cards, payload.card].sort(
                    (a, b) => a.position - b.position,
                  ),
                }
              : list,
          ),
        };
      });
    };

    const onCardUpdate = (payload: CardUpdatePayload) => {
      queryClient.setQueryData<BoardWithLists>(['board', boardId], (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.map((list) => ({
            ...list,
            cards: list.cards.map((c) =>
              c.id === payload.card.id ? { ...c, ...payload.card } : c,
            ),
          })),
        };
      });
    };

    const onCardDelete = (payload: CardDeletePayload) => {
      queryClient.setQueryData<BoardWithLists>(['board', boardId], (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.map((list) => ({
            ...list,
            cards: list.cards.filter((c) => c.id !== payload.cardId),
          })),
        };
      });
    };

    const onListCreate = (payload: ListCreatePayload) => {
      queryClient.setQueryData<BoardWithLists>(['board', boardId], (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: [...old.lists, { ...payload.list, cards: [] }].sort(
            (a, b) => a.position - b.position,
          ),
        };
      });
    };

    const onListUpdate = (payload: ListUpdatePayload) => {
      queryClient.setQueryData<BoardWithLists>(['board', boardId], (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.map((l) =>
            l.id === payload.list.id ? { ...l, ...payload.list } : l,
          ),
        };
      });
    };

    const onListDelete = (payload: ListDeletePayload) => {
      queryClient.setQueryData<BoardWithLists>(['board', boardId], (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.filter((l) => l.id !== payload.listId),
        };
      });
    };

    socket.on('card:move', onCardMove);
    socket.on('card:create', onCardCreate);
    socket.on('card:update', onCardUpdate);
    socket.on('card:delete', onCardDelete);
    socket.on('list:create', onListCreate);
    socket.on('list:update', onListUpdate);
    socket.on('list:delete', onListDelete);

    // --- Cleanup ---
    return () => {
      socket.emit('board:leave', { boardId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect', onReconnect);
      socket.off('card:move', onCardMove);
      socket.off('card:create', onCardCreate);
      socket.off('card:update', onCardUpdate);
      socket.off('card:delete', onCardDelete);
      socket.off('list:create', onListCreate);
      socket.off('list:update', onListUpdate);
      socket.off('list:delete', onListDelete);
      disconnectSocket();
    };
  }, [boardId]);
}
