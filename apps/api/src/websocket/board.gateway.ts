import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { createWsAuthMiddleware } from '../auth/ws-auth.middleware';

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true },
  transports: ['websocket', 'polling'],
})
export class BoardGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    server.use(createWsAuthMiddleware(this.jwtService));
  }

  @SubscribeMessage('board:join')
  handleJoinBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string },
  ): void {
    client.join(`board:${data.boardId}`);
    // Store boardId on socket for cleanup on disconnect
    (client as any).boardId = data.boardId;
  }

  @SubscribeMessage('board:leave')
  handleLeaveBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string },
  ): void {
    client.leave(`board:${data.boardId}`);
  }

  handleDisconnect(client: Socket): void {
    const boardId = (client as any).boardId;
    if (boardId) {
      client.leave(`board:${boardId}`);
    }
  }

  /**
   * Broadcast an event to all clients in a board room.
   * Optionally exclude a specific socket (the mutation originator).
   */
  broadcastToBoard(
    boardId: string,
    event: string,
    data: unknown,
    excludeSocketId?: string,
  ): void {
    if (excludeSocketId) {
      this.server
        .to(`board:${boardId}`)
        .except(excludeSocketId)
        .emit(event, data);
    } else {
      this.server.to(`board:${boardId}`).emit(event, data);
    }
  }

  @SubscribeMessage('ping-test')
  handlePing(): { event: string; data: { message: string } } {
    return { event: 'pong-test', data: { message: 'pong' } };
  }
}
