import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (E2E)', () => {
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

  // Test 1: POST /api/auth/register with valid data returns 201 with accessToken
  it('POST /api/auth/register — returns 201 with accessToken in body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123', name: 'Test User' })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(typeof res.body.accessToken).toBe('string');
  });

  // Test 2: POST /api/auth/register sets refresh_token HTTP-only cookie
  it('POST /api/auth/register — sets refresh_token HTTP-only cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123', name: 'Test User' })
      .expect(201);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith('refresh_token='))
      : cookies;
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('Path=/api/auth/refresh');
  });

  // Test 3: POST /api/auth/register with duplicate email returns 409
  it('POST /api/auth/register — duplicate email returns 409', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'password123', name: 'First' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'password123', name: 'Second' })
      .expect(409);
  });

  // Test 4: POST /api/auth/register with invalid email returns 400
  it('POST /api/auth/register — invalid email returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123', name: 'Test' })
      .expect(400);
  });

  // Test 5: POST /api/auth/login with valid credentials returns 200 with accessToken
  it('POST /api/auth/login — valid credentials returns 200 with accessToken', async () => {
    // Register first
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'login@example.com', password: 'password123', name: 'Login User' });

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123' })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(typeof res.body.accessToken).toBe('string');
  });

  // Test 6: POST /api/auth/login with wrong password returns 401
  it('POST /api/auth/login — wrong password returns 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'wrong@example.com', password: 'password123', name: 'Wrong' });

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'wrong@example.com', password: 'wrongpassword' })
      .expect(401);
  });

  // Test 7: POST /api/auth/login with non-existent email returns 401
  it('POST /api/auth/login — non-existent email returns 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'password123' })
      .expect(401);
  });

  // Test 8: POST /api/auth/refresh with valid refresh cookie returns new accessToken and new refresh cookie
  it('POST /api/auth/refresh — valid cookie returns new tokens', async () => {
    // Register to get refresh cookie
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'refresh@example.com', password: 'password123', name: 'Refresh User' });

    const cookies = registerRes.headers['set-cookie'];
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith('refresh_token='))
      : cookies;

    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [refreshCookie!])
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');

    // Should set a NEW refresh cookie
    const newCookies = res.headers['set-cookie'];
    const newRefreshCookie = Array.isArray(newCookies)
      ? newCookies.find((c: string) => c.startsWith('refresh_token='))
      : newCookies;
    expect(newRefreshCookie).toBeDefined();
  });

  // Test 9: POST /api/auth/refresh with revoked token returns 401
  it('POST /api/auth/refresh — revoked token returns 401', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'revoked@example.com', password: 'password123', name: 'Revoked' });

    const cookies = registerRes.headers['set-cookie'];
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith('refresh_token='))
      : cookies;

    // Use it once (rotates)
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [refreshCookie!])
      .expect(200);

    // Use the OLD cookie again — should be revoked
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [refreshCookie!])
      .expect(401);
  });

  // Test 10: POST /api/auth/refresh reusing old token after rotation returns 401
  it('POST /api/auth/refresh — old token after rotation returns 401', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'rotate@example.com', password: 'password123', name: 'Rotate' });

    const cookies = registerRes.headers['set-cookie'];
    const firstRefreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith('refresh_token='))
      : cookies;

    // Rotate once
    const refreshRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [firstRefreshCookie!])
      .expect(200);

    // Rotate again with the NEW cookie
    const secondCookies = refreshRes.headers['set-cookie'];
    const secondRefreshCookie = Array.isArray(secondCookies)
      ? secondCookies.find((c: string) => c.startsWith('refresh_token='))
      : secondCookies;

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [secondRefreshCookie!])
      .expect(200);

    // Try the FIRST cookie again — must fail
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [firstRefreshCookie!])
      .expect(401);
  });
});
