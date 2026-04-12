import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import {
  createYjsWebSocketServer,
  setupDualWebSocket,
} from './websocket/yjs.setup';
import { flushAllDirtyDocs } from './collab/yjs-persistence';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Initialize all modules (NestJS/Socket.io attaches upgrade listener here)
  await app.init();

  // Wire dual WebSocket upgrade dispatcher AFTER init, BEFORE listen
  // per Pitfall 2: NestJS IoAdapter creates Socket.io server during init
  const prisma = app.get(PrismaService);
  const yjsWss = createYjsWebSocketServer(prisma);
  setupDualWebSocket(app, yjsWss);

  // Flush dirty Yjs documents on shutdown to prevent data loss
  const shutdownHandler = () => {
    new Logger('Bootstrap').log('Flushing dirty Yjs documents before shutdown...');
    flushAllDirtyDocs();
  };
  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  new Logger('Bootstrap').log(`FlowBoard API running on port ${port}`);
}

bootstrap();
