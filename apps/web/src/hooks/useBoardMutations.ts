import { useMutation } from '@tanstack/react-query';
import { apiPost, apiPatch, apiDelete } from '../lib/api';
import { getQueryClient } from '../providers/QueryProvider';
import { useToast } from '../components/ui/ToastProvider';
import type { BoardWithLists, List, Card } from '@flowboard/shared';

/**
 * Tracks card IDs with in-flight move mutations.
 * Socket event handlers check this to skip events for cards
 * being moved by THIS client (prevents duplication from
 * optimistic update + server broadcast arriving together).
 */
const inflightMoveCardIds = new Set<string>();

export function isCardMoveInflight(cardId: string): boolean {
  return inflightMoveCardIds.has(cardId);
}

// --- List mutations ---

export function useCreateList(boardId: string) {
  const queryClient = getQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (vars: { name: string }) =>
      apiPost<List>(`/api/boards/${boardId}/lists`, vars),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] });
      const previous = queryClient.getQueryData<BoardWithLists>(['board', boardId]);
      queryClient.setQueryData<BoardWithLists>(['board', boardId], (old) => {
        if (!old) return old;
        const maxPos = old.lists.reduce((max, l) => Math.max(max, l.position), 0);
        const tempList: BoardWithLists['lists'][number] = {
          id: `temp-${Date.now()}`,
          boardId,
          name: vars.name,
          position: maxPos + 1000,
          createdAt: new Date(),
          cards: [],
        };
        return { ...old, lists: [...old.lists, tempList] };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['board', boardId], context.previous);
      }
      addToast('error', "Couldn't create list. Please try again.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}

export function useUpdateList(boardId: string) {
  const queryClient = getQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (vars: { id: string; name: string }) =>
      apiPatch<List>(`/api/boards/${boardId}/lists/${vars.id}`, { name: vars.name }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] });
      const previous = queryClient.getQueryData<BoardWithLists>(['board', boardId]);
      queryClient.setQueryData<BoardWithLists>(['board', boardId], (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.map((l) =>
            l.id === vars.id ? { ...l, name: vars.name } : l,
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['board', boardId], context.previous);
      }
      addToast('error', "Changes couldn't be saved. Please try again.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}

export function useDeleteList(boardId: string) {
  const queryClient = getQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (vars: { id: string }) =>
      apiDelete(`/api/boards/${boardId}/lists/${vars.id}`),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] });
      const previous = queryClient.getQueryData<BoardWithLists>(['board', boardId]);
      queryClient.setQueryData<BoardWithLists>(['board', boardId], (old) => {
        if (!old) return old;
        return { ...old, lists: old.lists.filter((l) => l.id !== vars.id) };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['board', boardId], context.previous);
      }
      addToast('error', "Couldn't delete list. Please try again.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}

// --- Card mutations ---

export function useCreateCard(boardId: string) {
  const queryClient = getQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (vars: { title: string; listId: string }) =>
      apiPost<Card>(`/api/boards/${boardId}/cards`, vars),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] });
      const previous = queryClient.getQueryData<BoardWithLists>(['board', boardId]);
      queryClient.setQueryData<BoardWithLists>(['board', boardId], (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.map((l) => {
            if (l.id !== vars.listId) return l;
            const maxPos = l.cards.reduce((max, c) => Math.max(max, c.position), 0);
            const tempCard: Card = {
              id: `temp-${Date.now()}`,
              listId: vars.listId,
              title: vars.title,
              position: maxPos + 1000,
              createdById: '',
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            return { ...l, cards: [...l.cards, tempCard] };
          }),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['board', boardId], context.previous);
      }
      addToast('error', "Couldn't create card. Please try again.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}

export function useUpdateCard(boardId: string) {
  const queryClient = getQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (vars: { id: string; title?: string; descriptionText?: string }) => {
      const { id, ...body } = vars;
      return apiPatch<Card>(`/api/boards/${boardId}/cards/${id}`, body);
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] });
      const previous = queryClient.getQueryData<BoardWithLists>(['board', boardId]);
      queryClient.setQueryData<BoardWithLists>(['board', boardId], (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.map((l) => ({
            ...l,
            cards: l.cards.map((c) =>
              c.id === vars.id ? { ...c, ...vars, updatedAt: new Date() } : c,
            ),
          })),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['board', boardId], context.previous);
      }
      addToast('error', "Changes couldn't be saved. Please try again.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}

export function useMoveCard(boardId: string) {
  const queryClient = getQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (vars: { cardId: string; targetListId: string; newPosition: number }) =>
      apiPost<Card>(`/api/boards/${boardId}/cards/${vars.cardId}/move`, {
        targetListId: vars.targetListId,
        newPosition: vars.newPosition,
      }),
    onMutate: async (vars) => {
      inflightMoveCardIds.add(vars.cardId);
      await queryClient.cancelQueries({ queryKey: ['board', boardId] });
      const previous = queryClient.getQueryData<BoardWithLists>(['board', boardId]);

      // Optimistic: update card's listId and position in cache
      queryClient.setQueryData<BoardWithLists>(['board', boardId], (old) => {
        if (!old) return old;

        // Remove the card from ALL lists first (prevents duplicates)
        let movedCard: Card | undefined;
        const listsWithoutCard = old.lists.map((l) => {
          const found = l.cards.find((c) => c.id === vars.cardId);
          if (found && !movedCard) {
            movedCard = { ...found, listId: vars.targetListId, position: vars.newPosition };
          }
          return { ...l, cards: l.cards.filter((c) => c.id !== vars.cardId) };
        });

        if (!movedCard) return old;

        // Add card to target list, then deduplicate by ID as a safety net
        const updated = listsWithoutCard.map((l) => {
          if (l.id === vars.targetListId) {
            const cards = [...l.cards, movedCard!];
            // Deduplicate: keep only the last occurrence of each card ID
            const seen = new Set<string>();
            const deduped = cards.filter((c) => {
              if (seen.has(c.id)) return false;
              seen.add(c.id);
              return true;
            });
            return { ...l, cards: deduped };
          }
          return l;
        });

        return { ...old, lists: updated };
      });

      return { previous };
    },
    onError: (_err, vars, context) => {
      inflightMoveCardIds.delete(vars.cardId);
      if (context?.previous) {
        queryClient.setQueryData(['board', boardId], context.previous);
      }
      addToast('error', 'Card move failed. The card has been returned to its original position.');
    },
    onSettled: (_data, _error, vars) => {
      // Delay removal from in-flight set so the socket event guard
      // still blocks the broadcast that arrives after the HTTP response.
      // Without this delay, onSuccess removes the ID, then the socket
      // event arrives and duplicates the card.
      setTimeout(() => {
        inflightMoveCardIds.delete(vars.cardId);
      }, 3000);
    },
  });
}

export function useDeleteCard(boardId: string) {
  const queryClient = getQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (vars: { id: string }) =>
      apiDelete(`/api/boards/${boardId}/cards/${vars.id}`),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] });
      const previous = queryClient.getQueryData<BoardWithLists>(['board', boardId]);
      queryClient.setQueryData<BoardWithLists>(['board', boardId], (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.map((l) => ({
            ...l,
            cards: l.cards.filter((c) => c.id !== vars.id),
          })),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['board', boardId], context.previous);
      }
      addToast('error', "Couldn't delete card. Please try again.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}
