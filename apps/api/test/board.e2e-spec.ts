import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Board CRUD (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let boardId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
  }, 30000);

  beforeEach(async () => {
    // Clean tables in FK order
    await prisma.refreshToken.deleteMany();
    await prisma.card.deleteMany();
    await prisma.list.deleteMany();
    await prisma.board.deleteMany();
    await prisma.user.deleteMany();

    // Create a test user and get JWT
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'board-test@example.com', password: 'password123', name: 'Board Tester' })
      .expect(201);

    accessToken = registerRes.body.accessToken;

    // Get user ID from DB
    const user = await prisma.user.findUnique({ where: { email: 'board-test@example.com' } });
    userId = user!.id;

    // Create a test board
    const board = await prisma.board.create({
      data: {
        name: 'Test Board',
        isDemo: false,
        createdById: userId,
      },
    });
    boardId = board.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // Test 1: GET /api/boards/:id returns 200 with board, lists sorted by position, cards sorted by position
  it('GET /api/boards/:id — returns board with sorted lists and cards', async () => {
    // Create lists in reverse order
    const list2 = await prisma.list.create({
      data: { boardId, name: 'List B', position: 2000 },
    });
    const list1 = await prisma.list.create({
      data: { boardId, name: 'List A', position: 1000 },
    });

    // Create cards in reverse order within list1
    await prisma.card.create({
      data: { listId: list1.id, title: 'Card 2', position: 2000, createdById: userId },
    });
    await prisma.card.create({
      data: { listId: list1.id, title: 'Card 1', position: 1000, createdById: userId },
    });

    const res = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.id).toBe(boardId);
    expect(res.body.lists).toHaveLength(2);
    // Lists sorted by position
    expect(res.body.lists[0].name).toBe('List A');
    expect(res.body.lists[1].name).toBe('List B');
    // Cards sorted by position within list
    expect(res.body.lists[0].cards).toHaveLength(2);
    expect(res.body.lists[0].cards[0].title).toBe('Card 1');
    expect(res.body.lists[0].cards[1].title).toBe('Card 2');
  });

  // Test 2: POST /api/boards/:boardId/lists creates list with position = max + 1000
  it('POST /api/boards/:boardId/lists — creates list with auto position', async () => {
    // Create an existing list
    await prisma.list.create({
      data: { boardId, name: 'Existing', position: 1000 },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/boards/${boardId}/lists`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'New List' })
      .expect(201);

    expect(res.body.name).toBe('New List');
    expect(res.body.boardId).toBe(boardId);
    expect(res.body.position).toBe(2000);
  });

  // Test 3: PATCH /api/boards/:boardId/lists/:id updates name
  it('PATCH /api/boards/:boardId/lists/:id — updates name', async () => {
    const list = await prisma.list.create({
      data: { boardId, name: 'Old Name', position: 1000 },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/boards/${boardId}/lists/${list.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'New Name' })
      .expect(200);

    expect(res.body.name).toBe('New Name');
  });

  // Test 4: DELETE /api/boards/:boardId/lists/:id — cascades card deletion
  it('DELETE /api/boards/:boardId/lists/:id — deletes list and cascades cards', async () => {
    const list = await prisma.list.create({
      data: { boardId, name: 'To Delete', position: 1000 },
    });
    await prisma.card.create({
      data: { listId: list.id, title: 'Orphan Card', position: 1000, createdById: userId },
    });

    await request(app.getHttpServer())
      .delete(`/api/boards/${boardId}/lists/${list.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const cards = await prisma.card.findMany({ where: { listId: list.id } });
    expect(cards).toHaveLength(0);
  });

  // Test 5: POST /api/boards/:boardId/cards creates card in list with auto position
  it('POST /api/boards/:boardId/cards — creates card with auto position', async () => {
    const list = await prisma.list.create({
      data: { boardId, name: 'Target List', position: 1000 },
    });
    await prisma.card.create({
      data: { listId: list.id, title: 'Existing', position: 1000, createdById: userId },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/boards/${boardId}/cards`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'New Card', listId: list.id })
      .expect(201);

    expect(res.body.title).toBe('New Card');
    expect(res.body.listId).toBe(list.id);
    expect(res.body.position).toBe(2000);
    expect(res.body.createdById).toBe(userId);
  });

  // Test 6: PATCH /api/boards/:boardId/cards/:id updates title
  it('PATCH /api/boards/:boardId/cards/:id — updates title', async () => {
    const list = await prisma.list.create({
      data: { boardId, name: 'List', position: 1000 },
    });
    const card = await prisma.card.create({
      data: { listId: list.id, title: 'Old Title', position: 1000, createdById: userId },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/boards/${boardId}/cards/${card.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'New Title' })
      .expect(200);

    expect(res.body.title).toBe('New Title');
  });

  // Test 7: PATCH /api/boards/:boardId/cards/:id updates descriptionText
  it('PATCH /api/boards/:boardId/cards/:id — updates descriptionText', async () => {
    const list = await prisma.list.create({
      data: { boardId, name: 'List', position: 1000 },
    });
    const card = await prisma.card.create({
      data: { listId: list.id, title: 'Card', position: 1000, createdById: userId },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/boards/${boardId}/cards/${card.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ descriptionText: 'Updated description' })
      .expect(200);

    expect(res.body.descriptionText).toBe('Updated description');
  });

  // Test 8: DELETE /api/boards/:boardId/cards/:id
  it('DELETE /api/boards/:boardId/cards/:id — deletes card', async () => {
    const list = await prisma.list.create({
      data: { boardId, name: 'List', position: 1000 },
    });
    const card = await prisma.card.create({
      data: { listId: list.id, title: 'To Delete', position: 1000, createdById: userId },
    });

    await request(app.getHttpServer())
      .delete(`/api/boards/${boardId}/cards/${card.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const found = await prisma.card.findUnique({ where: { id: card.id } });
    expect(found).toBeNull();
  });

  // Test 9: POST /api/boards/:boardId/cards/:id/move — moves card to new list and position
  it('POST /api/boards/:boardId/cards/:id/move — moves card to new list', async () => {
    const list1 = await prisma.list.create({
      data: { boardId, name: 'Source', position: 1000 },
    });
    const list2 = await prisma.list.create({
      data: { boardId, name: 'Target', position: 2000 },
    });
    const card = await prisma.card.create({
      data: { listId: list1.id, title: 'Moving Card', position: 1000, createdById: userId },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/boards/${boardId}/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ targetListId: list2.id, newPosition: 1000 })
      .expect(200);

    expect(res.body.listId).toBe(list2.id);
    expect(res.body.position).toBe(1000);
  });

  // Test 10: Move card between two existing cards gets position = midpoint (fractional indexing)
  it('Move card between two cards — gets midpoint position', async () => {
    const list = await prisma.list.create({
      data: { boardId, name: 'List', position: 1000 },
    });
    const card1 = await prisma.card.create({
      data: { listId: list.id, title: 'Card A', position: 1000, createdById: userId },
    });
    const card2 = await prisma.card.create({
      data: { listId: list.id, title: 'Card B', position: 2000, createdById: userId },
    });
    const card3 = await prisma.card.create({
      data: { listId: list.id, title: 'Card C', position: 3000, createdById: userId },
    });

    // Move card3 between card1 and card2 (midpoint = 1500)
    const res = await request(app.getHttpServer())
      .post(`/api/boards/${boardId}/cards/${card3.id}/move`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ targetListId: list.id, newPosition: 1500 })
      .expect(200);

    expect(res.body.position).toBe(1500);
  });

  // Test 11: Rebalancing triggers when position gap < 0.001
  it('Rebalancing triggers when position gap < 0.001', async () => {
    const list = await prisma.list.create({
      data: { boardId, name: 'Dense List', position: 1000 },
    });

    // Create cards with very close positions
    await prisma.card.create({
      data: { listId: list.id, title: 'Dense A', position: 1000.0005, createdById: userId },
    });
    await prisma.card.create({
      data: { listId: list.id, title: 'Dense B', position: 1000.001, createdById: userId },
    });

    // Move a new card between them — gap is 0.0005 which is < 0.001
    const cardToMove = await prisma.card.create({
      data: { listId: list.id, title: 'Dense C', position: 5000, createdById: userId },
    });

    await request(app.getHttpServer())
      .post(`/api/boards/${boardId}/cards/${cardToMove.id}/move`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ targetListId: list.id, newPosition: 1000.00075 })
      .expect(200);

    // After rebalance, all cards should have positions at (index+1)*1000 pattern
    const cards = await prisma.card.findMany({
      where: { listId: list.id },
      orderBy: { position: 'asc' },
    });

    expect(cards).toHaveLength(3);
    expect(cards[0].position).toBe(1000);
    expect(cards[1].position).toBe(2000);
    expect(cards[2].position).toBe(3000);
  });
});
