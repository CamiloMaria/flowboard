import { Module } from '@nestjs/common';
import { BoardGateway } from './board.gateway';
import { AuthModule } from '../auth/auth.module';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [AuthModule, PresenceModule],
  providers: [BoardGateway],
  exports: [BoardGateway],
})
export class WebSocketModule {}
