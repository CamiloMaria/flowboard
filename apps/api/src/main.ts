import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import {
  createYjsWebSocketServer,
  setupDualWebSocket,
} from './websocket/yjs.setup';

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
    origin: 'http://localhost:5173',
    credentials: true,
  });

  // Initialize all modules (NestJS/Socket.io attaches upgrade listener here)
  await app.init();

  // Wire dual WebSocket upgrade dispatcher AFTER init, BEFORE listen
  // per Pitfall 2: NestJS IoAdapter creates Socket.io server during init
  const yjsWss = createYjsWebSocketServer();
  setupDualWebSocket(app, yjsWss);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`FlowBoard API running on port ${port}`);
}

bootstrap();
