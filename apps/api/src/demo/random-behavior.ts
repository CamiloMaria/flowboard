/**
 * Post-choreography random weighted behavior engine (D-03).
 * Each bot has personality weights — one action every 5-10 seconds.
 * Feels like a calm team in flow state.
 */

import type { BoardService } from '../board/board.service';
import type { BoardGateway } from '../websocket/board.gateway';
import type { BotUser } from './bot-user.interface';
import { DEMO_BOARD_ID } from './bot-user.interface';
import {
  generateCursorPath,
  sleep,
  randomizeDelay,
  type CursorPoint,
} from './cursor-path';

export type BotAction = 'move_card' | 'cursor_roam' | 'idle_pause';

export interface BotPersonality {
  bot: BotUser;
  weights: Record<BotAction, number>;
}

/** Column X positions for cursor targeting */
const COLUMN_X = [100, 380, 660, 940, 1220];
const BOARD_WIDTH = 1300;
const BOARD_HEIGHT = 600;

/**
 * Create bot personality profiles.
 * Weights must sum to 1 for correct probability distribution.
 */
export function createPersonalities(bots: BotUser[]): BotPersonality[] {
  return [
    { bot: bots[0], weights: { move_card: 0.5, cursor_roam: 0.3, idle_pause: 0.2 } }, // Maria: card mover
    { bot: bots[1], weights: { move_card: 0.2, cursor_roam: 0.5, idle_pause: 0.3 } }, // Carlos: cursor/typing
    { bot: bots[2], weights: { move_card: 0.3, cursor_roam: 0.5, idle_pause: 0.2 } }, // Ana: roamer
  ].filter((p) => p.bot != null);
}

/** Weighted random selection from a Record of weights */
export function weightedRandom(weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [action, weight] of entries) {
    r -= weight;
    if (r <= 0) return action;
  }
  return entries[entries.length - 1][0];
}

export interface RandomBehaviorDeps {
  boardService: BoardService;
  boardGateway: BoardGateway;
  bots: BotUser[];
  signal: AbortSignal;
}

/** Track last known cursor position per bot */
const botCursorPositions = new Map<string, CursorPoint>();

/** Execute a single random action for a bot */
async function executeAction(
  deps: RandomBehaviorDeps,
  personality: BotPersonality,
): Promise<void> {
  const action = weightedRandom(personality.weights) as BotAction;
  const bot = personality.bot;
  const lastPos = botCursorPositions.get(bot.id) ?? {
    x: 200 + Math.random() * 800,
    y: 150 + Math.random() * 300,
  };

  switch (action) {
    case 'move_card': {
      // Pick a random card, move to a random different list
      try {
        const board = await deps.boardService.getBoard(DEMO_BOARD_ID);
        const lists = [...board.lists].sort((a, b) => a.position - b.position);
        const nonEmptyLists = lists.filter((l) => l.cards.length > 0);
        if (nonEmptyLists.length === 0) break;

        const sourceList = nonEmptyLists[Math.floor(Math.random() * nonEmptyLists.length)];
        const card = sourceList.cards[Math.floor(Math.random() * sourceList.cards.length)];
        const targetList = lists.filter((l) => l.id !== sourceList.id)[
          Math.floor(Math.random() * (lists.length - 1))
        ];
        if (!targetList || !card) break;

        // Cursor arc to card
        const sourceColIdx = lists.indexOf(sourceList);
        const cardTarget: CursorPoint = {
          x: COLUMN_X[sourceColIdx] + 60,
          y: 120 + sourceList.cards.indexOf(card) * 70,
        };
        const path1 = generateCursorPath(lastPos, cardTarget);
        for (const p of path1) {
          if (deps.signal.aborted) return;
          deps.boardGateway.broadcastToBoard(DEMO_BOARD_ID, 'presence:cursor', {
            userId: bot.id, name: bot.name, color: bot.color,
            x: p.x, y: p.y, boardId: DEMO_BOARD_ID,
          });
          await sleep(16, deps.signal);
        }

        await sleep(500, deps.signal); // reading pause

        // Arc to target column
        const targetColIdx = lists.indexOf(targetList);
        const dropTarget: CursorPoint = {
          x: COLUMN_X[targetColIdx] + 60,
          y: 120 + targetList.cards.length * 70,
        };
        const path2 = generateCursorPath(cardTarget, dropTarget);
        for (const p of path2) {
          if (deps.signal.aborted) return;
          deps.boardGateway.broadcastToBoard(DEMO_BOARD_ID, 'presence:cursor', {
            userId: bot.id, name: bot.name, color: bot.color,
            x: p.x, y: p.y, boardId: DEMO_BOARD_ID,
          });
          await sleep(16, deps.signal);
        }

        // Execute move
        const maxPos = targetList.cards.reduce((m, c) => Math.max(m, c.position), 0);
        const result = await deps.boardService.moveCard(card.id, {
          targetListId: targetList.id,
          newPosition: maxPos + 1000,
        });
        deps.boardGateway.broadcastToBoard(DEMO_BOARD_ID, 'card:move', {
          cardId: card.id,
          fromListId: sourceList.id,
          toListId: targetList.id,
          newPosition: maxPos + 1000,
          card: result,
        });
        botCursorPositions.set(bot.id, dropTarget);
      } catch {
        // Board or card not found — skip
      }
      break;
    }

    case 'cursor_roam': {
      // Roam to a random board position with Bezier arc
      const target: CursorPoint = {
        x: 80 + Math.random() * (BOARD_WIDTH - 160),
        y: 80 + Math.random() * (BOARD_HEIGHT - 160),
      };
      const path = generateCursorPath(lastPos, target);
      for (const p of path) {
        if (deps.signal.aborted) return;
        deps.boardGateway.broadcastToBoard(DEMO_BOARD_ID, 'presence:cursor', {
          userId: bot.id, name: bot.name, color: bot.color,
          x: p.x, y: p.y, boardId: DEMO_BOARD_ID,
        });
        await sleep(16, deps.signal);
      }
      botCursorPositions.set(bot.id, target);
      break;
    }

    case 'idle_pause':
      // Natural break — do nothing
      break;
  }
}

/**
 * Perpetual random behavior loop.
 * One bot action every 5-10 seconds (randomized). Runs until abort signal fires.
 * Per D-04: random phase does NOT open cards for editing — only moves and cursor roaming.
 */
export async function runRandomBehaviorLoop(
  deps: RandomBehaviorDeps,
): Promise<void> {
  const personalities = createPersonalities(deps.bots);
  if (personalities.length === 0) return;

  try {
    while (!deps.signal.aborted) {
      // Pick a random bot
      const personality =
        personalities[Math.floor(Math.random() * personalities.length)];

      await executeAction(deps, personality);

      // Wait 5-10 seconds between actions
      await sleep(randomizeDelay(5000, 10000), deps.signal);
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    throw err;
  }
}
