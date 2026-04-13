import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getHealth() {
    const checks = { database: 'disconnected', redis: 'disconnected' };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch {
      // Database unreachable
    }

    try {
      await this.redis.ping();
      checks.redis = 'connected';
    } catch {
      // Redis unreachable
    }

    const allHealthy =
      checks.database === 'connected' && checks.redis === 'connected';

    return {
      status: allHealthy ? 'ok' : 'error',
      ...checks,
      timestamp: new Date().toISOString(),
    };
  }
}
