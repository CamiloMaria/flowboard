import { Module } from '@nestjs/common';
import { BoardGateway } from './board.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [BoardGateway],
  exports: [BoardGateway],
})
export class WebSocketModule {}
