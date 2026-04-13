/** A user currently online on a board */
export interface OnlineUser {
  userId: string;
  name: string;
  color: string; // hex from USER_COLORS/BOT_COLORS/GUEST_COLORS
  role: 'user' | 'guest' | 'bot';
}

/** Remote cursor position on the board canvas */
export interface CursorPosition {
  x: number; // relative to board canvas scroll container
  y: number;
  lastUpdate: number; // Date.now() timestamp for idle detection
}

/** Socket.io payload for presence:cursor events (D-21) */
export interface PresenceCursorPayload {
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  boardId: string;
}

/** Socket.io payload for presence:join events (D-22) */
export interface PresenceJoinPayload {
  user: OnlineUser;
  boardId: string;
}

/** Socket.io payload for presence:leave events (D-22) */
export interface PresenceLeavePayload {
  userId: string;
  boardId: string;
}

/** Info about a co-editor in a card modal (D-14) */
export interface CoEditorInfo {
  userId: string;
  name: string;
  color: string;
}
