import { Module, forwardRef } from '@nestjs/common';
import { BoardModule } from '../board/board.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { PresenceModule } from '../presence/presence.module';
import { DemoService } from './demo.service';

@Module({
  imports: [BoardModule, forwardRef(() => WebSocketModule), PresenceModule],
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}
