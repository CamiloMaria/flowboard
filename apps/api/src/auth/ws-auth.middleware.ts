import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

export function createWsAuthMiddleware(jwtService: JwtService) {
  return (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Unauthorized: No token provided'));
    }

    try {
      const payload = jwtService.verify(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Unauthorized: Invalid token'));
    }
  };
}
