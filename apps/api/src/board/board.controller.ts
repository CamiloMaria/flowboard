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
  Req,
} from '@nestjs/common';
import { Request } from 'express';
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

  private getSocketId(req: Request): string | undefined {
    return req.headers['x-socket-id'] as string | undefined;
  }

  @Get(':id')
  getBoard(@Param('id') id: string) {
    return this.boardService.getBoard(id);
  }

  @Post(':boardId/lists')
  @HttpCode(HttpStatus.CREATED)
  async createList(
    @Param('boardId') boardId: string,
    @Body() dto: CreateListDto,
    @Req() req: Request,
  ) {
    const list = await this.boardService.createList(boardId, dto);
    this.boardGateway.broadcastToBoard(boardId, 'list:create', { list }, this.getSocketId(req));
    return list;
  }

  @Patch(':boardId/lists/:listId')
  async updateList(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Body() dto: UpdateListDto,
    @Req() req: Request,
  ) {
    const list = await this.boardService.updateList(boardId, listId, dto);
    this.boardGateway.broadcastToBoard(boardId, 'list:update', { list }, this.getSocketId(req));
    return list;
  }

  @Delete(':boardId/lists/:listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteList(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Req() req: Request,
  ) {
    await this.boardService.deleteList(boardId, listId);
    this.boardGateway.broadcastToBoard(boardId, 'list:delete', { listId }, this.getSocketId(req));
  }

  @Post(':boardId/cards')
  @HttpCode(HttpStatus.CREATED)
  async createCard(
    @Param('boardId') boardId: string,
    @Body() dto: CreateCardDto,
    @CurrentUser() user: { sub: string; role?: string },
    @Req() req: Request,
  ) {
    // Guests don't have a row in the users table — skip createdById FK
    const userId = user.role === 'guest' ? undefined : user.sub;
    const card = await this.boardService.createCard(boardId, dto, userId);
    this.boardGateway.broadcastToBoard(boardId, 'card:create', { card }, this.getSocketId(req));
    return card;
  }

  @Patch(':boardId/cards/:cardId')
  async updateCard(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
    @Req() req: Request,
  ) {
    const card = await this.boardService.updateCard(cardId, dto);
    this.boardGateway.broadcastToBoard(boardId, 'card:update', { card }, this.getSocketId(req));
    return card;
  }

  @Delete(':boardId/cards/:cardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCard(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Req() req: Request,
  ) {
    const card = await this.boardService.deleteCard(cardId);
    this.boardGateway.broadcastToBoard(boardId, 'card:delete', {
      cardId,
      listId: card.listId,
    }, this.getSocketId(req));
  }

  @Post(':boardId/cards/:cardId/move')
  @HttpCode(HttpStatus.OK)
  async moveCard(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Body() dto: MoveCardDto,
    @Req() req: Request,
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
    }, this.getSocketId(req));
    return result;
  }
}
