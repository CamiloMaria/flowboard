import { INestApplication } from '@nestjs/common';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { JwtService } from '@nestjs/jwt';

/**
 * Creates a standalone y-websocket server with noServer mode.
 * This server handles Yjs CRDT document sync on the /yjs/ path.
 * In the spike, connections are accepted without auth — auth
 * middleware will be wired in Plan 05.
 */
export function createYjsWebSocketServer(): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const docName = req.url?.replace('/yjs/', '').split('?')[0] || 'default';
    console.log(`[Yjs] Client connected to document: ${docName}`);

    ws.on('close', () => {
      console.log(`[Yjs] Client disconnected from document: ${docName}`);
    });

    // y-websocket setupWSConnection will be wired here in Phase 3
    // For now, just acknowledge the connection
  });

  return wss;
}

/**
 * Wires the dual WebSocket upgrade dispatcher onto the NestJS HTTP server.
 *
 * CRITICAL: Must be called AFTER app.init() but BEFORE app.listen().
 * NestJS/Socket.io attaches its own upgrade listener during init.
 * We remove ALL upgrade listeners and install a single dispatcher
 * that routes by URL path:
 *   /socket.io/* → Socket.io engine
 *   /yjs/*       → y-websocket server
 *   anything else → destroy
 *
 * Per Pitfall 1 & 2 in RESEARCH.md.
 */
export function setupDualWebSocket(
  app: INestApplication,
  yjsWss: WebSocketServer,
): void {
  const httpServer = app.getHttpServer();

  // Capture Socket.io's upgrade handler BEFORE removing listeners.
  // NestJS's IoAdapter attaches a single upgrade listener for Socket.io.
  // We need to intercept it to re-route.
  const existingUpgradeListeners = httpServer.listeners('upgrade').slice();

  // CRITICAL per Pitfall 1: Remove ALL existing upgrade listeners
  httpServer.removeAllListeners('upgrade');

  // Single upgrade dispatcher per D-09
  httpServer.on(
    'upgrade',
    (request: IncomingMessage, socket: any, head: Buffer) => {
      const pathname = request.url || '';

      if (pathname.startsWith('/yjs/')) {
        // Validate JWT before completing WebSocket handshake
        const url = new URL(request.url!, `http://${request.headers.host}`);
        const token = url.searchParams.get('token');
        if (!token) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
        try {
          const jwtService = app.get(JwtService);
          jwtService.verify(token);
        } catch {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Route to y-websocket server
        yjsWss.handleUpgrade(request, socket, head, (ws) => {
          yjsWss.emit('connection', ws, request);
        });
      } else if (pathname.startsWith('/socket.io/')) {
        // Delegate to Socket.io's original upgrade handler
        // Socket.io's Engine.IO attaches a handler that we captured above.
        // We call it directly to handle the upgrade.
        for (const listener of existingUpgradeListeners) {
          listener.call(httpServer, request, socket, head);
        }
      } else {
        socket.destroy();
      }
    },
  );

  const listenerCount = httpServer.listeners('upgrade').length;
  console.log(
    `[WebSocket] Upgrade listeners: ${listenerCount} (expected: 1)`,
  );
}
