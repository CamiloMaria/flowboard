import { PresenceService } from './presence.service';
import type { OnlineUser } from '@flowboard/shared';

// Mock RedisService — just the methods PresenceService uses
const mockRedis = {
  hset: jest.fn().mockResolvedValue(1),
  hdel: jest.fn().mockResolvedValue(1),
  hgetall: jest.fn().mockResolvedValue({}),
  expire: jest.fn().mockResolvedValue(1),
};

describe('PresenceService', () => {
  let service: PresenceService;

  const testUser: OnlineUser = {
    userId: 'user-1',
    name: 'Alice',
    color: '#22D3EE',
    role: 'user',
  };
  const boardId = 'board-abc';
  const redisKey = `presence:board:${boardId}`;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PresenceService(mockRedis as any);
  });

  describe('setOnline', () => {
    it('stores user in Redis HSET with board key and sets 10s TTL', async () => {
      await service.setOnline(testUser.userId, boardId, testUser);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        redisKey,
        testUser.userId,
        JSON.stringify(testUser),
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(redisKey, 10);
    });
  });

  describe('setOffline', () => {
    it('removes user from Redis HDEL', async () => {
      await service.setOffline(testUser.userId, boardId);

      expect(mockRedis.hdel).toHaveBeenCalledWith(redisKey, testUser.userId);
    });
  });

  describe('getOnlineUsers', () => {
    it('returns parsed online users from Redis HGETALL', async () => {
      mockRedis.hgetall.mockResolvedValueOnce({
        'user-1': JSON.stringify(testUser),
        'user-2': JSON.stringify({ userId: 'user-2', name: 'Bob', color: '#FBBF24', role: 'user' }),
      });

      const users = await service.getOnlineUsers(boardId);

      expect(mockRedis.hgetall).toHaveBeenCalledWith(redisKey);
      expect(users).toHaveLength(2);
      expect(users[0]).toEqual(testUser);
      expect(users[1]).toEqual({ userId: 'user-2', name: 'Bob', color: '#FBBF24', role: 'user' });
    });

    it('returns empty array when no users online', async () => {
      mockRedis.hgetall.mockResolvedValueOnce({});

      const users = await service.getOnlineUsers(boardId);

      expect(users).toEqual([]);
    });
  });

  describe('refreshHeartbeat', () => {
    it('extends TTL on presence key to 10 seconds', async () => {
      await service.refreshHeartbeat(boardId);

      expect(mockRedis.expire).toHaveBeenCalledWith(redisKey, 10);
    });
  });
});
