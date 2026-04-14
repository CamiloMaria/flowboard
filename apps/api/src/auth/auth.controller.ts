import {
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('guest')
  @HttpCode(HttpStatus.CREATED)
  generateGuestToken() {
    return this.authService.generateGuestToken();
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldRefreshToken = req.cookies?.refresh_token;
    if (!oldRefreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const { accessToken, refreshToken } =
      await this.authService.refreshTokens(oldRefreshToken);

    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    return { accessToken };
  }
}
