import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { USER_COLORS, GUEST_COLORS } from '@flowboard/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();

    // Check unique email
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password with bcrypt 12 rounds per D-06
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Random color from non-bot palette
    const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name,
        color,
      },
    });

    return this.generateTokens(user.id, user.email, user.name, user.color);
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id, user.email, user.name, user.color);
  }

  async refreshTokens(oldRefreshToken: string) {
    // Verify JWT signature
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(oldRefreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token exists in DB (not revoked)
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
    });
    if (!stored || stored.revoked) {
      // Potential token theft — revoke ALL tokens for this user (RFC 6819)
      if (stored?.userId) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: stored.userId, revoked: false },
          data: { revoked: true },
        });
      }
      throw new UnauthorizedException('Token revoked');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    // Fetch user for access token payload
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user.id, user.email, user.name, user.color);
  }

  async validateToken(token: string) {
    return this.jwtService.verifyAsync(token);
  }

  /**
   * Remove expired and old revoked refresh tokens.
   * Call periodically (e.g., via @nestjs/schedule Cron) to prevent unbounded table growth.
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revoked: true, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        ],
      },
    });
    return result.count;
  }

  /**
   * Generate a guest JWT for anonymous demo board access.
   * No database row created — per D-11, guests are ephemeral.
   * Uses same JWT_SECRET as regular tokens per D-12.
   * Color excludes bot-assigned colors per D-13.
   */
  generateGuestToken(): { accessToken: string } {
    const guestId = crypto.randomUUID();
    const shortId = guestId.slice(0, 6);
    const color =
      GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)];

    const accessToken = this.jwtService.sign(
      {
        sub: guestId,
        name: `Guest-${shortId}`,
        color,
        role: 'guest',
      },
      { expiresIn: '24h' },
    );

    return { accessToken };
  }

  private async generateTokens(
    userId: string,
    email: string,
    name: string,
    color: string,
  ) {
    const accessToken = this.jwtService.sign(
      { sub: userId, email, name, color, role: 'user' },
      { expiresIn: '15m' },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, jti: crypto.randomUUID() },
      { secret: this.refreshSecret, expiresIn: '7d' },
    );

    // Store refresh token in DB for revocation
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
