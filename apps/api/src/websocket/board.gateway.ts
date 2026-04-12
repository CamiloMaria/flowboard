import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { createWsAuthMiddleware } from '../auth/ws-auth.middleware';

@WebSocketGateway({
  cors: { origin: 'http://localhost:5173', credentials: true },
  transports: ['websocket'],
})
export class BoardGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    server.use(createWsAuthMiddleware(this.jwtService));
  }

  @SubscribeMessage('ping-test')
  handlePing(): { event: string; data: { message: string } } {
    return { event: 'pong-test', data: { message: 'pong' } };
  }
}
