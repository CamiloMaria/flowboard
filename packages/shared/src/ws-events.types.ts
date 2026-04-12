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
