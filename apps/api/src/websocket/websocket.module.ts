import { Module, forwardRef } from '@nestjs/common';
import { BoardGateway } from './board.gateway';
import { AuthModule } from '../auth/auth.module';
import { PresenceModule } from '../presence/presence.module';
import { DemoModule } from '../demo/demo.module';

@Module({
  imports: [AuthModule, PresenceModule, forwardRef(() => DemoModule)],
  providers: [BoardGateway],
  exports: [BoardGateway],
})
export class WebSocketModule {}
