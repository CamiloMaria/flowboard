import { AppService } from './app.service';

// Mock PrismaService — just the $queryRaw method
const mockPrisma = {
  $queryRaw: jest.fn(),
};

// Mock RedisService — just the ping method
const mockRedis = {
  ping: jest.fn(),
};

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AppService(mockPrisma as any, mockRedis as any);
  });

  describe('getHealth', () => {
    it('returns status ok with database and redis connected when both are healthy', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValueOnce('PONG');

      const result = await service.getHealth();

      expect(result).toEqual({
        status: 'ok',
        database: 'connected',
        redis: 'connected',
        timestamp: expect.any(String),
      });
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('returns status error with database disconnected when DB is unreachable', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));
      mockRedis.ping.mockResolvedValueOnce('PONG');

      const result = await service.getHealth();

      expect(result).toEqual({
        status: 'error',
        database: 'disconnected',
        redis: 'connected',
        timestamp: expect.any(String),
      });
    });

    it('returns status error with redis disconnected when Redis is unreachable', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      mockRedis.ping.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await service.getHealth();

      expect(result).toEqual({
        status: 'error',
        database: 'connected',
        redis: 'disconnected',
        timestamp: expect.any(String),
      });
    });

    it('returns valid ISO timestamp', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValueOnce('PONG');

      const result = await service.getHealth();

      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
