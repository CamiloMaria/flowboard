import { Module } from '@nestjs/common';
import { CollabService } from './collab.service';

/**
 * CollabModule — Provides Yjs collaboration services.
 *
 * PrismaModule is @Global() so PrismaService is available without explicit import.
 * Exports CollabService so yjs.setup.ts can access it via NestJS DI.
 */
@Module({
  providers: [CollabService],
  exports: [CollabService],
})
export class CollabModule {}
