import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BoardService } from './board.service';
import { BoardGateway } from '../websocket/board.gateway';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';

@Controller('boards')
export class BoardController {
  constructor(
    private readonly boardService: BoardService,
    private readonly boardGateway: BoardGateway,
  ) {}

  @Get(':id')
  getBoard(@Param('id') id: string) {
    return this.boardService.getBoard(id);
  }

  @Post(':boardId/lists')
  @HttpCode(HttpStatus.CREATED)
  async createList(
    @Param('boardId') boardId: string,
    @Body() dto: CreateListDto,
  ) {
    const list = await this.boardService.createList(boardId, dto);
    this.boardGateway.broadcastToBoard(boardId, 'list:create', { list });
    return list;
  }

  @Patch(':boardId/lists/:listId')
  async updateList(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Body() dto: UpdateListDto,
  ) {
    const list = await this.boardService.updateList(boardId, listId, dto);
    this.boardGateway.broadcastToBoard(boardId, 'list:update', { list });
    return list;
  }

  @Delete(':boardId/lists/:listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteList(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
  ) {
    await this.boardService.deleteList(boardId, listId);
    this.boardGateway.broadcastToBoard(boardId, 'list:delete', { listId });
  }

  @Post(':boardId/cards')
  @HttpCode(HttpStatus.CREATED)
  async createCard(
    @Param('boardId') boardId: string,
    @Body() dto: CreateCardDto,
    @CurrentUser() user: { sub: string },
  ) {
    const card = await this.boardService.createCard(boardId, dto, user.sub);
    this.boardGateway.broadcastToBoard(boardId, 'card:create', { card });
    return card;
  }

  @Patch(':boardId/cards/:cardId')
  async updateCard(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
  ) {
    const card = await this.boardService.updateCard(cardId, dto);
    this.boardGateway.broadcastToBoard(boardId, 'card:update', { card });
    return card;
  }

  @Delete(':boardId/cards/:cardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCard(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
  ) {
    const card = await this.boardService.deleteCard(cardId);
    this.boardGateway.broadcastToBoard(boardId, 'card:delete', {
      cardId,
      listId: card.listId,
    });
  }

  @Post(':boardId/cards/:cardId/move')
  @HttpCode(HttpStatus.OK)
  async moveCard(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Body() dto: MoveCardDto,
  ) {
    const fromCard = await this.boardService.getCardById(cardId);
    const fromListId = fromCard.listId;
    const result = await this.boardService.moveCard(cardId, dto);
    this.boardGateway.broadcastToBoard(boardId, 'card:move', {
      cardId,
      fromListId,
      toListId: dto.targetListId,
      newPosition: dto.newPosition,
      card: result,
    });
    return result;
  }
}
