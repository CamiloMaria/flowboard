import { INestApplication, Logger } from '@nestjs/common';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { JwtService } from '@nestjs/jwt';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import {
  bindState,
  writeState,
  setupDebouncedPersistence,
} from '../collab/yjs-persistence';
import type { PrismaService } from '../prisma/prisma.service';

const logger = new Logger('YjsSetup');

// ── y-websocket protocol message types ──────────────────────────────
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

// ── In-memory document + awareness store ────────────────────────────
const docs = new Map<string, Y.Doc>();
const awarenessMap = new Map<string, awarenessProtocol.Awareness>();
const docConnections = new Map<string, Set<WebSocket>>();

function getYDoc(docName: string): Y.Doc {
  let doc = docs.get(docName);
  if (!doc) {
    doc = new Y.Doc({ gc: true });
    docs.set(docName, doc);
  }
  return doc;
}

function getAwareness(docName: string, doc: Y.Doc): awarenessProtocol.Awareness {
  let awareness = awarenessMap.get(docName);
  if (!awareness) {
    awareness = new awarenessProtocol.Awareness(doc);
    awarenessMap.set(docName, awareness);
  }
  return awareness;
}

/**
 * Send a binary message to a WebSocket client.
 */
function send(ws: WebSocket, message: Uint8Array): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(message, (err) => {
      if (err) logger.error(`WebSocket send error: ${err.message}`);
    });
  }
}

/**
 * Handle a y-websocket connection — implements the sync and awareness protocol
 * that y-websocket clients expect (same wire format as y-websocket server utils).
 */
async function setupWSConnection(
  ws: WebSocket,
  req: IncomingMessage,
  docName: string,
  prisma: PrismaService,
): Promise<void> {
  const doc = getYDoc(docName);
  const awareness = getAwareness(docName, doc);

  // Track this connection
  if (!docConnections.has(docName)) {
    docConnections.set(docName, new Set());
  }
  const connections = docConnections.get(docName)!;
  const isNewDoc = connections.size === 0;
  connections.add(ws);

  // If first connection to this doc, load persisted state
  if (isNewDoc) {
    await bindState(docName, doc, prisma);
    setupDebouncedPersistence(docName, doc, prisma);
  }

  // Forward doc updates to all connected clients
  const docUpdateHandler = (update: Uint8Array, origin: unknown) => {
    if (origin === ws) return; // Don't echo back to sender
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);
    for (const conn of connections) {
      if (conn !== ws) send(conn, message);
    }
  };
  doc.on('update', docUpdateHandler);

  // Forward awareness updates to all connected clients
  const awarenessChangeHandler = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    const changedClients = [...added, ...updated, ...removed];
    if (changedClients.length > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
      );
      const message = encoding.toUint8Array(encoder);
      for (const conn of connections) {
        send(conn, message);
      }
    }
  };
  awareness.on('update', awarenessChangeHandler);

  // Handle incoming messages from client
  ws.on('message', (data: ArrayBuffer | Buffer) => {
    try {
      const message = data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MESSAGE_SYNC: {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_SYNC);
          syncProtocol.readSyncMessage(decoder, encoder, doc, ws);
          if (encoding.length(encoder) > 1) {
            send(ws, encoding.toUint8Array(encoder));
          }
          break;
        }
        case MESSAGE_AWARENESS: {
          awarenessProtocol.applyAwarenessUpdate(
            awareness,
            decoding.readVarUint8Array(decoder),
            ws,
          );
          break;
        }
        default:
          logger.warn(`Unknown message type: ${messageType}`);
      }
    } catch (err) {
      logger.error(`Error processing message: ${err}`);
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    connections.delete(ws);
    doc.off('update', docUpdateHandler);
    awareness.off('update', awarenessChangeHandler);

    // Remove awareness state for this client
    awarenessProtocol.removeAwarenessStates(awareness, [doc.clientID], null);

    logger.log(`Client disconnected from document: ${docName}`);

    // If last connection to this doc, persist and clean up
    if (connections.size === 0) {
      writeState(docName, doc, prisma).catch((err) =>
        logger.error(`Failed to persist on last disconnect: ${err}`),
      );
      // Clean up memory
      docs.delete(docName);
      awarenessMap.delete(docName);
      docConnections.delete(docName);
    }
  });

  // Send initial sync step 1 to the client
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(ws, encoding.toUint8Array(encoder));
  }

  // Send current awareness state
  const awarenessStates = awareness.getStates();
  if (awarenessStates.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        awareness,
        Array.from(awarenessStates.keys()),
      ),
    );
    send(ws, encoding.toUint8Array(encoder));
  }

  logger.log(`Client connected to document: ${docName}`);
}

/**
 * Creates a standalone y-websocket server with noServer mode.
 * This server handles Yjs CRDT document sync on the /yjs/ path.
 *
 * The prisma parameter is provided at creation time for persistence callbacks.
 */
export function createYjsWebSocketServer(
  prisma?: PrismaService,
): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const docName = req.url?.replace('/yjs/', '').split('?')[0] || 'default';

    if (prisma) {
      setupWSConnection(ws, req, docName, prisma).catch((err) =>
        logger.error(`Failed to setup WS connection: ${err}`),
      );
    } else {
      logger.warn('No PrismaService available — Yjs persistence disabled');
    }
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
  logger.log(
    `Upgrade listeners: ${listenerCount} (expected: 1)`,
  );
}
