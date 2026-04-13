import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService } from '../presence/presence.service';
import { BoardGateway } from '../websocket/board.gateway';
import {
  BotUser,
  BOT_TEMPLATES,
  DEMO_BOARD_ID,
  GRACE_PERIOD_MS,
  HEARTBEAT_INTERVAL_MS,
} from './bot-user.interface';

@Injectable()
export class DemoService implements OnModuleInit {
  private readonly logger = new Logger(DemoService.name);

  /** Resolved bot users with database UUIDs */
  private botUsers: BotUser[] = [];

  /** Whether bots are currently active */
  private isRunning = false;

  /** Number of guests currently watching the demo board */
  private guestCount = 0;

  /** Grace period timer — stops bots after last guest leaves */
  private graceTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Heartbeat interval — refreshes bot presence TTL in Redis */
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  /** AbortController for choreography cancellation */
  private choreographyAbort: AbortController | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly presenceService: PresenceService,
    private readonly boardGateway: BoardGateway,
  ) {}

  /** Resolve bot UUIDs from database on module init */
  async onModuleInit(): Promise<void> {
    try {
      const emails = BOT_TEMPLATES.map((b) => b.email);
      const users = await this.prisma.user.findMany({
        where: { email: { in: emails } },
        select: { id: true, email: true, name: true, color: true },
      });

      this.botUsers = BOT_TEMPLATES.map((template) => {
        const dbUser = users.find((u) => u.email === template.email);
        if (!dbUser) {
          this.logger.warn(
            `Bot user ${template.email} not found in DB — run seed first`,
          );
          return null;
        }
        return {
          id: dbUser.id,
          name: dbUser.name ?? template.name,
          color: dbUser.color ?? template.color,
          role: 'bot' as const,
        };
      }).filter(Boolean) as BotUser[];

      this.logger.log(`Resolved ${this.botUsers.length} bot users from database`);
    } catch (err) {
      this.logger.warn('Failed to resolve bot users — demo mode disabled', err);
    }
  }

  /** Called when a guest joins the demo board */
  notifyGuestJoined(boardId: string): void {
    if (boardId !== DEMO_BOARD_ID) return;

    this.guestCount++;
    this.logger.log(`Guest joined demo board (count: ${this.guestCount})`);

    // Cancel grace period if active
    if (this.graceTimeout) {
      clearTimeout(this.graceTimeout);
      this.graceTimeout = null;
      this.logger.log('Grace period cancelled — guest rejoined');
    }

    // Start bots if not already running
    if (!this.isRunning) {
      this.startBots();
    }
  }

  /** Called when a guest leaves the demo board */
  notifyGuestLeft(boardId: string): void {
    if (boardId !== DEMO_BOARD_ID) return;

    this.guestCount = Math.max(0, this.guestCount - 1);
    this.logger.log(`Guest left demo board (count: ${this.guestCount})`);

    // Start grace period when last guest leaves
    if (this.guestCount <= 0 && this.isRunning) {
      this.logger.log(`Starting ${GRACE_PERIOD_MS / 1000}s grace period`);
      this.graceTimeout = setTimeout(() => {
        this.logger.log('Grace period expired — stopping bots');
        this.stopBots();
      }, GRACE_PERIOD_MS);
    }
  }

  /** Start bot presence and choreography */
  startBots(): void {
    if (this.isRunning) return; // Idempotent
    if (this.botUsers.length === 0) {
      this.logger.warn('No bot users available — cannot start demo');
      return;
    }

    this.isRunning = true;
    this.choreographyAbort = new AbortController();
    this.logger.log('Starting demo bots');

    // Register all bots in presence
    for (const bot of this.botUsers) {
      void this.presenceService.setOnline(bot.id, DEMO_BOARD_ID, {
        userId: bot.id,
        name: bot.name,
        color: bot.color,
        role: 'bot',
      });

      // Broadcast presence:join for each bot
      this.boardGateway.broadcastToBoard(DEMO_BOARD_ID, 'presence:join', {
        user: {
          userId: bot.id,
          name: bot.name,
          color: bot.color,
          role: 'bot',
        },
        boardId: DEMO_BOARD_ID,
      });
    }

    // Broadcast updated users list
    void this.presenceService
      .getOnlineUsers(DEMO_BOARD_ID)
      .then((users) => {
        this.boardGateway.broadcastToBoard(DEMO_BOARD_ID, 'presence:users', {
          users,
        });
      });

    // Start heartbeat to keep bot presence alive
    this.heartbeatInterval = setInterval(() => {
      void this.presenceService.refreshHeartbeat(DEMO_BOARD_ID);
    }, HEARTBEAT_INTERVAL_MS);
  }

  /** Stop bots and clean up all state */
  stopBots(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.logger.log('Stopping demo bots');

    // Abort choreography
    if (this.choreographyAbort) {
      this.choreographyAbort.abort();
      this.choreographyAbort = null;
    }

    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Clear grace timeout
    if (this.graceTimeout) {
      clearTimeout(this.graceTimeout);
      this.graceTimeout = null;
    }

    // Remove all bot presence
    for (const bot of this.botUsers) {
      void this.presenceService.setOffline(bot.id, DEMO_BOARD_ID);

      this.boardGateway.broadcastToBoard(DEMO_BOARD_ID, 'presence:leave', {
        userId: bot.id,
        boardId: DEMO_BOARD_ID,
      });
    }

    // Reset state
    this.guestCount = 0;
  }

  /** Get the abort signal for choreography engine (Plan 03) */
  getAbortSignal(): AbortSignal | null {
    return this.choreographyAbort?.signal ?? null;
  }

  /** Check if bots are currently running */
  isBotsRunning(): boolean {
    return this.isRunning;
  }

  /** Get resolved bot users (for choreography engine) */
  getBotUsers(): BotUser[] {
    return this.botUsers;
  }
}
