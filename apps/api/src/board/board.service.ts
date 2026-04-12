import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';

@Injectable()
export class BoardService {
  constructor(private readonly prisma: PrismaService) {}

  async getBoard(boardId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });

    if (!board) {
      throw new NotFoundException(`Board ${boardId} not found`);
    }

    return board;
  }

  async createList(boardId: string, dto: CreateListDto) {
    // Verify board exists
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException(`Board ${boardId} not found`);
    }

    // Get max position of existing lists (default 0)
    const maxResult = await this.prisma.list.aggregate({
      where: { boardId },
      _max: { position: true },
    });
    const maxPosition = maxResult._max.position ?? 0;

    return this.prisma.list.create({
      data: {
        boardId,
        name: dto.name,
        position: maxPosition + 1000,
      },
    });
  }

  async updateList(boardId: string, listId: string, dto: UpdateListDto) {
    const list = await this.prisma.list.findUnique({ where: { id: listId } });
    if (!list) {
      throw new NotFoundException(`List ${listId} not found`);
    }
    if (list.boardId !== boardId) {
      throw new NotFoundException(`List ${listId} not found in board ${boardId}`);
    }

    return this.prisma.list.update({
      where: { id: listId },
      data: { ...dto },
    });
  }

  async deleteList(boardId: string, listId: string) {
    const list = await this.prisma.list.findUnique({ where: { id: listId } });
    if (!list) {
      throw new NotFoundException(`List ${listId} not found`);
    }
    if (list.boardId !== boardId) {
      throw new NotFoundException(`List ${listId} not found in board ${boardId}`);
    }

    // Cards cascade via Prisma schema onDelete: Cascade
    await this.prisma.list.delete({ where: { id: listId } });
  }

  async createCard(boardId: string, dto: CreateCardDto, userId: string) {
    // Verify board exists
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException(`Board ${boardId} not found`);
    }

    // Get max position of cards in target list (default 0)
    const maxResult = await this.prisma.card.aggregate({
      where: { listId: dto.listId },
      _max: { position: true },
    });
    const maxPosition = maxResult._max.position ?? 0;

    return this.prisma.card.create({
      data: {
        listId: dto.listId,
        title: dto.title,
        coverColor: dto.coverColor,
        position: maxPosition + 1000,
        createdById: userId,
      },
    });
  }

  async getCardById(cardId: string) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException(`Card ${cardId} not found`);
    }
    return card;
  }

  async updateCard(cardId: string, dto: UpdateCardDto) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException(`Card ${cardId} not found`);
    }

    return this.prisma.card.update({
      where: { id: cardId },
      data: { ...dto },
    });
  }

  async deleteCard(cardId: string) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException(`Card ${cardId} not found`);
    }

    await this.prisma.card.delete({ where: { id: cardId } });
    return card;
  }

  async moveCard(cardId: string, dto: MoveCardDto) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException(`Card ${cardId} not found`);
    }

    await this.prisma.card.update({
      where: { id: cardId },
      data: {
        listId: dto.targetListId,
        position: dto.newPosition,
      },
    });

    // Check if rebalancing is needed in target list
    const rebalanced = await this.rebalanceIfNeeded(dto.targetListId);

    // If rebalanced, re-fetch for updated position; otherwise use known values
    if (rebalanced) {
      const fresh = await this.prisma.card.findUnique({ where: { id: cardId } });
      if (!fresh) throw new NotFoundException(`Card ${cardId} not found after rebalance`);
      return fresh;
    }

    // No rebalance — return card with updated fields directly
    return { ...card, listId: dto.targetListId, position: dto.newPosition };
  }

  private async rebalanceIfNeeded(listId: string): Promise<boolean> {
    const cards = await this.prisma.card.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
    });

    if (cards.length < 2) return false;

    // Check min gap between adjacent cards
    let needsRebalance = false;
    for (let i = 1; i < cards.length; i++) {
      const gap = cards[i].position - cards[i - 1].position;
      if (gap < 0.001) {
        needsRebalance = true;
        break;
      }
    }

    if (!needsRebalance) return false;

    // Rebalance: assign positions as (index + 1) * 1000 atomically
    await this.prisma.$transaction(
      cards.map((card, index) =>
        this.prisma.card.update({
          where: { id: card.id },
          data: { position: (index + 1) * 1000 },
        }),
      ),
    );
    return true;
  }
}
