import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './api';

/** Socket.io server URL. In production (Vercel), points to Oracle Cloud backend.
 *  In local dev, empty string connects to current origin (Vite proxy at /socket.io). */
const SOCKET_URL = import.meta.env.VITE_API_URL || '';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  // Clean up any existing disconnected socket before creating a new one
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    auth: { token: getAccessToken() },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function getSocketId(): string | undefined {
  return socket?.id;
}
