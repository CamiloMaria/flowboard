import { describe, it, expect } from 'vitest';
import type {
  Board,
  List,
  Card,
  BoardWithLists,
  ListWithCards,
  CardMovePayload,
  CardCreatePayload,
  CardUpdatePayload,
  CardDeletePayload,
  ListCreatePayload,
  ListUpdatePayload,
  ListDeletePayload,
} from '../board.types';
import type { WsEventMap } from '../ws-events.types';

describe('Composite board types', () => {
  it('BoardWithLists includes lists array with cards nested', () => {
    const board: BoardWithLists = {
      id: '1',
      name: 'Test Board',
      isDemo: false,
      createdById: 'user-1',
      createdAt: new Date(),
      lists: [
        {
          id: 'list-1',
          boardId: '1',
          name: 'Todo',
          position: 1000,
          createdAt: new Date(),
          cards: [
            {
              id: 'card-1',
              listId: 'list-1',
              title: 'Test Card',
              position: 1000,
              createdById: 'user-1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ],
    };

    expect(board.lists).toHaveLength(1);
    expect(board.lists[0].cards).toHaveLength(1);
  });

  it('ListWithCards includes cards array sorted by position', () => {
    const list: ListWithCards = {
      id: 'list-1',
      boardId: '1',
      name: 'In Progress',
      position: 2000,
      createdAt: new Date(),
      cards: [
        {
          id: 'card-1',
          listId: 'list-1',
          title: 'First',
          position: 1000,
          createdById: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'card-2',
          listId: 'list-1',
          title: 'Second',
          position: 2000,
          createdById: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    expect(list.cards).toHaveLength(2);
    // Cards should be sortable by position
    const sorted = [...list.cards].sort((a, b) => a.position - b.position);
    expect(sorted[0].title).toBe('First');
    expect(sorted[1].title).toBe('Second');
  });

  it('CardMovePayload includes cardId, fromListId, toListId, newPosition', () => {
    const payload: CardMovePayload = {
      cardId: 'card-1',
      fromListId: 'list-1',
      toListId: 'list-2',
      newPosition: 1500,
      card: {
        id: 'card-1',
        listId: 'list-2',
        title: 'Moved Card',
        position: 1500,
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    expect(payload.cardId).toBe('card-1');
    expect(payload.fromListId).toBe('list-1');
    expect(payload.toListId).toBe('list-2');
    expect(payload.newPosition).toBe(1500);
    expect(payload.card.id).toBe('card-1');
  });

  it('WS event payload types are exported for each board event', () => {
    // Verify WsEventMap has all expected event types
    const eventMap: WsEventMap = {
      'board:join': { boardId: 'board-1' },
      'board:leave': { boardId: 'board-1' },
      'card:move': {
        cardId: 'card-1',
        fromListId: 'list-1',
        toListId: 'list-2',
        newPosition: 1500,
        card: {
          id: 'card-1',
          listId: 'list-2',
          title: 'Test',
          position: 1500,
          createdById: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      'card:create': {
        card: {
          id: 'card-1',
          listId: 'list-1',
          title: 'New',
          position: 1000,
          createdById: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      'card:update': {
        card: {
          id: 'card-1',
          listId: 'list-1',
          title: 'Updated',
          position: 1000,
          createdById: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      'card:delete': { cardId: 'card-1', listId: 'list-1' },
      'list:create': {
        list: {
          id: 'list-1',
          boardId: 'board-1',
          name: 'New List',
          position: 1000,
          createdAt: new Date(),
        },
      },
      'list:update': {
        list: {
          id: 'list-1',
          boardId: 'board-1',
          name: 'Updated List',
          position: 1000,
          createdAt: new Date(),
        },
      },
      'list:delete': { listId: 'list-1' },
    };

    expect(Object.keys(eventMap)).toHaveLength(9);
    expect(eventMap['card:move'].cardId).toBe('card-1');
    expect(eventMap['card:create'].card.id).toBe('card-1');
    expect(eventMap['list:delete'].listId).toBe('list-1');
  });
});
