import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import {
  createYjsWebSocketServer,
  setupDualWebSocket,
} from '../src/websocket/yjs.setup';
import { io as ioClient, Socket } from 'socket.io-client';
import * as WebSocket from 'ws';

describe('Dual WebSocket Spike (E2E)', () => {
  let app: INestApplication;
  let port: number;
  let testJwt: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Generate a valid test JWT for Socket.io auth
    const jwtService = app.get(JwtService);
    testJwt = jwtService.sign({
      sub: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      color: '#22D3EE',
      role: 'user',
    });

    // Wire dual WebSocket — same as main.ts bootstrap
    const yjsWss = createYjsWebSocketServer();
    setupDualWebSocket(app, yjsWss);

    await app.listen(0); // Random port
    const address = app.getHttpServer().address();
    port = typeof address === 'string' ? parseInt(address) : address.port;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('Socket.io client connects on /socket.io/ with valid JWT', (done) => {
    const socket = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: testJwt },
    });
    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      socket.disconnect();
      done();
    });
    socket.on('connect_error', (err) => done(err));
  }, 10000);

  it('Socket.io rejects connection without token', (done) => {
    const socket = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
    });
    socket.on('connect', () => {
      socket.disconnect();
      done(new Error('Should not connect without token'));
    });
    socket.on('connect_error', (err) => {
      expect(err.message).toContain('Unauthorized');
      socket.disconnect();
      done();
    });
  }, 10000);

  it('Socket.io rejects connection with invalid token', (done) => {
    const socket = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: 'invalid-jwt-token' },
    });
    socket.on('connect', () => {
      socket.disconnect();
      done(new Error('Should not connect with invalid token'));
    });
    socket.on('connect_error', (err) => {
      expect(err.message).toContain('Unauthorized');
      socket.disconnect();
      done();
    });
  }, 10000);

  it('Socket.io handles ping/pong message', (done) => {
    const socket = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: testJwt },
    });
    socket.on('connect', () => {
      socket.emit('ping-test');
    });
    socket.on('pong-test', (data) => {
      expect(data).toEqual({ message: 'pong' });
      socket.disconnect();
      done();
    });
    socket.on('connect_error', (err) => done(err));
  }, 10000);

  it('y-websocket client connects on /yjs/', (done) => {
    const ws = new WebSocket(`ws://localhost:${port}/yjs/test-doc`);
    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      done();
    });
    ws.on('error', (err) => done(err));
  }, 10000);

  it('both transports work simultaneously', (done) => {
    const socketIoClient = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: testJwt },
    });
    const yjsWs = new WebSocket(`ws://localhost:${port}/yjs/test-doc`);

    let socketIoConnected = false;
    let yjsConnected = false;

    function checkBoth() {
      if (socketIoConnected && yjsConnected) {
        socketIoClient.disconnect();
        yjsWs.close();
        done();
      }
    }

    socketIoClient.on('connect', () => {
      socketIoConnected = true;
      checkBoth();
    });
    yjsWs.on('open', () => {
      yjsConnected = true;
      checkBoth();
    });
    socketIoClient.on('connect_error', (err) => done(err));
    yjsWs.on('error', (err) => done(err));
  }, 10000);
});
