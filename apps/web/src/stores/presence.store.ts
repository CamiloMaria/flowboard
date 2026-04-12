import { create } from 'zustand';
import type { OnlineUser, CursorPosition } from '@flowboard/shared';

interface PresenceState {
  onlineUsers: OnlineUser[];
  /** userId → cursor position (Record, not Map — Zustand serialization) */
  cursorPositions: Record<string, CursorPosition>;

  setOnlineUsers: (users: OnlineUser[]) => void;
  addOnlineUser: (user: OnlineUser) => void;
  removeOnlineUser: (userId: string) => void;
  updateCursor: (userId: string, pos: CursorPosition) => void;
  removeCursor: (userId: string) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUsers: [],
  cursorPositions: {},

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addOnlineUser: (user) =>
    set((s) => ({
      onlineUsers: s.onlineUsers.some((u) => u.userId === user.userId)
        ? s.onlineUsers
        : [...s.onlineUsers, user],
    })),

  removeOnlineUser: (userId) =>
    set((s) => ({
      onlineUsers: s.onlineUsers.filter((u) => u.userId !== userId),
      cursorPositions: Object.fromEntries(
        Object.entries(s.cursorPositions).filter(([k]) => k !== userId),
      ),
    })),

  updateCursor: (userId, pos) =>
    set((s) => ({
      cursorPositions: { ...s.cursorPositions, [userId]: pos },
    })),

  removeCursor: (userId) =>
    set((s) => ({
      cursorPositions: Object.fromEntries(
        Object.entries(s.cursorPositions).filter(([k]) => k !== userId),
      ),
    })),
}));
