import { weightedRandom, createPersonalities, type BotPersonality } from './random-behavior';
import { generateCursorPath, sleep, randomizeDelay } from './cursor-path';
import type { BotUser } from './bot-user.interface';

const mockBots: BotUser[] = [
  { id: 'maria-uuid', name: 'Maria', color: '#F472B6', role: 'bot' },
  { id: 'carlos-uuid', name: 'Carlos', color: '#4ADE80', role: 'bot' },
  { id: 'ana-uuid', name: 'Ana', color: '#A78BFA', role: 'bot' },
];

describe('weightedRandom', () => {
  it('selects actions according to bot personality weights', () => {
    const weights = { move_card: 0.7, cursor_roam: 0.2, idle_pause: 0.1 };
    const counts: Record<string, number> = { move_card: 0, cursor_roam: 0, idle_pause: 0 };

    for (let i = 0; i < 1000; i++) {
      const action = weightedRandom(weights);
      counts[action]++;
    }

    // move_card should be most common (~70%)
    expect(counts.move_card).toBeGreaterThan(550);
    // idle_pause should be least common (~10%)
    expect(counts.idle_pause).toBeLessThan(200);
  });

  it("Maria's weight distribution favors card moves", () => {
    const personalities = createPersonalities(mockBots);
    const maria = personalities[0];
    expect(maria.weights.move_card).toBe(0.5);
    expect(maria.weights.move_card).toBeGreaterThan(maria.weights.cursor_roam);
    expect(maria.weights.move_card).toBeGreaterThan(maria.weights.idle_pause);
  });

  it("Carlos's weight distribution favors cursor roaming", () => {
    const personalities = createPersonalities(mockBots);
    const carlos = personalities[1];
    expect(carlos.weights.cursor_roam).toBe(0.5);
    expect(carlos.weights.cursor_roam).toBeGreaterThan(carlos.weights.move_card);
    expect(carlos.weights.cursor_roam).toBeGreaterThan(carlos.weights.idle_pause);
  });
});

describe('generateCursorPath', () => {
  it('generates correct number of points', () => {
    const path = generateCursorPath({ x: 0, y: 0 }, { x: 100, y: 100 }, 10);
    expect(path.length).toBe(11); // 0..10 inclusive
  });

  it('starts at start point and ends at end point', () => {
    const path = generateCursorPath({ x: 50, y: 50 }, { x: 200, y: 300 }, 20);
    expect(path[0].x).toBe(50);
    expect(path[0].y).toBe(50);
    expect(path[path.length - 1].x).toBe(200);
    expect(path[path.length - 1].y).toBe(300);
  });
});

describe('sleep', () => {
  it('stops when abort signal fires', async () => {
    const controller = new AbortController();

    // Abort after 50ms
    setTimeout(() => controller.abort(), 50);

    const start = Date.now();
    await expect(sleep(5000, controller.signal)).rejects.toThrow();
    const elapsed = Date.now() - start;

    // Should abort quickly, not wait full 5 seconds
    expect(elapsed).toBeLessThan(500);
  });

  it('resolves after given delay when not aborted', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});

describe('randomizeDelay', () => {
  it('returns values within the specified range', () => {
    for (let i = 0; i < 100; i++) {
      const value = randomizeDelay(5000, 10000);
      expect(value).toBeGreaterThanOrEqual(5000);
      expect(value).toBeLessThanOrEqual(10000);
    }
  });
});
