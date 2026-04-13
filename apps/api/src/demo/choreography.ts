/**
 * 60-second scripted choreography sequence (D-01, D-04).
 * Three bots run in parallel, showcasing card moves, cursor arcs,
 * and a climactic collaborative editing moment.
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

export interface ChoreographyDeps {
  boardService: BoardService;
  boardGateway: BoardGateway;
  bots: BotUser[];
  signal: AbortSignal;
}

/** Emit cursor positions along a Bezier path at ~60fps */
async function emitCursorPath(
  deps: ChoreographyDeps,
  bot: BotUser,
  from: CursorPoint,
  to: CursorPoint,
  steps = 20,
): Promise<void> {
  const path = generateCursorPath(from, to, steps);
  for (const point of path) {
    if (deps.signal.aborted) return;
    deps.boardGateway.broadcastToBoard(DEMO_BOARD_ID, 'presence:cursor', {
      userId: bot.id,
      name: bot.name,
      color: bot.color,
      x: point.x,
      y: point.y,
      boardId: DEMO_BOARD_ID,
    });
    await sleep(16, deps.signal); // ~60fps
  }
}

/** Move a card and broadcast the event */
async function botMoveCard(
  deps: ChoreographyDeps,
  bot: BotUser,
  cardId: string,
  targetListId: string,
  newPosition: number,
  fromListId: string,
): Promise<void> {
  try {
    const result = await deps.boardService.moveCard(cardId, {
      targetListId,
      newPosition,
    });
    deps.boardGateway.broadcastToBoard(DEMO_BOARD_ID, 'card:move', {
      cardId,
      fromListId,
      toListId: targetListId,
      newPosition,
      card: result,
    });
  } catch {
    // Card may not exist (e.g., board not seeded) — silently skip
  }
}

/** Update card description to simulate typing */
async function botTypeInCard(
  deps: ChoreographyDeps,
  cardId: string,
  text: string,
): Promise<void> {
  // Simulate typing by appending characters every 100-200ms
  let current = '';
  for (const char of text) {
    if (deps.signal.aborted) return;
    current += char;
    try {
      const card = await deps.boardService.updateCard(cardId, {
        descriptionText: current,
      });
      deps.boardGateway.broadcastToBoard(DEMO_BOARD_ID, 'card:update', {
        card,
      });
    } catch {
      return; // Card doesn't exist — skip
    }
    await sleep(randomizeDelay(80, 180), deps.signal);
  }
}

/** Board position constants (approximate pixel positions for cursor targeting) */
const COLUMN_X = [100, 380, 660, 940, 1220]; // Backlog, To Do, In Progress, Review, Done
const CARD_Y_BASE = 120;
const CARD_Y_STEP = 70;

function cardPos(colIndex: number, cardIndex: number): CursorPoint {
  return { x: COLUMN_X[colIndex] + 60, y: CARD_Y_BASE + cardIndex * CARD_Y_STEP };
}

/**
 * Run the 60-second scripted choreography with 3 parallel bots.
 * After completion, resolves so the caller can transition to random behavior.
 */
export async function runChoreography(deps: ChoreographyDeps): Promise<void> {
  const [maria, carlos, ana] = deps.bots;
  if (!maria || !carlos || !ana) return;

  // Load board to get real card/list IDs
  let board: Awaited<ReturnType<BoardService['getBoard']>>;
  try {
    board = await deps.boardService.getBoard(DEMO_BOARD_ID);
  } catch {
    return; // Board not seeded
  }

  const lists = [...board.lists].sort((a, b) => a.position - b.position);
  // Backlog=0, To Do=1, In Progress=2, Review=3, Done=4
  const getCards = (listIndex: number) =>
    lists[listIndex]
      ? [...lists[listIndex].cards].sort((a, b) => a.position - b.position)
      : [];

  // ---- Parallel bot behaviors ----
  async function mariaBehavior(): Promise<void> {
    // t=0-5s: Roam "In Progress" column
    const ipCards = getCards(2);
    let cursorPos: CursorPoint = { x: 50, y: 200 };
    for (let i = 0; i < Math.min(3, ipCards.length); i++) {
      const target = cardPos(2, i);
      await emitCursorPath(deps, maria, cursorPos, target);
      cursorPos = target;
      await sleep(randomizeDelay(800, 1200), deps.signal); // "reading" pause
    }

    // t=5-15s: Drag card from "In Progress" to "Review"
    if (ipCards.length > 0) {
      const card = ipCards[0];
      const reviewTarget = cardPos(3, getCards(3).length);
      await emitCursorPath(deps, maria, cursorPos, reviewTarget, 30);
      const reviewList = lists[3];
      if (reviewList) {
        const maxPos = getCards(3).reduce((m, c) => Math.max(m, c.position), 0);
        await botMoveCard(deps, maria, card.id, reviewList.id, maxPos + 1000, card.listId);
      }
      cursorPos = reviewTarget;
    }
    await sleep(randomizeDelay(2000, 3000), deps.signal);

    // t=15-30s: Move cursor toward Carlos's card for collab moment
    const collabTarget = cardPos(2, 1);
    await emitCursorPath(deps, maria, cursorPos, collabTarget, 25);
    cursorPos = collabTarget;
    await sleep(randomizeDelay(3000, 5000), deps.signal);

    // t=30-45s: CRDT climax — type in same card as Carlos
    const ipCardsNow = getCards(2);
    if (ipCardsNow.length > 1) {
      await botTypeInCard(deps, ipCardsNow[1].id, 'Added responsive breakpoints');
    }
    await sleep(randomizeDelay(3000, 5000), deps.signal);

    // t=45-60s: Slow down — one more independent move
    const reviewCards = getCards(3);
    if (reviewCards.length > 0) {
      const doneTarget = cardPos(4, getCards(4).length);
      await emitCursorPath(deps, maria, cursorPos, doneTarget, 25);
      const doneList = lists[4];
      if (doneList) {
        const maxPos = getCards(4).reduce((m, c) => Math.max(m, c.position), 0);
        await botMoveCard(deps, maria, reviewCards[0].id, doneList.id, maxPos + 1000, reviewCards[0].listId);
      }
    }
  }

  async function carlosBehavior(): Promise<void> {
    // t=0-5s: Move to "To Do" column
    let cursorPos: CursorPoint = { x: 300, y: 80 };
    const todoCards = getCards(1);
    if (todoCards.length > 0) {
      const target = cardPos(1, 0);
      await emitCursorPath(deps, carlos, cursorPos, target);
      cursorPos = target;
      await sleep(randomizeDelay(1000, 1500), deps.signal);
    }

    // t=5-15s: Drag card from "To Do" to "In Progress"
    if (todoCards.length > 0) {
      const card = todoCards[0];
      const ipTarget = cardPos(2, getCards(2).length);
      await emitCursorPath(deps, carlos, cursorPos, ipTarget, 30);
      const ipList = lists[2];
      if (ipList) {
        const maxPos = getCards(2).reduce((m, c) => Math.max(m, c.position), 0);
        await botMoveCard(deps, carlos, card.id, ipList.id, maxPos + 1000, card.listId);
      }
      cursorPos = ipTarget;
    }
    await sleep(randomizeDelay(3000, 4000), deps.signal);

    // t=15-30s: Move to a card in "In Progress", hover (reading)
    const ipCards = getCards(2);
    if (ipCards.length > 1) {
      const readTarget = cardPos(2, 1);
      await emitCursorPath(deps, carlos, cursorPos, readTarget, 20);
      cursorPos = readTarget;
      await sleep(randomizeDelay(2000, 3000), deps.signal);
    }

    // t=30-45s: CRDT climax — type in card description
    if (ipCards.length > 1) {
      await botTypeInCard(deps, ipCards[1].id, 'Needs unit test coverage for edge cases');
    }
    await sleep(randomizeDelay(3000, 5000), deps.signal);

    // t=45-60s: Gentle cursor roaming
    const roamTarget = cardPos(1, 2);
    await emitCursorPath(deps, carlos, cursorPos, roamTarget, 25);
    await sleep(randomizeDelay(3000, 5000), deps.signal);
  }

  async function anaBehavior(): Promise<void> {
    // t=0-5s: Roam header area, then move to "Review"
    let cursorPos: CursorPoint = { x: 500, y: 30 };
    await emitCursorPath(deps, ana, cursorPos, { x: 800, y: 40 }, 15);
    cursorPos = { x: 800, y: 40 };
    await sleep(randomizeDelay(1000, 1500), deps.signal);

    const reviewTarget = cardPos(3, 0);
    await emitCursorPath(deps, ana, cursorPos, reviewTarget, 20);
    cursorPos = reviewTarget;
    await sleep(randomizeDelay(2000, 3000), deps.signal);

    // t=5-15s: Watch Maria's move (roam to Review area)
    const watchTarget = cardPos(3, 2);
    await emitCursorPath(deps, ana, cursorPos, watchTarget, 15);
    cursorPos = watchTarget;
    await sleep(randomizeDelay(2000, 3000), deps.signal);

    // Move a card from Backlog to To Do
    const backlogCards = getCards(0);
    if (backlogCards.length > 0) {
      const blTarget = cardPos(0, 0);
      await emitCursorPath(deps, ana, cursorPos, blTarget, 20);
      const todoTarget = cardPos(1, getCards(1).length);
      await emitCursorPath(deps, ana, blTarget, todoTarget, 30);
      const todoList = lists[1];
      if (todoList) {
        const maxPos = getCards(1).reduce((m, c) => Math.max(m, c.position), 0);
        await botMoveCard(deps, ana, backlogCards[0].id, todoList.id, maxPos + 1000, backlogCards[0].listId);
      }
      cursorPos = todoTarget;
    }
    await sleep(randomizeDelay(5000, 8000), deps.signal);

    // t=30-45s: Independent cursor roaming + card move from Review to Done
    const reviewCards = getCards(3);
    if (reviewCards.length > 1) {
      const rcTarget = cardPos(3, 1);
      await emitCursorPath(deps, ana, cursorPos, rcTarget, 20);
      const doneTarget = cardPos(4, getCards(4).length);
      await emitCursorPath(deps, ana, rcTarget, doneTarget, 30);
      const doneList = lists[4];
      if (doneList) {
        const maxPos = getCards(4).reduce((m, c) => Math.max(m, c.position), 0);
        await botMoveCard(deps, ana, reviewCards[1].id, doneList.id, maxPos + 1000, reviewCards[1].listId);
      }
      cursorPos = doneTarget;
    }
    await sleep(randomizeDelay(5000, 8000), deps.signal);

    // t=45-60s: Gentle roaming
    await emitCursorPath(deps, ana, cursorPos, { x: 600, y: 250 }, 25);
    await sleep(randomizeDelay(3000, 5000), deps.signal);
  }

  // Run all 3 bots in parallel
  try {
    await Promise.all([
      mariaBehavior(),
      carlosBehavior(),
      anaBehavior(),
    ]);
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    throw err;
  }
}
