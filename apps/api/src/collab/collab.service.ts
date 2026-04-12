import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * CollabService — NestJS service for Yjs collaboration infrastructure.
 *
 * Provides access to PrismaService for the y-websocket persistence layer.
 * The persistence setup (bindState/writeState) is configured in yjs-persistence.ts
 * and wired into the WebSocket connection handler in yjs.setup.ts.
 */
@Injectable()
export class CollabService implements OnModuleInit {
  private readonly logger = new Logger(CollabService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log('CollabService initialized — Yjs persistence ready');
  }

  /** Expose PrismaService for the yjs.setup.ts wiring */
  getPrisma(): PrismaService {
    return this.prisma;
  }
}
