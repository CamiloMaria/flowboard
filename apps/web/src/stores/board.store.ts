import { create } from 'zustand';

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

interface BoardUIState {
  selectedCardId: string | null;
  connectionStatus: ConnectionStatus;
  // Actions
  openCard: (cardId: string) => void;
  closeCard: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const useBoardStore = create<BoardUIState>((set) => ({
  selectedCardId: null,
  connectionStatus: 'connecting',
  openCard: (cardId) => set({ selectedCardId: cardId }),
  closeCard: () => set({ selectedCardId: null }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
}));
