import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Bot colors (slots 2, 3, 4) — per D-13, excluded from guest assignment
const BOT_COLORS = ['#F472B6', '#4ADE80', '#A78BFA'];

describe('Guest Auth (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    // Clean tables in proper order (foreign keys)
    await prisma.refreshToken.deleteMany();
    await prisma.card.deleteMany();
    await prisma.list.deleteMany();
    await prisma.board.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  // Test 1: POST /api/auth/guest returns 201 with accessToken
  it('POST /api/auth/guest — returns 201 with accessToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/guest')
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(typeof res.body.accessToken).toBe('string');
  });

  // Test 2: Guest JWT payload contains role: "guest", name starting with "Guest-",
  //          a color hex string, and sub (UUID format)
  it('POST /api/auth/guest — JWT payload has role, name, color, sub', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/guest')
      .expect(201);

    // Decode JWT payload (base64url)
    const payload = JSON.parse(
      Buffer.from(res.body.accessToken.split('.')[1], 'base64url').toString(),
    );

    expect(payload.role).toBe('guest');
    expect(payload.name).toMatch(/^Guest-[a-f0-9]{6}$/);
    expect(payload.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    // UUID format: 8-4-4-4-12 hex chars
    expect(payload.sub).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  // Test 3: Guest JWT expires in 24 hours (decode and check exp claim)
  it('POST /api/auth/guest — JWT expires in 24 hours', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/guest')
      .expect(201);

    const payload = JSON.parse(
      Buffer.from(res.body.accessToken.split('.')[1], 'base64url').toString(),
    );

    const now = Math.floor(Date.now() / 1000);
    const expectedExp = now + 24 * 60 * 60;
    // Allow 10 seconds tolerance
    expect(payload.exp).toBeGreaterThan(expectedExp - 10);
    expect(payload.exp).toBeLessThan(expectedExp + 10);
  });

  // Test 4: Guest JWT color is NOT one of the bot colors
  it('POST /api/auth/guest — color is NOT a bot color', async () => {
    // Run multiple times to increase confidence
    for (let i = 0; i < 10; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/auth/guest')
        .expect(201);

      const payload = JSON.parse(
        Buffer.from(res.body.accessToken.split('.')[1], 'base64url').toString(),
      );

      expect(BOT_COLORS).not.toContain(payload.color);
    }
  });

  // Test 5: Guest does NOT create a database row
  it('POST /api/auth/guest — does NOT create a database row', async () => {
    const beforeCount = await prisma.user.count();

    await request(app.getHttpServer())
      .post('/api/auth/guest')
      .expect(201);

    const afterCount = await prisma.user.count();
    expect(afterCount).toBe(beforeCount);
  });

  // Test 6: Multiple calls produce different sub values (unique guest IDs)
  it('POST /api/auth/guest — multiple calls produce different sub values', async () => {
    const subs = new Set<string>();

    for (let i = 0; i < 5; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/auth/guest')
        .expect(201);

      const payload = JSON.parse(
        Buffer.from(res.body.accessToken.split('.')[1], 'base64url').toString(),
      );

      subs.add(payload.sub);
    }

    expect(subs.size).toBe(5);
  });
});
