import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import type { OnlineUser } from '@flowboard/shared';

@Injectable()
export class PresenceService {
  constructor(private readonly redis: RedisService) {}

  /** Store a user as online on a board (HSET + TTL) */
  async setOnline(
    userId: string,
    boardId: string,
    user: OnlineUser,
  ): Promise<void> {
    const key = `presence:board:${boardId}`;
    await this.redis.hset(key, userId, JSON.stringify(user));
    await this.redis.expire(key, 10);
  }

  /** Remove a user from the online set (immediate cleanup) */
  async setOffline(userId: string, boardId: string): Promise<void> {
    const key = `presence:board:${boardId}`;
    await this.redis.hdel(key, userId);
  }

  /** Get all online users for a board */
  async getOnlineUsers(boardId: string): Promise<OnlineUser[]> {
    const key = `presence:board:${boardId}`;
    const data = await this.redis.hgetall(key);
    return Object.values(data).map(
      (json) => JSON.parse(json) as OnlineUser,
    );
  }

  /** Refresh TTL on the presence key (called on heartbeat) */
  async refreshHeartbeat(boardId: string): Promise<void> {
    const key = `presence:board:${boardId}`;
    await this.redis.expire(key, 10);
  }
}
