import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import type { BoardWithLists } from '@flowboard/shared';

export function useBoard(boardId: string) {
  return useQuery({
    queryKey: ['board', boardId],
    queryFn: () => apiGet<BoardWithLists>(`/api/boards/${boardId}`),
    enabled: !!boardId,
  });
}
