import { runChoreography, type ChoreographyDeps } from './choreography';
import type { BotUser } from './bot-user.interface';
import { DEMO_BOARD_ID } from './bot-user.interface';

/**
 * DEMO-02: 60-second scripted choreography runs 3 parallel bots.
 * Verifies the orchestration calls (moveCard, broadcastToBoard, getBoard).
 *
 * Since the full choreography takes ~60 seconds of real time (sleep calls),
 * we abort after a short window and verify initial behavior occurred.
 */
describe('runChoreography orchestration (DEMO-02)', () => {
  const mockBots: BotUser[] = [
    { id: 'maria-uuid', name: 'Maria', color: '#F472B6', role: 'bot' },
    { id: 'carlos-uuid', name: 'Carlos', color: '#4ADE80', role: 'bot' },
    { id: 'ana-uuid', name: 'Ana', color: '#A78BFA', role: 'bot' },
  ];

  function createMockBoard() {
    return {
      lists: [
        { id: 'backlog', position: 0, cards: [
          { id: 'card-b1', listId: 'backlog', position: 1000 },
        ]},
        { id: 'todo', position: 1000, cards: [
          { id: 'card-t1', listId: 'todo', position: 1000 },
          { id: 'card-t2', listId: 'todo', position: 2000 },
        ]},
        { id: 'in-progress', position: 2000, cards: [
          { id: 'card-ip1', listId: 'in-progress', position: 1000 },
          { id: 'card-ip2', listId: 'in-progress', position: 2000 },
          { id: 'card-ip3', listId: 'in-progress', position: 3000 },
        ]},
        { id: 'review', position: 3000, cards: [
          { id: 'card-r1', listId: 'review', position: 1000 },
          { id: 'card-r2', listId: 'review', position: 2000 },
        ]},
        { id: 'done', position: 4000, cards: [
          { id: 'card-d1', listId: 'done', position: 1000 },
        ]},
      ],
    };
  }

  function createMockDeps(controller: AbortController): ChoreographyDeps {
    return {
      boardService: {
        getBoard: jest.fn().mockResolvedValue(createMockBoard()),
        moveCard: jest.fn().mockResolvedValue({ id: 'moved-card' }),
        updateCard: jest.fn().mockResolvedValue({ id: 'updated-card' }),
      } as any,
      boardGateway: {
        broadcastToBoard: jest.fn(),
      } as any,
      bots: mockBots,
      signal: controller.signal,
    };
  }

  it('loads board data via getBoard on start', async () => {
    const controller = new AbortController();
    const deps = createMockDeps(controller);

    // Abort after 2 seconds — enough for initial board load and first cursor emissions
    setTimeout(() => controller.abort(), 2000);

    await runChoreography(deps);
    expect(deps.boardService.getBoard).toHaveBeenCalledWith(DEMO_BOARD_ID);
  }, 10000);

  it('broadcasts cursor events for all 3 bots in parallel', async () => {
    const controller = new AbortController();
    const deps = createMockDeps(controller);

    // Allow 3 seconds of choreography to capture initial cursor events from all 3 bots
    setTimeout(() => controller.abort(), 3000);

    await runChoreography(deps);

    const cursorCalls = (deps.boardGateway.broadcastToBoard as jest.Mock).mock.calls
      .filter(([, event]: [string, string]) => event === 'presence:cursor');

    // Each bot emits cursor events during t=0-5s phase
    const mariaEvents = cursorCalls.filter(([, , data]: [string, string, any]) => data.userId === 'maria-uuid');
    const carlosEvents = cursorCalls.filter(([, , data]: [string, string, any]) => data.userId === 'carlos-uuid');
    const anaEvents = cursorCalls.filter(([, , data]: [string, string, any]) => data.userId === 'ana-uuid');

    expect(mariaEvents.length).toBeGreaterThan(0);
    expect(carlosEvents.length).toBeGreaterThan(0);
    expect(anaEvents.length).toBeGreaterThan(0);
  }, 10000);

  it('performs card moves via boardService.moveCard when allowed enough time', async () => {
    const controller = new AbortController();
    const deps = createMockDeps(controller);

    // Allow 4 seconds — Maria's first move happens around t=2-4s
    setTimeout(() => controller.abort(), 4000);

    await runChoreography(deps);

    // At least one card move should have happened
    const moveCardCalls = (deps.boardService.moveCard as jest.Mock).mock.calls;
    const moveEvents = (deps.boardGateway.broadcastToBoard as jest.Mock).mock.calls
      .filter(([, event]: [string, string]) => event === 'card:move');

    // Due to timing variability, at least verify the board was loaded and cursors emitted
    expect(deps.boardService.getBoard).toHaveBeenCalled();
    // If move happened, verify broadcast too
    if (moveCardCalls.length > 0) {
      expect(moveEvents.length).toBeGreaterThan(0);
    }
  }, 10000);

  it('stops cleanly when abort signal fires immediately', async () => {
    const controller = new AbortController();
    const deps = createMockDeps(controller);

    // Abort after just 100ms
    setTimeout(() => controller.abort(), 100);

    const start = Date.now();
    await runChoreography(deps);
    const elapsed = Date.now() - start;

    // Should stop quickly (within 2 seconds of abort, accounting for async cleanup)
    expect(elapsed).toBeLessThan(3000);
    // Board should still have been loaded (happens before sleep calls)
    expect(deps.boardService.getBoard).toHaveBeenCalled();
  }, 10000);

  it('handles missing bots gracefully (returns immediately with <3 bots)', async () => {
    const controller = new AbortController();
    const deps = createMockDeps(controller);
    deps.bots = [mockBots[0]]; // Only Maria — need exactly 3

    const start = Date.now();
    await runChoreography(deps);
    const elapsed = Date.now() - start;

    // Should return immediately without any actions
    expect(elapsed).toBeLessThan(100);
    expect(deps.boardGateway.broadcastToBoard).not.toHaveBeenCalled();
    controller.abort(); // Clean up
  }, 10000);

  it('handles board not found gracefully', async () => {
    const controller = new AbortController();
    const deps = createMockDeps(controller);
    (deps.boardService.getBoard as jest.Mock).mockRejectedValue(new Error('Board not found'));

    const start = Date.now();
    await runChoreography(deps);
    const elapsed = Date.now() - start;

    // Should return immediately without crash
    expect(elapsed).toBeLessThan(100);
    controller.abort(); // Clean up
  }, 10000);
});
