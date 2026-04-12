import type {
  CardMovePayload,
  CardCreatePayload,
  CardUpdatePayload,
  CardDeletePayload,
  ListCreatePayload,
  ListUpdatePayload,
  ListDeletePayload,
} from './board.types';

export type WsEventType =
  | 'board:join'
  | 'board:leave'
  | 'card:move'
  | 'card:create'
  | 'card:update'
  | 'card:delete'
  | 'list:create'
  | 'list:update'
  | 'list:delete'
  | 'presence:cursor'
  | 'presence:join'
  | 'presence:leave';

export interface WsEventMap {
  'board:join': { boardId: string };
  'board:leave': { boardId: string };
  'card:move': CardMovePayload;
  'card:create': CardCreatePayload;
  'card:update': CardUpdatePayload;
  'card:delete': CardDeletePayload;
  'list:create': ListCreatePayload;
  'list:update': ListUpdatePayload;
  'list:delete': ListDeletePayload;
}
