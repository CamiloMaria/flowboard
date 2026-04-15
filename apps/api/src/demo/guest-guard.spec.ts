import { Test, TestingModule } from '@nestjs/testing';
import { BoardController } from '../board/board.controller';
import { BoardService } from '../board/board.service';
import { BoardGateway } from '../websocket/board.gateway';
import { DEMO_BOARD_ID } from './bot-user.interface';

/**
 * After removing sign in/sign up (demo-only auth), all users are guests.
 * Guests must be able to mutate the demo board for the interactive demo to work.
 */
describe('Guest mutations on demo board (post sign-in removal)', () => {
  let controller: BoardController;
  let boardService: jest.Mocked<BoardService>;

  const guestUser = { sub: 'guest-uuid', role: 'guest' };
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

  it('guest can create a list on the demo board', async () => {
    const result = await controller.createList(DEMO_BOARD_ID, { name: 'New List' }, guestUser, mockReq);
    expect(result).toBeDefined();
    expect(boardService.createList).toHaveBeenCalledWith(DEMO_BOARD_ID, { name: 'New List' });
  });

  it('guest can update a list on the demo board', async () => {
    const result = await controller.updateList(DEMO_BOARD_ID, 'list-1', { name: 'Renamed' }, guestUser, mockReq);
    expect(result).toBeDefined();
    expect(boardService.updateList).toHaveBeenCalledWith(DEMO_BOARD_ID, 'list-1', { name: 'Renamed' });
  });

  it('guest can delete a list on the demo board', async () => {
    await controller.deleteList(DEMO_BOARD_ID, 'list-1', guestUser, mockReq);
    expect(boardService.deleteList).toHaveBeenCalledWith(DEMO_BOARD_ID, 'list-1');
  });

  it('guest can create a card on the demo board', async () => {
    const result = await controller.createCard(DEMO_BOARD_ID, { title: 'New Card', listId: 'list-1' }, guestUser, mockReq);
    expect(result).toBeDefined();
    expect(boardService.createCard).toHaveBeenCalledWith(DEMO_BOARD_ID, { title: 'New Card', listId: 'list-1' }, undefined);
  });

  it('guest can move a card on the demo board', async () => {
    const result = await controller.moveCard(DEMO_BOARD_ID, 'card-1', { targetListId: 'list-2', newPosition: 1000 }, guestUser, mockReq);
    expect(result).toBeDefined();
    expect(boardService.getCardById).toHaveBeenCalledWith('card-1');
  });
});
