import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BoardController } from '../board/board.controller';
import { BoardService } from '../board/board.service';
import { BoardGateway } from '../websocket/board.gateway';
import { DEMO_BOARD_ID } from './bot-user.interface';

/**
 * DEMO-06: Guest read-only guard prevents guests from mutating the demo board.
 * Verifies the `assertNotGuestOnDemo` guard on all 7 mutation endpoints.
 */
describe('Guest read-only guard (DEMO-06)', () => {
  let controller: BoardController;
  let boardService: jest.Mocked<BoardService>;

  const guestUser = { sub: 'guest-uuid', role: 'guest' };
  const normalUser = { sub: 'user-uuid', role: 'user' };
  const mockReq = { headers: {} } as any;

  beforeEach(async () => {
    boardService = {
      getBoard: jest.fn(),
      createList: jest.fn().mockResolvedValue({ id: 'list-1', name: 'Test' }),
      updateList: jest.fn().mockResolvedValue({ id: 'list-1', name: 'Updated' }),
      deleteList: jest.fn().mockResolvedValue(undefined),
      createCard: jest.fn().mockResolvedValue({ id: 'card-1', title: 'Test' }),
      updateCard: jest.fn().mockResolvedValue({ id: 'card-1', title: 'Updated' }),
      deleteCard: jest.fn().mockResolvedValue({ id: 'card-1', listId: 'list-1' }),
      moveCard: jest.fn().mockResolvedValue({ id: 'card-1' }),
      getCardById: jest.fn().mockResolvedValue({ id: 'card-1', listId: 'list-1' }),
    } as any;

    const boardGateway = {
      broadcastToBoard: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoardController],
      providers: [
        { provide: BoardService, useValue: boardService },
        { provide: BoardGateway, useValue: boardGateway },
      ],
    }).compile();

    controller = module.get<BoardController>(BoardController);
  });

  it('guest cannot create a list on the demo board', async () => {
    await expect(
      controller.createList(DEMO_BOARD_ID, { name: 'Hacked' }, guestUser, mockReq),
    ).rejects.toThrow(ForbiddenException);
  });

  it('guest cannot update a list on the demo board', async () => {
    await expect(
      controller.updateList(DEMO_BOARD_ID, 'list-1', { name: 'Hacked' }, guestUser, mockReq),
    ).rejects.toThrow(ForbiddenException);
  });

  it('guest cannot delete a list on the demo board', async () => {
    await expect(
      controller.deleteList(DEMO_BOARD_ID, 'list-1', guestUser, mockReq),
    ).rejects.toThrow(ForbiddenException);
  });

  it('guest cannot create a card on the demo board', async () => {
    await expect(
      controller.createCard(DEMO_BOARD_ID, { title: 'Hacked', listId: 'list-1' }, guestUser, mockReq),
    ).rejects.toThrow(ForbiddenException);
  });

  it('guest cannot update a card on the demo board', async () => {
    await expect(
      controller.updateCard(DEMO_BOARD_ID, 'card-1', { title: 'Hacked' }, guestUser, mockReq),
    ).rejects.toThrow(ForbiddenException);
  });

  it('guest cannot delete a card on the demo board', async () => {
    await expect(
      controller.deleteCard(DEMO_BOARD_ID, 'card-1', guestUser, mockReq),
    ).rejects.toThrow(ForbiddenException);
  });

  it('guest cannot move a card on the demo board', async () => {
    await expect(
      controller.moveCard(DEMO_BOARD_ID, 'card-1', { targetListId: 'list-2', newPosition: 1000 }, guestUser, mockReq),
    ).rejects.toThrow(ForbiddenException);
  });

  it('normal user CAN create a list on the demo board', async () => {
    const result = await controller.createList(DEMO_BOARD_ID, { name: 'Legit' }, normalUser, mockReq);
    expect(result).toBeDefined();
    expect(boardService.createList).toHaveBeenCalled();
  });

  it('guest CAN create a list on a non-demo board', async () => {
    const result = await controller.createList('other-board-id', { name: 'Legit' }, guestUser, mockReq);
    expect(result).toBeDefined();
    expect(boardService.createList).toHaveBeenCalled();
  });
});
