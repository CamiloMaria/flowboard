import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: 'http://localhost:5173', credentials: true },
  transports: ['websocket'],
})
export class BoardGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('ping-test')
  handlePing(): { event: string; data: { message: string } } {
    return { event: 'pong-test', data: { message: 'pong' } };
  }
}
