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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';

@Controller('boards')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Get(':id')
  getBoard(@Param('id') id: string) {
    return this.boardService.getBoard(id);
  }

  @Post(':boardId/lists')
  @HttpCode(HttpStatus.CREATED)
  createList(
    @Param('boardId') boardId: string,
    @Body() dto: CreateListDto,
  ) {
    return this.boardService.createList(boardId, dto);
  }

  @Patch(':boardId/lists/:listId')
  updateList(
    @Param('listId') listId: string,
    @Body() dto: UpdateListDto,
  ) {
    return this.boardService.updateList(listId, dto);
  }

  @Delete(':boardId/lists/:listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteList(@Param('listId') listId: string) {
    return this.boardService.deleteList(listId);
  }

  @Post(':boardId/cards')
  @HttpCode(HttpStatus.CREATED)
  createCard(
    @Param('boardId') boardId: string,
    @Body() dto: CreateCardDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.boardService.createCard(boardId, dto, user.sub);
  }

  @Patch(':boardId/cards/:cardId')
  updateCard(
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
  ) {
    return this.boardService.updateCard(cardId, dto);
  }

  @Delete(':boardId/cards/:cardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCard(@Param('cardId') cardId: string) {
    return this.boardService.deleteCard(cardId);
  }

  @Post(':boardId/cards/:cardId/move')
  @HttpCode(HttpStatus.OK)
  moveCard(
    @Param('cardId') cardId: string,
    @Body() dto: MoveCardDto,
  ) {
    return this.boardService.moveCard(cardId, dto);
  }
}
