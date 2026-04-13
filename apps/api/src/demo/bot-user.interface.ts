/**
 * Bot identity and demo board constants.
 * Bot UUIDs are resolved at runtime from the database (seed uses upsert with dynamic IDs).
 */
export interface BotUser {
  id: string; // UUID resolved from DB by email
  name: string;
  color: string;
  role: 'bot';
}

/** Stable demo board UUID from seed.ts */
export const DEMO_BOARD_ID = '00000000-0000-0000-0000-000000000000';

/** Bot identity templates — IDs are resolved via PrismaService at startup */
export const BOT_TEMPLATES = [
  { email: 'maria@flowboard.bot', name: 'Maria', color: '#F472B6' },
  { email: 'carlos@flowboard.bot', name: 'Carlos', color: '#4ADE80' },
  { email: 'ana@flowboard.bot', name: 'Ana', color: '#A78BFA' },
] as const;

/** Grace period before stopping bots after last guest disconnects (ms) */
export const GRACE_PERIOD_MS = 45_000;

/** Heartbeat interval for bot presence TTL refresh (ms) */
export const HEARTBEAT_INTERVAL_MS = 5_000;
