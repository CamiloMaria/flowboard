import { Test, TestingModule } from '@nestjs/testing';
import { DemoService } from './demo.service';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService } from '../presence/presence.service';
import { BoardGateway } from '../websocket/board.gateway';
import { DEMO_BOARD_ID, GRACE_PERIOD_MS } from './bot-user.interface';

describe('DemoService', () => {
  let service: DemoService;
  let presenceService: jest.Mocked<PresenceService>;
  let boardGateway: jest.Mocked<BoardGateway>;
  let prismaService: any;

  beforeEach(async () => {
    presenceService = {
      setOnline: jest.fn().mockResolvedValue(undefined),
      setOffline: jest.fn().mockResolvedValue(undefined),
      getOnlineUsers: jest.fn().mockResolvedValue([]),
      refreshHeartbeat: jest.fn().mockResolvedValue(undefined),
    } as any;

    boardGateway = {
      broadcastToBoard: jest.fn(),
    } as any;

    prismaService = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'maria-uuid', email: 'maria@flowboard.bot', name: 'Maria', color: '#F472B6' },
          { id: 'carlos-uuid', email: 'carlos@flowboard.bot', name: 'Carlos', color: '#4ADE80' },
          { id: 'ana-uuid', email: 'ana@flowboard.bot', name: 'Ana', color: '#A78BFA' },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemoService,
        { provide: PrismaService, useValue: prismaService },
        { provide: PresenceService, useValue: presenceService },
        { provide: BoardGateway, useValue: boardGateway },
      ],
    }).compile();

    service = module.get<DemoService>(DemoService);
    await service.onModuleInit();
  });

  afterEach(() => {
    // Clean up any running timers
    if (service.isBotsRunning()) {
      service.stopBots();
    }
    jest.clearAllTimers();
  });

  it('should start bots and register presence when no bots running', () => {
    service.startBots();

    expect(service.isBotsRunning()).toBe(true);
    expect(presenceService.setOnline).toHaveBeenCalledTimes(3);
    expect(presenceService.setOnline).toHaveBeenCalledWith(
      'maria-uuid',
      DEMO_BOARD_ID,
      expect.objectContaining({ name: 'Maria', role: 'bot' }),
    );
    expect(boardGateway.broadcastToBoard).toHaveBeenCalledWith(
      DEMO_BOARD_ID,
      'presence:join',
      expect.objectContaining({
        user: expect.objectContaining({ name: 'Maria' }),
      }),
    );
  });

  it('should be idempotent — second startBots call does nothing', () => {
    service.startBots();
    presenceService.setOnline.mockClear();

    service.startBots(); // second call

    expect(presenceService.setOnline).not.toHaveBeenCalled();
    expect(service.isBotsRunning()).toBe(true);
  });

  it('should trigger grace period on last guest leaving, then stop', () => {
    jest.useFakeTimers();

    service.notifyGuestJoined(DEMO_BOARD_ID);
    expect(service.isBotsRunning()).toBe(true);

    service.notifyGuestLeft(DEMO_BOARD_ID);

    // Bots still running during grace period
    expect(service.isBotsRunning()).toBe(true);

    // Advance past grace period
    jest.advanceTimersByTime(GRACE_PERIOD_MS + 100);

    expect(service.isBotsRunning()).toBe(false);
    expect(presenceService.setOffline).toHaveBeenCalledTimes(3);

    jest.useRealTimers();
  });

  it('should cancel grace period when guest rejoins', () => {
    jest.useFakeTimers();

    service.notifyGuestJoined(DEMO_BOARD_ID);
    service.notifyGuestLeft(DEMO_BOARD_ID);

    // Grace period started — advance half way
    jest.advanceTimersByTime(GRACE_PERIOD_MS / 2);
    expect(service.isBotsRunning()).toBe(true);

    // Guest rejoins
    service.notifyGuestJoined(DEMO_BOARD_ID);

    // Advance past full grace period — should NOT stop because grace was cancelled
    jest.advanceTimersByTime(GRACE_PERIOD_MS);
    expect(service.isBotsRunning()).toBe(true);

    jest.useRealTimers();
  });

  it('should clear all bot presence on stopBots', () => {
    service.startBots();
    presenceService.setOffline.mockClear();
    boardGateway.broadcastToBoard.mockClear();

    service.stopBots();

    expect(service.isBotsRunning()).toBe(false);
    expect(presenceService.setOffline).toHaveBeenCalledTimes(3);
    expect(presenceService.setOffline).toHaveBeenCalledWith('maria-uuid', DEMO_BOARD_ID);
    expect(presenceService.setOffline).toHaveBeenCalledWith('carlos-uuid', DEMO_BOARD_ID);
    expect(presenceService.setOffline).toHaveBeenCalledWith('ana-uuid', DEMO_BOARD_ID);
    expect(boardGateway.broadcastToBoard).toHaveBeenCalledWith(
      DEMO_BOARD_ID,
      'presence:leave',
      expect.objectContaining({ userId: 'maria-uuid' }),
    );
  });

  it('should ignore non-demo board joins', () => {
    service.notifyGuestJoined('other-board-id');
    expect(service.isBotsRunning()).toBe(false);
  });

  it('should expose abort signal for choreography', () => {
    expect(service.getAbortSignal()).toBeNull();

    service.startBots();
    const signal = service.getAbortSignal();
    expect(signal).toBeDefined();
    expect(signal?.aborted).toBe(false);

    service.stopBots();
    expect(signal?.aborted).toBe(true);
    expect(service.getAbortSignal()).toBeNull();
  });
});
