import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { createWsAuthMiddleware } from '../auth/ws-auth.middleware';
import { PresenceService } from '../presence/presence.service';
import { DemoService } from '../demo/demo.service';
import { DEMO_BOARD_ID } from '../demo/bot-user.interface';

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true },
  transports: ['websocket', 'polling'],
})
export class BoardGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly presenceService: PresenceService,
    @Inject(forwardRef(() => DemoService))
    private readonly demoService: DemoService,
  ) {}

  afterInit(server: Server) {
    server.use(createWsAuthMiddleware(this.jwtService));
  }

  @SubscribeMessage('board:join')
  async handleJoinBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string },
  ): Promise<void> {
    client.join(`board:${data.boardId}`);
    // Store boardId and user on socket for cleanup on disconnect
    (client as any).boardId = data.boardId;

    const user = client.data.user;
    if (user) {
      (client as any).user = user;

      // Register in Redis presence
      await this.presenceService.setOnline(user.sub, data.boardId, {
        userId: user.sub,
        name: user.name ?? 'Anonymous',
        color: user.color ?? '#22D3EE',
        role: user.role ?? 'user',
      });

      // Broadcast join to room (excluding sender)
      this.broadcastToBoard(
        data.boardId,
        'presence:join',
        {
          user: {
            userId: user.sub,
            name: user.name ?? 'Anonymous',
            color: user.color ?? '#22D3EE',
            role: user.role ?? 'user',
          },
          boardId: data.boardId,
        },
        client.id,
      );

      // Send current online users list to the joining client
      const onlineUsers =
        await this.presenceService.getOnlineUsers(data.boardId);
      client.emit('presence:users', { users: onlineUsers });

      // Notify DemoService when a guest joins the demo board
      if (data.boardId === DEMO_BOARD_ID && user.role === 'guest') {
        this.demoService.notifyGuestJoined(data.boardId);
      }
    }
  }

  @SubscribeMessage('board:leave')
  handleLeaveBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string },
  ): void {
    client.leave(`board:${data.boardId}`);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const boardId = (client as any).boardId;
    if (boardId) {
      client.leave(`board:${boardId}`);

      const user = (client as any).user ?? client.data.user;
      if (user) {
        await this.presenceService.setOffline(user.sub, boardId);
        this.broadcastToBoard(boardId, 'presence:leave', {
          userId: user.sub,
          boardId,
        });

        // Notify DemoService when a guest leaves the demo board
        if (boardId === DEMO_BOARD_ID && user.role === 'guest') {
          this.demoService.notifyGuestLeft(boardId);
        }
      }
    }
  }

  @SubscribeMessage('presence:cursor')
  handleCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { x: number; y: number; boardId: string },
  ): void {
    const user = client.data.user;
    if (!user) return;

    // WR-01: Validate cursor coordinates
    if (
      typeof data.x !== 'number' ||
      typeof data.y !== 'number' ||
      !Number.isFinite(data.x) ||
      !Number.isFinite(data.y)
    ) {
      return;
    }

    // WR-02: Only allow cursor events for the board the user joined
    const joinedBoardId = (client as any).boardId;
    if (data.boardId !== joinedBoardId) return;

    // Clamp to reasonable bounds (0-10000)
    const x = Math.max(0, Math.min(10000, data.x));
    const y = Math.max(0, Math.min(10000, data.y));

    this.broadcastToBoard(
      data.boardId,
      'presence:cursor',
      {
        userId: user.sub,
        name: user.name ?? 'Anonymous',
        color: user.color ?? '#22D3EE',
        x,
        y,
        boardId: data.boardId,
      },
      client.id,
    );
  }

  @SubscribeMessage('presence:heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const boardId = (client as any).boardId;
    if (boardId) {
      await this.presenceService.refreshHeartbeat(boardId);
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
